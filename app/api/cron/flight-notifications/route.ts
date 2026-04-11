import webpush from "web-push";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { AIRPORTS } from "@/lib/airports";
import { parseAeroDataBox } from "@/lib/aerodatabox";
import { parseXML } from "@/lib/faa";
import { localToUTC, localHourInTimezone, dateInTimezone, CRON_LABELS, CronLocale } from "@/lib/cronUtils";
import { analyzeConnection } from "@/lib/connectionRisk";
import { TripFlight } from "@/lib/types";
import { sendInBatches } from "@/lib/retry";

type FlightRow = {
  id: string;
  trip_id: string;
  flight_code: string;
  airline_code: string;
  airline_name: string;
  airline_icao: string;
  flight_number: string;
  origin_code: string;
  destination_code: string;
  iso_date: string;
  departure_time: string | null;
  arrival_date: string | null;
  arrival_time: string | null;
  arrival_buffer: number;
  gate: string | null;
  wants_upgrade: boolean | null;
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
    scheduledTime?: { local?: string };
  };
  arrival?: {
    actualTime?: { local?: string };
    scheduledTime?: { local?: string };
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
  // UTC-based strings used only for the DB query window.
  // We widen by 12 h on each side so we never miss flights for users
  // whose local date differs from the UTC date (e.g. UTC-5 at 23:00 local
  // is UTC+1 the next day — a 12 h buffer covers UTC±12 completely).
  const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
  const todayISO = new Date(now.getTime() - TWELVE_HOURS_MS).toISOString().slice(0, 10);
  const threeDaysISO = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 + TWELVE_HOURS_MS)
    .toISOString()
    .slice(0, 10);

  // Get all flights departing in the next 3 days, with their user_id via trip
  const { data: flights, error } = await supabase
    .from("flights")
    .select("id, trip_id, flight_code, airline_code, airline_name, airline_icao, flight_number, origin_code, destination_code, iso_date, departure_time, arrival_date, arrival_time, arrival_buffer, gate, wants_upgrade, trips!inner(user_id)")
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

  const flightRows = flights as unknown as FlightRow[];

  // Collect unique origin airports
  const uniqueAirports = Array.from(
    new Set(flightRows.map((f) => f.origin_code)),
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
  let notificationsFailed = 0;

  async function processFlightRow(flight: FlightRow): Promise<void> {
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

    // Allow recently-departed flights through for landing check (up to 18h past departure)
    // but skip everything else if departure was in the past
    const isPastDeparture = hoursUntil !== null && hoursUntil < 0;
    const isRecentlyDeparted = isPastDeparture && hoursUntil !== null && hoursUntil >= -18;

    if (isPastDeparture && !isRecentlyDeparted) return;

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId);

    if (!subs?.length) return;

    const locale = await getUserLocale(userId);
    const L = CRON_LABELS[locale];

    // A1: Landing notification — flight departed in the past, check if it has arrived
    if (isRecentlyDeparted) {
      const alreadySent = await checkFlightLog(supabase, flight.id, "flight_landed", Infinity);
      if (!alreadySent) {
        const landingStatus = await fetchFlightStatus(flight.flight_code, isoDate, rapidApiKey, Math.floor((departureDateTime?.getTime() ?? 0) / 1000), AIRPORTS[flight.origin_code]?.icao ?? null);
        if (landingStatus?.landed) {
          const { title, body } = L.flightLanded(flight.flight_code, originCode, destCode);
          notificationsFailed += await sendAndLogFlight(supabase, subs, flight.id, userId, "flight_landed", { title, body, url: "/app" });
          notificationsSent++;
        }
      }
      return;
    }

    const airportStatus = statusMap[originCode] ?? "ok";
    const statusLabel = L.statusLabel[airportStatus] ?? L.statusLabel["ok"];

    // A: Delay / closure alert (up to 3 days before)
    if (ALERT_STATUSES.has(airportStatus)) {
      const alreadySent = await checkFlightLog(supabase, flight.id, `delay_${airportStatus}`, 20);
      if (!alreadySent) {
        const { title, body } = L.delayAlert(originCode, flight.flight_code, destCode, formatDate(isoDate), statusLabel);
        notificationsFailed += await sendAndLogFlight(supabase, subs, flight.id, userId, `delay_${airportStatus}`, { title, body, url: "/app" });
        notificationsSent++;
      }
    }

    // A2: Morning briefing — fires when it's 6–10 AM at the origin airport.
    // Use the airport's local date (not UTC date) to decide "today".
    const todayInAirportTz    = dateInTimezone(now, airportTz);
    const tomorrowInAirportTz = dateInTimezone(new Date(now.getTime() + 24 * 60 * 60 * 1000), airportTz);
    if (isoDate === todayInAirportTz && hoursUntil !== null && hoursUntil > 3) {
      const localHour = localHourInTimezone(now, airportTz);
      if (localHour >= 6 && localHour <= 10) {
        const alreadySent = await checkFlightLog(supabase, flight.id, "morning_briefing", Infinity);
        if (!alreadySent) {
          const { title, body } = L.morningBriefing(flight.flight_code, departureTime ?? "?", originCode, destCode, statusLabel);
          notificationsFailed += await sendAndLogFlight(supabase, subs, flight.id, userId, "morning_briefing", { title, body, url: "/app" });
          notificationsSent++;
        }
      }
    }

    // B: Check-in reminder — flight is tomorrow in the airport's local timezone
    if (isoDate === tomorrowInAirportTz) {
      const alreadySent = await checkFlightLog(supabase, flight.id, "checkin_24h", Infinity);
      if (!alreadySent) {
        const { title, body } = L.checkin24h(flight.flight_code, originCode, destCode, departureTime ?? "?");
        notificationsFailed += await sendAndLogFlight(supabase, subs, flight.id, userId, "checkin_24h", { title, body, url: "/app" });
        notificationsSent++;
      }
    }

    // C: Pre-flight alert 3h before (with airport status)
    if (hoursUntil !== null && hoursUntil >= 2.5 && hoursUntil <= 3.5) {
      const alreadySent = await checkFlightLog(supabase, flight.id, "preflight_3h", Infinity);
      if (!alreadySent) {
        const { title, body } = L.preflight3h(flight.flight_code, originCode, destCode, departureTime ?? "?", statusLabel);
        notificationsFailed += await sendAndLogFlight(supabase, subs, flight.id, userId, "preflight_3h", { title, body, url: "/app" });
        notificationsSent++;
      }
    }

    // D: Real-time flight status — re-checks every 90 min within 1–8h of scheduled departure.
    // Window is wide (8h) to catch delays announced hours before departure.
    // Uses bracket-based dedup so users get notified again when delay worsens significantly.
    if (hoursUntil !== null && hoursUntil >= 1 && hoursUntil <= 8) {
      // Re-check every 90 minutes (not one-shot) so delays discovered after the first check are caught
      const alreadyFetched = await checkFlightLog(supabase, flight.id, "flight_status_fetched", 1.5);
      if (!alreadyFetched) {
        // Log immediately so parallel cron runs don't double-fetch within the same 90-min window
        await supabase.from("notification_log").insert({
          flight_id: flight.id,
          user_id: userId,
          type: "flight_status_fetched",
          sent_at: new Date().toISOString(),
        });

        const flightStatus = await fetchFlightStatus(flight.flight_code, isoDate, rapidApiKey, Math.floor((departureDateTime?.getTime() ?? 0) / 1000), AIRPORTS[flight.origin_code]?.icao ?? null);
        if (flightStatus) {
          if (flightStatus.cancelled) {
            const { title, body } = L.flightCancelled(flight.flight_code, originCode, destCode);
            notificationsFailed += await sendAndLogFlight(supabase, subs, flight.id, userId, "flight_cancelled", { title, body, url: "/app" });
            notificationsSent++;
          } else if (flightStatus.delayMinutes >= 20) {
            const delayText = flightStatus.delayMinutes >= 60
              ? `${Math.floor(flightStatus.delayMinutes / 60)}h ${flightStatus.delayMinutes % 60}min`
              : `${flightStatus.delayMinutes} min`;
            const gateText = flightStatus.gate ? ` · ${locale === "es" ? "Puerta" : "Gate"} ${flightStatus.gate}` : "";
            // Bracket-based dedup: notify once per bracket (20–59 min, 60–119 min, 120+ min)
            // This ensures users are re-notified if the delay increases significantly
            const delayBracket = flightStatus.delayMinutes >= 120 ? "120" : flightStatus.delayMinutes >= 60 ? "60" : "20";
            const alreadySentDelay = await checkFlightLog(supabase, flight.id, `flight_delay_real_${delayBracket}`, Infinity);
            if (!alreadySentDelay) {
              const { title, body } = L.flightDelay(flight.flight_code, delayText, flightStatus.estimatedDeparture, departureTime ?? "?", gateText, originCode, destCode, flightStatus.delayMinutes);
              notificationsFailed += await sendAndLogFlight(supabase, subs, flight.id, userId, `flight_delay_real_${delayBracket}`, { title, body, url: "/app" });
              notificationsSent++;

              // Persist actual delayed departure time to DB so UI shows correct time without live data
              if (flight.departure_time) {
                const [dh, dm] = flight.departure_time.split(":").map(Number);
                const totalMin = dh * 60 + dm + flightStatus.delayMinutes;
                const ah = Math.floor(totalMin / 60) % 24;
                const am = totalMin % 60;
                const actualDepTime = `${String(ah).padStart(2, "0")}:${String(am).padStart(2, "0")}`;
                await supabase
                  .from("flights")
                  .update({ departure_time: actualDepTime })
                  .eq("id", flight.id);
                // Also update the in-memory object so processCountdown (which
                // runs after processFlightRow on the same FlightRow reference)
                // computes the countdown against the actual delayed time, not
                // the stale scheduled time.
                flight.departure_time = actualDepTime;
              }
            }

            // A6: Connection rescue — check if this delay impacts the next flight in the trip
            {
              const tripId: string = flight.trip_id;
              // Find next flight in same trip (chronologically after this one)
              const nextFlight = flightRows.find((f) =>
                f.trip_id === tripId &&
                f.id !== flight.id &&
                (f.iso_date > isoDate ||
                  (f.iso_date === isoDate && (f.departure_time ?? "") > (departureTime ?? ""))),
              );

              if (nextFlight) {
                // Build minimal TripFlight objects for analyzeConnection
                const delayedTripFlight: TripFlight = {
                  id:              flight.id,
                  flightCode:      flight.flight_code,
                  airlineCode:     flight.airline_code,
                  airlineName:     flight.airline_name,
                  airlineIcao:     flight.airline_icao,
                  flightNumber:    flight.flight_number,
                  originCode:      originCode,
                  destinationCode: destCode,
                  isoDate:         isoDate,
                  departureTime:   departureTime ?? "",
                  arrivalBuffer:   flight.arrival_buffer ?? 2,
                };
                const nextTripFlight: TripFlight = {
                  id:              nextFlight.id,
                  flightCode:      nextFlight.flight_code,
                  airlineCode:     nextFlight.airline_code,
                  airlineName:     nextFlight.airline_name,
                  airlineIcao:     nextFlight.airline_icao,
                  flightNumber:    nextFlight.flight_number,
                  originCode:      nextFlight.origin_code,
                  destinationCode: nextFlight.destination_code,
                  isoDate:         nextFlight.iso_date,
                  departureTime:   nextFlight.departure_time ?? "",
                  arrivalBuffer:   nextFlight.arrival_buffer ?? 2,
                };

                const connAnalysis = analyzeConnection(delayedTripFlight, nextTripFlight, {});
                if (connAnalysis && (connAnalysis.risk === "at_risk" || connAnalysis.risk === "missed")) {
                  const alreadySentConn = await checkFlightLog(supabase, flight.id, "connection_rescue", 20);
                  if (!alreadySentConn) {
                    const connTitle = locale === "es"
                      ? `⚠️ Conexión en riesgo — ${nextFlight.flight_code}`
                      : `⚠️ Connection at risk — ${nextFlight.flight_code}`;
                    const connBody = locale === "es"
                      ? "El delay afecta tu conexión. Avisá a la tripulación al aterrizar."
                      : "The delay impacts your connection. Alert the crew when landing.";
                    notificationsFailed += await sendAndLogFlight(supabase, subs, flight.id, userId, "connection_rescue", { title: connTitle, body: connBody, url: "/app" });
                    notificationsSent++;
                  }
                }
              }
            }
          }

          // Gate change detection (piggybacks on already-fetched flightStatus)
          if (flightStatus.gate && flightStatus.gate !== flight.gate) {
            const alreadyAlerted = await checkFlightLog(supabase, flight.id, "gate_change", 4);
            if (!alreadyAlerted) {
              const { title, body } = L.gateChange(
                flight.flight_code,
                flightStatus.gate,
                flight.gate,
                flight.origin_code,
                flight.destination_code,
              );
              const url = `/trips/${flight.trip_id}`;
              notificationsFailed += await sendAndLogFlight(supabase, subs, flight.id, userId, "gate_change", { title, body, url });
              notificationsSent++;
            }
          }
          // Always persist the latest gate (regardless of change or notification)
          if (flightStatus.gate) {
            await supabase.from("flights").update({ gate: flightStatus.gate }).eq("id", flight.id);
          }
        }
      }
    }

    // E: Boarding open — roughly 24–36 minutes before departure
    if (hoursUntil !== null && hoursUntil >= 0.4 && hoursUntil <= 0.6) {
      const alreadySent = await checkFlightLog(supabase, flight.id, "boarding_open", Infinity);
      if (!alreadySent) {
        const boardingStatus = await fetchFlightStatus(flight.flight_code, isoDate, rapidApiKey, Math.floor((departureDateTime?.getTime() ?? 0) / 1000), AIRPORTS[flight.origin_code]?.icao ?? null);
        if (boardingStatus && !boardingStatus.cancelled && !boardingStatus.landed) {
          const gateText = boardingStatus.gate ? ` — ${locale === "es" ? "Puerta" : "Gate"} ${boardingStatus.gate}` : "";
          const { title, body } = L.boardingOpen(flight.flight_code, originCode, destCode, gateText);
          notificationsFailed += await sendAndLogFlight(supabase, subs, flight.id, userId, "boarding_open", { title, body, url: "/app" });
          notificationsSent++;

          // Gate change check (piggyback on already-fetched boardingStatus)
          if (boardingStatus.gate && boardingStatus.gate !== flight.gate) {
            const alreadyAlerted = await checkFlightLog(supabase, flight.id, "gate_change", 4);
            if (!alreadyAlerted) {
              const { title: gTitle, body: gBody } = L.gateChange(
                flight.flight_code,
                boardingStatus.gate,
                flight.gate,
                flight.origin_code,
                flight.destination_code,
              );
              const url = `/trips/${flight.trip_id}`;
              notificationsFailed += await sendAndLogFlight(supabase, subs, flight.id, userId, "gate_change", { title: gTitle, body: gBody, url });
              notificationsSent++;
            }
          }
          if (boardingStatus.gate) {
            await supabase.from("flights").update({ gate: boardingStatus.gate }).eq("id", flight.id);
          }
        }
      } else {
        // boarding_open already sent — only fetch if gate_change alert hasn't been sent recently
        const gateChangeAlreadyAlerted = await checkFlightLog(supabase, flight.id, "gate_change", 4);
        if (!gateChangeAlreadyAlerted) {
          const boardingStatus = await fetchFlightStatus(flight.flight_code, isoDate, rapidApiKey, Math.floor((departureDateTime?.getTime() ?? 0) / 1000), AIRPORTS[flight.origin_code]?.icao ?? null);
          if (boardingStatus?.gate && boardingStatus.gate !== flight.gate) {
            const { title, body } = L.gateChange(
              flight.flight_code,
              boardingStatus.gate,
              flight.gate,
              flight.origin_code,
              flight.destination_code,
            );
            const url = `/trips/${flight.trip_id}`;
            notificationsFailed += await sendAndLogFlight(supabase, subs, flight.id, userId, "gate_change", { title, body, url });
            notificationsSent++;
          }
          if (boardingStatus?.gate) {
            await supabase.from("flights").update({ gate: boardingStatus.gate }).eq("id", flight.id);
          }
        }
      }
    }
    // A7: Seat upgrade reminder — fires when wants_upgrade is true and flight departs in 2–5h today
    if (
      flight.wants_upgrade === true &&
      isoDate === todayISO &&
      hoursUntil !== null &&
      hoursUntil >= 2 &&
      hoursUntil <= 5
    ) {
      const alreadySent = await checkFlightLog(supabase, flight.id, "upgrade_reminder", Infinity);
      if (!alreadySent) {
        const title = locale === "es"
          ? "⬆️ Buen momento para pedir upgrade"
          : "⬆️ Good time to request an upgrade";
        const body = locale === "es"
          ? `Quedan ~3h para tu vuelo ${flight.flight_code}. En el mostrador de ${flight.airline_name} a veces asignan upgrades gratuitos.`
          : `~3h left for ${flight.flight_code}. Check with ${flight.airline_name} at the gate — they sometimes assign free upgrades.`;
        notificationsFailed += await sendAndLogFlight(supabase, subs, flight.id, userId, "upgrade_reminder", { title, body, url: "/app" });
        notificationsSent++;
      }
    }
  }

  await sendInBatches(flightRows, processFlightRow, 10);

  // ── A5: Weather alert at destination (1–3 days before arrival) ───────────
  async function processWeatherAlert(flight: FlightRow): Promise<void> {
    const userId: string = flight.trips.user_id;
    const isoDate: string = flight.iso_date;
    const destCode: string = flight.destination_code;

    const todayMidnight = new Date(todayISO + "T00:00:00").getTime();
    const flightMidnight = new Date(isoDate + "T00:00:00").getTime();
    const daysUntilFlight = Math.ceil((flightMidnight - todayMidnight) / (1000 * 60 * 60 * 24));

    if (daysUntilFlight < 1 || daysUntilFlight > 3) return;

    const destInfo = AIRPORTS[destCode];
    if (!destInfo?.lat || !destInfo?.lng) return;

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId);
    if (!subs?.length) return;

    const alreadySent = await checkFlightLog(supabase, flight.id, `weather_alert_destination_${isoDate}`, Infinity);
    if (alreadySent) return;

    try {
      const weatherUrl =
        `https://api.open-meteo.com/v1/forecast?latitude=${destInfo.lat}&longitude=${destInfo.lng}` +
        `&daily=weather_code&timezone=auto&start_date=${isoDate}&end_date=${isoDate}`;
      const weatherRes = await fetch(weatherUrl, { signal: AbortSignal.timeout(8000) });
      if (!weatherRes.ok) return;
      const weatherData = await weatherRes.json() as { daily?: { weather_code?: number[] } };
      const wmoCode = weatherData?.daily?.weather_code?.[0] ?? 0;

      if (wmoCode >= 65) {
        const locale = await getUserLocale(userId);
        const destCity = destInfo.city ?? destCode;
        const [, month, day] = isoDate.split("-");
        const dateStr = `${day}/${month}`;
        const title = locale === "es"
          ? `🌧 Mal tiempo en ${destCity} el ${dateStr}`
          : `🌧 Bad weather in ${destCity} on ${dateStr}`;
        const body = locale === "es"
          ? "Llevá paraguas / ropa de abrigo"
          : "Bring an umbrella / warm clothes";
        notificationsFailed += await sendAndLogFlight(supabase, subs, flight.id, userId, `weather_alert_destination_${isoDate}`, { title, body, url: "/app" });
        notificationsSent++;
      }
    } catch (e) {
      cronErrors.push(`Weather alert ${destCode}: ${String(e)}`);
    }
  }

  await sendInBatches(flightRows, processWeatherAlert, 10);

  // ── Flight countdown push (lock screen) ──────────────────────────────────
  // Sends a push with tag "flight_countdown" every cron run when a flight is
  // 30 min–4 h away. The shared tag means the browser replaces the previous
  // countdown notification rather than stacking them.
  async function processCountdown(flight: FlightRow): Promise<void> {
    const userId: string = flight.trips.user_id;
    const departureTime: string | null = flight.departure_time;
    const isoDate: string = flight.iso_date;
    const originCode: string = flight.origin_code;
    const destCode: string = flight.destination_code;
    const flightCode: string = flight.flight_code;

    if (!departureTime) return;

    const airportTz = AIRPORTS[originCode]?.timezone ?? "UTC";
    let departureDateTime: Date | null = null;
    try {
      departureDateTime = localToUTC(isoDate, departureTime, airportTz);
    } catch {
      return;
    }

    const hoursUntil = (departureDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntil < 0.5 || hoursUntil > 4) return;

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId);

    if (!subs?.length) return;

    const locale = await getUserLocale(userId);

    const minsLeft = Math.round((departureDateTime.getTime() - now.getTime()) / 60000);
    const formatted =
      minsLeft >= 60
        ? `${Math.floor(minsLeft / 60)}h ${minsLeft % 60}min`
        : `${minsLeft}min`;

    const title =
      locale === "es"
        ? `${flightCode} · Sale en ${formatted}`
        : `${flightCode} · Departs in ${formatted}`;
    const body = `${originCode} → ${destCode}`;

    const failed = await pushToAll(subs, supabase, { title, body, url: "/app" }, "flight_countdown");
    notificationsSent++;
    notificationsFailed += failed;
  }

  await sendInBatches(flightRows, processCountdown, 10);

  // ── Hotel notifications ───────────────────────────────────────────────────
  const todayStr    = now.toISOString().slice(0, 10);
  const tomorrowISO = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const currentTime = now.toISOString().slice(11, 16); // "HH:MM" UTC
  const windowStart = new Date(now.getTime() - 30 * 60 * 1000).toISOString().slice(11, 16);

  const { data: hotelAccs } = await supabase
    .from("accommodations")
    .select("*, trips!inner(user_id)")
    .or(`check_in_date.eq.${todayStr},check_in_date.eq.${tomorrowISO},check_out_date.eq.${todayStr},check_out_date.eq.${tomorrowISO}`);

  async function processAccommodation(acc: AccommodationRow): Promise<void> {
    const userId: string = acc.trips.user_id;
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId);
    if (!subs?.length) return;

    const locale = await getUserLocale(userId);
    const L = CRON_LABELS[locale];

    // A: Check-in reminder (day before, if no specific time set)
    if (acc.check_in_date === tomorrowISO && !acc.check_in_time) {
      const alreadySent = await checkAccommodationLog(supabase, acc.id, "hotel_checkin_reminder");
      if (!alreadySent) {
        const { title, body } = L.hotelCheckinReminder(acc.name);
        notificationsFailed += await sendAndLogAccommodation(supabase, subs, acc.id, userId, "hotel_checkin_reminder", { title, body, url: "/app" });
        notificationsSent++;
      }
    }

    // B: Check-in time notification (today, at the exact check-in time ±30min)
    if (acc.check_in_date === todayStr && acc.check_in_time) {
      if (timeInWindow(acc.check_in_time, windowStart, currentTime)) {
        const alreadySent = await checkAccommodationLog(supabase, acc.id, "hotel_checkin_time");
        if (!alreadySent) {
          const { title, body } = L.hotelCheckinTime(acc.name, acc.check_in_time);
          notificationsFailed += await sendAndLogAccommodation(supabase, subs, acc.id, userId, "hotel_checkin_time", { title, body, url: "/app" });
          notificationsSent++;
        }
      }
    }

    // C: Check-out reminder (day before, if no specific time set)
    if (acc.check_out_date === tomorrowISO && !acc.check_out_time) {
      const alreadySent = await checkAccommodationLog(supabase, acc.id, "hotel_checkout_reminder");
      if (!alreadySent) {
        const { title, body } = L.hotelCheckoutReminder(acc.name);
        notificationsFailed += await sendAndLogAccommodation(supabase, subs, acc.id, userId, "hotel_checkout_reminder", { title, body, url: "/app" });
        notificationsSent++;
      }
    }

    // D: Check-out time notification (today, at the exact check-out time ±30min)
    if (acc.check_out_date === todayStr && acc.check_out_time) {
      if (timeInWindow(acc.check_out_time, windowStart, currentTime)) {
        const alreadySent = await checkAccommodationLog(supabase, acc.id, "hotel_checkout_time");
        if (!alreadySent) {
          const { title, body } = L.hotelCheckoutTime(acc.name, acc.check_out_time);
          notificationsFailed += await sendAndLogAccommodation(supabase, subs, acc.id, userId, "hotel_checkout_time", { title, body, url: "/app" });
          notificationsSent++;
        }
      }
    }
  }

  {
    await sendInBatches(
      (hotelAccs ?? []) as AccommodationRow[],
      processAccommodation,
      10,
    );
  }

  // ── Price alert reminders ──────────────────────────────────────────────────
  const sixMonthsISO = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const { data: priceAlerts } = await supabase
    .from("price_alerts")
    .select("id, user_id, origin_code, destination_code, target_date")
    .eq("is_active", true)
    .gte("target_date", todayISO)
    .lte("target_date", sixMonthsISO);

  type PriceAlertRow = {
    id: string;
    user_id: string;
    origin_code: string;
    destination_code: string;
    target_date: string;
  };

  if (priceAlerts?.length) {
    const processPriceAlert = async (alert: PriceAlertRow): Promise<void> => {
      const targetMs  = new Date(alert.target_date + "T00:00:00").getTime();
      const todayMs   = new Date(todayISO + "T00:00:00").getTime();
      const daysLeft  = Math.round((targetMs - todayMs) / (1000 * 60 * 60 * 24));

      const triggerDays = [90, 30, 7] as const;
      const matched = triggerDays.find((d) => daysLeft === d);
      if (!matched) return;

      const tag = `price_alert_${alert.id}_${matched}d`;

      // Check notification_log to avoid duplicates (re-use flight log helper pattern)
      const { data: existing } = await supabase
        .from("notification_log")
        .select("id")
        .eq("type", tag)
        .eq("user_id", alert.user_id)
        .gte("sent_at", new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString())
        .limit(1)
        .maybeSingle();

      if (existing) return;

      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", alert.user_id);

      if (!subs?.length) return;

      const locale = await getUserLocale(alert.user_id);
      const route = `${alert.origin_code}→${alert.destination_code}`;

      let title: string;
      let body: string;

      if (matched === 90) {
        title = locale === "es"
          ? `Buen momento para buscar vuelos ${route}`
          : `Good time to search for ${route} flights`;
        body = locale === "es"
          ? "Los precios suelen estar buenos ~90 días antes. Revisá ahora."
          : "Prices are usually good ~90 days out. Check now.";
      } else if (matched === 30) {
        title = locale === "es"
          ? `Los precios de ${route} suelen subir pronto`
          : `${route} prices tend to rise soon`;
        body = locale === "es"
          ? "Faltan 30 días para tu mes objetivo. Revisá antes de que suban."
          : "30 days to your target month. Check before prices go up.";
      } else {
        title = locale === "es"
          ? `Últimos días para conseguir buen precio ${route}`
          : `Last days for a good price on ${route}`;
        body = locale === "es"
          ? "Tu mes objetivo está a solo 7 días. Última oportunidad."
          : "Your target month is just 7 days away. Last chance.";
      }

      notificationsFailed += await pushToAll(subs, supabase, { title, body, url: "/app" }, tag);
      notificationsSent++;

      await supabase.from("notification_log").insert({
        user_id:  alert.user_id,
        type:     tag,
        sent_at:  new Date().toISOString(),
      });
    }

    await sendInBatches(priceAlerts as PriceAlertRow[], processPriceAlert, 10);
  }

  // ── Weekly Morning Briefing (flights in next 14 days) ─────────────────────
  // Runs once per week per user. Deduplication via notification_log with key
  // "weekly_briefing_YYYY-WW" so the same user only gets it once that week.
  {
    const isoWeek = (() => {
      const d = new Date(now);
      d.setUTCHours(0, 0, 0, 0);
      d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
      return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
    })();

    // Only on Monday (UTC day 1) to avoid spamming every cron run
    if (now.getUTCDay() === 1) {
      const fourteenDaysISO = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);

      const { data: upcomingFlights } = await supabase
        .from("flights")
        .select("trip_id, flight_code, origin_code, destination_code, iso_date, trips!inner(user_id)")
        .gt("iso_date", todayISO)
        .lte("iso_date", fourteenDaysISO);

      if (upcomingFlights?.length) {
        // Group by user_id
        type UpcomingRow = { trip_id: string; flight_code: string; origin_code: string; destination_code: string; iso_date: string; trips: { user_id: string } };
        const byUser = new Map<string, UpcomingRow[]>();
        for (const f of upcomingFlights as unknown as UpcomingRow[]) {
          const uid = f.trips.user_id;
          if (!byUser.has(uid)) byUser.set(uid, []);
          byUser.get(uid)!.push(f);
        }

        for (const [userId, userFlights] of Array.from(byUser)) {
          const briefingType = `weekly_briefing_${isoWeek}`;

          // Deduplicate: skip if already sent this week
          const { data: existing } = await supabase
            .from("notification_log")
            .select("id")
            .eq("user_id", userId)
            .eq("type", briefingType)
            .limit(1)
            .maybeSingle();
          if (existing) continue;

          const { data: subs } = await supabase
            .from("push_subscriptions")
            .select("endpoint, p256dh, auth")
            .eq("user_id", userId);
          if (!subs?.length) continue;

          const userLocale = await getUserLocale(userId);
          const count = userFlights.length;
          const next = userFlights.sort((a: UpcomingRow, b: UpcomingRow) => a.iso_date.localeCompare(b.iso_date))[0];
          const [, nextMonth, nextDay] = next.iso_date.split("-");

          const title = userLocale === "es"
            ? `☀️ Tus próximos vuelos esta semana`
            : `☀️ Your upcoming flights this week`;
          const body = userLocale === "es"
            ? `Tenés ${count} vuelo${count !== 1 ? "s" : ""} en los próximos 14 días. Próximo: ${next.flight_code} ${next.origin_code}→${next.destination_code} el ${nextDay}/${nextMonth}.`
            : `You have ${count} flight${count !== 1 ? "s" : ""} in the next 14 days. Next: ${next.flight_code} ${next.origin_code}→${next.destination_code} on ${nextMonth}/${nextDay}.`;

          const failed = await pushToAll(subs, supabase, { title, body, url: "/app" }, briefingType);
          notificationsSent++;
          notificationsFailed += failed;

          await supabase.from("notification_log").insert({
            user_id: userId,
            type: briefingType,
            sent_at: new Date().toISOString(),
          });
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
    failed: notificationsFailed,
    errors: cronErrors.length,
  });
}

// ── Flight status API ──────────────────────────────────────────────────────

type FlightStatusResult = {
  delayMinutes: number;
  estimatedDeparture: string | null;
  gate: string | null;
  cancelled: boolean;
  landed: boolean;
};

async function fetchFlightStatusFromAeroDataBox(
  flightCode: string,
  isoDate: string,
  rapidApiKey: string,
): Promise<FlightStatusResult | null> {
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
    const status = leg.status ?? "";
    const cancelled = status === "Cancelled";
    const landed = status === "Arrived" || status === "Landed";
    const delayMinutes: number = leg.departure?.delay ?? 0;
    const gate: string | null = leg.departure?.gate ?? null;
    const actualLocal: string | null = leg.departure?.actualTime?.local ?? null;
    const estimatedDeparture = actualLocal ? actualLocal.slice(11, 16) : null;

    return { delayMinutes, estimatedDeparture, gate, cancelled, landed };
  } catch {
    return null;
  }
}

async function fetchFlightStatusFromAviationStack(
  flightCode: string,
  isoDate: string,
): Promise<FlightStatusResult | null> {
  const apiKey = process.env.AVIATIONSTACK_API_KEY;
  if (!apiKey) return null;
  try {
    const params = new URLSearchParams({
      access_key: apiKey,
      flight_iata: flightCode,
      flight_date: isoDate,
      limit: "1",
    });
    const res = await fetch(`http://api.aviationstack.com/v1/flights?${params}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const json = await res.json() as { data?: Array<{
      flight_status?: string;
      departure?: { delay?: number; estimated?: string; actual?: string; gate?: string };
    }> };
    const raw = json.data?.[0];
    if (!raw) return null;

    const st = raw.flight_status ?? "";
    const cancelled = st === "cancelled";
    const landed    = st === "landed";
    const delayMinutes = typeof raw.departure?.delay === "number" ? raw.departure.delay : 0;
    const gate: string | null = raw.departure?.gate ?? null;
    // AviationStack returns ISO strings — extract HH:MM
    const actualOrEst = raw.departure?.actual ?? raw.departure?.estimated ?? null;
    const estimatedDeparture = actualOrEst ? actualOrEst.slice(11, 16) : null;

    return { delayMinutes, estimatedDeparture, gate, cancelled, landed };
  } catch {
    return null;
  }
}

async function fetchFlightStatusFromOpenSky(
  flightCode: string,
  isoDate: string,
  originIcao: string,
  scheduledUnix: number,
): Promise<FlightStatusResult | null> {
  try {
    const dayStart = Math.floor(new Date(isoDate + "T00:00:00Z").getTime() / 1000);
    const dayEnd = dayStart + 86400;
    const res = await fetch(
      `https://opensky-network.org/api/flights/departure?airport=${originIcao}&begin=${dayStart}&end=${dayEnd}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const flights: Array<{ callsign: string; firstSeen: number }> = await res.json();
    const numericSuffix = flightCode.replace(/^[A-Z]+/, "");
    const match = flights.find((f) => f.callsign?.trim().endsWith(numericSuffix));
    if (!match) return null;
    const delayMinutes = scheduledUnix > 0
      ? Math.max(0, Math.round((match.firstSeen - scheduledUnix) / 60))
      : 0;
    return {
      delayMinutes,
      estimatedDeparture: new Date(match.firstSeen * 1000).toISOString().slice(11, 16),
      gate: null,
      cancelled: false,
      landed: false,
    };
  } catch {
    return null;
  }
}

async function fetchFlightStatus(
  flightCode: string,
  isoDate: string,
  rapidApiKey: string | undefined,
  scheduledUnix: number,
  originIcao: string | null,
): Promise<FlightStatusResult | null> {
  // Try AeroDataBox first (better delay data); fall back to AviationStack
  const adb = rapidApiKey ? await fetchFlightStatusFromAeroDataBox(flightCode, isoDate, rapidApiKey) : null;
  if (adb !== null) return adb;

  console.warn(`[cron] AeroDataBox failed for ${flightCode}, trying AviationStack…`);
  const avs = await fetchFlightStatusFromAviationStack(flightCode, isoDate);
  if (avs !== null) return avs;

  // Fallback 3: OpenSky Network
  if (originIcao) {
    console.warn(`[cron] AviationStack failed for ${flightCode}, trying OpenSky…`);
    return fetchFlightStatusFromOpenSky(flightCode, isoDate, originIcao, scheduledUnix);
  }
  return null;
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
): Promise<number> {
  const failed = await pushToAll(subs, supabase, notification, type);
  await supabase.from("notification_log").insert({
    flight_id: flightId,
    user_id: userId,
    type,
    sent_at: new Date().toISOString(),
  });
  return failed;
}

async function sendAndLogAccommodation(
  supabase: SupabaseClient,
  subs: PushSubRow[],
  accommodationId: string,
  userId: string,
  type: string,
  notification: { title: string; body: string; url: string },
): Promise<number> {
  const failed = await pushToAll(subs, supabase, notification, type);
  await supabase.from("notification_log").insert({
    accommodation_id: accommodationId,
    user_id: userId,
    type,
    sent_at: new Date().toISOString(),
  });
  return failed;
}

async function pushToAll(
  subs: PushSubRow[],
  supabase: SupabaseClient,
  notification: { title: string; body: string; url: string },
  tag: string,
): Promise<number> {
  let failed = 0;
  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ ...notification, tag }),
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        } else {
          failed++;
        }
      }
    }),
  );
  return failed;
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
