"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Share2, Sparkles, Check } from "lucide-react";
import { TripTab } from "@/lib/types";
import { computeTripStats } from "@/lib/tripStats";
import { generateWrappedImage } from "@/lib/wrappedImage";
import type { TravelPersonaResult } from "@/app/api/travel-persona/route";

// ── Cache config ───────────────────────────────────────────────────────────

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface CachedPersona {
  data: TravelPersonaResult;
  ts: number;
}

function readPersonaCache(userId: string): TravelPersonaResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`tc-travel-persona-${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedPersona;
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writePersonaCache(userId: string, data: TravelPersonaResult): void {
  if (typeof window === "undefined") return;
  try {
    const entry: CachedPersona = { data, ts: Date.now() };
    localStorage.setItem(`tc-travel-persona-${userId}`, JSON.stringify(entry));
  } catch {
    // fail silently
  }
}

function clearPersonaCache(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(`tc-travel-persona-${userId}`);
  } catch {
    // fail silently
  }
}

// ── Labels ─────────────────────────────────────────────────────────────────

const LABELS = {
  es: {
    title: "Tu personalidad viajera",
    subtitle: "Generado por IA a partir de tus estadísticas",
    regenerate: "Regenerar",
    share: "Compartir",
    sharing: "Compartiendo...",
    copied: "¡Copiado!",
    generating: "Analizando tus viajes...",
    error: "No se pudo generar. Intentá de nuevo.",
    minFlights: "Guardá al menos un vuelo para generar tu personalidad.",
    retry: "Reintentar",
  },
  en: {
    title: "Your travel personality",
    subtitle: "AI-generated from your travel stats",
    regenerate: "Regenerate",
    share: "Share",
    sharing: "Sharing...",
    copied: "Copied!",
    generating: "Analysing your travels...",
    error: "Could not generate. Please try again.",
    minFlights: "Save at least one flight to generate your personality.",
    retry: "Retry",
  },
} as const;

// ── Props ──────────────────────────────────────────────────────────────────

interface TravelPersonalityProps {
  trips: TripTab[];
  userId: string;
  locale: "es" | "en";
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function PersonaSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-xl bg-white/[0.06]" />
        <div className="space-y-2 flex-1">
          <div className="h-5 w-32 rounded-lg bg-white/[0.06]" />
          <div className="h-3 w-48 rounded-lg bg-white/[0.04]" />
        </div>
      </div>
      <div className="h-3 w-full rounded-lg bg-white/[0.04]" />
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-6 w-20 rounded-full bg-white/[0.05]" />
        ))}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function TravelPersonality({ trips, userId, locale }: TravelPersonalityProps) {
  const L = LABELS[locale];

  const [persona, setPersona] = useState<TravelPersonaResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [shared, setShared] = useState(false);
  const [sharing, setSharing] = useState(false);
  const fetchingRef = useRef(false);

  // Aggregate stats across all trips
  const stats = useMemo(() => {
    const allFlights = trips.flatMap((t) => t.flights);
    const merged: TripTab = { id: "global", name: "Global", flights: allFlights, accommodations: [] };
    return computeTripStats(merged);
  }, [trips]);

  const hasSufficientData = stats.totalFlights >= 1;

  const fetchPersona = useCallback(async (force = false) => {
    if (!hasSufficientData) return;
    if (fetchingRef.current) return;

    if (!force) {
      const cached = readPersonaCache(userId);
      if (cached) {
        setPersona(cached);
        return;
      }
    }

    fetchingRef.current = true;
    setLoading(true);
    setError(false);

    // Derive top airlines
    const airlineMap: Record<string, number> = {};
    for (const t of trips) {
      for (const f of t.flights) {
        if (f.airlineName) {
          airlineMap[f.airlineName] = (airlineMap[f.airlineName] ?? 0) + 1;
        }
      }
    }
    const topAirlines = Object.entries(airlineMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);

    // Derive cabin classes used
    const cabinSet = new Set<string>();
    for (const t of trips) {
      for (const f of t.flights) {
        if (f.cabinClass) cabinSet.add(f.cabinClass);
      }
    }
    const cabinClasses = Array.from(cabinSet);

    // Avg trip days (rough: total flights / trips count * 3)
    const avgTripDays = trips.length > 0
      ? trips.reduce((acc, t) => acc + Math.max(t.flights.length, 1), 0) / trips.length * 2
      : 3;

    // Domestic ratio (US airports / total)
    const allFlights = trips.flatMap((t) => t.flights);
    const domesticCount = allFlights.filter(
      (f) => f.originCode.match(/^[A-Z]{3}$/) && !f.originCode.match(/^[EGL]/)
    ).length;
    const domesticRatio = allFlights.length > 0 ? domesticCount / allFlights.length : 0;

    try {
      const res = await fetch("/api/travel-persona", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalFlights: stats.totalFlights,
          countries: stats.countriesVisited.length,
          totalKm: stats.totalDistanceKm,
          avgTripDays,
          topAirlines,
          cabinClasses,
          domesticRatio,
          locale,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as { data?: TravelPersonaResult; error?: string };
      if (!json.data) throw new Error("No data");

      writePersonaCache(userId, json.data);
      setPersona(json.data);
    } catch {
      setError(true);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, [hasSufficientData, userId, trips, stats, locale]);

  // Auto-fetch on mount
  useEffect(() => {
    fetchPersona(false);
  // Only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRegenerate() {
    clearPersonaCache(userId);
    setPersona(null);
    fetchPersona(true);
  }

  async function handleShare() {
    if (!persona) return;
    setSharing(true);
    try {
      const text = locale === "es"
        ? `Soy un ${persona.title} ${persona.emoji}! "${persona.description}" — TripCopilot ✈️`
        : `I'm a ${persona.title} ${persona.emoji}! "${persona.description}" — TripCopilot ✈️`;

      // Try image share first using wrapped image canvas
      try {
        const blob = await generateWrappedImage({
          totalFlights: stats.totalFlights,
          totalKm: stats.totalDistanceKm,
          countries: stats.countriesVisited.length,
          destinations: stats.uniqueDestinations.length,
          airborneHours: stats.totalDurationHours,
          favoriteRoute: stats.mostFrequentRoute ?? undefined,
        });
        const file = new File([blob], "travel-persona.png", { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: "TripCopilot", text });
          return;
        }
      } catch {
        // fall through to text share
      }

      if (navigator.share) {
        await navigator.share({ text, title: "TripCopilot" });
      } else {
        await navigator.clipboard.writeText(text);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } catch {
      // dismissed or unavailable
    } finally {
      setSharing(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="mx-4 mb-4 rounded-2xl border border-violet-700/30 bg-gradient-to-br from-violet-900/30 via-zinc-900/60 to-indigo-950/40 p-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-400" />
          <div>
            <p className="text-sm font-bold text-white">{L.title}</p>
            <p className="text-[10px] text-violet-300/50 mt-0.5">{L.subtitle}</p>
          </div>
        </div>
        {persona && !loading && (
          <button
            onClick={handleRegenerate}
            className="flex items-center gap-1.5 text-[11px] text-violet-400 hover:text-violet-300 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            {L.regenerate}
          </button>
        )}
      </div>

      {/* Content */}
      {!hasSufficientData && (
        <p className="text-xs text-gray-500 italic">{L.minFlights}</p>
      )}

      {hasSufficientData && loading && <PersonaSkeleton />}

      {hasSufficientData && !loading && error && (
        <div className="space-y-2">
          <p className="text-xs text-red-400">{L.error}</p>
          <button
            onClick={() => fetchPersona(true)}
            className="text-xs text-violet-400 hover:text-violet-300 transition-colors underline underline-offset-2"
          >
            {L.retry}
          </button>
        </div>
      )}

      {hasSufficientData && !loading && !error && persona && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="space-y-3"
        >
          {/* Persona header */}
          <div className="flex items-center gap-3">
            <span className="text-4xl leading-none select-none" aria-hidden>
              {persona.emoji}
            </span>
            <div>
              <p className="text-lg font-black text-white leading-tight">{persona.title}</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{persona.description}</p>
            </div>
          </div>

          {/* Trait pills */}
          <div className="flex flex-wrap gap-1.5">
            {persona.traits.map((trait) => (
              <span
                key={trait}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-violet-900/50 border border-violet-600/30 text-violet-300"
              >
                {trait}
              </span>
            ))}
          </div>

          {/* Share button */}
          <button
            onClick={handleShare}
            disabled={sharing}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/35 active:scale-95 border border-violet-500/25 text-violet-200 text-xs font-bold py-2.5 transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {shared ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                {L.copied}
              </>
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5" />
                {sharing ? L.sharing : L.share}
              </>
            )}
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
