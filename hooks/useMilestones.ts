"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  computeMilestoneStats,
  getNextMilestone,
  getUnlockedMilestones,
  type Milestone,
} from "@/lib/milestones";
import type { TripTab } from "@/lib/types";

// ── localStorage helpers ──────────────────────────────────────────────────────

function seenKey(userId: string): string {
  return `tc-milestones-seen-${userId}`;
}

function readSeenIds(userId: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(seenKey(userId));
    return new Set(JSON.parse(raw ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function writeSeenIds(userId: string, ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(seenKey(userId), JSON.stringify(Array.from(ids)));
  } catch {
    // localStorage unavailable — silently ignore
  }
}

// ── Return type ───────────────────────────────────────────────────────────────

export interface UseMilestonesReturn {
  /** All milestones that the user has already reached. */
  unlockedMilestones: Milestone[];
  /** The next milestone the user is closest to unlocking (with progress 0–1). */
  nextMilestone: { milestone: Milestone; progress: number } | null;
  /** A newly-unlocked milestone not yet seen by the user (for the toast). */
  newMilestone: Milestone | null;
  /** Mark the current newMilestone as seen and clear it. */
  dismissMilestone: () => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useMilestones(
  userId: string | null,
  trips: TripTab[],
): UseMilestonesReturn {
  const [newMilestone, setNewMilestone] = useState<Milestone | null>(null);
  const initialized = useRef(false);

  const stats = useMemo(() => computeMilestoneStats(trips), [trips]);

  const unlockedMilestones = useMemo(
    () => getUnlockedMilestones(stats),
    [stats],
  );

  const nextMilestone = useMemo(() => getNextMilestone(stats), [stats]);

  // On mount (or when userId/trips change), find the first unseen unlocked milestone.
  // We only run this once per mount to avoid repeated toasts on re-renders.
  useEffect(() => {
    if (initialized.current) return;
    if (!userId) return;
    initialized.current = true;

    const seen = readSeenIds(userId);
    const fresh = unlockedMilestones.find((m) => !seen.has(m.id));

    if (fresh) {
      setNewMilestone(fresh);
    }
    // Intentionally depends only on userId to fire once after mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const dismissMilestone = () => {
    if (!userId || !newMilestone) return;
    const seen = readSeenIds(userId);
    seen.add(newMilestone.id);
    writeSeenIds(userId, seen);
    setNewMilestone(null);
  };

  return {
    unlockedMilestones,
    nextMilestone,
    newMilestone,
    dismissMilestone,
  };
}
