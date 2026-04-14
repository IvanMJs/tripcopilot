"use client";

import { useState, useEffect, useCallback } from "react";
import { GeoPosition } from "@/hooks/useGeolocation";
import {
  calculateDeparture,
  DepartureCalculatorResult,
} from "@/lib/departureCalculator";

// ── Types ──────────────────────────────────────────────────────────────────

export interface DepartureTimeResult extends DepartureCalculatorResult {
  /** "Salir a las 14:30" / "Leave at 2:30 PM" */
  leaveAtFormatted: string;
  /** "Faltan 2 horas 15 minutos" / "2 hours 15 minutes left" */
  countdownText: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatLeaveAt(date: Date, locale: "es" | "en"): string {
  const timeStr = date.toLocaleTimeString(locale === "es" ? "es-AR" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: locale === "en",
  });
  return locale === "es" ? `Salir a las ${timeStr}` : `Leave at ${timeStr}`;
}

function buildCountdownText(
  leaveAt: Date,
  locale: "es" | "en",
): string {
  const msLeft = leaveAt.getTime() - Date.now();

  if (msLeft <= 0) {
    return locale === "es" ? "¡Salí ya!" : "Leave now!";
  }

  const totalMinutes = Math.ceil(msLeft / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (locale === "es") {
    if (hours === 0) return `Faltan ${minutes} min`;
    if (minutes === 0) return `Falta ${hours} h`;
    return `Faltan ${hours} h ${minutes} min`;
  } else {
    if (hours === 0) return `${minutes} min left`;
    if (minutes === 0) return `${hours} hr left`;
    return `${hours} hr ${minutes} min left`;
  }
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

// ── Hook ───────────────────────────────────────────────────────────────────

/**
 * Calculates and formats departure time for a flight, refreshing every minute.
 * Returns null if the flight departs more than 24 hours from now.
 */
export function useDepartureTime(
  flightDepartureISO: string,
  originCode: string,
  geoPosition: GeoPosition | null,
  locale: "es" | "en",
): DepartureTimeResult | null {
  const compute = useCallback((): DepartureTimeResult | null => {
    if (!flightDepartureISO) return null;

    const departureDate = new Date(flightDepartureISO);
    const msUntilDeparture = departureDate.getTime() - Date.now();

    // Only show the widget for flights within the next 24 hours
    if (msUntilDeparture > TWENTY_FOUR_HOURS_MS || msUntilDeparture < 0) {
      return null;
    }

    const result = calculateDeparture({
      flightDepartureISO,
      originCode,
      geoPosition,
    });

    return {
      ...result,
      leaveAtFormatted: formatLeaveAt(result.leaveAt, locale),
      countdownText: buildCountdownText(result.leaveAt, locale),
    };
  }, [flightDepartureISO, originCode, geoPosition, locale]);

  const [result, setResult] = useState<DepartureTimeResult | null>(() =>
    compute(),
  );

  useEffect(() => {
    // Recalculate immediately on param changes
    setResult(compute());

    // Then recalculate every 60 seconds
    const id = setInterval(() => {
      setResult(compute());
    }, 60 * 1000);

    return () => clearInterval(id);
  }, [compute]);

  return result;
}
