import { TripTab } from "@/lib/types";
import { AIRPORTS } from "@/lib/airports";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Badge {
  id: string;
  label: { es: string; en: string };
  emoji: string;
  description: { es: string; en: string };
  unlocked: boolean;
}

// ── Continent helpers ─────────────────────────────────────────────────────────

/**
 * Derive continent from airport lat/lng.
 * Uses bounding-box heuristics that cover TripCopilot's current airport set.
 */
function latLngToContinent(lat: number, lng: number): string {
  // Africa
  if (lat >= -35 && lat <= 37 && lng >= -18 && lng <= 52) return "Africa";
  // Europe (rough bounding box before Asia overlap)
  if (lat >= 34 && lat <= 72 && lng >= -25 && lng <= 60) return "Europe";
  // Asia (after Europe)
  if (lat >= -10 && lat <= 77 && lng >= 26 && lng <= 180) return "Asia";
  // Oceania
  if (lat >= -50 && lat <= -10 && lng >= 110 && lng <= 180) return "Oceania";
  if (lat >= -50 && lat <= 5 && lng >= 110 && lng <= 180) return "Oceania";
  // North America (including Caribbean)
  if (lat >= 5 && lat <= 84 && lng >= -170 && lng <= -50) return "North America";
  // South America
  if (lat >= -60 && lat <= 14 && lng >= -82 && lng <= -34) return "South America";
  // Pacific islands / Hawaii
  if (lng <= -140) return "Oceania";
  return "Other";
}

function uniqueContinentsFromTrips(trips: TripTab[]): Set<string> {
  const continents = new Set<string>();
  for (const trip of trips) {
    for (const flight of trip.flights) {
      for (const code of [flight.originCode, flight.destinationCode]) {
        const ap = AIRPORTS[code];
        if (ap) {
          continents.add(latLngToContinent(ap.lat, ap.lng));
        }
      }
    }
  }
  return continents;
}

function uniqueCountriesFromTrips(trips: TripTab[]): Set<string> {
  const countries = new Set<string>();
  for (const trip of trips) {
    for (const flight of trip.flights) {
      for (const code of [flight.originCode, flight.destinationCode]) {
        const ap = AIRPORTS[code];
        if (ap) {
          countries.add(ap.country ?? "USA");
        }
      }
    }
  }
  return countries;
}

// ── BADGES definition ─────────────────────────────────────────────────────────

interface BadgeDefinition {
  id: string;
  label: { es: string; en: string };
  emoji: string;
  description: { es: string; en: string };
  unlockFn: (trips: TripTab[]) => boolean;
}

export const BADGES: BadgeDefinition[] = [
  {
    id: "first-trip",
    label: { es: "Primer viaje", en: "First Trip" },
    emoji: "🎒",
    description: {
      es: "Guardaste tu primer viaje",
      en: "You saved your first trip",
    },
    unlockFn: (trips) => trips.length >= 1,
  },
  {
    id: "five-countries",
    label: { es: "5 Países", en: "5 Countries" },
    emoji: "🗺️",
    description: {
      es: "Visitaste 5 países diferentes",
      en: "You visited 5 different countries",
    },
    unlockFn: (trips) => uniqueCountriesFromTrips(trips).size >= 5,
  },
  {
    id: "night-owl",
    label: { es: "Noctámbulo", en: "Night Owl" },
    emoji: "🦉",
    description: {
      es: "Volaste en un vuelo nocturno antes de las 6:00",
      en: "You flew on a red-eye departing before 06:00",
    },
    unlockFn: (trips) =>
      trips.some((t) =>
        t.flights.some((f) => {
          if (!f.departureTime) return false;
          const [h] = f.departureTime.split(":").map(Number);
          return h < 6;
        }),
      ),
  },
  {
    id: "globe-trotter",
    label: { es: "Globetrotter", en: "Globe Trotter" },
    emoji: "🌍",
    description: {
      es: "Viajaste a 3 continentes distintos",
      en: "You traveled to 3 different continents",
    },
    unlockFn: (trips) => uniqueContinentsFromTrips(trips).size >= 3,
  },
  {
    id: "early-bird",
    label: { es: "Madrugador", en: "Early Bird" },
    emoji: "🐦",
    description: {
      es: "Hiciste check-in 3 viajes seguidos",
      en: "You checked in on 3 consecutive trips",
    },
    unlockFn: (trips) => trips.length >= 3,
  },
  {
    id: "frequent-flyer",
    label: { es: "Viajero frecuente", en: "Frequent Flyer" },
    emoji: "✈️",
    description: {
      es: "Registraste 10 o más vuelos",
      en: "You logged 10 or more flights",
    },
    unlockFn: (trips) =>
      trips.reduce((acc, t) => acc + t.flights.length, 0) >= 10,
  },
  {
    id: "world-explorer",
    label: { es: "Explorador mundial", en: "World Explorer" },
    emoji: "🌐",
    description: {
      es: "Visitaste 10 países diferentes",
      en: "You visited 10 different countries",
    },
    unlockFn: (trips) => uniqueCountriesFromTrips(trips).size >= 10,
  },
  {
    id: "jet-setter",
    label: { es: "Jet-setter", en: "Jet Setter" },
    emoji: "💼",
    description: {
      es: "Tuviste 3 o más viajes en un mismo mes",
      en: "You had 3 or more trips in a single month",
    },
    unlockFn: (trips) => {
      const monthCounts: Record<string, number> = {};
      for (const trip of trips) {
        const firstFlight = trip.flights
          .slice()
          .sort((a, b) => a.isoDate.localeCompare(b.isoDate))[0];
        if (!firstFlight) continue;
        const monthKey = firstFlight.isoDate.slice(0, 7); // "YYYY-MM"
        monthCounts[monthKey] = (monthCounts[monthKey] ?? 0) + 1;
      }
      return Object.values(monthCounts).some((count) => count >= 3);
    },
  },
];

// ── computeAchievements ───────────────────────────────────────────────────────

export function computeAchievements(trips: TripTab[]): Badge[] {
  return BADGES.map((def) => ({
    id: def.id,
    label: def.label,
    emoji: def.emoji,
    description: def.description,
    unlocked: def.unlockFn(trips),
  }));
}
