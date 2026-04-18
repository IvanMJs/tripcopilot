import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { USERNAME_REGEX, RESERVED_USERNAMES } from "@/lib/username";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const u = searchParams.get("u") ?? "";

  if (!USERNAME_REGEX.test(u)) {
    return NextResponse.json({ available: false, reason: "invalid" });
  }

  if (RESERVED_USERNAMES.includes(u.toLowerCase())) {
    return NextResponse.json({ available: false, reason: "reserved" });
  }

  const supabase = await createClient();

  const { data } = await supabase
    .from("user_profiles")
    .select("username")
    .ilike("username", u)
    .maybeSingle();

  return NextResponse.json({ available: data === null });
}
