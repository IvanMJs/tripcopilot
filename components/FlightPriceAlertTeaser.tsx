"use client";

import { useId } from "react";
import { TrendingDown } from "lucide-react";

// ── i18n ──────────────────────────────────────────────────────────────────────

const LABELS = {
  es: {
    badge: "Próximamente",
    title: "Alertas de precio",
    description: "Recibí notificaciones cuando el precio de tu vuelo baje.",
    ctaFree: "Mejorar plan →",
    ctaPaid: "Próximamente",
    route: "Ruta",
  },
  en: {
    badge: "Coming soon",
    title: "Price alerts",
    description: "Get notified when your flight price drops.",
    ctaFree: "Upgrade plan →",
    ctaPaid: "Coming soon",
    route: "Route",
  },
};

// ── Decorative SVG price graph ─────────────────────────────────────────────────

function PriceGraph() {
  const gradId = useId();

  // Fake data points: x from 0–200, y values in a 0–60 range (lower = cheaper)
  const points: [number, number][] = [
    [0, 50],
    [30, 42],
    [60, 55],
    [90, 38],
    [120, 48],
    [150, 30],
    [180, 22],
    [200, 18],
  ];

  const polyline = points.map(([x, y]) => `${x},${y}`).join(" ");

  return (
    <svg
      viewBox="0 0 200 60"
      className="w-full h-10 opacity-60"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      {/* Gradient fill under the line */}
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Filled area */}
      <polygon
        points={`0,60 ${polyline} 200,60`}
        fill={`url(#${gradId})`}
      />

      {/* Line */}
      <polyline
        points={polyline}
        fill="none"
        stroke="#a78bfa"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Last dot (lowest price) */}
      <circle cx="200" cy="18" r="2.5" fill="#a78bfa" />
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface FlightPriceAlertTeaserProps {
  origin: string;
  destination: string;
  locale: "es" | "en";
  planType: string;
  onUpgrade?: () => void;
}

export function FlightPriceAlertTeaser({
  origin,
  destination,
  locale,
  planType,
  onUpgrade,
}: FlightPriceAlertTeaserProps) {
  const L = LABELS[locale];
  const isFree = planType === "free";

  return (
    <div className="rounded-xl border border-[rgba(255,184,0,0.25)] bg-[rgba(255,184,0,0.06)] p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[rgba(255,184,0,0.08)] flex items-center justify-center">
            <TrendingDown className="h-3.5 w-3.5 text-[#FFB800]" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">{L.title}</p>
            <p className="text-[11px] text-gray-500">
              {origin} → {destination}
            </p>
          </div>
        </div>

        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[rgba(255,184,0,0.08)] border border-[rgba(255,184,0,0.25)] text-[#FFB800]">
          {L.badge}
        </span>
      </div>

      {/* Decorative price graph */}
      <PriceGraph />

      {/* Description + CTA */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-gray-500 flex-1">{L.description}</p>

        {isFree ? (
          <button
            onClick={onUpgrade}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-[#FFB800] hover:bg-[#FFC933] text-xs font-bold text-[#07070d] transition-colors"
          >
            {L.ctaFree}
          </button>
        ) : (
          <button
            disabled
            className="flex-shrink-0 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] text-xs font-semibold text-gray-500 cursor-not-allowed"
          >
            {L.ctaPaid}
          </button>
        )}
      </div>
    </div>
  );
}
