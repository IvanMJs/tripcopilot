import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { AIRPORTS } from "@/lib/airports";
import webpush from "web-push";

export const dynamic = "force-dynamic";

const PostBodySchema = z.object({
  destinationCode: z.string().length(3),
});

let vapidInitialized = false;
function initVapid() {
  if (vapidInitialized) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return;
  webpush.setVapidDetails(
    "mailto:support@tripcopilot.app",
    publicKey,
    privateKey,
  );
  vapidInitialized = true;
}

interface FriendshipRow {
  requester_id: string;
  addressee_id: string;
}

interface VisitedPlaceRow {
  user_id: string;
  city: string;
  country: string;
}

interface PushSubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function POST(req: NextRequest) {
  initVapid();
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 10 per hour
  if (!(await checkUserRateLimit(supabase, user.id, "friends-notify", 10))) {
    return rateLimitResponse();
  }

  const raw = await req.json().catch(() => null);
  const parsed = PostBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { destinationCode } = parsed.data;

  // Resolve airport info
  const airport = AIRPORTS[destinationCode.toUpperCase()];
  if (!airport) {
    return NextResponse.json({ ok: true, notified: 0 });
  }
  const city = airport.city ?? destinationCode;
  const country = airport.country ?? "USA";

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Get accepted friends
  const { data: friendships } = await supabase
    .from("friendships")
    .select("requester_id, addressee_id")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .eq("status", "accepted");

  const friendRows = (friendships ?? []) as FriendshipRow[];
  const friendIds = friendRows.map((r) =>
    r.requester_id === user.id ? r.addressee_id : r.requester_id,
  );

  if (friendIds.length === 0) {
    return NextResponse.json({ ok: true, notified: 0 });
  }

  // Check which friends have visited this city+country (service role for cross-user query)
  const { data: visitedRows } = await adminSupabase
    .from("visited_places")
    .select("user_id, city, country")
    .in("user_id", friendIds)
    .ilike("city", city)
    .ilike("country", country);

  const visitedFriendIds = Array.from(
    new Set((visitedRows ?? []).map((r: VisitedPlaceRow) => r.user_id)),
  );

  if (visitedFriendIds.length === 0) {
    return NextResponse.json({ ok: true, notified: 0 });
  }

  // Fetch push subscriptions for those friends
  const { data: subs } = await adminSupabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .in("user_id", visitedFriendIds);

  const subRows = (subs ?? []) as PushSubscriptionRow[];
  if (subRows.length === 0) {
    return NextResponse.json({ ok: true, notified: 0 });
  }

  const notification = JSON.stringify({
    title: `Tu amigo va a ${city} \u2708\uFE0F`,
    body: `\u00BFLe mand\u00E1s un tip sobre ${city}?`,
    tag: `friend-dest-${destinationCode.toUpperCase()}`,
    url: "/app?tab=social",
  });

  const results = await Promise.allSettled(
    subRows.map((sub) =>
      webpush
        .sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          notification,
        )
        .catch(() => null),
    ),
  );
  const notified = results.filter(
    (r) => r.status === "fulfilled" && r.value !== null,
  ).length;

  return NextResponse.json({ ok: true, notified });
}
