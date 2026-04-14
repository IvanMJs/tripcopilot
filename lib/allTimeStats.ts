import { AIRPORTS, haversineKm } from "@/lib/airports";
import type { TripTab } from "@/lib/types";

export interface AllTimeStats {
  /** Number of unique countries visited */
  totalCountries: number;
  /** Unique country name strings */
  countryCodes: string[];
  /** Total kilometres flown across all trips */
  totalKm: number;
  /** Total number of individual flight legs */
  totalFlights: number;
  /** Average trip duration in days (first departure → last arrival/departure) */
  avgTripDurationDays: number;
  /** The calendar month with the most departures */
  busiestMonth: { month: number; label: string; count: number };
  /** Airport that appears most often (origin or destination) */
  mostVisitedAirport: { iata: string; count: number };
  /** How many times around the Earth the total distance equals */
  timesAroundEarth: number;
  /** Estimated total airborne hours at avg 800 km/h */
  totalHoursAirborne: number;
}

const EARTH_CIRCUMFERENCE_KM = 40075;
const AVG_SPEED_KMH = 800;

const MONTH_LABELS: string[] = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getAirportCountry(iata: string): string {
  const airport = AIRPORTS[iata];
  if (!airport) return "Unknown";
  return airport.country ?? "USA";
}

function getTripDurationDays(trip: TripTab): number {
  if (trip.flights.length === 0) return 0;
  const sorted = [...trip.flights].sort(
    (a, b) => new Date(a.isoDate).getTime() - new Date(b.isoDate).getTime(),
  );
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const startMs = new Date(first.isoDate).getTime();
  const endMs = new Date(last.arrivalDate ?? last.isoDate).getTime();
  return Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1);
}

export function computeAllTimeStats(trips: TripTab[]): AllTimeStats {
  const countriesSet = new Set<string>();
  let totalKm = 0;
  let totalFlights = 0;
  const monthCounts: number[] = new Array(12).fill(0) as number[];
  const airportCounts: Record<string, number> = {};
  const tripDurations: number[] = [];

  for (const trip of trips) {
    for (const flight of trip.flights) {
      totalFlights += 1;

      // Distance
      const origin = AIRPORTS[flight.originCode];
      const dest = AIRPORTS[flight.destinationCode];
      if (origin && dest) {
        totalKm += haversineKm(origin.lat, origin.lng, dest.lat, dest.lng);
      }

      // Countries
      countriesSet.add(getAirportCountry(flight.originCode));
      countriesSet.add(getAirportCountry(flight.destinationCode));

      // Busiest month — based on departure date
      const depDate = new Date(flight.isoDate);
      if (!isNaN(depDate.getTime())) {
        monthCounts[depDate.getMonth()] += 1;
      }

      // Airport visit counts (both origin and destination)
      airportCounts[flight.originCode] = (airportCounts[flight.originCode] ?? 0) + 1;
      airportCounts[flight.destinationCode] = (airportCounts[flight.destinationCode] ?? 0) + 1;
    }

    if (trip.flights.length > 0) {
      tripDurations.push(getTripDurationDays(trip));
    }
  }

  // Busiest month
  let busiestMonthIndex = 0;
  for (let i = 1; i < 12; i++) {
    if (monthCounts[i] > monthCounts[busiestMonthIndex]) {
      busiestMonthIndex = i;
    }
  }
  const busiestMonth = {
    month: busiestMonthIndex + 1,
    label: MONTH_LABELS[busiestMonthIndex],
    count: monthCounts[busiestMonthIndex],
  };

  // Most visited airport
  let mostVisitedIata = "";
  let mostVisitedCount = 0;
  for (const [iata, count] of Object.entries(airportCounts)) {
    if (count > mostVisitedCount) {
      mostVisitedIata = iata;
      mostVisitedCount = count;
    }
  }

  const avgTripDurationDays =
    tripDurations.length > 0
      ? Math.round(
          tripDurations.reduce((sum, d) => sum + d, 0) / tripDurations.length,
        )
      : 0;

  const roundedKm = Math.round(totalKm);

  return {
    totalCountries: countriesSet.size,
    countryCodes: Array.from(countriesSet).sort(),
    totalKm: roundedKm,
    totalFlights,
    avgTripDurationDays,
    busiestMonth,
    mostVisitedAirport: { iata: mostVisitedIata, count: mostVisitedCount },
    timesAroundEarth:
      Math.round((roundedKm / EARTH_CIRCUMFERENCE_KM) * 100) / 100,
    totalHoursAirborne:
      Math.round((roundedKm / AVG_SPEED_KMH) * 10) / 10,
  };
}
