import webpush from "web-push";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/rateLimit";

webpush.setVapidDetails(
  "mailto:support@tripcopilot.app",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

const MOCKS: Record<string, { title: string; body: string; tag: string }> = {
  flight_delay: {
    title: "AR1303 con 45 min de demora 🟠",
    body: "Sale aprox. a las 09:45 · Puerta 12. EZE→MIA.",
    tag: "flight_delay_real",
  },
  flight_cancelled: {
    title: "Vuelo cancelado ⛔ — AR1303",
    body: "Tu vuelo AR1303 EZE→MIA fue cancelado. Contactá a la aerolínea.",
    tag: "flight_cancelled",
  },
  morning_briefing: {
    title: "¡Hoy viajás! AR1303 sale a las 08:55",
    body: "EZE→MIA. EZE: Normal ✅. ¡Buen vuelo! 🛫",
    tag: "morning_briefing",
  },
  checkin_24h: {
    title: "¿Hiciste el check-in? ✈️",
    body: "Tu vuelo AR1303 EZE→MIA sale mañana a las 08:55.",
    tag: "checkin_24h",
  },
  preflight_3h: {
    title: "Tu vuelo AR1303 sale en ~3hs",
    body: "EZE→MIA a las 08:55. EZE: Normal ✅.",
    tag: "preflight_3h",
  },
  hotel_reminder: {
    title: "🏨 Mañana check-in en Marriott Buenos Aires",
    body: "Recordá tener listos los documentos y código de reserva.",
    tag: "hotel_checkin_reminder",
  },
  hotel_checkin: {
    title: "🏨 Check-in ahora — Marriott Buenos Aires",
    body: "Check-in programado a las 15:00. Confirmación: MRR-48291.",
    tag: "hotel_checkin_time",
  },
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "morning_briefing";

  const mock = MOCKS[type];
  if (!mock) {
    return Response.json(
      { error: `Unknown type. Valid: ${Object.keys(MOCKS).join(", ")}` },
      { status: 400 },
    );
  }

  // Require auth — only send to the current user
  const supabaseAuth = await createClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Rate limit: 30 test notifications per hour per user
  if (!(await checkUserRateLimit(supabaseAuth, user.id, "push-test-notify", 30))) {
    return rateLimitResponse();
  }

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", user.id);

  if (!subs?.length) {
    return Response.json(
      { error: "No push subscriptions found for your account. Enable notifications in the app first." },
      { status: 404 },
    );
  }

  const payload = JSON.stringify({
    title: mock.title,
    body: mock.body,
    tag: mock.tag,
    url: "/app",
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
      } catch {}
    }),
  );

  return Response.json({ ok: true, type, sent, title: mock.title });
}
