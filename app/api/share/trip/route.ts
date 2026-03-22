import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/rateLimit";

// ── GET: fetch trip data by share token ───────────────────────────────────────

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token || token.length > 128) {
    return NextResponse.json({ error: "Missing or invalid token" }, { status: 400 });
  }

  // Use service-role-like access for public read — token lookup is intentionally public
  const supabase = await createClient();

  // Look up the token and check expiry
  const { data: tokenRow, error: tokenErr } = await supabase
    .from("trip_share_tokens")
    .select("trip_id, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (tokenErr || !tokenRow) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 404 });
  }

  if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
    return NextResponse.json({ error: "Share link has expired" }, { status: 410 });
  }

  // Fetch trip data (no auth required — public share)
  const { data: trip, error: tripErr } = await supabase
    .from("trips")
    .select("id, name, flights(*), accommodations(*)")
    .eq("id", tokenRow.trip_id)
    .single();

  if (tripErr || !trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  return NextResponse.json({ data: trip });
}

// ── POST: create a share token for a trip ────────────────────────────────────

const PostBodySchema = z.object({
  tripId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  // Auth required to create tokens
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 30 share token creations per hour per user
  if (!(await checkUserRateLimit(supabase, user.id, "share-trip", 30))) {
    return rateLimitResponse();
  }

  const raw = await req.json().catch(() => null);
  const parsed = PostBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { tripId } = parsed.data;

  // Verify the trip belongs to the requesting user
  const { data: tripRow, error: tripErr } = await supabase
    .from("trips")
    .select("id")
    .eq("id", tripId)
    .single();

  if (tripErr || !tripRow) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  // Check for an existing non-expired token for this trip (reuse it)
  const { data: existing } = await supabase
    .from("trip_share_tokens")
    .select("token, expires_at")
    .eq("trip_id", tripId)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ token: existing.token });
  }

  // Create a new token using crypto.randomUUID()
  const token = crypto.randomUUID();

  const { error: insertErr } = await supabase
    .from("trip_share_tokens")
    .insert({ token, trip_id: tripId });

  if (insertErr) {
    return NextResponse.json({ error: "Could not create share token" }, { status: 500 });
  }

  return NextResponse.json({ token });
}
