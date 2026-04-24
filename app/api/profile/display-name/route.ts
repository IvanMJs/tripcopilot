import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";

const Schema = z.object({
  displayName: z.string().min(1).max(40).trim(),
});

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = await req.json().catch(() => null);
  const parsed = Schema.safeParse(raw);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });

  const { error } = await supabase
    .from("user_profiles")
    .upsert({ id: user.id, display_name: parsed.data.displayName });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
