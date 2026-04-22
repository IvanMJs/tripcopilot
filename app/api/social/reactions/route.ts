import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";

const PostBodySchema = z.object({
  tripId: z.string().uuid(),
  emoji: z.string().min(1).max(8),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = PostBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { tripId, emoji } = parsed.data;

  const { error } = await supabase.from("social_reactions").insert({
    trip_id: tripId,
    user_id: user.id,
    emoji,
  });

  if (error) {
    return NextResponse.json({ error: "Failed to save reaction" }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
