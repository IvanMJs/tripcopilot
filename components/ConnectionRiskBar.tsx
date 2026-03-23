"use client";

import { ConnectionAnalysis, ConnectionRisk } from "@/lib/connectionRisk";

interface ConnectionRiskBarProps {
  analysis: ConnectionAnalysis;
  locale: "es" | "en";
}

const RISK_CONFIG: Record<
  ConnectionRisk,
  {
    barColor: string;
    bgColor: string;
    borderColor: string;
    textColor: string;
    icon: string;
    labelEs: string;
    labelEn: string;
  }
> = {
  safe: {
    barColor:   "bg-emerald-500",
    bgColor:    "bg-emerald-950/30",
    borderColor:"border-emerald-800/40",
    textColor:  "text-emerald-300",
    icon:       "✈",
    labelEs:    "Cómodo",
    labelEn:    "Comfortable",
  },
  tight: {
    barColor:   "bg-yellow-500",
    bgColor:    "bg-yellow-950/30",
    borderColor:"border-yellow-800/40",
    textColor:  "text-yellow-300",
    icon:       "⚡",
    labelEs:    "Ajustado",
    labelEn:    "Tight",
  },
  at_risk: {
    barColor:   "bg-orange-500",
    bgColor:    "bg-orange-950/30",
    borderColor:"border-orange-800/40",
    textColor:  "text-orange-300",
    icon:       "⚠",
    labelEs:    "En riesgo",
    labelEn:    "At risk",
  },
  missed: {
    barColor:   "bg-red-500",
    bgColor:    "bg-red-950/30",
    borderColor:"border-red-800/40",
    textColor:  "text-red-300",
    icon:       "🚨",
    labelEs:    "Conexión perdida",
    labelEn:    "Missed connection",
  },
};

function formatMinutes(minutes: number): string {
  if (minutes <= 0) {
    const abs = Math.abs(minutes);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return h > 0
      ? `-${h}h ${m > 0 ? `${m}m` : ""}`.trim()
      : `-${m}m`;
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

/**
 * Visual bar shown between consecutive flights in TripPanel to indicate
 * connection risk. Uses the result of analyzeConnection() for data.
 */
export function ConnectionRiskBar({ analysis, locale }: ConnectionRiskBarProps) {
  const cfg = RISK_CONFIG[analysis.risk];

  // Clamp fill percentage: 0–100 based on effective vs. scheduled buffer.
  // A negative effective buffer = 0%, full scheduled buffer = 100%.
  const pct = analysis.scheduledBufferMinutes > 0
    ? Math.max(
        0,
        Math.min(100, (analysis.effectiveBufferMinutes / analysis.scheduledBufferMinutes) * 100),
      )
    : 0;

  const effectiveLabel = formatMinutes(analysis.effectiveBufferMinutes);
  const label = locale === "es" ? cfg.labelEs : cfg.labelEn;

  return (
    <div
      className={`mx-1 my-2 rounded-xl border px-4 py-3 ${cfg.bgColor} ${cfg.borderColor}`}
      role="status"
      aria-label={
        locale === "es"
          ? `Conexión en ${analysis.connectionAirport}: ${label}`
          : `Connection at ${analysis.connectionAirport}: ${label}`
      }
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm leading-none select-none">{cfg.icon}</span>
          <span className={`text-xs font-semibold ${cfg.textColor}`}>
            {locale === "es" ? "Conexión en" : "Connection at"}{" "}
            <span className="font-black">{analysis.connectionAirport}</span>
          </span>
        </div>
        <span className={`text-xs font-bold tabular-nums ${cfg.textColor}`}>
          {effectiveLabel}
          {" · "}
          {label}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${cfg.barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Detail row */}
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[11px] text-gray-500">
          {locale === "es" ? "Buffer requerido:" : "Required buffer:"}{" "}
          <span className="text-gray-400 font-medium">{analysis.mctMinutes}m</span>
        </span>
        {analysis.delayAddedMinutes > 0 && (
          <span className="text-[11px] text-orange-400/80">
            +{analysis.delayAddedMinutes}m{" "}
            {locale === "es" ? "demora FAA" : "FAA delay"}
          </span>
        )}
      </div>
    </div>
  );
}
