"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { LiveFlightData } from "@/app/api/flight-live/route";

export type { LiveFlightData };

// Statuses that mean the flight is still active and worth polling
const ACTIVE_STATUSES: LiveFlightData["status"][] = ["scheduled", "delayed", "departed"];

const POLL_INTERVAL = 3 * 60 * 1000; // 3 minutes

// Module-level cache to avoid redundant fetches across component remounts
const _cache: Record<string, { data: LiveFlightData | null; ts: number }> = {};
const TTL = 3 * 60 * 1000;

function isEligibleDate(isoDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const flightDay = new Date(isoDate + "T00:00:00");
  const diffDays = Math.round(
    (flightDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  // Only show live status for today and tomorrow
  return diffDays === 0 || diffDays === 1;
}

export interface UseFlightLiveStatusResult {
  liveData: LiveFlightData | null;
  loading: boolean;
  error: string | null;
}

export function useFlightLiveStatus(
  flightNumber: string,
  isoDate: string,
  enabled = true,
): UseFlightLiveStatusResult {
  const [liveData, setLiveData] = useState<LiveFlightData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cacheKey = `${flightNumber}__${isoDate}`;

  const doFetch = useCallback(async () => {
    if (!enabled || !isEligibleDate(isoDate)) return;

    const cached = _cache[cacheKey];
    if (cached && Date.now() - cached.ts < TTL) {
      setLiveData(cached.data);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ flight: flightNumber, date: isoDate });
      const res = await fetch(`/api/flight-live?${params}`);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json: LiveFlightData = await res.json();
      _cache[cacheKey] = { data: json, ts: Date.now() };
      if (mounted.current) {
        setLiveData(json);
        setError(null);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (mounted.current) setError(msg);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [enabled, flightNumber, isoDate, cacheKey]);

  // Schedule next poll only when flight is still active
  const scheduleNextPoll = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      await doFetch();
      // Re-check after fetch whether we should keep polling
      const cached = _cache[`${flightNumber}__${isoDate}`];
      if (cached?.data && ACTIVE_STATUSES.includes(cached.data.status)) {
        scheduleNextPoll();
      }
    }, POLL_INTERVAL);
  }, [doFetch, flightNumber, isoDate]);

  useEffect(() => {
    mounted.current = true;

    if (!enabled || !isEligibleDate(isoDate)) return;

    doFetch().then(() => {
      const cached = _cache[`${flightNumber}__${isoDate}`];
      if (cached?.data && ACTIVE_STATUSES.includes(cached.data.status)) {
        scheduleNextPoll();
      }
    });

    return () => {
      mounted.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [doFetch, enabled, flightNumber, isoDate, scheduleNextPoll]);

  return { liveData, loading, error };
}
