import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { AIRPORTS } from "@/lib/airports";
import { CRON_LABELS, CronLocale } from "@/lib/cronUtils";

// FlightAware pushes events for alerts registered via POST /alerts.
interface FAWebhookPayload {
  alert_id?: number;
  event_type?: string; // "departure" | "arrival" | "diverted" | "cancelled" | "filed"
  flight?: {
    ident?: string;
    ident_iata?: string;
    fa_flight_id?: string;
    status?: string;
    cancelled?: boolean;
    diverted?: boolean;
    departure_delay?: number; // seconds
    arrival_delay?: number;   // seconds
    gate_origin?: string;
    terminal_origin?: string;
    estimated_out?: string;
    actual_out?: string;
    scheduled_out?: string;
  };
}

webpush.setVapidDetails(
  "mailto:support@tripcopilot.app",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const secret = process.env.FLIGHTAWARE_WEBHOOK_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error("[fa-webhook] FLIGHTAWARE_WEBHOOK_SECRET is not configured");
      return Response.json({ error: "Webhook not configured" }, { status: 503 });
    }
    // In development without a secret, skip verification
  } else {
    if (token !== secret) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let payload: FAWebhookPayload;
  try {
    payload = (await request.json()) as FAWebhookPayload;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  return handlePayload(payload);
}

async function handlePayload(payload: FAWebhookPayload) {
  const flight = payload.flight;
  if (!flight) return Response.json({ ok: true });

  const eventType = payload.event_type ?? "";
  const flightIdent = flight.ident_iata ?? flight.ident ?? "";
  if (!flightIdent) return Response.json({ ok: true });

  // Derive ISO date from the scheduled departure UTC timestamp
  const isoDate = (flight.scheduled_out ?? flight.estimated_out ?? flight.actual_out ?? "")
    .slice(0, 10);
  if (!isoDate) return Response.json({ ok: true });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Find matching flights in DB — also fetch stored gate and destination to detect changes
  const { data: dbFlights } = await supabase
    .from("flights")
    .select("id, flight_code, gate, destination_code, trips!inner(user_id)")
    .eq("flight_code", flightIdent)
    .eq("iso_date", isoDate);

  if (!dbFlights?.length) return Response.json({ ok: true });

  const depDelayMin = flight.departure_delay
    ? Math.round(flight.departure_delay / 60)
    : 0;
  const arrDelayMin = flight.arrival_delay
    ? Math.round(flight.arrival_delay / 60)
    : 0;
  const newGate = flight.gate_origin ?? null;

  // Detect gate change: new gate exists and differs from what we have stored
  const storedGate = dbFlights[0].gate ?? null;
  const gateChanged = newGate !== null && newGate !== storedGate;

  // Build notification
  let title = "";
  let body  = "";

  switch (eventType) {
    case "departure":
      title = `✈️ ${flightIdent} departed`;
      body  = newGate ? `Gate ${newGate}` : "Flight has departed";
      break;

    case "arrival":
      title = `🛬 ${flightIdent} landed`;
      body  = arrDelayMin >= 5
        ? `Arrived ${arrDelayMin} min late`
        : "On time";
      break;

    case "diverted":
      title = `⚠️ ${flightIdent} diverted`;
      body  = "Flight has been diverted to another airport";
      break;

    case "cancelled":
      title = `❌ ${flightIdent} cancelled`;
      body  = "Your flight has been cancelled";
      break;

    case "filed":
    default:
      if (gateChanged) {
        // Gate change takes priority over delays in a filed event
        title = `🚪 Gate change — ${flightIdent}`;
        body  = `New gate: ${newGate}`;
      } else if (depDelayMin >= 20) {
        title = `⏱️ ${flightIdent} delayed ${depDelayMin} min`;
        body  = newGate ? `Gate ${newGate}` : "Check updated departure time";
      } else if (arrDelayMin >= 20) {
        // In-flight ETA update: arrival pushed back significantly
        title = `⏱️ ${flightIdent} arriving ${arrDelayMin} min late`;
        body  = "Updated arrival estimate from FlightAware";
      } else {
        // No actionable change — skip push
        return Response.json({ ok: true });
      }
  }

  // Persist gate update if changed
  if (gateChanged) {
    const flightIds = dbFlights.map((f) => f.id);
    await supabase.from("flights").update({ gate: newGate }).in("id", flightIds);
  }

  // Collect unique user_ids
  const userIds = Array.from(
    new Set(
      dbFlights.map((f) => (f.trips as unknown as { user_id: string }).user_id),
    ),
  );

  // Fetch push subscriptions
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .in("user_id", userIds);

  if (!subs?.length) return Response.json({ ok: true });

  const notification = JSON.stringify({
    title,
    body,
    tag:  `fa-${flightIdent}-${eventType}`,
    url:  "/app",
  });

  await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        notification,
      ).catch(() => null),
    ),
  );

  // ── Déjà Vu check on arrival ──────────────────────────────────────────────
  // After sending the landed notification, check if each user has visited this
  // destination before. Fire asynchronously so it doesn't delay the response.
  if (eventType === "arrival") {
    const destCode = (dbFlights[0] as unknown as { destination_code: string }).destination_code ?? "";

    void (async () => {
      try {
        const airport = destCode ? AIRPORTS[destCode] : undefined;
        if (!airport) return;

        const { city } = airport;

        for (const userId of userIds) {
          // Check visited_places for this destination city
          const { data: visited } = await supabase
            .from("visited_places")
            .select("date_visited")
            .eq("user_id", userId)
            .eq("city", city)
            .order("date_visited", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!visited) continue; // First time visiting, no déjà vu

          const monthsAgo = Math.floor(
            (Date.now() - new Date(visited.date_visited as string).getTime()) /
              (30 * 24 * 60 * 60 * 1000),
          );
          if (monthsAgo < 1) continue; // Too recent to feel like déjà vu

          // Dedup check
          const dejaVuTag = `deja_vu_${flightIdent}_${isoDate}_${userId}`;
          const { data: logged } = await supabase
            .from("notification_log")
            .select("id")
            .eq("type", dejaVuTag)
            .eq("user_id", userId)
            .limit(1)
            .maybeSingle();
          if (logged) continue;

          // Get current temperature (best-effort, 4s timeout)
          let tempC: number | null = null;
          try {
            const weatherUrl =
              `https://api.open-meteo.com/v1/forecast?latitude=${airport.lat}&longitude=${airport.lng}` +
              `&current=temperature_2m&forecast_days=1`;
            const wr = await fetch(weatherUrl, { signal: AbortSignal.timeout(4000) });
            if (wr.ok) {
              const wd = (await wr.json()) as { current?: { temperature_2m?: number } };
              const raw = wd?.current?.temperature_2m;
              tempC = typeof raw === "number" ? Math.round(raw) : null;
            }
          } catch { /* ignore — temperature is optional */ }

          // Resolve user locale from Supabase auth metadata
          let locale: CronLocale = "es";
          try {
            const { data: userData } = await supabase.auth.admin.getUserById(userId);
            const meta = userData?.user?.user_metadata?.locale as string | undefined;
            locale = meta === "en" ? "en" : "es";
          } catch { /* default to es */ }

          const L = CRON_LABELS[locale].dejaVu(city, monthsAgo, tempC);

          // Get this user's push subscriptions
          const { data: userSubs } = await supabase
            .from("push_subscriptions")
            .select("endpoint, p256dh, auth")
            .eq("user_id", userId);

          if (!userSubs?.length) continue;

          const dejaNotification = JSON.stringify({
            title: L.title,
            body: L.body,
            tag: `deja-vu-${destCode}`,
            url: "/app",
          });

          await Promise.allSettled(
            userSubs.map((sub) =>
              webpush
                .sendNotification(
                  {
                    endpoint: sub.endpoint,
                    keys: { p256dh: sub.p256dh, auth: sub.auth },
                  },
                  dejaNotification,
                )
                .catch(() => null),
            ),
          );

          // Log to prevent duplicate déjà vu pushes
          await supabase.from("notification_log").insert({
            user_id: userId,
            type: dejaVuTag,
            sent_at: new Date().toISOString(),
          });
        }
      } catch {
        // Non-fatal — the main arrival push already succeeded
      }
    })();
  }

  return Response.json({ ok: true, notified: subs.length });
}
