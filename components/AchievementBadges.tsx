"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { TripTab } from "@/lib/types";
import { computeAchievements, type Badge } from "@/lib/achievements";

// ── i18n ──────────────────────────────────────────────────────────────────────

const LABELS = {
  es: {
    title: "Logros",
    locked: "Bloqueado",
    unlocked: "Desbloqueado",
  },
  en: {
    title: "Achievements",
    locked: "Locked",
    unlocked: "Unlocked",
  },
} as const;

// ── localStorage key ──────────────────────────────────────────────────────────

const SEEN_KEY = "tc-badges-seen";

function readSeenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return new Set(JSON.parse(raw ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function markSeenIds(ids: string[]): void {
  try {
    const existing = readSeenIds();
    for (const id of ids) existing.add(id);
    localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(existing)));
  } catch {
    // localStorage unavailable — silently ignore
  }
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface AchievementBadgesProps {
  trips: TripTab[];
  locale: "es" | "en";
}

// ── BadgeCard ─────────────────────────────────────────────────────────────────

function BadgeCard({
  badge,
  isNew,
  locale,
}: {
  badge: Badge;
  isNew: boolean;
  locale: "es" | "en";
}) {
  const L = LABELS[locale];
  const label = badge.label[locale];
  const description = badge.description[locale];

  if (badge.unlocked) {
    return (
      <motion.div
        initial={isNew ? { scale: 0.6, opacity: 0 } : { scale: 1, opacity: 1 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={
          isNew
            ? { type: "spring", stiffness: 320, damping: 18, delay: 0.05 }
            : { duration: 0 }
        }
        className="flex flex-col items-center gap-1.5 rounded-2xl border border-[rgba(255,184,0,0.25)] bg-[rgba(255,184,0,0.06)] p-3 text-center"
        title={description}
      >
        <span className="text-3xl leading-none" aria-hidden>
          {badge.emoji}
        </span>
        <p className="text-[11px] font-bold text-[#FFC933] leading-tight">
          {label}
        </p>
        <span className="text-[9px] font-semibold uppercase tracking-widest text-[#FFB800]/70">
          {L.unlocked}
        </span>
      </motion.div>
    );
  }

  return (
    <div
      className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 text-center opacity-50"
      title={description}
    >
      <span className="text-3xl leading-none grayscale" aria-hidden>
        {badge.emoji}
      </span>
      <p className="text-[11px] font-bold text-gray-500 leading-tight">
        {label}
      </p>
      <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold uppercase tracking-widest text-gray-600">
        <Lock className="h-2.5 w-2.5" />
        {L.locked}
      </span>
    </div>
  );
}

// ── AchievementBadges ─────────────────────────────────────────────────────────

export function AchievementBadges({ trips, locale }: AchievementBadgesProps) {
  const L = LABELS[locale];

  const badges = useMemo(() => computeAchievements(trips), [trips]);

  // Track which unlocked badges are "new" (not seen before this render).
  // Only fire the pop animation on the very first view after unlock.
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const seen = readSeenIds();
    const freshIds = badges
      .filter((b) => b.unlocked && !seen.has(b.id))
      .map((b) => b.id);

    if (freshIds.length > 0) {
      setNewIds(new Set(freshIds));
      markSeenIds(freshIds);
    }
  // Run once after mount; badges is stable at that point.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return (
    <section aria-label={L.title} className="px-4 pb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-black text-white">{L.title}</h2>
        <span className="text-xs text-gray-500 tabular-nums">
          {unlockedCount} / {badges.length}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {badges.map((badge) => (
          <BadgeCard
            key={badge.id}
            badge={badge}
            isNew={newIds.has(badge.id)}
            locale={locale}
          />
        ))}
      </div>
    </section>
  );
}
