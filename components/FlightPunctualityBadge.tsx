"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, ChevronDown, ChevronUp, Lightbulb } from "lucide-react";
import {
  useFlightPunctuality,
  type FlightPunctualityInput,
  type PunctualityRating,
} from "@/hooks/useFlightPunctuality";

// ── Colour config per rating ───────────────────────────────────────────────────

const RATING_CONFIG: Record<
  PunctualityRating,
  { pill: string; bar: string; text: string; expanded: string; border: string }
> = {
  excellent: {
    pill:     "bg-emerald-900/60 text-emerald-300 border-emerald-700/50",
    bar:      "bg-emerald-500",
    text:     "text-emerald-400",
    expanded: "bg-emerald-950/40",
    border:   "border-emerald-800/40",
  },
  good: {
    pill:     "bg-emerald-900/40 text-emerald-400 border-emerald-700/30",
    bar:      "bg-emerald-400",
    text:     "text-emerald-400",
    expanded: "bg-emerald-950/30",
    border:   "border-emerald-800/30",
  },
  average: {
    pill:     "bg-yellow-900/60 text-yellow-300 border-yellow-700/50",
    bar:      "bg-yellow-400",
    text:     "text-yellow-400",
    expanded: "bg-yellow-950/40",
    border:   "border-yellow-800/40",
  },
  poor: {
    pill:     "bg-red-900/60 text-red-300 border-red-700/50",
    bar:      "bg-red-500",
    text:     "text-red-400",
    expanded: "bg-red-950/40",
    border:   "border-red-800/40",
  },
};

const RATING_LABEL: Record<PunctualityRating, { es: string; en: string }> = {
  excellent: { es: "Excelente puntualidad", en: "Excellent punctuality" },
  good:      { es: "Buena puntualidad",     en: "Good punctuality" },
  average:   { es: "Puntualidad regular",   en: "Average punctuality" },
  poor:      { es: "Puntualidad baja",      en: "Poor punctuality" },
};

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  flight: FlightPunctualityInput;
  locale: "es" | "en";
  /** When true, always shows compact pill without expand option */
  pillOnly?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function FlightPunctualityBadge({ flight, locale, pillOnly = false }: Props) {
  const [expanded, setExpanded] = useState(false);
  const data = useFlightPunctuality(flight, locale);
  const cfg = RATING_CONFIG[data.rating];

  const label =
    locale === "es"
      ? `${data.onTimePercent}% a tiempo`
      : `${data.onTimePercent}% on-time`;

  // Compact pill-only mode (no expand)
  if (pillOnly) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${cfg.pill}`}
        title={RATING_LABEL[data.rating][locale]}
      >
        <Clock className="w-2.5 h-2.5 shrink-0" />
        {label}
      </span>
    );
  }

  // Expandable mode
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold transition-opacity hover:opacity-80 ${cfg.pill}`}
        title={RATING_LABEL[data.rating][locale]}
      >
        <Clock className="w-3 h-3 shrink-0" />
        <span>{label}</span>
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>
    );
  }

  return (
    <div className={`rounded-xl border overflow-hidden ${cfg.expanded} ${cfg.border}`}>
      {/* Header button */}
      <button
        onClick={() => setExpanded(false)}
        className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Clock className={`w-3.5 h-3.5 shrink-0 ${cfg.text}`} />
          <span className={`text-xs font-bold ${cfg.text}`}>{label}</span>
          <span className="text-xs text-gray-500 hidden sm:inline">
            · {RATING_LABEL[data.rating][locale]}
          </span>
        </div>
        <ChevronUp className={`w-3.5 h-3.5 shrink-0 ${cfg.text} opacity-60`} />
      </button>

      {/* Expanded detail */}
      <AnimatePresence initial={false}>
        <motion.div
          key="punctuality-detail"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          <div className="px-3 pb-3 border-t border-white/5 space-y-3 pt-2">
            {/* Progress bar */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-xs font-bold ${cfg.text}`}>
                  {data.onTimePercent}%
                </span>
                <span className="text-[10px] text-gray-500">
                  {locale === "es" ? "vuelos a tiempo" : "flights on-time"}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${cfg.bar}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${data.onTimePercent}%` }}
                  transition={{ duration: 0.55, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* Risk factor pills */}
            {data.riskFactors.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">
                  {locale === "es" ? "Factores de riesgo" : "Risk factors"}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {data.riskFactors.map((factor, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-gray-400"
                    >
                      {factor}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Best tip */}
            <div className={`rounded-lg border p-2 text-xs ${cfg.expanded} ${cfg.border}`}>
              <p className={`font-semibold ${cfg.text} mb-0.5 flex items-center gap-1`}>
                <Lightbulb className="w-3 h-3 shrink-0" />
                {locale === "es" ? "Consejo" : "Tip"}
              </p>
              <p className="text-gray-300 leading-snug">{data.bestTip}</p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
