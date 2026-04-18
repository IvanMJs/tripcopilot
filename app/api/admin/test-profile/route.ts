import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const username = req.nextUrl.searchParams.get("username") ?? "micam";

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return NextResponse.json({
      error: "Missing env vars",
      hasUrl: !!url,
      hasKey: !!key,
    });
  }

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin
    .from("user_profiles")
    .select("id, username, display_name, social_settings")
    .ilike("username", username)
    .maybeSingle();

  return NextResponse.json({
    username,
    found: !!data,
    data: data ?? null,
    error: error?.message ?? null,
    supabaseUrl: url.slice(0, 30) + "...",
  });
}
