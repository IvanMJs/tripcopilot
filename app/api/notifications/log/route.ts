import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const flightId = searchParams.get("flightId");

  if (!flightId) {
    return Response.json({ error: "Missing flightId" }, { status: 400 });
  }

  // Authenticate user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify the flight belongs to this user
  const { data: flight } = await supabase
    .from("flights")
    .select("id, trips!inner(user_id)")
    .eq("id", flightId)
    .single();

  if (!flight) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Fetch the log using service role (notification_log may not have user RLS)
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: logs } = await service
    .from("notification_log")
    .select("type, sent_at")
    .eq("flight_id", flightId)
    .neq("type", "flight_status_fetched") // internal marker, not useful to show
    .order("sent_at", { ascending: false })
    .limit(20);

  return Response.json({ logs: logs ?? [] });
}
