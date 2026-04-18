import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/rateLimit";

interface UserProfileRow {
  id: string;
  username: string;
  display_name: string | null;
  social_settings: Record<string, unknown> | null;
}

interface FriendshipRow {
  requester_id: string;
  addressee_id: string;
}

export async function GET(req: NextRequest) {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await checkUserRateLimit(supabase, user.id, "travelers-search", 20))) {
    return rateLimitResponse();
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  if (!q.trim()) {
    return NextResponse.json({ results: [] });
  }

  const sanitized = q.replace(/[^a-zA-Z0-9 _-]/g, "").slice(0, 50);
  if (!sanitized.trim()) {
    return NextResponse.json({ results: [] });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Fetch up to 50 candidates matching the query, excluding the caller
  const { data: candidates, error: searchErr } = await admin
    .from("user_profiles")
    .select("id, username, display_name, social_settings")
    .or(`username.ilike.%${sanitized}%,display_name.ilike.%${sanitized}%`)
    .neq("id", user.id)
    .limit(50);

  if (searchErr) {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }

  const rows = (candidates ?? []) as UserProfileRow[];

  // Fetch accepted friendships for the caller to build a Set of friend IDs
  const { data: friendships } = await admin
    .from("friendships")
    .select("requester_id, addressee_id")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .eq("status", "accepted");

  const acceptedFriendIds = new Set<string>();
  for (const row of (friendships ?? []) as FriendshipRow[]) {
    const otherId =
      row.requester_id === user.id ? row.addressee_id : row.requester_id;
    acceptedFriendIds.add(otherId);
  }

  // Privacy filter: include if profileVisible === 'friends' OR is an accepted friend
  const filtered = rows
    .filter((profile) => {
      const settings = profile.social_settings;
      const isVisible = settings?.profileVisible === "friends";
      const isFriend = acceptedFriendIds.has(profile.id);
      return isVisible || isFriend;
    })
    .slice(0, 10);

  const results = filtered.map((profile) => ({
    userId: profile.id,
    username: profile.username,
    displayName: profile.display_name,
  }));

  return NextResponse.json({ results });
}
