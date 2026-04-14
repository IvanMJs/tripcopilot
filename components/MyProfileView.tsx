"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, type Easing } from "framer-motion";
import { TrendingUp, Globe, Plane, MapPin, Zap, Award, Share2, Check, ImageIcon, Download, X } from "lucide-react";
import { WorldMapView } from "@/components/WorldMapView";
import { TripTab } from "@/lib/types";
import { computeTripStats } from "@/lib/tripStats";
import { PLANS } from "@/lib/mercadopago";
import { generateWrappedImage } from "@/lib/wrappedImage";
import { AIRPORTS } from "@/lib/airports";
import { TravelPersonality } from "@/components/TravelPersonality";

interface MyProfileViewProps {
  trips: TripTab[];
  locale: "es" | "en";
  userPlan: "free" | "premium" | null;
  userId: string | null;
  onUpgrade: () => void;
}

const LABELS = {
  es: {
    title: "Mi historial de viajes",
    subtitle: (n: number) => `${n} viaje${n !== 1 ? "s" : ""} guardado${n !== 1 ? "s" : ""}`,
    totalFlights: "Vuelos totales",
    countries: "Países visitados",
    totalKm: "Kilómetros volados",
    destinations: "Destinos únicos",
    aroundEarth: (n: number) => `Diste ${n} vuelta${n !== 1 ? "s" : ""} al planeta`,
    achievements: "Logros",
    emptyAchievements: "Guardá tus viajes para ver tus logros",
    favoriteRoute: "Ruta favorita",
    freePlan: "Plan Gratuito",
    freeLimits: `${PLANS.free.maxTrips} viajes · ${PLANS.free.maxFlightsPerTrip} vuelos`,
    upgradeBtn: "Mejorar a Premium →",
    premiumPlan: "Plan Premium ⭐",
    premiumPerks: "Viajes ilimitados",
    wrapped: {
      title: "Mi Travel Wrapped",
      share: "Compartir mis stats",
      shareImage: "Compartir imagen",
      generatingImage: "Generando imagen...",
      copied: "¡Copiado!",
      tagline: (flights: number, km: number, countries: number) =>
        `${flights} vuelo${flights !== 1 ? "s" : ""} · ${km.toLocaleString()} km · ${countries} país${countries !== 1 ? "es" : ""} · TripCopilot ✈️`,
    },
    badges: {
      firstFlight: "Primer vuelo",
      explorer: "Explorador",
      globalTraveler: "Viajero global",
      frequentFlyer: "Viajero frecuente",
      tenThousandKm: "10.000 km",
      aroundWorld: "Vuelta al mundo",
      unlocked: "Desbloqueado",
    },
    stamp: {
      firstVisit: "Primera visita",
      visited: "veces visitado",
      of: "de",
      countriesVisited: "Países visitados",
    },
  },
  en: {
    title: "My travel history",
    subtitle: (n: number) => `${n} trip${n !== 1 ? "s" : ""} saved`,
    totalFlights: "Total flights",
    countries: "Countries visited",
    totalKm: "Kilometres flown",
    destinations: "Unique destinations",
    aroundEarth: (n: number) => `You flew around Earth ${n} time${n !== 1 ? "s" : ""}`,
    achievements: "Achievements",
    emptyAchievements: "Save your trips to see your achievements",
    favoriteRoute: "Favorite route",
    freePlan: "Free Plan",
    freeLimits: `${PLANS.free.maxTrips} trips · ${PLANS.free.maxFlightsPerTrip} flights`,
    upgradeBtn: "Upgrade to Premium →",
    premiumPlan: "Premium Plan ⭐",
    premiumPerks: "Unlimited trips",
    wrapped: {
      title: "My Travel Wrapped",
      share: "Share my stats",
      shareImage: "Share as image",
      generatingImage: "Generating image...",
      copied: "Copied!",
      tagline: (flights: number, km: number, countries: number) =>
        `${flights} flight${flights !== 1 ? "s" : ""} · ${km.toLocaleString()} km · ${countries} countr${countries !== 1 ? "ies" : "y"} · TripCopilot ✈️`,
    },
    badges: {
      firstFlight: "First flight",
      explorer: "Explorer",
      globalTraveler: "Global traveler",
      frequentFlyer: "Frequent flyer",
      tenThousandKm: "10,000 km",
      aroundWorld: "Around the world",
      unlocked: "Unlocked",
    },
    stamp: {
      firstVisit: "First visit",
      visited: "times visited",
      of: "of",
      countriesVisited: "Countries visited",
    },
  },
} as const;

const EASE_OUT: Easing = "easeOut";

function useCountUp(target: number, duration = 800, delay = 0): number {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (target === 0) {
      setCurrent(0);
      return;
    }
    let timeout: ReturnType<typeof setTimeout>;
    let raf: number;
    timeout = setTimeout(() => {
      const start = performance.now();
      function step(now: number) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setCurrent(Math.round(eased * target));
        if (progress < 1) raf = requestAnimationFrame(step);
      }
      raf = requestAnimationFrame(step);
    }, delay);
    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(raf);
    };
  // Run once on first render; target is treated as stable initial value.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return current;
}

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: EASE_OUT, delay },
});

// ── Country flag helper ───────────────────────────────────────────────────────

const COUNTRY_FLAGS: Record<string, string> = {
  Argentina:          "🇦🇷",
  Brazil:             "🇧🇷",
  Chile:              "🇨🇱",
  Colombia:           "🇨🇴",
  Peru:               "🇵🇪",
  Uruguay:            "🇺🇾",
  Bolivia:            "🇧🇴",
  Ecuador:            "🇪🇨",
  Panama:             "🇵🇦",
  Mexico:             "🇲🇽",
  Cuba:               "🇨🇺",
  "Dominican Republic": "🇩🇴",
  "Puerto Rico":      "🇵🇷",
  Bahamas:            "🇧🇸",
  Jamaica:            "🇯🇲",
  Barbados:           "🇧🇧",
  Curaçao:            "🇨🇼",
  Aruba:              "🇦🇼",
  Antigua:            "🇦🇬",
  "Trinidad & Tobago":"🇹🇹",
  "Costa Rica":       "🇨🇷",
  Guatemala:          "🇬🇹",
  "El Salvador":      "🇸🇻",
  "Cayman Islands":   "🇰🇾",
  "United Kingdom":   "🇬🇧",
  France:             "🇫🇷",
  Spain:              "🇪🇸",
  Italy:              "🇮🇹",
  Germany:            "🇩🇪",
  Netherlands:        "🇳🇱",
  Portugal:           "🇵🇹",
  Switzerland:        "🇨🇭",
  Austria:            "🇦🇹",
  Belgium:            "🇧🇪",
  Greece:             "🇬🇷",
  Turkey:             "🇹🇷",
  Norway:             "🇳🇴",
  Sweden:             "🇸🇪",
  Denmark:            "🇩🇰",
  Finland:            "🇫🇮",
  Poland:             "🇵🇱",
  Japan:              "🇯🇵",
  China:              "🇨🇳",
  "South Korea":      "🇰🇷",
  India:              "🇮🇳",
  Thailand:           "🇹🇭",
  Singapore:          "🇸🇬",
  Australia:          "🇦🇺",
  "New Zealand":      "🇳🇿",
  Canada:             "🇨🇦",
  USA:                "🇺🇸",
};

function countryFlag(country: string): string {
  return COUNTRY_FLAGS[country] ?? "🌍";
}

function formatStampDate(isoDate: string, locale: "es" | "en"): string {
  if (!isoDate) return "";
  return new Date(isoDate + "T00:00:00").toLocaleDateString(
    locale === "en" ? "en-US" : "es-AR",
    { day: "numeric", month: "short", year: "numeric" },
  );
}

// ── StampCard component ───────────────────────────────────────────────────────

interface StampCardProps {
  data: AirportStampData;
  locale: "es" | "en";
  onClose: () => void;
}

function StampCard({ data, locale, onClose }: StampCardProps) {
  const L = LABELS[locale];
  const flag = countryFlag(data.country);
  const dateStr = formatStampDate(data.firstVisitDate, locale);

  return (
    <motion.div
      key={data.iata}
      initial={{ opacity: 0, scale: 0.85, rotate: -4 }}
      animate={{ opacity: 1, scale: 1, rotate: -1.5 }}
      exit={{ opacity: 0, scale: 0.80, rotate: 3 }}
      transition={{ type: "spring", stiffness: 360, damping: 22 }}
      className="relative mt-3 mx-auto"
      style={{ maxWidth: 320 }}
    >
      {/* Stamp-style visual */}
      <div
        className="relative rounded-xl overflow-hidden"
        style={{
          background: "linear-gradient(145deg, rgba(245,240,220,0.96) 0%, rgba(230,220,190,0.98) 100%)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.5), inset 0 0 0 3px rgba(0,0,0,0.12), inset 0 0 0 6px rgba(245,240,220,0.5)",
          filter: "sepia(0.15)",
        }}
      >
        {/* Perforated border effect */}
        <div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            border: "2px dashed rgba(139,92,246,0.45)",
            margin: 6,
            borderRadius: 10,
          }}
        />

        <div className="px-5 pt-5 pb-4 relative z-10">
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1 rounded-full bg-black/10 hover:bg-black/20 transition-colors"
          >
            <X className="h-3.5 w-3.5 text-gray-700" />
          </button>

          {/* Flag + country */}
          <div className="flex flex-col items-center text-center gap-1 mb-3">
            <span className="text-5xl leading-none">{flag}</span>
            <p className="text-lg font-black text-gray-800 leading-tight mt-1">
              {data.country}
            </p>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
              {data.iata} · {data.airportName.length > 30 ? data.airportName.slice(0, 28) + "…" : data.airportName}
            </p>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-violet-400/40 to-transparent mb-3" />

          {/* Stats */}
          <div className="flex justify-around text-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-0.5">
                {L.stamp.firstVisit}
              </p>
              <p className="text-sm font-black text-gray-800">{dateStr || "–"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-0.5">
                {L.stamp.visited}
              </p>
              <p className="text-2xl font-black text-violet-700 leading-none">
                {data.visitCount}
                <span className="text-xs font-normal text-gray-500 ml-1">×</span>
              </p>
            </div>
          </div>

          {/* STAMP text watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.07]">
            <p
              className="text-7xl font-black text-violet-700 uppercase tracking-widest"
              style={{ transform: "rotate(-20deg)" }}
            >
              STAMP
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── AirportStampData ──────────────────────────────────────────────────────────

interface AirportStampData {
  iata: string;
  airportName: string;
  country: string;
  firstVisitDate: string;
  visitCount: number;
}

export function MyProfileView({ trips, locale, userPlan, userId, onUpgrade }: MyProfileViewProps) {
  const L = LABELS[locale];
  const [wrappedCopied, setWrappedCopied] = useState(false);
  const [wrappedImageLoading, setWrappedImageLoading] = useState(false);
  const [selectedIata, setSelectedIata] = useState<string | null>(null);

  const stats = useMemo(() => {
    const allFlights = trips.flatMap((t) => t.flights);
    const merged: TripTab = { id: "global", name: "Global", flights: allFlights, accommodations: [] };
    return computeTripStats(merged);
  }, [trips]);

  // Per-airport stamp data: first visit date + visit count
  const stampDataMap = useMemo<Record<string, AirportStampData>>(() => {
    const map: Record<string, { dates: string[] }> = {};
    for (const trip of trips) {
      for (const flight of trip.flights) {
        for (const code of [flight.originCode, flight.destinationCode]) {
          if (!map[code]) map[code] = { dates: [] };
          map[code].dates.push(flight.isoDate);
        }
      }
    }
    const result: Record<string, AirportStampData> = {};
    for (const [iata, data] of Object.entries(map)) {
      const airport = AIRPORTS[iata];
      if (!airport) continue;
      const sorted = [...data.dates].sort();
      result[iata] = {
        iata,
        airportName: airport.name,
        country: airport.country ?? "USA",
        firstVisitDate: sorted[0] ?? "",
        visitCount: sorted.length,
      };
    }
    return result;
  }, [trips]);

  // Count-up animations — staggered 150 ms apart
  const animFlights      = useCountUp(stats.totalFlights,               800,    0);
  const animCountries    = useCountUp(stats.countriesVisited.length,     800,  150);
  const animKm           = useCountUp(stats.totalDistanceKm,            1200,  300);
  const animDestinations = useCountUp(stats.uniqueDestinations.length,   800,  450);

  // Derive badges with progress data
  const badges = useMemo(() => {
    const AROUND_EARTH_KM = 40075;
    type BadgeEntry = {
      emoji: string;
      label: string;
      unlocked: boolean;
      current: number;
      target: number;
      unit: string;
    };
    const all: BadgeEntry[] = [
      {
        emoji: "✈️",
        label: L.badges.firstFlight,
        unlocked: stats.totalFlights >= 1,
        current: Math.min(stats.totalFlights, 1),
        target: 1,
        unit: locale === "es" ? "vuelo" : "flight",
      },
      {
        emoji: "🗺️",
        label: L.badges.explorer,
        unlocked: stats.countriesVisited.length >= 3,
        current: Math.min(stats.countriesVisited.length, 3),
        target: 3,
        unit: locale === "es" ? "países" : "countries",
      },
      {
        emoji: "🌍",
        label: L.badges.globalTraveler,
        unlocked: stats.countriesVisited.length >= 5,
        current: Math.min(stats.countriesVisited.length, 5),
        target: 5,
        unit: locale === "es" ? "países" : "countries",
      },
      {
        emoji: "💺",
        label: L.badges.frequentFlyer,
        unlocked: stats.totalFlights >= 10,
        current: Math.min(stats.totalFlights, 10),
        target: 10,
        unit: locale === "es" ? "vuelos" : "flights",
      },
      {
        emoji: "📏",
        label: L.badges.tenThousandKm,
        unlocked: stats.totalDistanceKm >= 10000,
        current: Math.min(stats.totalDistanceKm, 10000),
        target: 10000,
        unit: "km",
      },
      {
        emoji: "🌐",
        label: L.badges.aroundWorld,
        unlocked: stats.totalDistanceKm >= AROUND_EARTH_KM,
        current: Math.min(stats.totalDistanceKm, AROUND_EARTH_KM),
        target: AROUND_EARTH_KM,
        unit: "km",
      },
    ];
    return all;
  }, [stats, L.badges, locale]);

  // Track newly unlocked badges via localStorage
  const [newlyUnlocked, setNewlyUnlocked] = useState<Set<string>>(new Set());
  useEffect(() => {
    const storageKey = "tripcopilot-seen-badges";
    let seen: string[] = [];
    try {
      seen = JSON.parse(localStorage.getItem(storageKey) ?? "[]") as string[];
    } catch {
      seen = [];
    }
    const seenSet = new Set(seen);
    const freshUnlocked = new Set(
      badges
        .filter((b) => b.unlocked && !seenSet.has(b.label))
        .map((b) => b.label),
    );
    if (freshUnlocked.size > 0) {
      setNewlyUnlocked(freshUnlocked);
      const updated = Array.from(seenSet).concat(Array.from(freshUnlocked));
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {
        // localStorage unavailable — silently ignore
      }
    }
  // Intentionally run once after mount; badges reference is stable at that point.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const badgePillColors = [
    "bg-emerald-950/50 border-emerald-700/40 text-emerald-300",
    "bg-violet-950/50 border-violet-700/40 text-violet-300",
    "bg-blue-950/50 border-blue-700/40 text-blue-300",
  ] as const;

  return (
    <div className="min-h-screen pb-24 bg-[#07070f]">

      {/* Section 1 — Header */}
      <motion.div {...fadeUp(0)} className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-4xl" aria-hidden>✈️</span>
          <div>
            <h1 className="text-xl font-black text-white leading-tight">{L.title}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{L.subtitle(trips.length)}</p>
          </div>
        </div>
      </motion.div>

      {/* Section 2 — Big stats grid */}
      <motion.div {...fadeUp(0.05)} className="px-4 pb-4">
        <div className="grid grid-cols-2 gap-3">
          {/* Total flights */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-violet-500/15 p-1.5">
                <Plane className="h-4 w-4 text-violet-400" />
              </div>
            </div>
            <p className="text-3xl font-black text-white leading-none tabular-nums">{animFlights}</p>
            <p className="text-xs text-gray-500 font-medium">{L.totalFlights}</p>
          </div>

          {/* Countries visited */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-blue-500/15 p-1.5">
                <Globe className="h-4 w-4 text-blue-400" />
              </div>
            </div>
            <p className="text-3xl font-black text-white leading-none tabular-nums">{animCountries}</p>
            <p className="text-xs text-gray-500 font-medium">{L.countries}</p>
          </div>

          {/* Total km */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-emerald-500/15 p-1.5">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              </div>
            </div>
            <p className="text-3xl font-black text-white leading-none tabular-nums">
              {animKm.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 font-medium">{L.totalKm}</p>
          </div>

          {/* Unique destinations */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-amber-500/15 p-1.5">
                <MapPin className="h-4 w-4 text-amber-400" />
              </div>
            </div>
            <p className="text-3xl font-black text-white leading-none tabular-nums">{animDestinations}</p>
            <p className="text-xs text-gray-500 font-medium">{L.destinations}</p>
          </div>
        </div>
      </motion.div>

      {/* Section 3 — Around the Earth highlight */}
      {stats.timesAroundEarth >= 0.1 && (
        <motion.div {...fadeUp(0.1)} className="px-4 pb-4">
          <div className="rounded-2xl bg-gradient-to-r from-violet-900/60 to-blue-900/60 border border-violet-700/30 p-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl" aria-hidden>🌏</span>
              <div>
                <p className="text-xs text-violet-300/70 font-semibold uppercase tracking-widest mb-0.5">
                  {locale === "es" ? "Vuelta al planeta" : "Around the planet"}
                </p>
                <p className="text-white font-black text-lg leading-tight">
                  {L.aroundEarth(stats.timesAroundEarth)}
                </p>
              </div>
              <div className="ml-auto">
                <span className="text-4xl font-black text-white/20 select-none">
                  {stats.timesAroundEarth}×
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Section 3b — World Map with country stamp collection */}
      {stats.totalFlights >= 1 && (
        <motion.div {...fadeUp(0.12)} className="px-4 pb-4">
          {/* Countries counter */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-bold text-gray-300">
                {L.stamp.countriesVisited}
              </span>
            </div>
            <span className="text-sm font-black text-white tabular-nums">
              {stats.countriesVisited.length}
              <span className="text-gray-500 font-normal text-xs ml-1">
                {L.stamp.of} 195
              </span>
            </span>
          </div>

          <WorldMapView
            trips={trips}
            locale={locale}
            onAirportClick={(iata) => setSelectedIata((prev) => prev === iata ? null : iata)}
          />

          {/* Stamp popup */}
          <AnimatePresence>
            {selectedIata && stampDataMap[selectedIata] && (
              <StampCard
                data={stampDataMap[selectedIata]}
                locale={locale}
                onClose={() => setSelectedIata(null)}
              />
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Section 3c — Travel Personality (AI-generated) */}
      {userId && (
        <motion.div {...fadeUp(0.13)}>
          <TravelPersonality trips={trips} userId={userId} locale={locale} />
        </motion.div>
      )}

      {/* Section 4 — Achievements */}
      <motion.div {...fadeUp(0.15)} className="px-4 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <Award className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest">{L.achievements}</h2>
        </div>

        {stats.totalFlights === 0 && stats.totalDistanceKm === 0 ? (
          <p className="text-sm text-gray-600 italic">{L.emptyAchievements}</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {badges.map((badge, i) => {
              const progressPct = badge.target > 0
                ? Math.round((badge.current / badge.target) * 100)
                : 0;
              const isNew = newlyUnlocked.has(badge.label);
              const colorClass = badgePillColors[i % badgePillColors.length];
              return (
                <div
                  key={badge.label}
                  className={`flex flex-col items-center rounded-2xl border p-3 gap-1 text-center ${colorClass} ${isNew && badge.unlocked ? "animate-pulse" : ""}`}
                >
                  <span className="text-2xl leading-none" aria-hidden>{badge.emoji}</span>
                  <p className="text-xs font-bold leading-tight">{badge.label}</p>
                  {badge.unlocked ? (
                    <span className="text-[10px] text-emerald-400">
                      {locale === "es" ? "✓ Desbloqueado" : "✓ Unlocked"}
                    </span>
                  ) : (
                    <div className="w-full">
                      <div className="h-1 w-full rounded-full bg-white/[0.06] mt-1">
                        <div
                          className="h-full rounded-full bg-violet-500"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-500">
                        {badge.current.toLocaleString()}/{badge.target.toLocaleString()} {badge.unit}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Section 5 — Top route */}
      {stats.mostFrequentRoute != null && (
        <motion.div {...fadeUp(0.2)} className="px-4 pb-4">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">{L.favoriteRoute}</p>
            </div>
            <p className="font-mono text-2xl font-black text-white">{stats.mostFrequentRoute}</p>
          </div>
        </motion.div>
      )}

      {/* Section 5b — Travel Wrapped shareable card */}
      {stats.totalFlights >= 1 && (
        <motion.div {...fadeUp(0.22)} className="px-4 pb-4">
          {/* Visual card */}
          <div className="rounded-2xl overflow-hidden border border-violet-700/30 bg-gradient-to-br from-violet-900/50 via-blue-900/30 to-indigo-950/60 p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-300/60 mb-1">
                  {L.wrapped.title}
                </p>
                <p className="text-3xl font-black text-white leading-none">
                  {stats.totalFlights}
                  <span className="text-lg text-violet-300/80 font-bold ml-1">
                    {locale === "es" ? "vuelos" : "flights"}
                  </span>
                </p>
              </div>
              <span className="text-4xl" aria-hidden>✈️</span>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="text-center">
                <p className="text-xl font-black text-white leading-none">
                  {stats.totalDistanceKm >= 1000
                    ? `${Math.round(stats.totalDistanceKm / 1000)}k`
                    : stats.totalDistanceKm}
                </p>
                <p className="text-[10px] text-violet-300/60 mt-0.5 font-medium">km</p>
              </div>
              <div className="text-center border-x border-violet-700/30">
                <p className="text-xl font-black text-white leading-none">{stats.countriesVisited.length}</p>
                <p className="text-[10px] text-violet-300/60 mt-0.5 font-medium">
                  {locale === "es" ? "países" : "countries"}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xl font-black text-white leading-none">{stats.totalDurationHours}h</p>
                <p className="text-[10px] text-violet-300/60 mt-0.5 font-medium">
                  {locale === "es" ? "en vuelo" : "airborne"}
                </p>
              </div>
            </div>

            {stats.timesAroundEarth >= 0.1 && (
              <p className="text-xs text-violet-200/60 mb-4 leading-relaxed">
                🌍 {L.aroundEarth(stats.timesAroundEarth)}
              </p>
            )}

            <div className="flex gap-2">
              {/* Text share */}
              <button
                onClick={async () => {
                  const text = L.wrapped.tagline(
                    stats.totalFlights,
                    stats.totalDistanceKm,
                    stats.countriesVisited.length,
                  );
                  try {
                    if (navigator.share) {
                      await navigator.share({ text, title: "TripCopilot" });
                    } else {
                      await navigator.clipboard.writeText(text);
                      setWrappedCopied(true);
                      setTimeout(() => setWrappedCopied(false), 2000);
                    }
                  } catch {
                    // cancelled or unavailable
                  }
                }}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/[0.15] active:scale-95 border border-white/[0.12] text-white text-sm font-bold py-2.5 transition-all"
              >
                {wrappedCopied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" />
                    {L.wrapped.copied}
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4" />
                    {L.wrapped.share}
                  </>
                )}
              </button>

              {/* Image share */}
              <button
                disabled={wrappedImageLoading}
                onClick={async () => {
                  setWrappedImageLoading(true);
                  try {
                    const blob = await generateWrappedImage({
                      totalFlights: stats.totalFlights,
                      totalKm: stats.totalDistanceKm,
                      countries: stats.countriesVisited.length,
                      destinations: stats.uniqueDestinations.length,
                      airborneHours: stats.totalDurationHours,
                      favoriteRoute: stats.mostFrequentRoute ?? undefined,
                    });
                    const file = new File([blob], "travel-wrapped.png", { type: "image/png" });
                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                      await navigator.share({ files: [file], title: "TripCopilot Travel Wrapped" });
                    } else {
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "travel-wrapped.png";
                      a.click();
                      URL.revokeObjectURL(url);
                    }
                  } catch {
                    // cancelled or unavailable
                  } finally {
                    setWrappedImageLoading(false);
                  }
                }}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-violet-600/30 hover:bg-violet-600/50 active:scale-95 border border-violet-500/30 text-violet-200 text-sm font-bold py-2.5 transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                {wrappedImageLoading ? (
                  <>
                    <Download className="h-4 w-4 animate-bounce" />
                    {L.wrapped.generatingImage}
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-4 w-4" />
                    {L.wrapped.shareImage}
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Section 6 — Plan status */}
      <motion.div {...fadeUp(0.25)} className="px-4 pb-6">
        {userPlan === "premium" ? (
          <div className="rounded-2xl border border-amber-600/40 bg-gradient-to-br from-amber-950/40 to-[#07070f] p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-widest text-amber-500/70">
                {locale === "es" ? "Tu plan" : "Your plan"}
              </span>
            </div>
            <p className="text-lg font-black text-white">{L.premiumPlan}</p>
            <p className="text-sm text-amber-400/80 mt-0.5">{L.premiumPerks}</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                {locale === "es" ? "Tu plan" : "Your plan"}
              </span>
            </div>
            <p className="text-lg font-black text-white mb-0.5">{L.freePlan}</p>
            <p className="text-sm text-gray-500 mb-4">{L.freeLimits}</p>
            <button
              onClick={onUpgrade}
              className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 active:scale-95 text-white text-sm font-bold py-3 transition-all"
            >
              {L.upgradeBtn}
            </button>
          </div>
        )}
      </motion.div>

    </div>
  );
}
