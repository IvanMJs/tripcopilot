"use client";

import { useState, useEffect } from "react";
import { TripTab } from "@/lib/types";
import { AIRPORTS } from "@/lib/airports";

export interface LandedFlightInfo {
  flightId: string;
  flightCode: string;
  destinationCode: string;
  cityName: string;
}

const LS_PREFIX = "tripcopilot-welcomed-";
/** Maximum age (ms) to surface a welcome banner: 48 hours */
const MAX_AGE_MS = 48 * 60 * 60 * 1000;
/** Auto-dismiss after 24 hours from first shown */
const AUTO_DISMISS_MS = 24 * 60 * 60 * 1000;

function hasLanded(isoDate: string, arrivalTime?: string): boolean {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const yesterdayStr = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);

  if (isoDate !== todayStr && isoDate !== yesterdayStr) return false;

  // For yesterday's flights, always consider landed
  if (isoDate === yesterdayStr) return true;

  // For today, only consider landed if arrivalTime has passed
  if (!arrivalTime) return false;
  const [hh, mm] = arrivalTime.split(":").map(Number);
  const arrival = new Date();
  arrival.setHours(hh, mm, 0, 0);
  return now >= arrival;
}

function isWithin48h(isoDate: string): boolean {
  const now = Date.now();
  const flightTime = new Date(isoDate + "T00:00:00").getTime();
  return now - flightTime <= MAX_AGE_MS;
}

function isSeenAndExpired(flightId: string): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(LS_PREFIX + flightId);
  if (!raw) return false;
  const ts = Number(raw);
  if (isNaN(ts)) return false;
  return Date.now() - ts >= AUTO_DISMISS_MS;
}

function isSeen(flightId: string): boolean {
  if (typeof window === "undefined") return true;
  const raw = localStorage.getItem(LS_PREFIX + flightId);
  if (!raw) return false;
  const ts = Number(raw);
  if (isNaN(ts)) return false;
  // Expired — treat as unseen so it no longer shows but also won't re-appear
  return Date.now() - ts < AUTO_DISMISS_MS;
}

export function usePostFlightWelcome(trips: TripTab[]): {
  landedFlight: LandedFlightInfo | null;
  dismiss: () => void;
} {
  const [landedFlight, setLandedFlight] = useState<LandedFlightInfo | null>(null);

  useEffect(() => {
    const found = findLandedFlight(trips);
    setLandedFlight(found);
  }, [trips]);

  function findLandedFlight(allTrips: TripTab[]): LandedFlightInfo | null {
    // Gather all candidates — most recent first
    const candidates: Array<{ flight: TripTab["flights"][number]; isoDate: string }> = [];

    for (const trip of allTrips) {
      for (const f of trip.flights) {
        const effectiveDate = f.arrivalDate ?? f.isoDate;
        if (!hasLanded(effectiveDate, f.arrivalTime)) continue;
        if (!isWithin48h(effectiveDate)) continue;
        if (isSeen(f.id)) continue;
        candidates.push({ flight: f, isoDate: effectiveDate });
      }
    }

    if (candidates.length === 0) return null;

    // Pick most recent
    candidates.sort((a, b) => b.isoDate.localeCompare(a.isoDate));
    const { flight } = candidates[0];

    return {
      flightId: flight.id,
      flightCode: flight.flightCode,
      destinationCode: flight.destinationCode,
      cityName: AIRPORTS[flight.destinationCode]?.city ?? flight.destinationCode,
    };
  }

  function dismiss() {
    if (!landedFlight) return;
    if (typeof window !== "undefined") {
      localStorage.setItem(LS_PREFIX + landedFlight.flightId, String(Date.now()));
    }
    setLandedFlight(null);
  }

  return { landedFlight, dismiss };
}
