import { AIRPORTS, haversineKm } from "@/lib/airports";
import type { TripTab } from "@/lib/types";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Milestone {
  id: string;
  emoji: string;
  title: { es: string; en: string };
  description: { es: string; en: string };
  threshold: number;
  type: "flights" | "countries" | "airports" | "distance_km";
}

export interface MilestoneStats {
  totalFlights: number;
  uniqueCountries: number;
  uniqueAirports: number;
  totalDistanceKm: number;
}

// ── Milestone definitions ─────────────────────────────────────────────────────

export const MILESTONES: Milestone[] = [
  // Flights
  {
    id: "first_flight",
    emoji: "🛫",
    title: { es: "¡Primer vuelo!", en: "First flight!" },
    description: {
      es: "Registraste tu primer vuelo en TripCopilot.",
      en: "You logged your first flight in TripCopilot.",
    },
    threshold: 1,
    type: "flights",
  },
  {
    id: "5_flights",
    emoji: "✈️",
    title: { es: "Viajero frecuente", en: "Frequent flyer" },
    description: {
      es: "Completaste 5 vuelos. ¡Estás en camino!",
      en: "You've completed 5 flights. You're on your way!",
    },
    threshold: 5,
    type: "flights",
  },
  {
    id: "10_flights",
    emoji: "🌟",
    title: { es: "Explorador aéreo", en: "Air explorer" },
    description: {
      es: "10 vuelos y contando. El cielo es tu hogar.",
      en: "10 flights and counting. The sky is your home.",
    },
    threshold: 10,
    type: "flights",
  },
  {
    id: "25_flights",
    emoji: "💎",
    title: { es: "Jet setter", en: "Jet setter" },
    description: {
      es: "25 vuelos completados. Eres un experto viajero.",
      en: "25 flights completed. You're a seasoned traveler.",
    },
    threshold: 25,
    type: "flights",
  },
  {
    id: "50_flights",
    emoji: "👑",
    title: { es: "Leyenda del aire", en: "Air legend" },
    description: {
      es: "50 vuelos. Eres una leyenda entre las nubes.",
      en: "50 flights. You're a legend among the clouds.",
    },
    threshold: 50,
    type: "flights",
  },
  // Countries
  {
    id: "3_countries",
    emoji: "🌍",
    title: { es: "Trotamundos", en: "Globetrotter" },
    description: {
      es: "Visitaste 3 países diferentes. ¡El mundo te espera!",
      en: "You visited 3 different countries. The world awaits!",
    },
    threshold: 3,
    type: "countries",
  },
  {
    id: "10_countries",
    emoji: "🗺️",
    title: { es: "Ciudadano del mundo", en: "World citizen" },
    description: {
      es: "10 países explorados. Eres verdaderamente ciudadano del mundo.",
      en: "10 countries explored. You're truly a world citizen.",
    },
    threshold: 10,
    type: "countries",
  },
  // Airports
  {
    id: "5_airports",
    emoji: "🏛️",
    title: { es: "Coleccionista de aeropuertos", en: "Airport collector" },
    description: {
      es: "Pasaste por 5 aeropuertos distintos. ¡Gran colección!",
      en: "You've been through 5 different airports. Great collection!",
    },
    threshold: 5,
    type: "airports",
  },
  // Distance
  {
    id: "earth_circumference",
    emoji: "🌐",
    title: { es: "Vuelta al mundo", en: "Around the world" },
    description: {
      es: "Volaste más de 40,075 km — equivalente a una vuelta al mundo.",
      en: "You've flown over 40,075 km — the equivalent of circling the Earth.",
    },
    threshold: 40075,
    type: "distance_km",
  },
];

// ── Stats computation ─────────────────────────────────────────────────────────

function getAirportCountry(iata: string): string {
  const airport = AIRPORTS[iata];
  if (!airport) return "Unknown";
  return airport.country ?? "USA";
}

export function computeMilestoneStats(trips: TripTab[]): MilestoneStats {
  let totalFlights = 0;
  const countriesSet = new Set<string>();
  const airportsSet = new Set<string>();
  let totalDistanceKm = 0;

  for (const trip of trips) {
    for (const flight of trip.flights) {
      totalFlights += 1;

      // Airports
      airportsSet.add(flight.originCode);
      airportsSet.add(flight.destinationCode);

      // Countries
      countriesSet.add(getAirportCountry(flight.originCode));
      countriesSet.add(getAirportCountry(flight.destinationCode));

      // Distance
      const origin = AIRPORTS[flight.originCode];
      const dest = AIRPORTS[flight.destinationCode];
      if (origin && dest) {
        totalDistanceKm += haversineKm(origin.lat, origin.lng, dest.lat, dest.lng);
      }
    }
  }

  return {
    totalFlights,
    uniqueCountries: countriesSet.size,
    uniqueAirports: airportsSet.size,
    totalDistanceKm: Math.round(totalDistanceKm),
  };
}

// ── Milestone helpers ─────────────────────────────────────────────────────────

function getStatValue(stats: MilestoneStats, type: Milestone["type"]): number {
  switch (type) {
    case "flights":
      return stats.totalFlights;
    case "countries":
      return stats.uniqueCountries;
    case "airports":
      return stats.uniqueAirports;
    case "distance_km":
      return stats.totalDistanceKm;
  }
}

export function getUnlockedMilestones(stats: MilestoneStats): Milestone[] {
  return MILESTONES.filter((m) => getStatValue(stats, m.type) >= m.threshold);
}

export function getNextMilestone(
  stats: MilestoneStats,
): { milestone: Milestone; progress: number } | null {
  // Find all locked milestones grouped by type, pick the closest one per type
  const locked = MILESTONES.filter(
    (m) => getStatValue(stats, m.type) < m.threshold,
  );

  if (locked.length === 0) return null;

  // Find the milestone with the highest progress ratio (closest to unlock)
  let best: Milestone | null = null;
  let bestProgress = -1;

  for (const m of locked) {
    const current = getStatValue(stats, m.type);

    // Only consider the lowest threshold for each type (the next one to unlock)
    const isNextForType = MILESTONES.filter(
      (x) => x.type === m.type && getStatValue(stats, x.type) < x.threshold,
    ).every((x) => m.threshold <= x.threshold);

    if (!isNextForType) continue;

    const progress = current / m.threshold;
    if (progress > bestProgress) {
      bestProgress = progress;
      best = m;
    }
  }

  if (!best) return null;

  const current = getStatValue(stats, best.type);
  const progress = Math.min(1, current / best.threshold);

  return { milestone: best, progress };
}
