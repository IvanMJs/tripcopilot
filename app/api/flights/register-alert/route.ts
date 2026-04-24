import { createClient } from "@/utils/supabase/server";
import { registerFlightAlert } from "@/lib/flightaware";

const WEBHOOK_BASE = "https://tripcopilot.app/api/webhooks/flightaware";
const WEBHOOK_URL = process.env.FLIGHTAWARE_WEBHOOK_SECRET
  ? `${WEBHOOK_BASE}?token=${process.env.FLIGHTAWARE_WEBHOOK_SECRET}`
  : WEBHOOK_BASE;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json() as { flightId?: string };
  if (!body.flightId) {
    return Response.json({ error: "Missing flightId" }, { status: 400 });
  }

  // RLS ensures the flight belongs to this user
  const { data: flight } = await supabase
    .from("flights")
    .select("flight_code, iso_date, fa_alert_id")
    .eq("id", body.flightId)
    .single();

  if (!flight) {
    return Response.json({ ok: true }); // not found or not owned — silent no-op
  }

  // Idempotency: skip if this flight already has a FlightAware alert registered.
  // Prevents duplicate alerts and wasted API calls on client retries.
  if (flight.fa_alert_id) {
    return Response.json({ ok: true, alreadyRegistered: true });
  }

  const alert = await registerFlightAlert(flight.flight_code, flight.iso_date, WEBHOOK_URL);
  if (alert?.alert_id) {
    await supabase
      .from("flights")
      .update({ fa_alert_id: alert.alert_id })
      .eq("id", body.flightId);
  }

  return Response.json({ ok: true });
}
