import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import { AIRPORTS } from "@/lib/airports";
import { parseAeroDataBox } from "@/lib/aerodatabox";
import { parseXML } from "@/lib/faa";

webpush.setVapidDetails(
  "mailto:support@tripcopilot.app",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

const STATUS_LABEL: Record<string, string> = {
  ok: "Normal ✅",
  delay_minor: "Demora leve 🟡",
  delay_moderate: "Demora moderada 🟠",
  delay_severe: "Demora severa 🔴",
  ground_delay: "Ground delay 🔴",
  ground_stop: "Ground stop 🛑",
  closure: "Cerrado ⛔",
};

const ALERT_STATUSES = new Set([
  "delay_moderate",
  "delay_severe",
  "ground_delay",
  "ground_stop",
  "closure",
]);

export async function GET(request: Request) {
  // Vercel sets CRON_SECRET automatically for cron job requests
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const now = new Date();
  const todayISO = now.toISOString().slice(0, 10);
  const threeDaysISO = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  // Get all flights departing in the next 3 days, with their user_id via trip
  const { data: flights, error } = await supabase
    .from("flights")
    .select("*, trips!inner(user_id)")
    .gte("iso_date", todayISO)
    .lte("iso_date", threeDaysISO);

  if (error || !flights?.length) {
    return Response.json({ ok: true, processed: 0, sent: 0 });
  }

  // Collect unique origin airports
  const uniqueAirports = Array.from(
    new Set(flights.map((f: any) => f.origin_code as string)),
  );

  // Fetch airport statuses (FAA + international)
  const statusMap: Record<string, string> = {};

  const faaAirports = uniqueAirports.filter(
    (iata) => AIRPORTS[iata]?.isFAA !== false,
  );
  if (faaAirports.length > 0) {
    try {
      const res = await fetch(
        "https://nasstatus.faa.gov/api/airport-status-information",
        {
          headers: {
            "User-Agent": "TripCopilot/1.0",
            Accept: "application/xml",
          },
          signal: AbortSignal.timeout(10000),
        },
      );
      if (res.ok) {
        const xml = await res.text();
        const parsed = parseXML(xml, "es");
        for (const iata of faaAirports) {
          statusMap[iata] = parsed[iata]?.status ?? "ok";
        }
      }
    } catch {}
  }

  const intlAirports = uniqueAirports.filter(
    (iata) => AIRPORTS[iata]?.isFAA === false,
  );
  const rapidApiKey = process.env.AERODATABOX_RAPIDAPI_KEY;
  if (intlAirports.length > 0 && rapidApiKey) {
    const fromStr = new Date(now.getTime() - 60 * 60 * 1000)
      .toISOString()
      .slice(0, 16);
    const toStr = new Date(now.getTime() + 4 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 16);

    await Promise.allSettled(
      intlAirports.map(async (iata) => {
        try {
          const url =
            `https://aerodatabox.p.rapidapi.com/flights/airports/iata/${iata}/${fromStr}/${toStr}` +
            `?direction=Departure&withLeg=false&withCancelled=true&withCodeshared=true&withCargo=false&withPrivate=false&withLocation=false`;
          const res = await fetch(url, {
            headers: {
              "X-RapidAPI-Key": rapidApiKey,
              "X-RapidAPI-Host": "aerodatabox.p.rapidapi.com",
            },
            signal: AbortSignal.timeout(8000),
          });
          if (!res.ok) return;
          const data = await res.json();
          const status = parseAeroDataBox(iata, data, "es");
          if (status) statusMap[iata] = status.status;
        } catch {}
      }),
    );
  }

  // Process each flight
  let notificationsSent = 0;

  for (const flight of flights as any[]) {
    const userId: string = flight.trips.user_id;
    const departureTime: string | null = flight.departure_time;
    const isoDate: string = flight.iso_date;
    const originCode: string = flight.origin_code;

    // Parse departure datetime treating stored time as UTC-3 (Argentina)
    let departureDateTime: Date | null = null;
    if (departureTime) {
      departureDateTime = new Date(`${isoDate}T${departureTime}:00-03:00`);
    }

    const hoursUntil =
      departureDateTime !== null
        ? (departureDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)
        : null;

    // Skip past flights
    if (hoursUntil !== null && hoursUntil < 0) continue;

    // Get user push subscriptions
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId);

    if (!subs?.length) continue;

    const airportStatus = statusMap[originCode] ?? "ok";

    // A: Delay / closure alert (up to 3 days before)
    if (ALERT_STATUSES.has(airportStatus)) {
      const notifType = `delay_${airportStatus}`;
      const alreadySent = await checkLog(supabase, flight.id, notifType, 20);
      if (!alreadySent) {
        const label = STATUS_LABEL[airportStatus] ?? airportStatus;
        await sendAndLog(supabase, subs, flight, userId, notifType, {
          title: `Alerta en ${originCode} — ${flight.flight_code}`,
          body: `Tu vuelo ${flight.flight_code} a ${flight.destination_code} el ${formatDate(isoDate)}. Estado de ${originCode}: ${label}.`,
          url: "/app",
        });
        notificationsSent++;
      }
    }

    // B: Check-in 24h before
    if (hoursUntil !== null && hoursUntil >= 23 && hoursUntil <= 25) {
      const alreadySent = await checkLog(supabase, flight.id, "checkin_24h", Infinity);
      if (!alreadySent) {
        await sendAndLog(supabase, subs, flight, userId, "checkin_24h", {
          title: "¿Hiciste el check-in? ✈️",
          body: `Tu vuelo ${flight.flight_code} ${originCode}→${flight.destination_code} sale mañana a las ${departureTime}.`,
          url: "/app",
        });
        notificationsSent++;
      }
    }

    // C: Pre-flight alert 3h before (with airport status)
    if (hoursUntil !== null && hoursUntil >= 2.5 && hoursUntil <= 3.5) {
      const alreadySent = await checkLog(supabase, flight.id, "preflight_3h", Infinity);
      if (!alreadySent) {
        const label = STATUS_LABEL[airportStatus] ?? "Normal ✅";
        await sendAndLog(supabase, subs, flight, userId, "preflight_3h", {
          title: `Tu vuelo ${flight.flight_code} sale en ~3hs`,
          body: `${originCode}→${flight.destination_code} a las ${departureTime}. ${originCode}: ${label}.`,
          url: "/app",
        });
        notificationsSent++;
      }
    }
  }

  return Response.json({
    ok: true,
    processed: flights.length,
    sent: notificationsSent,
  });
}

/** Returns true if we already sent this notification type for this flight within withinHours */
async function checkLog(
  supabase: any,
  flightId: string,
  type: string,
  withinHours: number,
): Promise<boolean> {
  const cutoff =
    withinHours === Infinity
      ? new Date(0)
      : new Date(Date.now() - withinHours * 60 * 60 * 1000);

  const { data } = await supabase
    .from("notification_log")
    .select("id")
    .eq("flight_id", flightId)
    .eq("type", type)
    .gte("sent_at", cutoff.toISOString())
    .limit(1)
    .maybeSingle();

  return !!data;
}

/** Send push to all subscriptions and log it */
async function sendAndLog(
  supabase: any,
  subs: { endpoint: string; p256dh: string; auth: string }[],
  flight: any,
  userId: string,
  type: string,
  notification: { title: string; body: string; url: string },
) {
  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ ...notification, tag: type }),
        );
      } catch (e: unknown) {
        const err = e as { statusCode?: number };
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint);
        }
      }
    }),
  );

  await supabase.from("notification_log").insert({
    flight_id: flight.id,
    user_id: userId,
    type,
    sent_at: new Date().toISOString(),
  });
}

function formatDate(isoDate: string): string {
  const [, month, day] = isoDate.split("-");
  return `${day}/${month}`;
}
