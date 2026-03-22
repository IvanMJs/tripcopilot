"use client";

import { ShieldAlert, ShieldCheck, Shield, ShieldOff, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { TripRiskScore } from "@/lib/tripRiskScore";

interface TripRiskBadgeProps {
  risk: TripRiskScore;
  locale: "es" | "en";
}

const LEVEL_CONFIG = {
  low: {
    bg:     "bg-emerald-950/40",
    border: "border-emerald-800/50",
    text:   "text-emerald-400",
    ring:   "ring-emerald-500/20",
    track:  "#166534",
    fill:   "#22c55e",
    icon:   ShieldCheck,
    label:  { es: "Riesgo bajo", en: "Low risk" },
  },
  medium: {
    bg:     "bg-yellow-950/40",
    border: "border-yellow-800/50",
    text:   "text-yellow-400",
    ring:   "ring-yellow-500/20",
    track:  "#854d0e",
    fill:   "#eab308",
    icon:   Shield,
    label:  { es: "Riesgo medio", en: "Medium risk" },
  },
  high: {
    bg:     "bg-orange-950/40",
    border: "border-orange-800/50",
    text:   "text-orange-400",
    ring:   "ring-orange-500/20",
    track:  "#9a3412",
    fill:   "#f97316",
    icon:   ShieldAlert,
    label:  { es: "Riesgo alto", en: "High risk" },
  },
  critical: {
    bg:     "bg-red-950/50",
    border: "border-red-700/60",
    text:   "text-red-400",
    ring:   "ring-red-500/20",
    track:  "#7f1d1d",
    fill:   "#ef4444",
    icon:   ShieldOff,
    label:  { es: "Riesgo crítico", en: "Critical risk" },
  },
};

/** SVG arc gauge — draws a semicircle progress indicator */
function RiskGauge({ score, fill, track }: { score: number; fill: string; track: string }) {
  const r = 24;
  const cx = 32, cy = 32;
  const circumference = Math.PI * r; // semicircle
  const progress = (score / 100) * circumference;

  // Semicircle: starts at 180° (left), goes clockwise to 0° (right)
  const arcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

  return (
    <svg width="64" height="40" viewBox="0 0 64 40" className="overflow-visible">
      {/* Track */}
      <path
        d={arcPath}
        fill="none"
        stroke={track}
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* Progress */}
      <path
        d={arcPath}
        fill="none"
        stroke={fill}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${progress} ${circumference}`}
        style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)" }}
      />
      {/* Score text */}
      <text
        x={cx}
        y={cy + 2}
        textAnchor="middle"
        fill={fill}
        fontSize="12"
        fontWeight="800"
        fontFamily="-apple-system, sans-serif"
        style={{ fontFeatureSettings: '"tnum"' }}
      >
        {score}
      </text>
    </svg>
  );
}

export function TripRiskBadge({ risk, locale }: TripRiskBadgeProps) {
  const [expanded, setExpanded] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const cfg = LEVEL_CONFIG[risk.level];
  const Icon = cfg.icon;

  const factorTypeLabels = {
    airport_status: { es: "Aeropuerto",   en: "Airport"    },
    connection_risk:{ es: "Conexión",     en: "Connection" },
    peak_day:       { es: "Día pico",     en: "Peak day"   },
    imminent:       { es: "Inminente",    en: "Imminent"   },
  };

  return (
    <div className={`rounded-xl border ${cfg.bg} ${cfg.border} overflow-hidden`}>
      {/* Main row */}
      <div className="flex items-center gap-4 px-4 py-3">
      <button
        onClick={() => risk.factors.length > 0 && setExpanded((v) => !v)}
        className="flex-1 flex items-center gap-4 text-left"
      >
        {/* Gauge */}
        <div className="shrink-0">
          <RiskGauge score={risk.score} fill={cfg.fill} track={cfg.track} />
        </div>

        {/* Labels */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${cfg.text} shrink-0`} />
            <span className={`text-sm font-bold ${cfg.text}`}>
              {cfg.label[locale]}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {locale === "en"
              ? `Risk score for this trip · ${risk.factors.length} factor${risk.factors.length !== 1 ? "s" : ""}`
              : `Score de riesgo del viaje · ${risk.factors.length} factor${risk.factors.length !== 1 ? "es" : ""}`}
          </p>
        </div>

        {/* Expand toggle */}
        {risk.factors.length > 0 && (
          <div className={`shrink-0 ${cfg.text} opacity-60`}>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        )}
      </button>

      {/* Tap-to-explain popover */}
      <div className="relative shrink-0">
        <button
          onClick={() => setPopoverOpen((v) => !v)}
          aria-label={locale === "es" ? "Ver factores de riesgo" : "View risk factors"}
          className={`p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors ${cfg.text} opacity-70 hover:opacity-100`}
        >
          <ShieldAlert className="h-3.5 w-3.5" />
        </button>
        {popoverOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setPopoverOpen(false)} />
            <div className="absolute top-full mt-2 right-0 z-50 w-60 bg-[#1a1a2e] border border-white/10 rounded-xl p-3 shadow-2xl text-xs">
              <p className="font-semibold text-gray-200 mb-2 text-sm">
                {locale === "es" ? "Factores de riesgo" : "Risk factors"}
              </p>
              <ul className="space-y-1.5 text-gray-400">
                <li className="flex items-center gap-2"><span>🛫</span> {locale === "es" ? "Estado del aeropuerto" : "Airport status"}</li>
                <li className="flex items-center gap-2"><span>⏱</span> {locale === "es" ? "Tiempos de conexión" : "Connection times"}</li>
                <li className="flex items-center gap-2"><span>🌦</span> {locale === "es" ? "Condiciones climáticas" : "Weather conditions"}</li>
                <li className="flex items-center gap-2"><span>📊</span> {locale === "es" ? "Historial de demoras" : "Delay history"}</li>
              </ul>
            </div>
          </>
        )}
      </div>
      </div>

      {/* Factor details */}
      {expanded && risk.factors.length > 0 && (
        <div className="px-4 pb-3 space-y-1.5 border-t border-white/5 pt-2">
          {risk.factors.map((f, i) => (
            <div key={i} className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className={`px-1.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${cfg.text} bg-white/5`}>
                  {factorTypeLabels[f.type][locale]}
                </span>
                <span className="text-gray-400">{f.label}</span>
              </div>
              <span className={`font-bold ${cfg.text}`}>+{f.points}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
