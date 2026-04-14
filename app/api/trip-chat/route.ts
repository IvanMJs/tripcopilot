import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { TripChatMessage } from "@/lib/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_MESSAGE_LENGTH = 2000;

// Helper: verify user is trip owner or accepted collaborator
async function canAccessTrip(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tripId: string,
  userId: string,
): Promise<boolean> {
  // Check if owner
  const { data: ownedTrip } = await supabase
    .from("trips")
    .select("id")
    .eq("id", tripId)
    .eq("user_id", userId)
    .maybeSingle();

  if (ownedTrip) return true;

  // Check if accepted collaborator
  const { data: collab } = await supabase
    .from("trip_collaborators")
    .select("id")
    .eq("trip_id", tripId)
    .eq("invitee_id", userId)
    .eq("status", "accepted")
    .maybeSingle();

  return !!collab;
}

// GET /api/trip-chat?tripId=<uuid>
// Returns last 50 messages ordered by created_at ASC
export async function GET(req: NextRequest) {
  const tripId = req.nextUrl.searchParams.get("tripId");
  if (!tripId) {
    return NextResponse.json({ error: "Missing tripId" }, { status: 400 });
  }
  if (!UUID_RE.test(tripId)) {
    return NextResponse.json({ error: "Invalid tripId format" }, { status: 400 });
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await canAccessTrip(supabase, tripId, user.id);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("trip_chat_messages")
    .select("id, trip_id, user_id, user_email, body, created_at")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: "Could not fetch messages" }, { status: 500 });
  }

  return NextResponse.json({ data: (data ?? []) as TripChatMessage[] });
}

// POST /api/trip-chat
// Body: { tripId: string, body: string }
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).tripId !== "string" ||
    typeof (body as Record<string, unknown>).body !== "string"
  ) {
    return NextResponse.json({ error: "Missing tripId or body" }, { status: 400 });
  }

  const { tripId, body: messageBody } = body as { tripId: string; body: string };

  if (!UUID_RE.test(tripId)) {
    return NextResponse.json({ error: "Invalid tripId format" }, { status: 400 });
  }

  const trimmed = messageBody.trim();
  if (!trimmed) {
    return NextResponse.json({ error: "Message body cannot be empty" }, { status: 400 });
  }
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `Message body exceeds ${MAX_MESSAGE_LENGTH} characters` },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await canAccessTrip(supabase, tripId, user.id);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("trip_chat_messages")
    .insert({
      trip_id: tripId,
      user_id: user.id,
      user_email: user.email ?? "",
      body: trimmed,
    })
    .select("id, trip_id, user_id, user_email, body, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "Could not send message" }, { status: 500 });
  }

  return NextResponse.json({ data: data as TripChatMessage }, { status: 201 });
}
