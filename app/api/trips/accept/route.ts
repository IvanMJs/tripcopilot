import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";

const PostBodySchema = z.object({
  token: z.string().uuid(),
});

// POST: accept an invitation via token
export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = PostBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { token } = parsed.data;

  // Look up the invite
  const { data: invite, error: lookupErr } = await supabase
    .from("trip_collaborators")
    .select("id, trip_id, invitee_email, status")
    .eq("invite_token", token)
    .maybeSingle();

  if (lookupErr || !invite) {
    return NextResponse.json({ error: "Invalid invitation token" }, { status: 404 });
  }

  if (invite.status === "declined") {
    return NextResponse.json({ error: "Invitation was declined" }, { status: 410 });
  }

  if (invite.status === "accepted") {
    // Already accepted — return trip ID so the caller can redirect
    return NextResponse.json({ tripId: invite.trip_id });
  }

  // Update invite: mark accepted, set invitee_id to current user
  const { error: updateErr } = await supabase
    .from("trip_collaborators")
    .update({
      status: "accepted",
      invitee_id: user.id,
      accepted_at: new Date().toISOString(),
    })
    .eq("id", invite.id);

  if (updateErr) {
    return NextResponse.json({ error: "Could not accept invitation" }, { status: 500 });
  }

  return NextResponse.json({ tripId: invite.trip_id });
}
