import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

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

// FlightAware does not sign webhook callbacks with HMAC on the basic plan.
// Security relies on the callback URL being private (not guessable).
// FLIGHTAWARE_WEBHOOK_SECRET is kept as an env var for future use if FlightAware
// adds signature support, but is not used for request verification.
export async function POST(request: Request) {
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

  // Find matching flights in DB — also fetch stored gate to detect changes
  const { data: dbFlights } = await supabase
    .from("flights")
    .select("id, flight_code, gate, trips!inner(user_id)")
    .eq("flight_code", flightIdent)
    .eq("iso_date", isoDate);

  if (!dbFlights?.length) return Response.json({ ok: true });

  const delayMinutes = flight.departure_delay
    ? Math.round(flight.departure_delay / 60)
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
      body  = newGate ? `Departed from gate ${newGate}` : "Flight has departed";
      break;

    case "arrival":
      title = `🛬 ${flightIdent} landed`;
      body  = "Your flight has arrived";
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
        // Gate change takes priority over delay in a "filed" event
        title = `🚪 Gate change — ${flightIdent}`;
        body  = `New gate: ${newGate}`;
      } else if (delayMinutes >= 20) {
        title = `⏱️ ${flightIdent} delayed ${delayMinutes} min`;
        body  = newGate ? `Gate ${newGate}` : "Check updated departure time";
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

  return Response.json({ ok: true, notified: subs.length });
}
