"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { MILESTONES, type Milestone, type MilestoneStats } from "@/lib/milestones";

// ── Labels ────────────────────────────────────────────────────────────────────

const LABELS = {
  es: {
    title: "Logros",
    unlocked: (n: number, total: number) => `${n}/${total} desbloqueados`,
    locked: "???",
    progressLabel: (pct: number) => `${pct}% completado`,
  },
  en: {
    title: "Achievements",
    unlocked: (n: number, total: number) => `${n}/${total} unlocked`,
    locked: "???",
    progressLabel: (pct: number) => `${pct}% complete`,
  },
} as const;

// ── Props ─────────────────────────────────────────────────────────────────────

interface MilestoneGridProps {
  stats: MilestoneStats;
  locale: "es" | "en";
}

// ── MilestoneBadge ────────────────────────────────────────────────────────────

interface MilestoneBadgeProps {
  milestone: Milestone;
  isUnlocked: boolean;
  progress: number;
  locale: "es" | "en";
}

function MilestoneBadge({
  milestone,
  isUnlocked,
  progress,
  locale,
}: MilestoneBadgeProps) {
  const L = LABELS[locale];
  const pct = Math.round(progress * 100);

  if (isUnlocked) {
    return (
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className="flex flex-col items-center gap-2 rounded-2xl border border-[rgba(255,184,0,0.28)] bg-[rgba(255,184,0,0.06)] p-3 text-center"
        title={milestone.description[locale]}
      >
        <span className="text-3xl leading-none" aria-hidden="true">
          {milestone.emoji}
        </span>
        <p className="text-[11px] font-bold text-[#FFC933] leading-tight">
          {milestone.title[locale]}
        </p>
      </motion.div>
    );
  }

  return (
    <div
      className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/[0.10] bg-white/[0.02] p-3 text-center"
      title={L.progressLabel(pct)}
    >
      <span
        className="text-3xl leading-none grayscale opacity-30"
        aria-hidden="true"
      >
        {milestone.emoji}
      </span>
      <p className="text-[11px] font-bold text-gray-600 leading-tight">
        {L.locked}
      </p>
      {/* Progress bar */}
      <div className="w-full h-1 rounded-full bg-white/[0.08] overflow-hidden">
        <div
          className="h-full rounded-full bg-[#FFB800]/50 transition-all duration-500"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={L.progressLabel(pct)}
        />
      </div>
    </div>
  );
}

// ── MilestoneGrid ─────────────────────────────────────────────────────────────

export function MilestoneGrid({ stats, locale }: MilestoneGridProps) {
  const [open, setOpen] = useState(true);
  const L = LABELS[locale];

  const unlockedIds = new Set(
    MILESTONES.filter((m) => {
      const value =
        m.type === "flights"
          ? stats.totalFlights
          : m.type === "countries"
            ? stats.uniqueCountries
            : m.type === "airports"
              ? stats.uniqueAirports
              : stats.totalDistanceKm;
      return value >= m.threshold;
    }).map((m) => m.id),
  );

  function getProgress(milestone: Milestone): number {
    const value =
      milestone.type === "flights"
        ? stats.totalFlights
        : milestone.type === "countries"
          ? stats.uniqueCountries
          : milestone.type === "airports"
            ? stats.uniqueAirports
            : stats.totalDistanceKm;
    return Math.min(1, value / milestone.threshold);
  }

  const unlockedCount = unlockedIds.size;
  const total = MILESTONES.length;

  return (
    <section
      aria-label={L.title}
      className="mx-4 mb-4 rounded-2xl border border-white/[0.07] bg-white/[0.03] overflow-hidden"
    >
      {/* Header — tap to collapse */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 border-b border-white/[0.05] text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <span className="text-base leading-none" aria-hidden="true">
            🏆
          </span>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">
            {L.title}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-600 tabular-nums">
            {L.unlocked(unlockedCount, total)}
          </span>
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-gray-600"
          >
            <ChevronDown className="h-4 w-4" />
          </motion.span>
        </div>
      </button>

      {/* Grid */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="grid"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-3 gap-2 p-3 sm:grid-cols-4">
              {MILESTONES.map((milestone) => (
                <MilestoneBadge
                  key={milestone.id}
                  milestone={milestone}
                  isUnlocked={unlockedIds.has(milestone.id)}
                  progress={getProgress(milestone)}
                  locale={locale}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
