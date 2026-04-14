"use client";

import { useState, useEffect, useCallback } from "react";
import type { DestinationTip } from "@/app/api/destination-tips/route";

interface DestinationTipsProps {
  city: string;
  country: string;
  locale: "es" | "en";
}

const CACHE_DAYS = 30;
const CACHE_PREFIX = "tc-dest-tips-";

interface CacheEntry {
  tips: DestinationTip[];
  timestamp: number;
}

function readCache(city: string): DestinationTip[] | null {
  try {
    const key = `${CACHE_PREFIX}${city.toLowerCase().replace(/\s+/g, "-")}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    const maxAge = CACHE_DAYS * 24 * 60 * 60 * 1000;
    if (Date.now() - entry.timestamp > maxAge) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.tips;
  } catch {
    return null;
  }
}

function writeCache(city: string, tips: DestinationTip[]): void {
  try {
    const key = `${CACHE_PREFIX}${city.toLowerCase().replace(/\s+/g, "-")}`;
    const entry: CacheEntry = { tips, timestamp: Date.now() };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // localStorage may be unavailable
  }
}

const LABELS = {
  es: {
    title: "Tips del destino",
    loading: "Generando tips…",
    error: "No se pudieron cargar los tips",
    retry: "Reintentar",
  },
  en: {
    title: "Destination Tips",
    loading: "Generating tips…",
    error: "Could not load tips",
    retry: "Retry",
  },
};

function TipsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-lg bg-white/[0.04] p-3 space-y-2">
          <div className="h-4 w-4 rounded-full bg-white/[0.08]" />
          <div className="h-2.5 rounded-full bg-white/[0.06] w-3/4" />
          <div className="h-2 rounded-full bg-white/[0.04] w-full" />
          <div className="h-2 rounded-full bg-white/[0.04] w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function DestinationTips({ city, country, locale }: DestinationTipsProps) {
  const L = LABELS[locale];
  const [tips, setTips] = useState<DestinationTip[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTips = useCallback(async (signal?: AbortSignal) => {
    const cached = readCache(city);
    if (cached) {
      setTips(cached);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/destination-tips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city, country, locale }),
        signal,
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json() as { tips: DestinationTip[] };
      writeCache(city, data.tips);
      setTips(data.tips);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(L.error);
    } finally {
      setLoading(false);
    }
  }, [city, country, locale, L.error]);

  useEffect(() => {
    const controller = new AbortController();
    fetchTips(controller.signal);
    return () => { controller.abort(); };
  }, [fetchTips]);

  return (
    <div className="rounded-xl border border-white/[0.08] bg-gray-900/60 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
          {L.title}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{city}</p>
      </div>

      <div className="p-3">
        {loading && <TipsSkeleton />}

        {error && (
          <div className="py-3 text-center space-y-2">
            <p className="text-xs text-red-400">{error}</p>
            <button
              onClick={() => fetchTips()}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors underline-offset-2 hover:underline"
            >
              {L.retry}
            </button>
          </div>
        )}

        {tips && (
          <div className="grid grid-cols-2 gap-2">
            {tips.map((tip, i) => (
              <div
                key={i}
                className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3 space-y-1.5"
              >
                <span className="text-base leading-none">{tip.icon}</span>
                <p className="text-xs font-semibold text-white leading-snug">{tip.title}</p>
                <p className="text-[11px] text-gray-500 leading-relaxed">{tip.tip}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
