import { AIRPORTS, haversineKm } from "@/lib/airports";
import type { TripTab } from "@/lib/types";

export interface TripSummary {
  totalKm: number;
  totalFlights: number;
  durationDays: number;
  /** Unique destination IATA codes across all flights */
  destinations: string[];
  dateRange: { start: string; end: string };
}

/**
 * Returns true when ALL flights in the trip have departure dates in the past.
 * A trip with no flights is considered not completed.
 */
export function isTripCompleted(trip: TripTab): boolean {
  if (trip.flights.length === 0) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return trip.flights.every((f) => {
    const departure = new Date(f.isoDate);
    departure.setHours(0, 0, 0, 0);
    return departure < today;
  });
}

/** Returns only completed trips, sorted by most recent departure first. */
export function getArchivedTrips(trips: TripTab[]): TripTab[] {
  return trips
    .filter(isTripCompleted)
    .sort((a, b) => {
      const latestA = Math.max(...a.flights.map((f) => new Date(f.isoDate).getTime()));
      const latestB = Math.max(...b.flights.map((f) => new Date(f.isoDate).getTime()));
      return latestB - latestA;
    });
}

/** Returns only non-completed (active) trips. */
export function getActiveTrips(trips: TripTab[]): TripTab[] {
  return trips.filter((t) => !isTripCompleted(t));
}

/** Computes a summary of the trip's key statistics. */
export function getTripSummary(trip: TripTab): TripSummary {
  const { flights } = trip;

  if (flights.length === 0) {
    return {
      totalKm: 0,
      totalFlights: 0,
      durationDays: 0,
      destinations: [],
      dateRange: { start: "", end: "" },
    };
  }

  // Total distance
  let totalKm = 0;
  for (const flight of flights) {
    const origin = AIRPORTS[flight.originCode];
    const dest = AIRPORTS[flight.destinationCode];
    if (origin && dest) {
      totalKm += haversineKm(origin.lat, origin.lng, dest.lat, dest.lng);
    }
  }

  // Unique destinations (all airports touched)
  const allIata = new Set<string>();
  for (const flight of flights) {
    allIata.add(flight.originCode);
    allIata.add(flight.destinationCode);
  }

  // Date range: earliest departure → latest arrival (or departure date if no arrival)
  const sortedByDeparture = [...flights].sort(
    (a, b) => new Date(a.isoDate).getTime() - new Date(b.isoDate).getTime(),
  );
  const firstFlight = sortedByDeparture[0];
  const lastFlight = sortedByDeparture[sortedByDeparture.length - 1];

  const startDate = firstFlight.isoDate;
  const endDate = lastFlight.arrivalDate ?? lastFlight.isoDate;

  const startMs = new Date(startDate).getTime();
  const endMs = new Date(endDate).getTime();
  const durationDays = Math.max(
    1,
    Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1,
  );

  return {
    totalKm: Math.round(totalKm),
    totalFlights: flights.length,
    durationDays,
    destinations: Array.from(allIata),
    dateRange: { start: startDate, end: endDate },
  };
}