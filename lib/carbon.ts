import { AIRPORTS } from "@/lib/airports";

// ── Haversine distance ────────────────────────────────────────────────────────

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Emission factors (kg CO₂/km/passenger) ───────────────────────────────────
// Source: ICAO Carbon Emissions Calculator methodology

const EMISSION_FACTORS: Record<
  "economy" | "premium_economy" | "business" | "first",
  number
> = {
  economy:         0.115,
  premium_economy: 0.173,
  business:        0.230,
  first:           0.345,
};

// ── calculateFlightCO2 ────────────────────────────────────────────────────────

export function calculateFlightCO2(
  originCode: string,
  destinationCode: string,
  cabinClass: "economy" | "premium_economy" | "business" | "first",
): { distanceKm: number; co2Kg: number } | null {
  const origin = AIRPORTS[originCode];
  const dest   = AIRPORTS[destinationCode];

  if (!origin || !dest) return null;

  const distanceKm = haversineKm(origin.lat, origin.lng, dest.lat, dest.lng);
  const co2Kg = distanceKm * EMISSION_FACTORS[cabinClass];

  return { distanceKm: Math.round(distanceKm), co2Kg: Math.round(co2Kg) };
}

// ── calculateTripCO2 ──────────────────────────────────────────────────────────

export function calculateTripCO2(
  flights: Array<{
    originCode: string;
    destinationCode: string;
    cabinClass?: string;
  }>,
): { totalCo2Kg: number; perFlight: Array<{ co2Kg: number; distanceKm: number }> } {
  let totalCo2Kg = 0;
  const perFlight: Array<{ co2Kg: number; distanceKm: number }> = [];

  for (const f of flights) {
    const cabin = (
      f.cabinClass === "economy" ||
      f.cabinClass === "premium_economy" ||
      f.cabinClass === "business" ||
      f.cabinClass === "first"
    ) ? f.cabinClass : "economy";

    const result = calculateFlightCO2(f.originCode, f.destinationCode, cabin);
    if (result) {
      totalCo2Kg += result.co2Kg;
      perFlight.push(result);
    } else {
      perFlight.push({ co2Kg: 0, distanceKm: 0 });
    }
  }

  return { totalCo2Kg: Math.round(totalCo2Kg), perFlight };
}
