import webpush from "web-push";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { AIRPORTS } from "@/lib/airports";
import { parseAeroDataBox } from "@/lib/aerodatabox";
import { parseXML } from "@/lib/faa";
import { localToUTC, localHourInTimezone, CRON_LABELS, CronLocale } from "@/lib/cronUtils";

type FlightRow = {
  id: string;
  flight_code: string;
  origin_code: string;
  destination_code: string;
  iso_date: string;
  departure_time: string | null;
  trips: { user_id: string };
};

type AccommodationRow = {
  id: string;
  name: string;
  check_in_date: string;
  check_out_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  trips: { user_id: string };
};

type PushSubRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

type AeroDataBoxFlightLeg = {
  status?: string;
  departure?: {
    delay?: number;
    gate?: string | null;
    actualTime?: { local?: string };
  };
};

webpush.setVapidDetails(
  "mailto:support@tripcopilot.app",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

const ALERT_STATUSES = new Set([
  "delay_moderate",
  "delay_severe",
  "ground_delay",
  "ground_stop",
  "closure",
]);

export async function GET(request: Request) {
  const cronStart = Date.now();
  const cronErrors: string[] = [];

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

  if (error) cronErrors.push(`flights query: ${error.message}`);
  if (error || !flights?.length) {
    await supabase.from("cron_runs").insert({
      flights_processed: 0, notifications_sent: 0,
      errors: cronErrors, duration_ms: Date.now() - cronStart,
    });
    return Response.json({ ok: true, processed: 0, sent: 0 });
  }

  // Collect unique origin airports
  const uniqueAirports = Array.from(
    new Set((flights as FlightRow[]).map((f) => f.origin_code)),
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
          headers: { "User-Agent": "TripCopilot/1.0", Accept: "application/xml" },
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
    const CACHE_TTL_MS = 30 * 60 * 1000;
    const cacheThreshold = new Date(now.getTime() - CACHE_TTL_MS).toISOString();

    const { data: cachedRows } = await supabase
      .from("airport_status_cache")
      .select("iata, data")
      .in("iata", intlAirports)
      .gte("cached_at", cacheThreshold);

    type CacheRow = { iata: string; data: { status?: string } };
    const cachedMap = new Map<string, string>(
      (cachedRows ?? []).map((r: CacheRow) => [r.iata, r.data?.status ?? "ok"]),
    );

    for (const iata of intlAirports) {
      if (cachedMap.has(iata)) statusMap[iata] = cachedMap.get(iata)!;
    }

    const toFetch = intlAirports.filter((iata) => !cachedMap.has(iata));
    if (toFetch.length > 0) {
      const fromStr = new Date(now.getTime() - 60 * 60 * 1000).toISOString().slice(0, 16);
      const toStr   = new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString().slice(0, 16);

      for (const iata of toFetch) {
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
          if (res.status === 429 || res.status === 402) {
            cronErrors.push(`AeroDataBox quota exceeded for ${iata}`);
            break;
          }
          if (!res.ok) continue;
          const data = await res.json();
          const status = parseAeroDataBox(iata, data, "es");
          if (status) {
            statusMap[iata] = status.status;
            await supabase
              .from("airport_status_cache")
              .upsert({ iata, data: status, cached_at: now.toISOString() });
          }
        } catch (e) {
          cronErrors.push(`AeroDataBox ${iata}: ${String(e)}`);
        }
      }
    }
  }

  // Cache user locales to avoid repeated auth admin calls
  const userLocaleCache = new Map<string, CronLocale>();
  async function getUserLocale(userId: string): Promise<CronLocale> {
    if (userLocaleCache.has(userId)) return userLocaleCache.get(userId)!;
    try {
      const { data } = await supabase.auth.admin.getUserById(userId);
      const locale = (data?.user?.user_metadata?.locale as CronLocale) ?? "es";
      const valid = locale === "en" ? "en" : "es";
      userLocaleCache.set(userId, valid);
      return valid;
    } catch {
      userLocaleCache.set(userId, "es");
      return "es";
    }
  }

  // Process each flight
  let notificationsSent = 0;

  for (const flight of flights as FlightRow[]) {
    const userId: string = flight.trips.user_id;
    const departureTime: string | null = flight.departure_time;
    const isoDate: string = flight.iso_date;
    const originCode: string = flight.origin_code;
    const destCode: string = flight.destination_code;

    // Resolve airport timezone (fallback: UTC)
    const airportTz = AIRPORTS[originCode]?.timezone ?? "UTC";

    // Parse departure datetime in airport local timezone → UTC
    let departureDateTime: Date | null = null;
    if (departureTime) {
      try {
        departureDateTime = localToUTC(isoDate, departureTime, airportTz);
      } catch {
        // malformed time — skip
      }
    }

    const hoursUntil =
      departureDateTime !== null
        ? (departureDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)
        : null;

    if (hoursUntil !== null && hoursUntil < 0) continue;

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId);

    if (!subs?.length) continue;

    const locale = await getUserLocale(userId);
    const L = CRON_LABELS[locale];
    const airportStatus = statusMap[originCode] ?? "ok";
    const statusLabel = L.statusLabel[airportStatus] ?? L.statusLabel["ok"];

    // A: Delay / closure alert (up to 3 days before)
    if (ALERT_STATUSES.has(airportStatus)) {
      const alreadySent = await checkFlightLog(supabase, flight.id, `delay_${airportStatus}`, 20);
      if (!alreadySent) {
        const { title, body } = L.delayAlert(originCode, flight.flight_code, destCode, formatDate(isoDate), statusLabel);
        await sendAndLogFlight(supabase, subs, flight.id, userId, `delay_${airportStatus}`, { title, body, url: "/app" });
        notificationsSent++;
      }
    }

    // A2: Morning briefing — fires when it's 6–10 AM at the origin airport
    if (isoDate === todayISO && hoursUntil !== null && hoursUntil > 3) {
      const localHour = localHourInTimezone(now, airportTz);
      if (localHour >= 6 && localHour <= 10) {
        const alreadySent = await checkFlightLog(supabase, flight.id, "morning_briefing", Infinity);
        if (!alreadySent) {
          const { title, body } = L.morningBriefing(flight.flight_code, departureTime ?? "?", originCode, destCode, statusLabel);
          await sendAndLogFlight(supabase, subs, flight.id, userId, "morning_briefing", { title, body, url: "/app" });
          notificationsSent++;
        }
      }
    }

    // B: Check-in 24h before
    if (hoursUntil !== null && hoursUntil >= 23 && hoursUntil <= 25) {
      const alreadySent = await checkFlightLog(supabase, flight.id, "checkin_24h", Infinity);
      if (!alreadySent) {
        const { title, body } = L.checkin24h(flight.flight_code, originCode, destCode, departureTime ?? "?");
        await sendAndLogFlight(supabase, subs, flight.id, userId, "checkin_24h", { title, body, url: "/app" });
        notificationsSent++;
      }
    }

    // C: Pre-flight alert 3h before (with airport status)
    if (hoursUntil !== null && hoursUntil >= 2.5 && hoursUntil <= 3.5) {
      const alreadySent = await checkFlightLog(supabase, flight.id, "preflight_3h", Infinity);
      if (!alreadySent) {
        const { title, body } = L.preflight3h(flight.flight_code, originCode, destCode, departureTime ?? "?", statusLabel);
        await sendAndLogFlight(supabase, subs, flight.id, userId, "preflight_3h", { title, body, url: "/app" });
        notificationsSent++;
      }
    }

    // D: Real-time flight status (2–4h before) — 1 API call per flight, ever
    if (hoursUntil !== null && hoursUntil >= 2 && hoursUntil <= 4 && rapidApiKey) {
      const alreadyFetched = await checkFlightLog(supabase, flight.id, "flight_status_fetched", Infinity);
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
            const { title, body } = L.flightCancelled(flight.flight_code, originCode, destCode);
            await sendAndLogFlight(supabase, subs, flight.id, userId, "flight_cancelled", { title, body, url: "/app" });
            notificationsSent++;
          } else if (flightStatus.delayMinutes >= 20) {
            const delayText = flightStatus.delayMinutes >= 60
              ? `${Math.floor(flightStatus.delayMinutes / 60)}h ${flightStatus.delayMinutes % 60}min`
              : `${flightStatus.delayMinutes} min`;
            const gateText = flightStatus.gate ? ` · ${locale === "es" ? "Puerta" : "Gate"} ${flightStatus.gate}` : "";
            const { title, body } = L.flightDelay(flight.flight_code, delayText, flightStatus.estimatedDeparture, departureTime ?? "?", gateText, originCode, destCode);
            await sendAndLogFlight(supabase, subs, flight.id, userId, "flight_delay_real", { title, body, url: "/app" });
            notificationsSent++;
          }
        }
      }
    }
  }

  // ── Hotel notifications ───────────────────────────────────────────────────
  const todayStr    = now.toISOString().slice(0, 10);
  const tomorrowISO = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const currentTime = now.toISOString().slice(11, 16); // "HH:MM" UTC
  const windowStart = new Date(now.getTime() - 30 * 60 * 1000).toISOString().slice(11, 16);

  const { data: hotelAccs } = await supabase
    .from("accommodations")
    .select("*, trips!inner(user_id)")
    .or(`check_in_date.eq.${todayStr},check_in_date.eq.${tomorrowISO},check_out_date.eq.${todayStr},check_out_date.eq.${tomorrowISO}`);

  for (const acc of (hotelAccs ?? []) as AccommodationRow[]) {
    const userId: string = acc.trips.user_id;
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId);
    if (!subs?.length) continue;

    const locale = await getUserLocale(userId);
    const L = CRON_LABELS[locale];

    // A: Check-in reminder (day before, if no specific time set)
    if (acc.check_in_date === tomorrowISO && !acc.check_in_time) {
      const alreadySent = await checkAccommodationLog(supabase, acc.id, "hotel_checkin_reminder");
      if (!alreadySent) {
        const { title, body } = L.hotelCheckinReminder(acc.name);
        await sendAndLogAccommodation(supabase, subs, acc.id, userId, "hotel_checkin_reminder", { title, body, url: "/app" });
        notificationsSent++;
      }
    }

    // B: Check-in time notification (today, at the exact check-in time ±30min)
    if (acc.check_in_date === todayStr && acc.check_in_time) {
      if (timeInWindow(acc.check_in_time, windowStart, currentTime)) {
        const alreadySent = await checkAccommodationLog(supabase, acc.id, "hotel_checkin_time");
        if (!alreadySent) {
          const { title, body } = L.hotelCheckinTime(acc.name, acc.check_in_time);
          await sendAndLogAccommodation(supabase, subs, acc.id, userId, "hotel_checkin_time", { title, body, url: "/app" });
          notificationsSent++;
        }
      }
    }

    // C: Check-out reminder (day before, if no specific time set)
    if (acc.check_out_date === tomorrowISO && !acc.check_out_time) {
      const alreadySent = await checkAccommodationLog(supabase, acc.id, "hotel_checkout_reminder");
      if (!alreadySent) {
        const { title, body } = L.hotelCheckoutReminder(acc.name);
        await sendAndLogAccommodation(supabase, subs, acc.id, userId, "hotel_checkout_reminder", { title, body, url: "/app" });
        notificationsSent++;
      }
    }

    // D: Check-out time notification (today, at the exact check-out time ±30min)
    if (acc.check_out_date === todayStr && acc.check_out_time) {
      if (timeInWindow(acc.check_out_time, windowStart, currentTime)) {
        const alreadySent = await checkAccommodationLog(supabase, acc.id, "hotel_checkout_time");
        if (!alreadySent) {
          const { title, body } = L.hotelCheckoutTime(acc.name, acc.check_out_time);
          await sendAndLogAccommodation(supabase, subs, acc.id, userId, "hotel_checkout_time", { title, body, url: "/app" });
          notificationsSent++;
        }
      }
    }
  }

  await supabase.from("cron_runs").insert({
    flights_processed: flights.length,
    notifications_sent: notificationsSent,
    errors: cronErrors,
    duration_ms: Date.now() - cronStart,
  });

  return Response.json({
    ok: true,
    processed: flights.length,
    sent: notificationsSent,
    errors: cronErrors.length,
  });
}

// ── Flight status API ──────────────────────────────────────────────────────

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
    const data = await res.json() as AeroDataBoxFlightLeg[];
    if (!Array.isArray(data) || data.length === 0) return null;

    const leg: AeroDataBoxFlightLeg = data[0];
    const cancelled = (leg.status ?? "") === "Cancelled";
    const delayMinutes: number = leg.departure?.delay ?? 0;
    const gate: string | null = leg.departure?.gate ?? null;
    const actualLocal: string | null = leg.departure?.actualTime?.local ?? null;
    const estimatedDeparture = actualLocal ? actualLocal.slice(11, 16) : null;

    return { delayMinutes, estimatedDeparture, gate, cancelled };
  } catch {
    return null;
  }
}

// ── Notification log helpers ───────────────────────────────────────────────

async function checkFlightLog(
  supabase: SupabaseClient,
  flightId: string,
  type: string,
  withinHours: number,
): Promise<boolean> {
  const cutoff = withinHours === Infinity
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

async function checkAccommodationLog(
  supabase: SupabaseClient,
  accommodationId: string,
  type: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("notification_log")
    .select("id")
    .eq("accommodation_id", accommodationId)
    .eq("type", type)
    .limit(1)
    .maybeSingle();

  return !!data;
}

async function sendAndLogFlight(
  supabase: SupabaseClient,
  subs: PushSubRow[],
  flightId: string,
  userId: string,
  type: string,
  notification: { title: string; body: string; url: string },
) {
  await pushToAll(subs, supabase, notification, type);
  await supabase.from("notification_log").insert({
    flight_id: flightId,
    user_id: userId,
    type,
    sent_at: new Date().toISOString(),
  });
}

async function sendAndLogAccommodation(
  supabase: SupabaseClient,
  subs: PushSubRow[],
  accommodationId: string,
  userId: string,
  type: string,
  notification: { title: string; body: string; url: string },
) {
  await pushToAll(subs, supabase, notification, type);
  await supabase.from("notification_log").insert({
    accommodation_id: accommodationId,
    user_id: userId,
    type,
    sent_at: new Date().toISOString(),
  });
}

async function pushToAll(
  subs: PushSubRow[],
  supabase: SupabaseClient,
  notification: { title: string; body: string; url: string },
  tag: string,
) {
  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ ...notification, tag }),
        );
      } catch (e: unknown) {
        const err = e as { statusCode?: number };
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    }),
  );
}

// ── Utility ────────────────────────────────────────────────────────────────

function formatDate(isoDate: string): string {
  const [, month, day] = isoDate.split("-");
  return `${day}/${month}`;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function timeInWindow(time: string, windowStart: string, windowEnd: string): boolean {
  const t = toMinutes(time);
  const s = toMinutes(windowStart);
  const e = toMinutes(windowEnd);
  if (s <= e) return t >= s && t <= e;
  return t >= s || t <= e; // crosses midnight
}
