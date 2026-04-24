"use client";

import { useState, useEffect } from "react";
import { Plus, Zap, Clock, Shield, Ticket } from "lucide-react";
import { motion } from "framer-motion";

interface FlightsEmptyStateProps {
  locale: "es" | "en";
  onCreateTrip: () => void;
}

const LABELS = {
  es: {
    ghostLabel: "Así se verá tu vuelo",
    ghostSub: "Delay en vivo · boarding pass · countdown",
    cta: "Agregar mi primer vuelo",
    socialProofSuffix: "vuelos rastreados hoy",
    features: [
      { label: "Delays FAA", sub: "En vivo" },
      { label: "Countdown", sub: "Exacto" },
      { label: "Conexión", sub: "Riesgo" },
    ],
  },
  en: {
    ghostLabel: "This is how your flight will look",
    ghostSub: "Live delay · boarding pass · countdown",
    cta: "Add my first flight",
    socialProofSuffix: "flights tracked today",
    features: [
      { label: "FAA Delays", sub: "Live" },
      { label: "Countdown", sub: "Precise" },
      { label: "Connection", sub: "Risk" },
    ],
  },
} as const;

function useCountUp(target: number, durationMs = 1200): number {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (target === 0) { setCurrent(0); return; }
    let startTime: number | null = null;
    let raf: number;

    function tick(ts: number) {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return current;
}

export function FlightsEmptyState({ locale, onCreateTrip }: FlightsEmptyStateProps) {
  const L = LABELS[locale];
  const BASE_COUNT = 3241;
  const [trackedCount, setTrackedCount] = useState(BASE_COUNT);
  const animatedCount = useCountUp(trackedCount, 1200);

  useEffect(() => {
    const interval = setInterval(() => {
      setTrackedCount(c => c + Math.floor(Math.random() * 2 + 1));
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  const toneClasses = {
    violet:  "border-[rgba(255,184,0,0.25)] text-[#FFB800] bg-[rgba(255,184,0,0.12)][0.08]",
    blue:    "border-blue-500/20 text-blue-300 bg-blue-500/[0.08]",
    emerald: "border-emerald-500/20 text-emerald-300 bg-emerald-500/[0.08]",
  } as const;

  const featureTones = ["violet", "blue", "emerald"] as const;
  const FeatureIcons = [Zap, Clock, Shield];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col gap-3 px-4 pt-1 pb-2"
    >
      {/* Ghost boarding pass */}
      <div className="relative">
        <div
          className="rounded-2xl border border-white/[0.07] bg-gradient-to-br from-[#0f0f17] to-[#0a0a14] p-4 select-none pointer-events-none"
          style={{ filter: "blur(2.5px)", opacity: 0.7 }}
          aria-hidden
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-blue-500/20 border border-blue-500/20" />
              <div>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-16 bg-white/25 rounded-full" />
                  <div className="h-3 w-8 bg-white/15 rounded-full" />
                </div>
                <div className="h-2 w-20 bg-white/10 rounded-full mt-1.5" />
              </div>
            </div>
            <div className="rounded-full bg-emerald-500/20 border border-emerald-500/25 px-2.5 py-1 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <div className="h-2 w-12 bg-emerald-400/40 rounded-full" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div>
              <div className="h-8 w-12 bg-white/25 rounded-lg mb-1" />
              <div className="h-2 w-8 bg-white/10 rounded-full" />
            </div>
            <div className="flex-1 flex flex-col items-center gap-1 px-2">
              <div className="h-1.5 w-10 bg-white/10 rounded-full" />
              <div className="w-full h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
              <div className="h-3 w-3 bg-white/10 rounded-full" />
            </div>
            <div className="text-right">
              <div className="h-8 w-12 bg-white/25 rounded-lg mb-1 ml-auto" />
              <div className="h-2 w-8 bg-white/10 rounded-full ml-auto" />
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.05]">
            <div className="h-2 w-20 bg-white/10 rounded-full" />
            <div className="h-6 w-16 bg-[rgba(255,184,0,0.12)] rounded-lg" />
          </div>
        </div>
        <div className="absolute inset-0 rounded-2xl bg-[#080810]/75 flex flex-col items-center justify-center gap-2">
          <div className="flex items-center gap-2 bg-[rgba(255,184,0,0.12)] border border-[rgba(255,184,0,0.25)] rounded-full px-3 py-1.5 backdrop-blur-sm">
            <Ticket size={13} className="text-[#FFB800]" />
            <span className="text-[11px] font-black text-white">{L.ghostLabel}</span>
          </div>
          <p className="text-[10px] text-gray-400 text-center px-8 leading-relaxed">{L.ghostSub}</p>
        </div>
      </div>

      {/* Flight arc + social proof */}
      <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-[#0f0f17] to-[#080810] overflow-hidden">
        <div className="relative" style={{ height: 90 }}>
          <svg viewBox="0 0 320 90" fill="none" className="absolute inset-0 w-full h-full">
            <defs>
              <linearGradient id="emptyArcGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#8b5cf6" stopOpacity="0.4" />
                <stop offset="0.5" stopColor="#a78bfa" stopOpacity="1" />
                <stop offset="1" stopColor="#8b5cf6" stopOpacity="0.4" />
              </linearGradient>
            </defs>
            <path d="M 28 76 Q 160 -15 292 76" stroke="rgba(139,92,246,0.15)" strokeWidth="10" fill="none" style={{ filter: "blur(4px)" }} />
            <motion.path
              d="M 28 76 Q 160 -15 292 76"
              stroke="url(#emptyArcGrad)"
              strokeWidth="1.5"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.6, ease: [0.4, 0, 0.2, 1], delay: 0.3 }}
            />
            <circle cx="28" cy="76" r="3.5" fill="#8b5cf6" />
            <circle cx="28" cy="76" r="3.5" fill="#8b5cf6" opacity="0.5">
              <animate attributeName="r" from="3.5" to="12" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="292" cy="76" r="3.5" fill="#8b5cf6" />
            <circle cx="292" cy="76" r="3.5" fill="#8b5cf6" opacity="0.5">
              <animate attributeName="r" from="3.5" to="12" dur="2s" begin="0.3s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.5" to="0" dur="2s" begin="0.3s" repeatCount="indefinite" />
            </circle>
          </svg>
          <div className="absolute bottom-1.5 left-4">
            <p className="font-mono text-base font-black text-white leading-none tabular-nums">EZE</p>
            <p className="text-[8px] text-gray-600">Buenos Aires</p>
          </div>
          <div className="absolute bottom-1.5 right-4 text-right">
            <p className="font-mono text-base font-black text-white leading-none tabular-nums">MIA</p>
            <p className="text-[8px] text-gray-600">Miami</p>
          </div>
          <motion.div
            className="absolute top-1 left-1/2 -translate-x-1/2 text-base select-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, y: [0, -6, 0] }}
            transition={{
              opacity: { delay: 2, duration: 0.3 },
              y: { delay: 2, duration: 3, repeat: Infinity, ease: "easeInOut" },
            }}
          >
            ✈️
          </motion.div>
        </div>
        <div className="flex items-center justify-center gap-2 pb-3 border-t border-white/[0.04] pt-2.5">
          <div className="flex -space-x-1">
            {(["#8b5cf6", "#3b82f6", "#10b981"] as const).map((c, i) => (
              <div
                key={i}
                className="h-5 w-5 rounded-full border border-[#080810] text-[9px] flex items-center justify-center"
                style={{ background: `${c}44` }}
              >
                ✈
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-400">
            <span className="font-black text-white tabular-nums">
              {animatedCount.toLocaleString(locale === "es" ? "es-AR" : "en-US")}
            </span>{" "}
            {L.socialProofSuffix}
          </p>
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={onCreateTrip}
        className="animate-glow-pulse relative overflow-hidden w-full rounded-2xl bg-gradient-to-r from-[#FFB800] to-[#E6A500] text-white font-black py-4 text-[15px] active:scale-[0.98] transition-transform shimmer-btn"
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          <Plus size={20} strokeWidth={2.5} />
          {L.cta}
        </span>
      </button>

      {/* Feature pills */}
      <div className="flex gap-2">
        {L.features.map(({ label, sub }, i) => {
          const Icon = FeatureIcons[i];
          const tone = featureTones[i];
          return (
            <div
              key={label}
              className={`flex-1 rounded-xl border ${toneClasses[tone]} flex flex-col items-center justify-center gap-0.5 py-2.5`}
            >
              <Icon size={14} />
              <span className="text-[10px] font-bold">{label}</span>
              <span className="text-[9px] text-gray-600">{sub}</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
