import { TripTab } from "@/lib/types";

function getTripDateRange(trip: TripTab): { min: string; max: string } | null {
  if (trip.flights.length === 0) return null;
  const dates = trip.flights.map((f) => f.isoDate);
  const min = dates.reduce((a, b) => (a < b ? a : b));
  const max = dates.reduce((a, b) => (a > b ? a : b));
  return { min, max };
}

export function isInTravelWindow(trips: TripTab[]): boolean {
  const today = new Date().toISOString().slice(0, 10);
  for (const trip of trips) {
    const range = getTripDateRange(trip);
    if (!range) continue;
    if (today >= range.min && today <= range.max) return true;
  }
  return false;
}

export function getActiveTravelTrip(trips: TripTab[]): TripTab | null {
  const today = new Date().toISOString().slice(0, 10);
  for (const trip of trips) {
    const range = getTripDateRange(trip);
    if (!range) continue;
    if (today >= range.min && today <= range.max) return trip;
  }
  return null;
}
