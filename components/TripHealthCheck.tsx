"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface HealthCheckItem {
  emoji: string;
  title: string;
  body: string;
  level: "ok" | "warning" | "tip";
}

interface HealthCheckResult {
  overallScore: number;
  scoreLabel: string;
  items: HealthCheckItem[];
  aiTip: string;
}

interface TripHealthCheckProps {
  tripId: string;
  locale: "es" | "en";
}

// ── Labels ────────────────────────────────────────────────────────────────────

const LABELS = {
  es: {
    title: "Health Check IA",
    subtitle: "Resumen inteligente antes de tu viaje",
    refresh: "Actualizar",
    loading: "Analizando tu viaje...",
    error: "No se pudo cargar. Intentá de nuevo.",
    score: "Puntaje del viaje",
  },
  en: {
    title: "AI Health Check",
    subtitle: "Smart briefing before your trip",
    refresh: "Refresh",
    loading: "Analysing your trip...",
    error: "Could not load. Try again.",
    score: "Trip score",
  },
};

// ── Level styles ──────────────────────────────────────────────────────────────

const LEVEL_STYLES: Record<HealthCheckItem["level"], string> = {
  ok: "border-l-emerald-500 bg-emerald-950/20",
  warning: "border-l-amber-500 bg-amber-950/20",
  tip: "border-l-[#FFB800] bg-[rgba(255,184,0,0.06)]",
};

// ── Score color ───────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function HealthCheckSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-10 w-24 rounded-lg bg-white/[0.06]" />
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="h-12 rounded-lg bg-white/[0.04] border-l-2 border-l-white/10 pl-3"
        />
      ))}
      <div className="h-6 w-3/4 rounded bg-white/[0.04]" />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function TripHealthCheck({ tripId, locale }: TripHealthCheckProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [data, setData] = useState<HealthCheckResult | null>(null);
  const labels = LABELS[locale];

  async function fetchHealthCheck() {
    setStatus("loading");
    try {
      const res = await fetch("/api/trip-health-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId, locale }),
      });
      const json = (await res.json()) as { data?: HealthCheckResult; error?: string };
      if (!res.ok || !json.data) {
        setStatus("error");
        return;
      }
      setData(json.data);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => {
    fetchHealthCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, locale]);

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white">{labels.title}</h3>
            <span className="rounded-full bg-[rgba(255,184,0,0.12)] border border-[rgba(255,184,0,0.25)] px-1.5 py-0.5 text-[10px] font-medium text-[#FFB800]">
              AI
            </span>
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5">{labels.subtitle}</p>
        </div>
        <button
          onClick={fetchHealthCheck}
          disabled={status === "loading"}
          aria-label={labels.refresh}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RefreshCw
            className={`h-3 w-3 ${status === "loading" ? "animate-spin" : ""}`}
          />
          {labels.refresh}
        </button>
      </div>

      {/* Body */}
      {status === "loading" && <HealthCheckSkeleton />}

      {status === "error" && (
        <p className="text-[12px] text-red-400 text-center py-2">{labels.error}</p>
      )}

      {status === "done" && data && (
        <div className="space-y-3">
          {/* Score */}
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-bold tabular-nums ${scoreColor(data.overallScore)}`}>
              {data.overallScore}
            </span>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide leading-none">
                {labels.score}
              </p>
              <p className="text-xs text-gray-300 leading-tight">{data.scoreLabel}</p>
            </div>
          </div>

          {/* Items */}
          <AnimatePresence>
            <div className="space-y-2">
              {data.items.map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`border-l-2 rounded-r-lg px-3 py-2 ${LEVEL_STYLES[item.level]}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-base leading-none mt-0.5" aria-hidden="true">
                      {item.emoji}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium text-white leading-tight">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-gray-400 leading-snug mt-0.5 truncate">
                        {item.body}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>

          {/* AI Tip */}
          <p className="text-[11px] italic text-[#FFB800] leading-snug">
            ✨ {data.aiTip}
          </p>
        </div>
      )}
    </div>
  );
}
