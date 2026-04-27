"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

interface FunnelStep {
  label: string;
  users: number;
  event: string;
}

export function FunnelChart({ data }: { data: FunnelStep[] }) {
  const max = Math.max(...data.map((d) => d.users), 1);

  return (
    <div className="space-y-3">
      {data.map((step, i) => {
        const pct = max > 0 ? Math.round((step.users / max) * 100) : 0;
        const dropPct = i > 0 && data[i - 1].users > 0
          ? Math.round(((data[i - 1].users - step.users) / data[i - 1].users) * 100)
          : null;
        return (
          <div key={step.event} className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-36 shrink-0 text-right">{step.label}</span>
            <div className="flex-1 h-7 bg-white/[0.04] rounded-lg overflow-hidden">
              <div
                className="h-full rounded-lg transition-all duration-500 flex items-center px-3"
                style={{
                  width: `${Math.max(pct, 2)}%`,
                  background: i === 0 ? "rgba(255,184,0,0.7)" : "rgba(255,184,0,0.35)",
                }}
              />
            </div>
            <div className="flex items-center gap-2 w-28 shrink-0">
              <span className="text-sm font-bold text-white w-8 text-right">{step.users}</span>
              {dropPct !== null && dropPct > 0 && (
                <span className="text-[10px] text-red-400 font-semibold">-{dropPct}%</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
