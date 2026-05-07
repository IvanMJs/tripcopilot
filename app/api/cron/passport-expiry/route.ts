import webpush from "web-push";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { PushSubRow } from "@/lib/types";

export const dynamic = "force-dynamic";

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

const PASSPORT_EXPIRY_WINDOW_DAYS = 90;
// Dedup: at most one passport-expiry notification per user per month
const DEDUP_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

async function pushToAll(
  subs: PushSubRow[],
  supabase: SupabaseClient,
  notification: { title: string; body: string; url: string },
  tag: string,
  userId: string,
): Promise<number> {
  let failed = 0;
  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ ...notification, tag }),
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        } else {
          failed++;
        }
      }
    }),
  );
  return failed;
}

export async function GET(req: Request) {
  initVapid();

  // 1. Verify CRON_SECRET
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const now = new Date();
  let processed = 0;
  let sent = 0;

  // 2. Paginate through all users looking for passport_expiry in user_metadata
  //    Supabase auth.admin.listUsers returns up to 1000 per page.
  const PAGE_SIZE = 1000;
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
      page,
      perPage: PAGE_SIZE,
    });

    if (authError || !authData) break;

    const users = authData.users;
    hasMore = users.length === PAGE_SIZE;
    page++;

    for (const user of users) {
      const passportExpiry = user.user_metadata?.passport_expiry as string | undefined;
      if (!passportExpiry) continue;

      processed++;

      // Parse the stored date (expected ISO format: YYYY-MM-DD)
      const expiryDate = new Date(passportExpiry);
      if (isNaN(expiryDate.getTime())) continue;

      // Compute days until expiry
      const msUntilExpiry = expiryDate.getTime() - now.getTime();
      const daysUntilExpiry = Math.ceil(msUntilExpiry / (1000 * 60 * 60 * 24));

      // Only notify if expiring within 90 days
      if (daysUntilExpiry > PASSPORT_EXPIRY_WINDOW_DAYS) continue;

      const userId = user.id;
      const locale = (user.user_metadata?.locale as string | undefined) === "en" ? "en" : "es";

      // 3b. Dedup: max 1 notification per user per month
      const dedupCutoff = new Date(now.getTime() - DEDUP_WINDOW_MS).toISOString();
      const { data: existing } = await supabase
        .from("notification_log")
        .select("id")
        .eq("user_id", userId)
        .eq("type", "passport_expiry")
        .gte("sent_at", dedupCutoff)
        .limit(1)
        .maybeSingle();

      if (existing) continue;

      // 3a. Fetch push subscriptions for this user
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", userId);

      if (!subs?.length) continue;

      const days = Math.max(0, daysUntilExpiry);
      const title =
        locale === "en"
          ? `🛂 Your passport expires in ${days} days`
          : `🛂 Tu pasaporte expira en ${days} días`;
      const body =
        locale === "en"
          ? "Many countries require 6 months of validity. Renew on time!"
          : "Muchos países requieren 6 meses de vigencia. ¡Renovalo a tiempo!";

      const tag = `passport_expiry_${userId}`;

      const failed = await pushToAll(
        subs as PushSubRow[],
        supabase,
        { title, body, url: "/app" },
        tag,
        userId,
      );

      if (failed < subs.length) {
        sent++;
        await supabase.from("notification_log").insert({
          user_id: userId,
          type: "passport_expiry",
          sent_at: now.toISOString(),
        });
      }
    }
  }

  return Response.json({ ok: true, processed, sent });
}
