import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/rateLimit";

const PostBodySchema = z.object({
  tripId: z.string().uuid(),
  email: z.string().email().max(254),
  role: z.enum(["viewer", "editor"]),
});

// POST: invite a collaborator to a trip
export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 20 invitations per hour per user
  if (!(await checkUserRateLimit(supabase, user.id, "trips-invite", 20))) {
    return rateLimitResponse();
  }

  const raw = await req.json().catch(() => null);
  const parsed = PostBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { tripId, email, role } = parsed.data;

  // Verify the trip belongs to the requesting user
  const { data: tripRow, error: tripErr } = await supabase
    .from("trips")
    .select("id")
    .eq("id", tripId)
    .single();

  if (tripErr || !tripRow) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  // Check if there's already a pending/accepted invite for this email+trip
  const { data: existing } = await supabase
    .from("trip_collaborators")
    .select("id, status")
    .eq("trip_id", tripId)
    .eq("invitee_email", email)
    .in("status", ["pending", "accepted"])
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "An active invite already exists for this email" },
      { status: 409 },
    );
  }

  const inviteToken = crypto.randomUUID();

  const { data: collaborator, error: insertErr } = await supabase
    .from("trip_collaborators")
    .insert({
      trip_id: tripId,
      inviter_id: user.id,
      invitee_email: email,
      role,
      invite_token: inviteToken,
    })
    .select("id, invite_token")
    .single();

  if (insertErr || !collaborator) {
    return NextResponse.json({ error: "Could not create invitation" }, { status: 500 });
  }

  return NextResponse.json({ token: collaborator.invite_token }, { status: 201 });
}
