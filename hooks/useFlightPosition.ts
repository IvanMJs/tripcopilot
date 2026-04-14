"use client";

import { useEffect, useState } from "react";
import { AIRPORTS } from "@/lib/airports";

export interface FlightPositionData {
  isActive: boolean;
  progress: number;         // 0–1
  currentLat: number;
  currentLng: number;
  remainingMinutes: number;
  elapsedMinutes: number;
  estimatedAltitudeFt: number;
}

interface UseFlightPositionInput {
  originIata: string;
  destIata: string;
  departureISO: string; // full ISO datetime, e.g. "2026-04-14T10:30:00"
  arrivalISO: string;   // full ISO datetime
}

// Great-circle intermediate point between two lat/lng pairs at fraction t (0–1).
// Uses spherical linear interpolation (slerp on unit sphere).
function greatCircleIntermediate(
  lat1Deg: number,
  lng1Deg: number,
  lat2Deg: number,
  lng2Deg: number,
  t: number,
): { lat: number; lng: number } {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;

  const lat1 = toRad(lat1Deg);
  const lng1 = toRad(lng1Deg);
  const lat2 = toRad(lat2Deg);
  const lng2 = toRad(lng2Deg);

  // Convert to Cartesian
  const x1 = Math.cos(lat1) * Math.cos(lng1);
  const y1 = Math.cos(lat1) * Math.sin(lng1);
  const z1 = Math.sin(lat1);

  const x2 = Math.cos(lat2) * Math.cos(lng2);
  const y2 = Math.cos(lat2) * Math.sin(lng2);
  const z2 = Math.sin(lat2);

  // Angular distance
  const dot = Math.min(1, Math.max(-1, x1 * x2 + y1 * y2 + z1 * z2));
  const omega = Math.acos(dot);

  if (omega < 1e-10) {
    return { lat: lat1Deg, lng: lng1Deg };
  }

  const sinOmega = Math.sin(omega);
  const a = Math.sin((1 - t) * omega) / sinOmega;
  const b = Math.sin(t * omega) / sinOmega;

  const x = a * x1 + b * x2;
  const y = a * y1 + b * y2;
  const z = a * z1 + b * z2;

  const lat = toDeg(Math.atan2(z, Math.sqrt(x * x + y * y)));
  const lng = toDeg(Math.atan2(y, x));

  return { lat, lng };
}

// Estimate altitude based on flight phase.
// climb: 0–20% of flight, cruise: 20–80%, descent: 80–100%.
function estimateAltitudeFt(progress: number): number {
  const CRUISE_ALT = 35_000;
  if (progress < 0.2) {
    // Climb phase: linear ramp from 0 to cruise
    return Math.round((progress / 0.2) * CRUISE_ALT);
  }
  if (progress <= 0.8) {
    // Cruise phase
    return CRUISE_ALT;
  }
  // Descent phase: linear ramp from cruise to 0
  return Math.round(((1 - progress) / 0.2) * CRUISE_ALT);
}

function computePosition(
  input: UseFlightPositionInput,
): FlightPositionData | null {
  const origin = AIRPORTS[input.originIata];
  const dest = AIRPORTS[input.destIata];

  if (!origin || !dest) return null;

  const now = Date.now();
  const dep = new Date(input.departureISO).getTime();
  const arr = new Date(input.arrivalISO).getTime();

  if (isNaN(dep) || isNaN(arr) || arr <= dep) return null;

  const totalMs = arr - dep;
  const elapsedMs = now - dep;

  if (elapsedMs < 0 || elapsedMs > totalMs) return null;

  const progress = elapsedMs / totalMs;
  const elapsedMinutes = Math.round(elapsedMs / 60_000);
  const remainingMinutes = Math.round((totalMs - elapsedMs) / 60_000);
  const estimatedAltitudeFt = estimateAltitudeFt(progress);

  const { lat: currentLat, lng: currentLng } = greatCircleIntermediate(
    origin.lat,
    origin.lng,
    dest.lat,
    dest.lng,
    progress,
  );

  return {
    isActive: true,
    progress,
    currentLat,
    currentLng,
    remainingMinutes,
    elapsedMinutes,
    estimatedAltitudeFt,
  };
}

const UPDATE_INTERVAL_MS = 30_000; // 30 seconds

export function useFlightPosition(
  input: UseFlightPositionInput,
): FlightPositionData | null {
  const [position, setPosition] = useState<FlightPositionData | null>(() =>
    computePosition(input),
  );

  useEffect(() => {
    // Recompute immediately when inputs change
    setPosition(computePosition(input));

    const id = setInterval(() => {
      setPosition(computePosition(input));
    }, UPDATE_INTERVAL_MS);

    return () => clearInterval(id);
  }, [input.originIata, input.destIata, input.departureISO, input.arrivalISO]); // eslint-disable-line react-hooks/exhaustive-deps

  return position;
}
