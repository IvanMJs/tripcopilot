import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { FunnelChart } from "./components/FunnelChart";
import { EventsTimeline } from "./components/EventsTimeline";
import { UsersTable } from "./components/UsersTable";

const ADMIN_EMAIL = "ivanmeyer1991@gmail.com";

const FUNNEL_EVENTS = [
  { key: "onboarding_tour_started",   label: "Tour iniciado" },
  { key: "onboarding_tour_completed", label: "Tour completado" },
  { key: "ai_import_success",         label: "Import exitoso" },
  { key: "notification_prompted",     label: "Notif prompt" },
  { key: "notification_granted",      label: "Notif otorgada" },
];

async function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export default async function AdminPage() {
  // Auth check — only admin email can access
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) redirect("/app");

  const admin = await getAdminClient();

  // Funnel: unique users per event
  const { data: funnelRaw } = await admin
    .from("analytics_events")
    .select("event, user_id")
    .in("event", FUNNEL_EVENTS.map((e) => e.key));

  const funnelData = FUNNEL_EVENTS.map(({ key, label }) => {
    const unique = new Set((funnelRaw ?? []).filter((r) => r.event === key).map((r) => r.user_id)).size;
    return { label, users: unique, event: key };
  });

  // Events over last 14 days
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data: timelineRaw } = await admin
    .from("analytics_events")
    .select("event, created_at")
    .in("event", FUNNEL_EVENTS.map((e) => e.key))
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  // Group by day
  const dayMap: Record<string, Record<string, number>> = {};
  for (const row of timelineRaw ?? []) {
    const day = row.created_at.slice(0, 10);
    dayMap[day] ??= {};
    dayMap[day][row.event] = (dayMap[day][row.event] ?? 0) + 1;
  }
  const timelineData = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, counts]) => ({ day, ...counts }));

  // Active users
  const { data: usersRaw } = await admin
    .from("analytics_events")
    .select("user_id, event, created_at")
    .order("created_at", { ascending: false });

  const userMap: Record<string, { lastSeen: string; eventCount: number; events: Set<string> }> = {};
  for (const row of usersRaw ?? []) {
    if (!userMap[row.user_id]) {
      userMap[row.user_id] = { lastSeen: row.created_at, eventCount: 0, events: new Set() };
    }
    userMap[row.user_id].eventCount++;
    userMap[row.user_id].events.add(row.event);
  }

  const usersData = Object.entries(userMap)
    .sort(([, a], [, b]) => b.lastSeen.localeCompare(a.lastSeen))
    .slice(0, 50)
    .map(([userId, { lastSeen, eventCount, events }]) => ({
      userId: userId.slice(0, 8),
      lastSeen,
      eventCount,
      completedSteps: FUNNEL_EVENTS.filter((e) => events.has(e.key)).length,
    }));

  const totalUsers = Object.keys(userMap).length;
  const totalEvents = (usersRaw ?? []).length;

  return (
    <div className="min-h-screen bg-[#07070d] text-white px-4 py-10">
      <div className="max-w-5xl mx-auto space-y-10">

        {/* Header */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-600 mb-1">TripCopilot Admin</p>
          <h1 className="text-2xl font-black tracking-tight">Analytics · Beta</h1>
        </div>

        {/* Top stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Usuarios activos", value: totalUsers },
            { label: "Eventos totales", value: totalEvents },
            { label: "Tour completado", value: funnelData[1]?.users ?? 0 },
            { label: "Notif otorgadas", value: funnelData[4]?.users ?? 0 },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/[0.06] p-4"
              style={{ background: "linear-gradient(160deg, #0e0e1c 0%, #09090f 100%)" }}
            >
              <p className="text-2xl font-black text-[#FFB800]">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Funnel */}
        <div
          className="rounded-2xl border border-white/[0.06] p-6"
          style={{ background: "linear-gradient(160deg, #0e0e1c 0%, #09090f 100%)" }}
        >
          <h2 className="text-sm font-bold text-gray-300 mb-6">Funnel de onboarding</h2>
          <FunnelChart data={funnelData} />
        </div>

        {/* Timeline */}
        <div
          className="rounded-2xl border border-white/[0.06] p-6"
          style={{ background: "linear-gradient(160deg, #0e0e1c 0%, #09090f 100%)" }}
        >
          <h2 className="text-sm font-bold text-gray-300 mb-6">Eventos · últimos 14 días</h2>
          <EventsTimeline data={timelineData} events={FUNNEL_EVENTS} />
        </div>

        {/* Users */}
        <div
          className="rounded-2xl border border-white/[0.06] p-6"
          style={{ background: "linear-gradient(160deg, #0e0e1c 0%, #09090f 100%)" }}
        >
          <h2 className="text-sm font-bold text-gray-300 mb-6">Usuarios activos</h2>
          <UsersTable data={usersData} totalSteps={FUNNEL_EVENTS.length} />
        </div>

      </div>
    </div>
  );
}
