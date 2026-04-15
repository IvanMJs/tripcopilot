"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Lock } from "lucide-react";
import { TripTab } from "@/lib/types";

// ── Types ──────────────────────────────────────────────────────────────────

interface TripSuggestion {
  iata: string;
  city: string;
  country: string;
  emoji: string;
  reason: string;
}

interface CachedSuggestions {
  suggestions: TripSuggestion[];
  expiresAt: number;
}

// ── Labels ─────────────────────────────────────────────────────────────────

const LABELS = {
  es: {
    title: "Sugerencias para ti",
    subtitle: "Basadas en tus viajes",
    explore: "Explorar",
    upgradeHint: "Upgrade para ver más destinos",
    upgradeCta: "Ver plan Explorer →",
    error: "No se pudieron cargar sugerencias",
    retry: "Reintentar",
  },
  en: {
    title: "Suggestions for you",
    subtitle: "Based on your trips",
    explore: "Explore",
    upgradeHint: "Upgrade to see more destinations",
    upgradeCta: "See Explorer plan →",
    error: "Could not load suggestions",
    retry: "Retry",
  },
} as const;

// ── Cache helpers ───────────────────────────────────────────────────────────

const CACHE_KEY = "tc-suggestions";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function readCache(cacheKey: string): TripSuggestion[] | null {
  try {
    const raw = localStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("suggestions" in parsed) ||
      !("expiresAt" in parsed)
    )
      return null;
    const cached = parsed as CachedSuggestions;
    if (Date.now() > cached.expiresAt) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    return cached.suggestions;
  } catch {
    return null;
  }
}

function writeCache(cacheKey: string, suggestions: TripSuggestion[]): void {
  try {
    const payload: CachedSuggestions = {
      suggestions,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };
    localStorage.setItem(cacheKey, JSON.stringify(payload));
  } catch {
    // localStorage unavailable — silently ignore
  }
}

// ── Skeleton ────────────────────────────────────────────────────────────────

function SuggestionSkeleton() {
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-4 flex flex-col gap-3 animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-white/[0.06]" />
      <div className="space-y-1.5">
        <div className="h-3.5 w-24 rounded-full bg-white/[0.06]" />
        <div className="h-2.5 w-16 rounded-full bg-white/[0.04]" />
      </div>
      <div className="h-2.5 w-full rounded-full bg-white/[0.04]" />
      <div className="h-8 rounded-xl bg-white/[0.04]" />
    </div>
  );
}

// ── SuggestionCard ──────────────────────────────────────────────────────────

function SuggestionCard({
  suggestion,
  locale,
  blurred,
  onUpgrade,
  index,
}: {
  suggestion: TripSuggestion;
  locale: "es" | "en";
  blurred: boolean;
  onUpgrade?: () => void;
  index: number;
}) {
  const L = LABELS[locale];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.08 }}
      className="relative rounded-2xl bg-white/[0.03] border border-white/[0.07] p-4 flex flex-col gap-3 overflow-hidden"
    >
      {/* Content — blurred for locked cards */}
      <div className={blurred ? "blur-sm select-none pointer-events-none" : undefined}>
        <div className="text-3xl leading-none mb-1">{suggestion.emoji}</div>
        <p className="text-sm font-black text-white leading-tight">
          {suggestion.city}
        </p>
        <p className="text-[11px] text-gray-500 font-medium">
          {suggestion.country}
        </p>
        <p className="text-xs text-gray-400 leading-snug mt-1.5">
          {suggestion.reason}
        </p>
        <button className="mt-3 w-full rounded-xl bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/30 text-violet-200 text-xs font-bold py-2 transition-all active:scale-95">
          {L.explore}
        </button>
      </div>

      {/* Upgrade overlay for blurred cards */}
      {blurred && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface-darker/60 backdrop-blur-[2px] p-4">
          <Lock className="h-5 w-5 text-violet-400/80" />
          <p className="text-[11px] text-gray-400 font-medium text-center leading-tight">
            {L.upgradeHint}
          </p>
          {onUpgrade && (
            <button
              onClick={onUpgrade}
              className="mt-1 rounded-xl bg-gradient-to-r from-violet-600/80 to-blue-600/80 hover:from-violet-500/90 hover:to-blue-500/90 border border-violet-500/30 text-white text-[11px] font-bold px-3 py-1.5 transition-all active:scale-95"
            >
              {L.upgradeCta}
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ── SmartTripSuggestions ────────────────────────────────────────────────────

interface SmartTripSuggestionsProps {
  trips: TripTab[];
  locale: "es" | "en";
  userPlan: string | undefined;
  onUpgrade?: () => void;
  onCreateTrip?: (destIata: string, destName: string) => void;
}

export function SmartTripSuggestions({
  trips,
  locale,
  userPlan,
  onUpgrade,
  onCreateTrip: _onCreateTrip,
}: SmartTripSuggestionsProps) {
  const L = LABELS[locale];
  const isPremium = userPlan === "explorer" || userPlan === "pilot";

  const [suggestions, setSuggestions] = useState<TripSuggestion[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const cached = readCache(CACHE_KEY);
    if (cached) {
      setSuggestions(cached);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(false);

    const destinationCodes = Array.from(
      new Set(trips.flatMap((t) => t.flights.map((f) => f.destinationCode))),
    ).slice(0, 10);

    fetch("/api/trip-suggestions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ destinationCodes, locale }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("non-ok");
        const data: unknown = await res.json();
        if (
          typeof data !== "object" ||
          data === null ||
          !("suggestions" in data) ||
          !Array.isArray((data as { suggestions: unknown }).suggestions)
        ) {
          throw new Error("invalid response");
        }
        const fetched = (data as { suggestions: TripSuggestion[] }).suggestions;
        writeCache(CACHE_KEY, fetched);
        setSuggestions(fetched);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(true);
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  // Intentionally run only on mount — trips and locale are stable inputs
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRetry() {
    abortRef.current?.abort();
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {
      // ignore
    }
    setSuggestions(null);
    setLoading(true);
    setError(false);

    const controller = new AbortController();
    abortRef.current = controller;

    const destinationCodes = Array.from(
      new Set(trips.flatMap((t) => t.flights.map((f) => f.destinationCode))),
    ).slice(0, 10);

    fetch("/api/trip-suggestions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ destinationCodes, locale }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("non-ok");
        const data: unknown = await res.json();
        if (
          typeof data !== "object" ||
          data === null ||
          !("suggestions" in data) ||
          !Array.isArray((data as { suggestions: unknown }).suggestions)
        ) {
          throw new Error("invalid response");
        }
        const fetched = (data as { suggestions: TripSuggestion[] }).suggestions;
        writeCache(CACHE_KEY, fetched);
        setSuggestions(fetched);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  return (
    <section aria-label={L.title} className="px-4 pb-4">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-black text-white">{L.title}</h2>
        <p className="text-[11px] text-gray-600">{L.subtitle}</p>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 gap-3"
          >
            {[0, 1, 2, 3].map((i) => (
              <SuggestionSkeleton key={i} />
            ))}
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-6 flex flex-col items-center gap-3"
          >
            <p className="text-sm text-gray-500">{L.error}</p>
            <button
              onClick={handleRetry}
              className="rounded-xl bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.1] text-white text-xs font-bold px-4 py-2 transition-all"
            >
              {L.retry}
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 gap-3"
          >
            {(suggestions ?? []).slice(0, 4).map((suggestion, index) => (
              <SuggestionCard
                key={suggestion.iata}
                suggestion={suggestion}
                locale={locale}
                blurred={!isPremium && index > 0}
                onUpgrade={!isPremium && index > 0 ? onUpgrade : undefined}
                index={index}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
