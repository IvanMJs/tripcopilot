import webpush from "web-push";
import { createClient } from "@/utils/supabase/server";

webpush.setVapidDetails(
  "mailto:support@tripcopilot.app",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export async function POST(request: Request) {
  const { user_id, title, body, tag, url } = await request.json();

  if (!user_id || !title) {
    return Response.json({ error: "user_id and title required" }, { status: 400 });
  }

  const supabase = await createClient();

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
