import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get the user's primary trip
  const { data: trip } = await supabase
    .from("trips")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!trip) return NextResponse.json({ error: "No trip found" }, { status: 404 });

  // Get display name from profile (best-effort)
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  // Upsert: one token per trip (re-use if already exists)
  const { data: existing } = await supabase
    .from("shared_trips")
    .select("token")
    .eq("trip_id", trip.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ token: existing.token });
  }

  const { data: created, error } = await supabase
    .from("shared_trips")
    .insert({
      trip_id: trip.id,
      owner_id: user.id,
      owner_display_name: profile?.display_name ?? null,
    })
    .select("token")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ token: created.token });
}
