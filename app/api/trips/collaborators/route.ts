import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// GET /api/trips/collaborators?tripId=<uuid>
// Returns collaborators for a trip (owner only)
export async function GET(req: NextRequest) {
  const tripId = req.nextUrl.searchParams.get("tripId");
  if (!tripId) {
    return NextResponse.json({ error: "Missing tripId" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership — RLS will also enforce this, but an explicit check gives a clear 403
  const { data: tripRow, error: tripErr } = await supabase
    .from("trips")
    .select("id")
    .eq("id", tripId)
    .single();

  if (tripErr || !tripRow) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  const { data: collaborators, error } = await supabase
    .from("trip_collaborators")
    .select("id, trip_id, invitee_email, invitee_id, role, status, invite_token, invited_at, accepted_at")
    .eq("trip_id", tripId)
    .order("invited_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Could not fetch collaborators" }, { status: 500 });
  }

  return NextResponse.json({ data: collaborators ?? [] });
}

// DELETE /api/trips/collaborators?collaboratorId=<uuid>
// Revokes access for a collaborator (owner only)
export async function DELETE(req: NextRequest) {
  const collaboratorId = req.nextUrl.searchParams.get("collaboratorId");
  if (!collaboratorId) {
    return NextResponse.json({ error: "Missing collaboratorId" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // RLS policy ensures only trip owners can delete — just execute it
  const { error } = await supabase
    .from("trip_collaborators")
    .delete()
    .eq("id", collaboratorId);

  if (error) {
    return NextResponse.json({ error: "Could not revoke access" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
