"use client";

import { useState, useEffect, useRef } from "react";
import { LiveFlightData } from "@/app/api/flight-live/route";

export type { LiveFlightData };

const POLL_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes

export function useFlightLive(
  flightCode: string,
  isoDate: string,
  enabled: boolean,
): { data: LiveFlightData | null; loading: boolean } {
  const [data, setData] = useState<LiveFlightData | null>(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled) {
      setData(null);
      setLoading(false);
      return;
    }

    async function fetchLive() {
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setLoading(true);
      try {
        const params = new URLSearchParams({ code: flightCode, date: isoDate });
        const res = await fetch(`/api/flight-live?${params.toString()}`, {
          signal: abortRef.current.signal,
        });
        if (!res.ok) {
          setData(null);
          return;
        }
        const json = await res.json() as LiveFlightData;
        setData(json);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    void fetchLive();
    const timer = setInterval(() => { void fetchLive(); }, POLL_INTERVAL_MS);

    return () => {
      clearInterval(timer);
      abortRef.current?.abort();
    };
  }, [flightCode, isoDate, enabled]);

  return { data, loading };
}
