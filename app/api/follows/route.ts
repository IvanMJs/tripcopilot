import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { z } from "zod";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { getNotificationPrefs } from "@/lib/notificationPreferences";
import webpush from "web-push";
import type { User } from "@supabase/auth-js";

const BodySchema = z.object({ username: z.string().min(1).max(30) });

function makeAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await checkUserRateLimit(supabase, user.id, "follows", 30))) {
    return rateLimitResponse();
  }

  const raw = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { username } = parsed.data;
  const admin = makeAdmin();

  const { data: targetProfile } = await admin
    .from("user_profiles")
    .select("id")
    .ilike("username", username)
    .single();

  if (!targetProfile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const targetId = (targetProfile as { id: string }).id;

  if (targetId === user.id) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
  }

  const { error: insertErr } = await admin
    .from("follows")
    .insert({ follower_id: user.id, following_id: targetId });

  if (insertErr) {
    if (insertErr.code === "23505") {
      return NextResponse.json({ error: "Already following this user" }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not follow user" }, { status: 500 });
  }

  void sendNewFollowerPush(targetId, user).catch(() => {});

  return NextResponse.json({ ok: true }, { status: 201 });
}

async function sendNewFollowerPush(targetId: string, follower: User) {
  const admin = makeAdmin();
  const prefs = await getNotificationPrefs(admin, targetId);
  if (!prefs.newFollower) return;

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", targetId);
  if (!subs?.length) return;

  webpush.setVapidDetails(
    "mailto:support@tripcopilot.app",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );

  const senderName =
    follower.user_metadata?.display_name ??
    follower.user_metadata?.username ??
    follower.email?.split("@")[0] ??
    "Alguien";

  const payload = JSON.stringify({
    title: "Nuevo seguidor ✈️",
    body: `${senderName} ahora te sigue en TripCopilot`,
    tag: "new-follower",
    url: "/app?tab=social",
  });

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
      } catch (e: unknown) {
        const err = e as { statusCode?: number };
        if (err.statusCode === 404 || err.statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    }),
  );
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await checkUserRateLimit(supabase, user.id, "follows", 30))) {
    return rateLimitResponse();
  }

  const raw = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { username } = parsed.data;
  const admin = makeAdmin();

  const { data: targetProfile } = await admin
    .from("user_profiles")
    .select("id")
    .ilike("username", username)
    .single();

  if (!targetProfile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const targetId = (targetProfile as { id: string }).id;

  const { error: deleteErr } = await admin
    .from("follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("following_id", targetId);

  if (deleteErr) {
    return NextResponse.json({ error: "Could not unfollow user" }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
