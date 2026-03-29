"use client";

import { useMemo } from "react";
import { motion, type Easing } from "framer-motion";
import { TrendingUp, Globe, Plane, MapPin, Zap, Award } from "lucide-react";
import { TripTab } from "@/lib/types";
import { computeTripStats } from "@/lib/tripStats";
import { PLANS } from "@/lib/mercadopago";

interface MyProfileViewProps {
  trips: TripTab[];
  locale: "es" | "en";
  userPlan: "free" | "premium" | null;
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
    badges: {
      firstFlight: "Primer vuelo",
      explorer: "Explorador",
      globalTraveler: "Viajero global",
      frequentFlyer: "Viajero frecuente",
      tenThousandKm: "10.000 km",
      aroundWorld: "Vuelta al mundo",
      unlocked: "Desbloqueado",
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
    badges: {
      firstFlight: "First flight",
      explorer: "Explorer",
      globalTraveler: "Global traveler",
      frequentFlyer: "Frequent flyer",
      tenThousandKm: "10,000 km",
      aroundWorld: "Around the world",
      unlocked: "Unlocked",
    },
  },
} as const;

const EASE_OUT: Easing = "easeOut";

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: EASE_OUT, delay },
});

export function MyProfileView({ trips, locale, userPlan, onUpgrade }: MyProfileViewProps) {
  const L = LABELS[locale];

  const stats = useMemo(() => {
    const allFlights = trips.flatMap((t) => t.flights);
    const merged: TripTab = { id: "global", name: "Global", flights: allFlights, accommodations: [] };
    return computeTripStats(merged);
  }, [trips]);

  // Derive badges
  const badges = useMemo(() => {
    const earned: { emoji: string; label: string }[] = [];
    if (stats.totalFlights >= 1) {
      earned.push({ emoji: "✈️", label: L.badges.firstFlight });
    }
    if (stats.countriesVisited.length >= 3) {
      earned.push({ emoji: "🗺️", label: L.badges.explorer });
    }
    if (stats.countriesVisited.length >= 5) {
      earned.push({ emoji: "🌍", label: L.badges.globalTraveler });
    }
    if (stats.totalFlights >= 10) {
      earned.push({ emoji: "💺", label: L.badges.frequentFlyer });
    }
    if (stats.totalDistanceKm >= 10000) {
      earned.push({ emoji: "📏", label: L.badges.tenThousandKm });
    }
    if (stats.timesAroundEarth >= 1) {
      earned.push({ emoji: "🌐", label: L.badges.aroundWorld });
    }
    return earned;
  }, [stats, L.badges]);

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
            <p className="text-3xl font-black text-white leading-none">{stats.totalFlights}</p>
            <p className="text-xs text-gray-500 font-medium">{L.totalFlights}</p>
          </div>

          {/* Countries visited */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-blue-500/15 p-1.5">
                <Globe className="h-4 w-4 text-blue-400" />
              </div>
            </div>
            <p className="text-3xl font-black text-white leading-none">{stats.countriesVisited.length}</p>
            <p className="text-xs text-gray-500 font-medium">{L.countries}</p>
          </div>

          {/* Total km */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-emerald-500/15 p-1.5">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              </div>
            </div>
            <p className="text-3xl font-black text-white leading-none">
              {stats.totalDistanceKm.toLocaleString()}
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
            <p className="text-3xl font-black text-white leading-none">{stats.uniqueDestinations.length}</p>
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

      {/* Section 4 — Achievements */}
      <motion.div {...fadeUp(0.15)} className="px-4 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <Award className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest">{L.achievements}</h2>
        </div>

        {badges.length === 0 ? (
          <p className="text-sm text-gray-600 italic">{L.emptyAchievements}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {badges.map((badge, i) => (
              <div
                key={badge.label}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 ${badgePillColors[i % badgePillColors.length]}`}
              >
                <span className="text-base leading-none" aria-hidden>{badge.emoji}</span>
                <div className="flex flex-col">
                  <span className="text-xs font-bold leading-tight">{badge.label}</span>
                  <span className="text-[10px] opacity-60 leading-tight">{L.badges.unlocked}</span>
                </div>
              </div>
            ))}
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
