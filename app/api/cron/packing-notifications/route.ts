import webpush from "web-push";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { AIRPORTS } from "@/lib/airports";
import { getPackingSuggestions } from "@/lib/packingEngine";
import { PushSubRow } from "@/lib/types";

export const dynamic = "force-dynamic";

// ── VAPID lazy init (same pattern as flight-notifications) ─────────────────

let vapidInitialized = false;
function initVapid() {
  if (vapidInitialized) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return;
  webpush.setVapidDetails(
    "mailto:support@tripcopilot.app",
    publicKey,
    privateKey,
  );
  vapidInitialized = true;
}

// ── Dedup: check notification_log for a given (flight_id, type) pair ───────

async function alreadyLogged(
  supabase: SupabaseClient,
  flightId: string,
  type: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("notification_log")
    .select("id")
    .eq("flight_id", flightId)
    .eq("type", type)
    .limit(1)
    .maybeSingle();
  return !!data;
}

// ── Push helper ────────────────────────────────────────────────────────────

async function pushToAll(
  supabase: SupabaseClient,
  subs: PushSubRow[],
  notification: { title: string; body: string; url: string },
  tag: string,
  userId: string,
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
          await supabase.from("failed_push_notifications").insert({
            user_id: userId,
            endpoint: sub.endpoint,
            payload: {
              subscription: { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              notification,
            },
            attempts: 1,
            last_attempted_at: new Date().toISOString(),
          });
        }
      }
    }),
  );
  return failed;
}

// ── Main handler ───────────────────────────────────────────────────────────

export async function GET(req: Request) {
  initVapid();

  // 1. Verify CRON_SECRET (Authorization: Bearer <secret>)
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const now = new Date();

  // 2. Find all flights departing in exactly 2 days (calendar days, UTC)
  // We look for iso_date = today + 2 days (UTC). Using a 1-day-wide window
  // (tomorrow = +2d ISO, dayAfter = +3d ISO) and filtering by iso_date strictly
  // equal to +2d lets us catch any timezone offset without a ±12h buffer trick
  // because packing notifications are low-frequency (once per flight, not time-of-day precise).
  const twoDaysISO = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const { data: flights, error } = await supabase
    .from("flights")
    .select(
      "id, trip_id, flight_code, destination_code, iso_date, trips!inner(user_id)",
    )
    .eq("segment_type", "flight")
    .eq("iso_date", twoDaysISO);

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  if (!flights?.length) {
    return Response.json({ ok: true, processed: 0, sent: 0 });
  }

  type FlightRow = {
    id: string;
    trip_id: string;
    flight_code: string;
    destination_code: string;
    iso_date: string;
    trips: { user_id: string };
  };

  const flightRows = flights as unknown as FlightRow[];

  // Cache user locales to avoid repeated auth admin calls
  const localeCache = new Map<string, "es" | "en">();
  async function getUserLocale(userId: string): Promise<"es" | "en"> {
    if (localeCache.has(userId)) return localeCache.get(userId)!;
    try {
      const { data } = await supabase.auth.admin.getUserById(userId);
      const raw = data?.user?.user_metadata?.locale as string | undefined;
      const locale: "es" | "en" = raw === "en" ? "en" : "es";
      localeCache.set(userId, locale);
      return locale;
    } catch {
      localeCache.set(userId, "es");
      return "es";
    }
  }

  let sent = 0;
  let failed = 0;

  for (const flight of flightRows) {
    try {
      const userId = flight.trips.user_id;
      const destCode = flight.destination_code;
      const notifType = `packing_${flight.id}`;

      // 3a. Dedup: skip if already sent
      const duplicate = await alreadyLogged(supabase, flight.id, notifType);
      if (duplicate) continue;

      // 3b. Get push subscriptions
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", userId);
      if (!subs?.length) continue;

      // 3c. Fetch destination weather from Open-Meteo
      const destInfo = AIRPORTS[destCode];
      if (!destInfo?.lat || !destInfo?.lng) continue;

      const weatherUrl =
        `https://api.open-meteo.com/v1/forecast?latitude=${destInfo.lat}&longitude=${destInfo.lng}` +
        `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code` +
        `&timezone=auto&start_date=${flight.iso_date}&end_date=${flight.iso_date}`;

      const weatherRes = await fetch(weatherUrl, { signal: AbortSignal.timeout(8000) });
      if (!weatherRes.ok) continue;

      const weatherData = await weatherRes.json() as {
        daily?: {
          temperature_2m_max?: number[];
          temperature_2m_min?: number[];
          precipitation_probability_max?: number[];
          weather_code?: number[];
        };
      };

      const daily = weatherData?.daily;
      if (!daily) continue;

      const tempMax = daily.temperature_2m_max?.[0] ?? 20;
      const tempMin = daily.temperature_2m_min?.[0] ?? 10;
      const precipProbability = daily.precipitation_probability_max?.[0] ?? 0;
      const weatherCode = daily.weather_code?.[0] ?? 0;

      // 3d. Generate packing suggestions
      const locale = await getUserLocale(userId);
      const suggestions = getPackingSuggestions(
        { tempMax, tempMin, precipProbability, weatherCode },
        locale,
      );

      // Top 3 items for the notification body
      const top3 = suggestions.slice(0, 3);
      const destCity = destInfo.city ?? destCode;

      const title =
        locale === "es"
          ? `🧳 ¡Hora de empacar para ${destCity}!`
          : `🧳 Time to pack for ${destCity}!`;
      const body = top3.map((s) => `${s.emoji} ${s.item}`).join(", ");

      // 3e. Send push notification
      const pushFailed = await pushToAll(
        supabase,
        subs as PushSubRow[],
        { title, body, url: "/app" },
        `packing_${flight.id}`,
        userId,
      );

      // 3f. Log to notification_log to prevent duplicates
      await supabase.from("notification_log").insert({
        flight_id: flight.id,
        user_id: userId,
        type: notifType,
        sent_at: new Date().toISOString(),
      });

      failed += pushFailed;
      sent++;
    } catch {
      // Continue processing remaining flights on individual errors
    }
  }

  return Response.json({ ok: true, processed: flightRows.length, sent, failed });
}
