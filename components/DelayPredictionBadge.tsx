"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, AlertTriangle, TrendingUp } from "lucide-react";
import { type DelayPrediction, type DelayFactor } from "@/lib/delayPrediction";

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  prediction: DelayPrediction;
  locale: "es" | "en";
  compact?: boolean;
}

// ── Risk level configuration ──────────────────────────────────────────────────

const RISK_CONFIG = {
  minimal: {
    bg: "bg-emerald-950/40",
    border: "border-emerald-800/40",
    text: "text-emerald-400",
    badge: "bg-emerald-900/60 text-emerald-300 border-emerald-700/50",
    bar: "bg-emerald-500",
    label: { es: "Riesgo mínimo", en: "Minimal risk" },
  },
  low: {
    bg: "bg-emerald-950/30",
    border: "border-emerald-800/30",
    text: "text-emerald-400",
    badge: "bg-emerald-900/50 text-emerald-300 border-emerald-700/40",
    bar: "bg-emerald-400",
    label: { es: "Riesgo bajo", en: "Low risk" },
  },
  moderate: {
    bg: "bg-yellow-950/40",
    border: "border-yellow-800/40",
    text: "text-yellow-400",
    badge: "bg-yellow-900/60 text-yellow-300 border-yellow-700/50",
    bar: "bg-yellow-400",
    label: { es: "Riesgo moderado", en: "Moderate risk" },
  },
  high: {
    bg: "bg-orange-950/40",
    border: "border-orange-800/40",
    text: "text-orange-400",
    badge: "bg-orange-900/60 text-orange-300 border-orange-700/50",
    bar: "bg-orange-400",
    label: { es: "Riesgo alto", en: "High risk" },
  },
  very_high: {
    bg: "bg-red-950/50",
    border: "border-red-800/50",
    text: "text-red-400",
    badge: "bg-red-900/60 text-red-300 border-red-700/50",
    bar: "bg-red-500",
    label: { es: "Riesgo muy alto", en: "Very high risk" },
  },
} as const;

// ── Factor type labels ────────────────────────────────────────────────────────

const FACTOR_TYPE_LABELS: Record<
  DelayFactor["type"],
  { es: string; en: string }
> = {
  faa_status: { es: "FAA", en: "FAA" },
  weather_origin: { es: "Clima origen", en: "Origin weather" },
  weather_destination: { es: "Clima destino", en: "Dest. weather" },
  time_of_day: { es: "Hora", en: "Time" },
  airport_congestion: { es: "Historial", en: "History" },
  day_of_week: { es: "Día", en: "Day" },
  season: { es: "Temporada", en: "Season" },
};

// ── Confidence dot ────────────────────────────────────────────────────────────

function ConfidenceDot({ confidence }: { confidence: DelayPrediction["confidence"] }) {
  const colors = {
    low: "bg-gray-500",
    medium: "bg-yellow-400",
    high: "bg-emerald-400",
  };
  return (
    <span className={`inline-block w-1.5 h-1.5 rounded-full ${colors[confidence]}`} />
  );
}

// ── Compact pill (default render) ─────────────────────────────────────────────

function CompactPill({
  prediction,
  locale,
  onClick,
}: {
  prediction: DelayPrediction;
  locale: "es" | "en";
  onClick: () => void;
}) {
  const cfg = RISK_CONFIG[prediction.riskLevel];

  const label =
    locale === "es"
      ? `${prediction.probability}% riesgo de retraso`
      : `${prediction.probability}% delay risk`;

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold transition-opacity hover:opacity-80 ${cfg.badge}`}
      title={cfg.label[locale]}
    >
      <TrendingUp className="w-3 h-3 shrink-0" />
      <span>{label}</span>
    </button>
  );
}

// ── Expanded detail panel ─────────────────────────────────────────────────────

function ExpandedPanel({
  prediction,
  locale,
}: {
  prediction: DelayPrediction;
  locale: "es" | "en";
}) {
  const cfg = RISK_CONFIG[prediction.riskLevel];

  const confidenceLabel = {
    low: { es: "Baja", en: "Low" },
    medium: { es: "Media", en: "Medium" },
    high: { es: "Alta", en: "High" },
  }[prediction.confidence][locale];

  return (
    <div className="space-y-3 pt-2">
      {/* Probability bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className={`text-xs font-bold ${cfg.text}`}>
            {prediction.probability}%
          </span>
          <span className="flex items-center gap-1 text-xs text-text-muted">
            <ConfidenceDot confidence={prediction.confidence} />
            {locale === "es" ? `Confianza ${confidenceLabel}` : `${confidenceLabel} confidence`}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${cfg.bar}`}
            initial={{ width: 0 }}
            animate={{ width: `${prediction.probability}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Estimated delay */}
      {prediction.estimatedDelayMinutes !== null && (
        <p className={`text-xs font-medium ${cfg.text}`}>
          {locale === "es"
            ? `Demora estimada: ~${prediction.estimatedDelayMinutes} min`
            : `Est. delay: ~${prediction.estimatedDelayMinutes} min`}
        </p>
      )}

      {/* Contributing factors */}
      {prediction.factors.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-text-muted">
            {locale === "es" ? "Factores" : "Factors"}
          </p>
          {prediction.factors.map((factor, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span
                className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${cfg.text} bg-white/5 border border-white/5`}
              >
                {FACTOR_TYPE_LABELS[factor.type][locale]}
              </span>
              <span className="text-text-muted leading-tight">{factor.signal}</span>
            </div>
          ))}
        </div>
      )}

      {/* Recommendation */}
      <div className={`rounded-lg border p-2 text-xs ${cfg.bg} ${cfg.border}`}>
        <p className={`font-medium ${cfg.text} mb-0.5 flex items-center gap-1`}>
          <AlertTriangle className="w-3 h-3 shrink-0" />
          {locale === "es" ? "Recomendación" : "Recommendation"}
        </p>
        <p className="text-gray-300 leading-snug">{prediction.recommendation}</p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DelayPredictionBadge({ prediction, locale, compact = true }: Props) {
  const riskLevel = prediction.riskLevel;
  const [expanded, setExpanded] = useState(() =>
    riskLevel === "high" || riskLevel === "very_high"
  );
  const cfg = RISK_CONFIG[prediction.riskLevel];

  if (compact && !expanded) {
    return (
      <CompactPill
        prediction={prediction}
        locale={locale}
        onClick={() => setExpanded(true)}
      />
    );
  }

  return (
    <div
      className={`rounded-xl border overflow-hidden ${cfg.bg} ${cfg.border}`}
    >
      {/* Header row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <TrendingUp className={`w-3.5 h-3.5 shrink-0 ${cfg.text}`} />
          <span className={`text-xs font-bold ${cfg.text}`}>
            {locale === "es"
              ? `${prediction.probability}% riesgo de retraso`
              : `${prediction.probability}% delay risk`}
          </span>
          <span className="text-xs text-text-muted hidden sm:inline">
            · {cfg.label[locale]}
          </span>
        </div>
        <div className={`shrink-0 ${cfg.text} opacity-60`}>
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </div>
      </button>

      {/* Expandable detail */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 border-t border-white/5">
              <ExpandedPanel prediction={prediction} locale={locale} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
