import { AIRPORTS } from "@/lib/airports";
import { GeoPosition } from "@/hooks/useGeolocation";

// ── Constants ──────────────────────────────────────────────────────────────

/** Airports that warrant an extra 15 min security buffer due to high traffic */
const BUSY_AIRPORTS = new Set(["JFK", "LAX", "ORD", "ATL", "MIA", "EZE", "GRU", "SCL"]);

/** Average city driving speed used for Haversine-based travel estimate (km/h) */
const AVG_DRIVE_SPEED_KPH = 50;

// ── Types ──────────────────────────────────────────────────────────────────

export type UrgencyLevel = "relaxed" | "normal" | "soon" | "now" | "past";

export interface DepartureCalculatorInput {
  /** ISO 8601 departure datetime string — must include date and time */
  flightDepartureISO: string;
  /** IATA code of the origin airport */
  originCode: string;
  /** User's current geolocation, or null if unavailable */
  geoPosition: GeoPosition | null;
  /** Optional manual overrides for individual buffer components (in minutes) */
  overrides?: {
    travelMinutes?: number;
    checkInMinutes?: number;
    securityMinutes?: number;
  };
}

export interface DepartureCalculatorResult {
  /** Calculated time the user should leave */
  leaveAt: Date;
  /** Estimated drive/travel time to airport in minutes */
  travelMinutes: number;
  /** Check-in buffer in minutes */
  checkInMinutes: number;
  /** Security buffer in minutes */
  securityMinutes: number;
  /** Sum of all three buffers */
  totalBufferMinutes: number;
  /** True when the user should leave in less than 30 minutes or is already late */
  isUrgent: boolean;
  urgencyLevel: UrgencyLevel;
}

// ── Haversine helper ───────────────────────────────────────────────────────

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Core function ──────────────────────────────────────────────────────────

/**
 * Calculates the recommended departure time from the user's current location
 * to make it to the airport with appropriate buffers.
 */
export function calculateDeparture(
  params: DepartureCalculatorInput,
): DepartureCalculatorResult {
  const { flightDepartureISO, originCode, geoPosition, overrides } = params;

  const departureDate = new Date(flightDepartureISO);
  const now = new Date();

  // ── Travel time ───────────────────────────────────────────────────────────
  let travelMinutes: number;
  if (overrides?.travelMinutes !== undefined) {
    travelMinutes = overrides.travelMinutes;
  } else if (geoPosition) {
    const airport = AIRPORTS[originCode];
    if (airport?.lat !== undefined && airport?.lng !== undefined) {
      const distKm = haversineKm(
        geoPosition.lat,
        geoPosition.lng,
        airport.lat,
        airport.lng,
      );
      // Convert straight-line distance to road distance (~1.4x factor) and time
      const roadKm = distKm * 1.4;
      travelMinutes = Math.round((roadKm / AVG_DRIVE_SPEED_KPH) * 60);
      // Clamp between 10 min (already at airport) and 180 min
      travelMinutes = Math.max(10, Math.min(travelMinutes, 180));
    } else {
      travelMinutes = 60;
    }
  } else {
    travelMinutes = 60;
  }

  // ── Check-in buffer ───────────────────────────────────────────────────────
  let checkInMinutes: number;
  if (overrides?.checkInMinutes !== undefined) {
    checkInMinutes = overrides.checkInMinutes;
  } else {
    const airport = AIRPORTS[originCode];
    // Treat as international if airport.country is defined and not USA, or isFAA is false
    const isInternational =
      (airport?.country !== undefined && airport.country !== "USA") ||
      airport?.isFAA === false;
    checkInMinutes = isInternational ? 180 : 120;
  }

  // ── Security buffer ───────────────────────────────────────────────────────
  let securityMinutes: number;
  if (overrides?.securityMinutes !== undefined) {
    securityMinutes = overrides.securityMinutes;
  } else {
    securityMinutes = BUSY_AIRPORTS.has(originCode) ? 45 : 30;
  }

  // ── Total and leaveAt ─────────────────────────────────────────────────────
  const totalBufferMinutes = travelMinutes + checkInMinutes + securityMinutes;
  const leaveAt = new Date(
    departureDate.getTime() - totalBufferMinutes * 60 * 1000,
  );

  // ── Urgency ───────────────────────────────────────────────────────────────
  const msUntilLeave = leaveAt.getTime() - now.getTime();
  const minutesUntilLeave = msUntilLeave / 60000;

  let urgencyLevel: UrgencyLevel;
  if (departureDate.getTime() < now.getTime()) {
    urgencyLevel = "past";
  } else if (minutesUntilLeave <= 0) {
    urgencyLevel = "now";
  } else if (minutesUntilLeave < 30) {
    urgencyLevel = "now";
  } else if (minutesUntilLeave < 60) {
    urgencyLevel = "soon";
  } else if (minutesUntilLeave < 180) {
    urgencyLevel = "normal";
  } else {
    urgencyLevel = "relaxed";
  }

  const isUrgent = urgencyLevel === "now" || urgencyLevel === "soon";

  return {
    leaveAt,
    travelMinutes,
    checkInMinutes,
    securityMinutes,
    totalBufferMinutes,
    isUrgent,
    urgencyLevel,
  };
}
