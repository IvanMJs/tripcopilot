"use client";

import { useEffect, useRef } from "react";
import { TripTab, AirportStatusMap } from "@/lib/types";
import { analyzeConnection } from "@/lib/connectionRisk";

// ── Constants ──────────────────────────────────────────────────────────────

/** How often to re-check for at-risk connections (5 minutes) */
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

/** localStorage key for tracking sent notification IDs */
const SENT_KEY = "tc-connection-alerts-sent";

// ── Helpers ────────────────────────────────────────────────────────────────

function readSentIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(SENT_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function markSent(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const existing = readSentIds();
    existing.add(id);
    // Keep only the last 100 entries to avoid unbounded growth
    const trimmed = Array.from(existing).slice(-100);
    localStorage.setItem(SENT_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage unavailable — fail silently
  }
}

function fireNotification(title: string, body: string, tag: string): void {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, {
      body,
      icon: "/icon.svg",
      tag,
    });
  } catch {
    // Notification API may throw in some environments
  }
}

const ALERT_LABELS = {
  es: {
    title: (code: string) => `⚠️ Conexión en riesgo · ${code}`,
    body: (
      flightA: string,
      flightB: string,
      buffer: number,
      delay: number,
    ) =>
      `${flightA} llega con ${delay}min de demora. Margen restante para ${flightB}: ${buffer}min. Considerá contactar a la aerolínea.`,
  },
  en: {
    title: (code: string) => `⚠️ Connection at risk · ${code}`,
    body: (
      flightA: string,
      flightB: string,
      buffer: number,
      delay: number,
    ) =>
      `${flightA} arriving ${delay}min late. Buffer for ${flightB}: ${buffer}min remaining. Consider contacting the airline.`,
  },
} as const;

// ── Hook ───────────────────────────────────────────────────────────────────

/**
 * Side-effect hook: monitors connection risks across all user trips.
 * When a delay reduces the connection buffer below the MCT threshold,
 * fires a push notification (once per connection per session).
 *
 * No UI output — call at the page level.
 */
export function useConnectionAlerts(
  userTrips: TripTab[],
  statusMap: AirportStatusMap,
  locale: "es" | "en",
): void {
  const userTripsRef  = useRef(userTrips);
  const statusMapRef  = useRef(statusMap);
  const localeRef     = useRef(locale);

  useEffect(() => { userTripsRef.current = userTrips; }, [userTrips]);
  useEffect(() => { statusMapRef.current = statusMap; }, [statusMap]);
  useEffect(() => { localeRef.current = locale; }, [locale]);

  useEffect(() => {
    function checkConnections() {
      if (typeof window === "undefined") return;
      if (!("Notification" in window)) return;
      if (Notification.permission !== "granted") return;

      const trips  = userTripsRef.current;
      const sMap   = statusMapRef.current;
      const loc    = localeRef.current;
      const L      = ALERT_LABELS[loc];
      const sent   = readSentIds();
      const today  = new Date().toISOString().slice(0, 10);

      for (const trip of trips) {
        const sorted = [...trip.flights].sort((a, b) =>
          a.isoDate.localeCompare(b.isoDate) ||
          (a.departureTime ?? "").localeCompare(b.departureTime ?? ""),
        );

        for (let i = 0; i < sorted.length - 1; i++) {
          const flightA = sorted[i];
          const flightB = sorted[i + 1];

          // Only check future connections
          if (flightB.isoDate < today) continue;

          const analysis = analyzeConnection(flightA, flightB, sMap);
          if (!analysis) continue;

          // Only alert when there's an actual delay AND connection is at risk or missed
          if (analysis.delayAddedMinutes === 0) continue;
          if (analysis.risk !== "at_risk" && analysis.risk !== "missed") continue;

          const notifId = `${flightA.id}→${flightB.id}:${analysis.risk}:${analysis.delayAddedMinutes}`;
          if (sent.has(notifId)) continue;

          const title = L.title(flightB.flightCode);
          const body  = L.body(
            flightA.flightCode,
            flightB.flightCode,
            analysis.effectiveBufferMinutes,
            analysis.delayAddedMinutes,
          );

          fireNotification(title, body, notifId);
          markSent(notifId);
        }
      }
    }

    // Run immediately on mount, then every CHECK_INTERVAL_MS
    checkConnections();
    const interval = setInterval(checkConnections, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);
}
