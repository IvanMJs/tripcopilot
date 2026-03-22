import webpush from "web-push";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/rateLimit";

webpush.setVapidDetails(
  "mailto:support@tripcopilot.app",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export async function POST(request: Request) {
  // Allow internal cron/n8n callers with CRON_SECRET to bypass auth
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isCronRequest =
    cronSecret !== undefined &&
    cronSecret !== "" &&
    authHeader === `Bearer ${cronSecret}`;

  const { user_id, title, body, tag, url } = await request.json();

  if (!user_id || !title) {
    return Response.json({ error: "user_id and title required" }, { status: 400 });
  }

  if (!isCronRequest) {
    // Require an authenticated session whose user matches the requested user_id
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.id !== user_id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Rate limit: 30 notify requests per hour per user
    if (!(await checkUserRateLimit(supabaseAuth, user.id, "push-notify", 30))) {
      return rateLimitResponse();
    }
  }

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", user_id);

  if (!subs?.length) {
    return Response.json({ sent: 0 });
  }

  const payload = JSON.stringify({
    title,
    body: body ?? "",
    tag: tag ?? "tripcopilot",
    url: url ?? "/app",
  });

  let sent = 0;

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
        sent++;
      } catch (e: unknown) {
        const err = e as { statusCode?: number };
        // Subscription expired or invalid — clean it up
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint);
        }
      }
    }),
  );

  return Response.json({ sent });
}
