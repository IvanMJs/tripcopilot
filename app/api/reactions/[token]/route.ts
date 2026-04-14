import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";

const PostBodySchema = z.object({
  emoji: z.string().min(1).max(8),
  fingerprint: z.string().min(1).max(128),
});

interface RouteContext {
  params: Promise<{ token: string }>;
}

// ── GET — return emoji reaction counts ────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { token } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("trip_reactions")
    .select("emoji")
    .eq("share_token", token);

  if (!data) {
    return NextResponse.json({ reactions: [] });
  }

  // Group by emoji
  const counts: Record<string, number> = {};
  for (const row of data) {
    counts[row.emoji as string] = (counts[row.emoji as string] ?? 0) + 1;
  }

  const reactions = Object.entries(counts).map(([emoji, count]) => ({
    emoji,
    count,
  }));

  return NextResponse.json({ reactions });
}

// ── POST — add / update a reaction ────────────────────────────────────────────

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { token } = await params;

  const raw = await req.json().catch(() => null);
  const parsed = PostBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { emoji, fingerprint } = parsed.data;
  const supabase = await createClient();

  // Rate-limit check: max 10 reactions per fingerprint per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("trip_reactions")
    .select("id", { count: "exact", head: true })
    .eq("user_fingerprint", fingerprint)
    .gte("created_at", oneHourAgo);

  if ((count ?? 0) >= 10) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  // Upsert — unique on (share_token, user_fingerprint)
  const { error } = await supabase.from("trip_reactions").upsert(
    {
      share_token: token,
      emoji,
      user_fingerprint: fingerprint,
      created_at: new Date().toISOString(),
    },
    { onConflict: "share_token,user_fingerprint" },
  );

  if (error) {
    return NextResponse.json({ error: "Failed to save reaction" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
