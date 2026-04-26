import { TripTab, TripFlight } from "./types";
import { AIRPORTS } from "./airports";

// ── Haversine distance ─────────────────────────────────────────────────────

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance in km between two lat/lng points. */
function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Flight duration estimate ───────────────────────────────────────────────

/** Estimate flight duration (minutes) from distance or known departure/arrival times. */
function estimateDurationMin(flight: TripFlight, distKm: number): number {
  // If both departure and arrival times are available on the same date
  if (flight.departureTime && flight.arrivalTime) {
    const [dh, dm] = flight.departureTime.split(":").map(Number);
    const [ah, am] = flight.arrivalTime.split(":").map(Number);
    const depMin = dh * 60 + dm;
    let arrMin = ah * 60 + am;
    // Overnight: arrival is next day (or arrivalDate differs)
    if (
      flight.arrivalDate &&
      flight.arrivalDate !== flight.isoDate
    ) {
      arrMin += 24 * 60;
    } else if (arrMin < depMin) {
      arrMin += 24 * 60; // naive overnight fallback
    }
    return arrMin - depMin;
  }

  // Estimate from distance using average cruise speed (~850 km/h) + 30 min taxi/climb
  if (distKm > 0) {
    return Math.round((distKm / 850) * 60 + 30);
  }

  // Absolute fallback by route type
  const originUS = AIRPORTS[flight.originCode]?.country == null;   // no country = USA
  const destUS = AIRPORTS[flight.destinationCode]?.country == null;
  if (originUS && destUS) return 165;
  return 240;
}

// ── CO2 estimation ────────────────────────────────────────────────────────
// Methodology: ICAO carbon calculator simplified formula.
// Emission factor: ~0.115 kg CO2 per passenger per km (economy, long-haul average)
// Short-haul (<1500 km) factor: ~0.158 kg CO2/pax/km

const CO2_SHORT = 0.158; // kg CO2 per pax per km, <1500 km
const CO2_LONG = 0.115; // kg CO2 per pax per km, >=1500 km

/** Calculate CO2 emissions for a flight based on distance. */
function co2KgForFlight(distKm: number): number {
  if (distKm <= 0) return 0;
  const factor = distKm < 1500 ? CO2_SHORT : CO2_LONG;
  return Math.round(distKm * factor);
}

// ── TripStats ─────────────────────────────────────────────────────────────

export interface TripStats {
  totalFlights: number;
  totalDistanceKm: number;
  totalDurationHours: number;
  countriesVisited: string[];
  airportsVisited: string[];
  mostUsedAirline: string | null;
  avgDelayMinutes: number;
  co2Kg: number;
  earliestFlight: string | null;   // "HH:MM" departure time
  longestFlight: { flightCode: string; durationMin: number } | null;
  uniqueDestinations: string[];        // unique destination airport codes
  mostFrequentRoute: string | null;    // e.g. "EZE→MIA"
  timesAroundEarth: number;            // totalDistanceKm / 40075, rounded to 1 decimal
}

/**
 * Compute trip statistics based on the given trip data.
 */
export function computeTripStats(trip: TripTab): TripStats {
  const { flights } = trip;

  if (flights.length === 0) {
    return {
      totalFlights: 0,
      totalDistanceKm: 0,
      totalDurationHours: 0,
      countriesVisited: [],
      airportsVisited: [],
      mostUsedAirline: null,
      avgDelayMinutes: 0,
      co2Kg: 0,
      earliestFlight: null,
      longestFlight: null,
      uniqueDestinations: [],
      mostFrequentRoute: null,
      timesAroundEarth: 0,
    };
  }

  let totalDistanceKm = 0;
  let totalDurationMin = 0;
  let co2Kg = 0;

  const airportSet = new Set<string>();
  const countrySet = new Set<string>();
  const airlineCounts = new Map<string, number>();

  let earliestDepartureMin: number | null = null;
  let earliestTime: string | null = null;
  let longestDuration = 0;
  let longestFlightCode: string | null = null;
  const destinationSet = new Set<string>();
  const routeCounts = new Map<string, number>();

  for (const flight of flights) {
    // Airports visited (origin + destination)
    airportSet.add(flight.originCode);
    airportSet.add(flight.destinationCode);

    // Unique destinations (only destination, not origin)
    destinationSet.add(flight.destinationCode);

    // Route frequency
    const routeKey = `${flight.originCode}→${flight.destinationCode}`;
    routeCounts.set(routeKey, (routeCounts.get(routeKey) ?? 0) + 1);

    // Countries from destination airport
    const destInfo = AIRPORTS[flight.destinationCode];
    if (destInfo) {
      countrySet.add(destInfo.country ?? "United States");
    }
    const originInfo = AIRPORTS[flight.originCode];
    if (originInfo) {
      countrySet.add(originInfo.country ?? "United States");
    }

    // Airline count
    const airline = flight.airlineName || flight.airlineCode;
    if (airline) {
      airlineCounts.set(airline, (airlineCounts.get(airline) ?? 0) + 1);
    }

    // Distance
    let distKm = 0;
    if (originInfo?.lat && destInfo?.lat) {
      distKm = haversineKm(
        originInfo.lat, originInfo.lng,
        destInfo.lat,   destInfo.lng,
      );
    }
    totalDistanceKm += distKm;

    // Duration
    const durationMin = estimateDurationMin(flight, distKm);
    totalDurationMin += durationMin;

    // CO2
    co2Kg += co2KgForFlight(distKm);

    // Earliest departure
    if (flight.departureTime) {
      const [h, m] = flight.departureTime.split(":").map(Number);
      const depMin = h * 60 + m;
      if (earliestDepartureMin === null || depMin < earliestDepartureMin) {
        earliestDepartureMin = depMin;
        earliestTime = flight.departureTime;
      }
    }

    // Longest flight
    if (durationMin > longestDuration) {
      longestDuration = durationMin;
      longestFlightCode = flight.flightCode;
    }
  }

  // Most used airline
  let mostUsedAirline: string | null = null;
  let maxCount = 0;
  airlineCounts.forEach((count, name) => {
    if (count > maxCount) {
      maxCount = count;
      mostUsedAirline = name;
    }
  });

  // Most frequent route
  let mostFrequentRoute: string | null = null;
  let maxRouteCount = 0;
  routeCounts.forEach((count, route) => {
    if (count > maxRouteCount) {
      maxRouteCount = count;
      mostFrequentRoute = route;
    }
  });

  const timesAroundEarth = Math.round((totalDistanceKm / 40075) * 10) / 10;

  return {
    totalFlights: flights.length,
    totalDistanceKm: Math.round(totalDistanceKm),
    totalDurationHours: Math.round((totalDurationMin / 60) * 10) / 10,
    countriesVisited: Array.from(countrySet).sort(),
    airportsVisited: Array.from(airportSet).sort(),
    mostUsedAirline,
    avgDelayMinutes: 0, // Delay data is not stored on TripFlight; reserved for future use
    co2Kg,
    earliestFlight: earliestTime,
    longestFlight:
      longestFlightCode !== null
        ? { flightCode: longestFlightCode, durationMin: longestDuration }
        : null,
    uniqueDestinations: Array.from(destinationSet).sort(),
    mostFrequentRoute,
    timesAroundEarth,
  };
}