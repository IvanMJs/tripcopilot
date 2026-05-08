import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { z } from "zod";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  token: z.string().min(1),
  platform: z.enum(["ios", "android"]),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await checkUserRateLimit(supabase, user.id, "push-subscribe-native", 20))) {
    return rateLimitResponse();
  }

  const raw = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { token, platform } = parsed.data;

  const adminSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Remove token if it belongs to another user (device transfer)
  await adminSupabase
    .from("native_push_tokens")
    .delete()
    .eq("token", token)
    .neq("user_id", user.id);

  // Upsert for current user
  const { error } = await adminSupabase
    .from("native_push_tokens")
    .upsert(
      { user_id: user.id, token, platform },
      { onConflict: "token" },
    );

  if (error) {
    return NextResponse.json({ error: "Failed to save token" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
