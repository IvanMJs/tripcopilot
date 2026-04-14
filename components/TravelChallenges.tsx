"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { TripTab } from "@/lib/types";
import { TripStats } from "@/lib/tripStats";
import { AIRPORTS } from "@/lib/airports";

// ── Continent mapping ─────────────────────────────────────────────────────────

const COUNTRY_TO_CONTINENT: Record<string, string> = {
  // North America
  USA:                   "North America",
  Canada:                "North America",
  Mexico:                "North America",
  Cuba:                  "North America",
  "Dominican Republic":  "North America",
  "Puerto Rico":         "North America",
  Bahamas:               "North America",
  Jamaica:               "North America",
  Barbados:              "North America",
  "Trinidad & Tobago":   "North America",
  "Costa Rica":          "North America",
  Guatemala:             "North America",
  "El Salvador":         "North America",
  Panama:                "North America",
  "Cayman Islands":      "North America",
  Curaçao:               "North America",
  Aruba:                 "North America",
  Antigua:               "North America",
  // South America
  Argentina:             "South America",
  Brazil:                "South America",
  Chile:                 "South America",
  Colombia:              "South America",
  Peru:                  "South America",
  Uruguay:               "South America",
  Bolivia:               "South America",
  Ecuador:               "South America",
  Venezuela:             "South America",
  Paraguay:              "South America",
  // Europe
  "United Kingdom":      "Europe",
  France:                "Europe",
  Spain:                 "Europe",
  Italy:                 "Europe",
  Germany:               "Europe",
  Netherlands:           "Europe",
  Portugal:              "Europe",
  Switzerland:           "Europe",
  Austria:               "Europe",
  Belgium:               "Europe",
  Greece:                "Europe",
  Turkey:                "Europe",
  Norway:                "Europe",
  Sweden:                "Europe",
  Denmark:               "Europe",
  Finland:               "Europe",
  Poland:                "Europe",
  Ireland:               "Europe",
  Russia:                "Europe",
  // Asia
  Japan:                 "Asia",
  China:                 "Asia",
  "South Korea":         "Asia",
  India:                 "Asia",
  Thailand:              "Asia",
  Singapore:             "Asia",
  Indonesia:             "Asia",
  Malaysia:              "Asia",
  Philippines:           "Asia",
  Vietnam:               "Asia",
  UAE:                   "Asia",
  "Saudi Arabia":        "Asia",
  Israel:                "Asia",
  // Africa
  Morocco:               "Africa",
  Egypt:                 "Africa",
  "South Africa":        "Africa",
  Kenya:                 "Africa",
  Ethiopia:              "Africa",
  Nigeria:               "Africa",
  // Oceania
  Australia:             "Oceania",
  "New Zealand":         "Oceania",
  Fiji:                  "Oceania",
};

function getContinent(country: string): string {
  return COUNTRY_TO_CONTINENT[country] ?? "North America";
}

// ── Labels ────────────────────────────────────────────────────────────────────

const LABELS = {
  es: {
    title: "Desafíos de viaje",
    completed: "Completado!",
    challenges: [
      { emoji: "🌍", title: "Globetrotter", desc: "Visita 5 países nuevos este año" },
      { emoji: "✈️", title: "Frequent Flyer", desc: "Toma 10 vuelos este año" },
      { emoji: "📏", title: "Maestro de distancia", desc: "Vuela 25.000 km este año" },
      { emoji: "🗺️", title: "Explorador", desc: "Visita 3 continentes" },
      { emoji: "✅", title: "Viajero organizado", desc: "Completa el checklist en 5 viajes" },
      { emoji: "⏰", title: "Madrugador", desc: "Abre la app 24h antes en 3 vuelos" },
    ],
  },
  en: {
    title: "Travel challenges",
    completed: "Completed!",
    challenges: [
      { emoji: "🌍", title: "Globetrotter", desc: "Visit 5 new countries this year" },
      { emoji: "✈️", title: "Frequent Flyer", desc: "Take 10 flights this year" },
      { emoji: "📏", title: "Distance Master", desc: "Fly 25,000 km this year" },
      { emoji: "🗺️", title: "Explorer", desc: "Visit 3 continents" },
      { emoji: "✅", title: "Organized Traveler", desc: "Complete checklist for 5 trips" },
      { emoji: "⏰", title: "Early Bird", desc: "Open app 24h+ before departure for 3 trips" },
    ],
  },
} as const;

// ── Progress computations ─────────────────────────────────────────────────────

const THIS_YEAR = new Date().getFullYear().toString();

function computeProgress(trips: TripTab[], stats: TripStats) {
  // Flights this year
  const flightsThisYear = trips.flatMap((t) =>
    t.flights.filter((f) => f.isoDate?.startsWith(THIS_YEAR)),
  );

  // Countries visited this year
  const countriesThisYear = new Set<string>();
  for (const f of flightsThisYear) {
    const dest = AIRPORTS[f.destinationCode];
    if (dest) countriesThisYear.add(dest.country ?? "United States");
    const orig = AIRPORTS[f.originCode];
    if (orig) countriesThisYear.add(orig.country ?? "United States");
  }

  // KM this year — approximate by ratio of this-year flights vs total
  const kmThisYear =
    flightsThisYear.length > 0 && stats.totalFlights > 0
      ? Math.round((stats.totalDistanceKm * flightsThisYear.length) / stats.totalFlights)
      : 0;

  // Continents (all time, since that's the challenge)
  const continentSet = new Set<string>();
  for (const country of stats.countriesVisited) {
    continentSet.add(getContinent(country));
  }

  // Checklist completions
  const CHECKLIST_PREFIX = "tc-checklist-complete-";
  let checklistDone = 0;
  for (const trip of trips) {
    try {
      const raw =
        typeof window !== "undefined"
          ? localStorage.getItem(`${CHECKLIST_PREFIX}${trip.id}`)
          : null;
      if (raw === "true") checklistDone++;
    } catch {
      // ignore
    }
  }

  // Early bird (24h+ opens)
  const EARLY_PREFIX = "tc-early-open-";
  const MS_24H = 24 * 60 * 60 * 1000;
  let earlyBirdCount = 0;
  for (const trip of trips) {
    const firstFlight = [...trip.flights]
      .filter((f) => f.isoDate && f.departureTime)
      .sort((a, b) => a.isoDate.localeCompare(b.isoDate))[0];
    if (!firstFlight) continue;
    try {
      const raw =
        typeof window !== "undefined"
          ? localStorage.getItem(`${EARLY_PREFIX}${trip.id}`)
          : null;
      if (raw) {
        const openTime = parseInt(raw, 10);
        const depMs = new Date(
          `${firstFlight.isoDate}T${firstFlight.departureTime}:00`,
        ).getTime();
        if (depMs - openTime > MS_24H) earlyBirdCount++;
      }
    } catch {
      // ignore
    }
  }

  return [
    { current: Math.min(countriesThisYear.size, 5), target: 5 },
    { current: Math.min(flightsThisYear.length, 10), target: 10 },
    { current: Math.min(kmThisYear, 25000), target: 25000 },
    { current: Math.min(continentSet.size, 3), target: 3 },
    { current: Math.min(checklistDone, 5), target: 5 },
    { current: Math.min(earlyBirdCount, 3), target: 3 },
  ];
}

// ── ChallengeCard ─────────────────────────────────────────────────────────────

interface ChallengeCardProps {
  emoji: string;
  title: string;
  desc: string;
  current: number;
  target: number;
  completedLabel: string;
  index: number;
}

function ChallengeCard({
  emoji,
  title,
  desc,
  current,
  target,
  completedLabel,
  index,
}: ChallengeCardProps) {
  const done = current >= target;
  const notStarted = current === 0;
  const pct = target > 0 ? Math.round((current / target) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: notStarted ? 0.5 : 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      className={`rounded-xl border p-3 flex flex-col gap-2 ${
        done
          ? "bg-amber-950/20 border-amber-500/50"
          : "bg-white/[0.03] border-white/[0.06]"
      }`}
    >
      {/* Emoji + title */}
      <div className="flex items-start gap-2">
        <span className="text-xl leading-none mt-0.5" aria-hidden>
          {done ? "✅" : emoji}
        </span>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-bold leading-tight ${done ? "text-amber-300" : "text-gray-200"}`}>
            {title}
          </p>
          <p className="text-[10px] text-gray-500 leading-snug mt-0.5">{desc}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: done
                ? "linear-gradient(90deg, #f59e0b, #f97316)"
                : "linear-gradient(90deg, #7c3aed, #3b82f6)",
            }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, delay: index * 0.06 + 0.2, ease: "easeOut" }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-gray-500 tabular-nums">
            {current.toLocaleString()}/{target.toLocaleString()}
          </span>
          {done && (
            <span className="text-[10px] font-bold text-amber-400">{completedLabel}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── TravelChallenges ──────────────────────────────────────────────────────────

interface TravelChallengesProps {
  trips: TripTab[];
  stats: TripStats;
  locale: "es" | "en";
}

export function TravelChallenges({ trips, stats, locale }: TravelChallengesProps) {
  const L = LABELS[locale];

  const progressList = useMemo(() => computeProgress(trips, stats), [trips, stats]);

  return (
    <div className="px-4 pb-4">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="h-4 w-4 text-amber-400" />
        <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest">{L.title}</h2>
      </div>

      {/* 2-column grid */}
      <div className="grid grid-cols-2 gap-2">
        {L.challenges.map((challenge, i) => {
          const prog = progressList[i];
          return (
            <ChallengeCard
              key={challenge.title}
              emoji={challenge.emoji}
              title={challenge.title}
              desc={challenge.desc}
              current={prog?.current ?? 0}
              target={prog?.target ?? 1}
              completedLabel={L.completed}
              index={i}
            />
          );
        })}
      </div>
    </div>
  );
}
