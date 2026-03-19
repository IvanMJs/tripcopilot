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

    // Sequential to detect quota-exceeded (429/402) and stop immediately
    for (const iata of intlAirports) {
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
        // Quota exceeded — stop all remaining calls for this run
        if (res.status === 429 || res.status === 402) break;
        if (!res.ok) continue;
        const data = await res.json();
        const status = parseAeroDataBox(iata, data, "es");
        if (status) statusMap[iata] = status.status;
      } catch {}
    }
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

    // A2: Morning briefing — day of flight, between 9:00–13:00 UTC (6–10am Argentina)
    if (isoDate === todayISO && hoursUntil !== null && hoursUntil > 3) {
      const utcHour = now.getUTCHours();
      if (utcHour >= 9 && utcHour <= 13) {
        const alreadySent = await checkLog(supabase, flight.id, "morning_briefing", Infinity);
        if (!alreadySent) {
          const statusLabel = STATUS_LABEL[airportStatus] ?? "Normal ✅";
          await sendAndLog(supabase, subs, flight, userId, "morning_briefing", {
            title: `¡Hoy viajás! ${flight.flight_code} sale a las ${departureTime ?? "?"}`,
            body: `${originCode}→${flight.destination_code}. ${originCode}: ${statusLabel}. ¡Buen vuelo! 🛫`,
            url: "/app",
          });
          notificationsSent++;
        }
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

    // D: Real-time flight status (2–4h before) — 1 API call per flight, ever
    if (hoursUntil !== null && hoursUntil >= 2 && hoursUntil <= 4 && rapidApiKey) {
      const alreadyFetched = await checkLog(supabase, flight.id, "flight_status_fetched", Infinity);
      if (!alreadyFetched) {
        // Log immediately so parallel cron runs don't double-fetch
        await supabase.from("notification_log").insert({
          flight_id: flight.id,
          user_id: userId,
          type: "flight_status_fetched",
          sent_at: new Date().toISOString(),
        });

        const flightStatus = await fetchFlightStatus(flight.flight_code, isoDate, rapidApiKey);

        if (flightStatus) {
          if (flightStatus.cancelled) {
            await sendAndLog(supabase, subs, flight, userId, "flight_cancelled", {
              title: `Vuelo cancelado ⛔ — ${flight.flight_code}`,
              body: `Tu vuelo ${flight.flight_code} ${originCode}→${flight.destination_code} fue cancelado. Contactá a la aerolínea.`,
              url: "/app",
            });
            notificationsSent++;
          } else if (flightStatus.delayMinutes >= 20) {
            const delayText = flightStatus.delayMinutes >= 60
              ? `${Math.floor(flightStatus.delayMinutes / 60)}h ${flightStatus.delayMinutes % 60}min`
              : `${flightStatus.delayMinutes} min`;
            const gateText = flightStatus.gate ? ` · Puerta ${flightStatus.gate}` : "";
            await sendAndLog(supabase, subs, flight, userId, "flight_delay_real", {
              title: `${flight.flight_code} con ${delayText} de demora 🟠`,
              body: `Sale aprox. a las ${flightStatus.estimatedDeparture ?? departureTime}${gateText}. ${originCode}→${flight.destination_code}.`,
              url: "/app",
            });
            notificationsSent++;
          }
        }
      }
    }
  }

  // ── Hotel notifications ───────────────────────────────────────────────────
  const todayStr    = now.toISOString().slice(0, 10);
  const tomorrowISO = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const currentTime = now.toISOString().slice(11, 16); // "HH:MM"
  const windowStart = new Date(now.getTime() - 30 * 60 * 1000).toISOString().slice(11, 16);

  const { data: hotelAccs } = await supabase
    .from("accommodations")
    .select("*, trips!inner(user_id)")
    .or(`check_in_date.eq.${todayStr},check_in_date.eq.${tomorrowISO},check_out_date.eq.${todayStr},check_out_date.eq.${tomorrowISO}`);

  for (const acc of (hotelAccs ?? []) as any[]) {
    const userId: string = acc.trips.user_id;
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId);
    if (!subs?.length) continue;

    // A: Check-in reminder (day before, if no specific time set)
    if (acc.check_in_date === tomorrowISO && !acc.check_in_time) {
      const alreadySent = await checkLog(supabase, acc.id, "hotel_checkin_reminder", Infinity);
      if (!alreadySent) {
        await sendAndLog(supabase, subs, { id: acc.id }, userId, "hotel_checkin_reminder", {
          title: `🏨 Mañana check-in en ${acc.name}`,
          body: "Recordá tener listos los documentos y código de reserva.",
          url: "/app",
        });
        notificationsSent++;
      }
    }

    // B: Check-in time notification (today, at the exact check-in time ±30min)
    if (acc.check_in_date === todayStr && acc.check_in_time) {
      const inWindow = timeInWindow(acc.check_in_time, windowStart, currentTime);
      if (inWindow) {
        const alreadySent = await checkLog(supabase, acc.id, "hotel_checkin_time", Infinity);
        if (!alreadySent) {
          await sendAndLog(supabase, subs, { id: acc.id }, userId, "hotel_checkin_time", {
            title: `🏨 Check-in ahora — ${acc.name}`,
            body: `Hora de check-in: ${acc.check_in_time}. ¡Bienvenido!`,
            url: "/app",
          });
          notificationsSent++;
        }
      }
    }

    // C0: Check-out reminder (day before, if no specific time set)
    if (acc.check_out_date === tomorrowISO && !acc.check_out_time) {
      const alreadySent = await checkLog(supabase, acc.id, "hotel_checkout_reminder", Infinity);
      if (!alreadySent) {
        await sendAndLog(supabase, subs, { id: acc.id }, userId, "hotel_checkout_reminder", {
          title: `🏨 Mañana check-out en ${acc.name}`,
          body: "Recordá dejar la habitación a tiempo y tener listo el equipaje.",
          url: "/app",
        });
        notificationsSent++;
      }
    }

    // C: Check-out time notification (today, at the exact check-out time ±30min)
    if (acc.check_out_date === todayStr && acc.check_out_time) {
      const inWindow = timeInWindow(acc.check_out_time, windowStart, currentTime);
      if (inWindow) {
        const alreadySent = await checkLog(supabase, acc.id, "hotel_checkout_time", Infinity);
        if (!alreadySent) {
          await sendAndLog(supabase, subs, { id: acc.id }, userId, "hotel_checkout_time", {
            title: `🏨 Check-out ahora — ${acc.name}`,
            body: `Hora de check-out: ${acc.check_out_time}. ¡Buen viaje!`,
            url: "/app",
          });
          notificationsSent++;
        }
      }
    }
  }

  return Response.json({
    ok: true,
    processed: flights.length,
    sent: notificationsSent,
  });
}

/** Fetch real-time status for a specific flight from AeroDataBox */
async function fetchFlightStatus(
  flightCode: string,
  isoDate: string,
  rapidApiKey: string,
): Promise<{ delayMinutes: number; estimatedDeparture: string | null; gate: string | null; cancelled: boolean } | null> {
  try {
    const url = `https://aerodatabox.p.rapidapi.com/flights/number/${flightCode}/${isoDate}`;
    const res = await fetch(url, {
      headers: {
        "X-RapidAPI-Key": rapidApiKey,
        "X-RapidAPI-Host": "aerodatabox.p.rapidapi.com",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json() as any[];
    if (!Array.isArray(data) || data.length === 0) return null;

    const leg = data[0];
    const status: string = leg.status ?? "";
    const cancelled = status === "Cancelled";
    const delayMinutes: number = leg.departure?.delay ?? 0;
    const gate: string | null = leg.departure?.gate ?? null;

    // Estimated departure from actualTime local, fallback to scheduledTime
    const actualLocal: string | null = leg.departure?.actualTime?.local ?? null;
    const estimatedDeparture = actualLocal ? actualLocal.slice(11, 16) : null;

    return { delayMinutes, estimatedDeparture, gate, cancelled };
  } catch {
    return null;
  }
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

/** Convert "HH:MM" string to minutes since midnight. */
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Returns true if `time` falls within the window [windowStart, windowEnd].
 * Handles midnight wrap-around (e.g. windowStart=23:45, windowEnd=00:15).
 */
function timeInWindow(time: string, windowStart: string, windowEnd: string): boolean {
  const t = toMinutes(time);
  const s = toMinutes(windowStart);
  const e = toMinutes(windowEnd);
  if (s <= e) return t >= s && t <= e;
  return t >= s || t <= e; // crosses midnight
}
