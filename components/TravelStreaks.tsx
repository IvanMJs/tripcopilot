"use client";

import { motion } from "framer-motion";
import { TripTab } from "@/lib/types";
import { useTravelStreaks } from "@/hooks/useTravelStreaks";

// ── Labels ────────────────────────────────────────────────────────────────────

const LABELS = {
  es: {
    title: "Rachas de viaje",
    months: (n: number) => `${n} ${n === 1 ? "mes" : "meses"} seguido${n !== 1 ? "s" : ""}`,
    checklistLabel: "Checklists completas",
    earlyBirdLabel: "Madrugador",
    monthStreakLabel: "Meses seguidos",
    best: (n: number) => `Mejor: ${n}`,
    inactive: "Sin racha",
  },
  en: {
    title: "Travel streaks",
    months: (n: number) => `${n} month${n !== 1 ? "s" : ""} in a row`,
    checklistLabel: "Checklists done",
    earlyBirdLabel: "Early bird",
    monthStreakLabel: "Month streak",
    best: (n: number) => `Best: ${n}`,
    inactive: "No streak",
  },
} as const;

// ── Props ─────────────────────────────────────────────────────────────────────

interface TravelStreaksProps {
  trips: TripTab[];
  locale: "es" | "en";
}

// ── StreakCounter ─────────────────────────────────────────────────────────────

interface StreakCounterProps {
  emoji: string;
  count: number;
  label: string;
  inactive: string;
  active: boolean;
  delay: number;
}

function StreakCounter({ emoji, count, label, inactive, active, delay }: StreakCounterProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border transition-colors ${
        active
          ? "bg-amber-950/30 border-amber-700/40"
          : "bg-white/[0.03] border-white/[0.06]"
      }`}
    >
      <span className="text-xl leading-none" aria-hidden>
        {active ? "🔥" : emoji}
      </span>
      <span
        className={`text-2xl font-black leading-none tabular-nums ${
          active ? "text-amber-300" : "text-gray-500"
        }`}
      >
        {count}
      </span>
      <span className="text-[10px] font-semibold text-center leading-tight text-gray-500 px-1">
        {count > 0 ? label : inactive}
      </span>
    </motion.div>
  );
}

// ── TravelStreaks ─────────────────────────────────────────────────────────────

export function TravelStreaks({ trips, locale }: TravelStreaksProps) {
  const L = LABELS[locale];
  const { tripStreak, checklistStreak, earlyBirdStreak, longestTripStreak, isOnFire } =
    useTravelStreaks(trips);

  return (
    <div className="px-4 pb-4">
      {/* Card with optional fire border */}
      <div
        className={`rounded-2xl p-3 relative overflow-hidden transition-all ${
          isOnFire
            ? "border border-amber-500/50 bg-gradient-to-br from-amber-950/20 via-orange-950/10 to-transparent"
            : "border border-white/[0.07] bg-white/[0.02]"
        }`}
      >
        {/* Animated glow when on fire */}
        {isOnFire && (
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            style={{
              background:
                "radial-gradient(ellipse at 50% 0%, rgba(251,146,60,0.15) 0%, transparent 70%)",
            }}
          />
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-3 relative z-10">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
            {L.title}
          </span>
          {longestTripStreak > 0 && (
            <span className="text-[10px] font-semibold text-amber-600/80">
              {L.best(longestTripStreak)}
            </span>
          )}
        </div>

        {/* Three counters */}
        <div className="flex gap-2 relative z-10">
          <StreakCounter
            emoji="📅"
            count={tripStreak}
            label={L.monthStreakLabel}
            inactive={L.inactive}
            active={tripStreak >= 3}
            delay={0}
          />
          <StreakCounter
            emoji="✅"
            count={checklistStreak}
            label={L.checklistLabel}
            inactive={L.inactive}
            active={checklistStreak >= 3}
            delay={0.05}
          />
          <StreakCounter
            emoji="⏰"
            count={earlyBirdStreak}
            label={L.earlyBirdLabel}
            inactive={L.inactive}
            active={earlyBirdStreak >= 3}
            delay={0.1}
          />
        </div>
      </div>
    </div>
  );
}
