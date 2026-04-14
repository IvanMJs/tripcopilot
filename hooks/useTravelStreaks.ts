"use client";

import { useMemo, useEffect, useState } from "react";
import { TripTab } from "@/lib/types";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TravelStreakData {
  tripStreak: number;
  checklistStreak: number;
  earlyBirdStreak: number;
  longestTripStreak: number;
  isOnFire: boolean;
}

interface PersistedStreaks {
  longestTripStreak: number;
}

const STORAGE_KEY = "tc-travel-streaks";

// ── Helpers ───────────────────────────────────────────────────────────────────

function readPersistedStreaks(): PersistedStreaks {
  if (typeof window === "undefined") return { longestTripStreak: 0 };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { longestTripStreak: 0 };
    return JSON.parse(raw) as PersistedStreaks;
  } catch {
    return { longestTripStreak: 0 };
  }
}

function writePersistedStreaks(data: PersistedStreaks): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage unavailable — silently ignore
  }
}

/**
 * Compute consecutive months with at least 1 trip (counting backwards from the
 * most recent trip month).
 */
function computeTripStreak(trips: TripTab[]): { current: number; longest: number } {
  const monthSet = new Set<string>();
  for (const trip of trips) {
    for (const flight of trip.flights) {
      if (flight.isoDate) {
        const ym = flight.isoDate.slice(0, 7); // "YYYY-MM"
        monthSet.add(ym);
      }
    }
  }

  if (monthSet.size === 0) return { current: 0, longest: 0 };

  // Sort descending
  const months = Array.from(monthSet).sort((a, b) => b.localeCompare(a));

  // Current streak: consecutive months going backwards from the most recent
  let current = 1;
  for (let i = 1; i < months.length; i++) {
    const [y1, m1] = months[i - 1].split("-").map(Number);
    const [y2, m2] = months[i].split("-").map(Number);
    const diff = (y1 * 12 + m1) - (y2 * 12 + m2);
    if (diff === 1) {
      current++;
    } else {
      break;
    }
  }

  // Longest streak: scan all months sorted ascending
  const ascending = Array.from(monthSet).sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < ascending.length; i++) {
    const [y1, m1] = ascending[i - 1].split("-").map(Number);
    const [y2, m2] = ascending[i].split("-").map(Number);
    const diff = (y2 * 12 + m2) - (y1 * 12 + m1);
    if (diff === 1) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }

  return { current, longest };
}

/**
 * Compute consecutive trips (sorted by first flight date, ascending) where the
 * checklist was 100% completed before departure. Reads completion data from
 * localStorage keys written by TripChecklist.
 */
function computeChecklistStreak(trips: TripTab[]): number {
  // Build ordered list of trip IDs by earliest flight date
  const sortable = trips
    .map((t) => {
      const dates = t.flights.map((f) => f.isoDate).filter(Boolean).sort();
      return { id: t.id, earliestDate: dates[0] ?? "" };
    })
    .filter((t) => t.earliestDate)
    .sort((a, b) => a.earliestDate.localeCompare(b.earliestDate));

  if (sortable.length === 0) return 0;

  // Check completion in localStorage — TripChecklist stores `tc-checklist-{tripId}`
  // as an array of checked item IDs. We consider it complete when the stored count
  // equals the default checklist length (5 standard items minimum).
  const CHECKLIST_COMPLETE_KEY_PREFIX = "tc-checklist-complete-";

  let streak = 0;
  // Walk backwards from most recent trip
  for (let i = sortable.length - 1; i >= 0; i--) {
    const tripId = sortable[i].id;
    let completed = false;
    try {
      const raw = typeof window !== "undefined"
        ? localStorage.getItem(`${CHECKLIST_COMPLETE_KEY_PREFIX}${tripId}`)
        : null;
      completed = raw === "true";
    } catch {
      completed = false;
    }
    if (completed) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Compute consecutive trips where the user opened the app >24h before departure.
 * Reads open timestamps from localStorage keys `tc-early-open-{tripId}`.
 */
function computeEarlyBirdStreak(trips: TripTab[]): number {
  const sortable = trips
    .map((t) => {
      const dates = t.flights.map((f) => f.isoDate).filter(Boolean).sort();
      return {
        id: t.id,
        earliestDate: dates[0] ?? "",
        earliestDeparture: t.flights
          .filter((f) => f.isoDate && f.departureTime)
          .sort((a, b) => a.isoDate.localeCompare(b.isoDate))[0],
      };
    })
    .filter((t) => t.earliestDate)
    .sort((a, b) => a.earliestDate.localeCompare(b.earliestDate));

  if (sortable.length === 0) return 0;

  const EARLY_KEY_PREFIX = "tc-early-open-";
  const MS_24H = 24 * 60 * 60 * 1000;

  let streak = 0;
  for (let i = sortable.length - 1; i >= 0; i--) {
    const { id, earliestDeparture } = sortable[i];
    let isEarly = false;
    try {
      const raw = typeof window !== "undefined"
        ? localStorage.getItem(`${EARLY_KEY_PREFIX}${id}`)
        : null;
      if (raw && earliestDeparture) {
        const openTime = parseInt(raw, 10);
        const depMs = new Date(`${earliestDeparture.isoDate}T${earliestDeparture.departureTime}:00`).getTime();
        isEarly = depMs - openTime > MS_24H;
      }
    } catch {
      isEarly = false;
    }
    if (isEarly) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTravelStreaks(trips: TripTab[]): TravelStreakData {
  const [persisted, setPersisted] = useState<PersistedStreaks>({ longestTripStreak: 0 });

  useEffect(() => {
    setPersisted(readPersistedStreaks());
  }, []);

  const streaks = useMemo((): TravelStreakData => {
    const { current: tripStreak, longest: computedLongest } = computeTripStreak(trips);
    const checklistStreak = computeChecklistStreak(trips);
    const earlyBirdStreak = computeEarlyBirdStreak(trips);

    const longestTripStreak = Math.max(computedLongest, persisted.longestTripStreak, tripStreak);
    const isOnFire = tripStreak >= 3 || checklistStreak >= 3 || earlyBirdStreak >= 3;

    return {
      tripStreak,
      checklistStreak,
      earlyBirdStreak,
      longestTripStreak,
      isOnFire,
    };
  }, [trips, persisted]);

  // Persist longest streak
  useEffect(() => {
    if (streaks.longestTripStreak > persisted.longestTripStreak) {
      const updated: PersistedStreaks = { longestTripStreak: streaks.longestTripStreak };
      writePersistedStreaks(updated);
      setPersisted(updated);
    }
  }, [streaks.longestTripStreak, persisted.longestTripStreak]);

  return streaks;
}
