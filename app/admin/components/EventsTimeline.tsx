"use client";

import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const COLORS: Record<string, string> = {
  onboarding_tour_started:   "#FFB800",
  onboarding_tour_completed: "#f59e0b",
  ai_import_success:         "#6366f1",
  notification_prompted:     "#22d3ee",
  notification_granted:      "#34d399",
};

interface EventDef { key: string; label: string }

export function EventsTimeline({
  data,
  events,
}: {
  data: Record<string, string | number>[];
  events: EventDef[];
}) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-gray-600 text-center py-8">
        Sin datos todavía — los eventos aparecen cuando llegan los primeros usuarios.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <XAxis
          dataKey="day"
          tick={{ fontSize: 10, fill: "#6b7280" }}
          tickFormatter={(v: string) => v.slice(5)}
        />
        <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: "#0e0e1c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, fontSize: 12 }}
          labelStyle={{ color: "#9ca3af" }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span style={{ fontSize: 11, color: "#9ca3af" }}>{events.find((e) => e.key === value)?.label ?? value}</span>}
        />
        {events.map((e) => (
          <Line
            key={e.key}
            type="monotone"
            dataKey={e.key}
            stroke={COLORS[e.key] ?? "#ffffff"}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
