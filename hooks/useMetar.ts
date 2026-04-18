"use client";

import { useState, useEffect, useRef } from "react";
import { AIRPORTS } from "@/lib/airports";

// ── Types ─────────────────────────────────────────────────────────────────────

export type FlightCategory = "VFR" | "MVFR" | "IFR" | "LIFR";

export interface MetarData {
  icao:           string;
  windDirDeg:     number;      // 0 = VRB or calm
  isVRB:          boolean;     // true when direction is variable
  windSpeedKt:    number;
  windGustKt?:    number;
  visibilitySM:   number;      // 10 means "10+ SM" (unlimited)
  ceilingFt?:     number;      // undefined = unlimited/clear
  weatherString?: string;      // raw wx phenomena, e.g. "-RA", "TS", "FG"
  tempC:          number;
  flightCategory: FlightCategory;
  rawOb:          string;
  obsTime:        number;      // unix timestamp (seconds)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseVisibility(raw: unknown): number {
  if (raw == null) return 10;
  const s = String(raw).trim();
  if (s === "10+" || parseFloat(s) >= 10) return 10;

  // Fractions like "1/4", "1 1/2"
  if (s.includes("/")) {
    let total = 0;
    for (const part of s.split(" ")) {
      if (part.includes("/")) {
        const [n, d] = part.split("/").map(Number);
        total += (d ? n / d : 0);
      } else {
        total += Number(part) || 0;
      }
    }
    return total;
  }
  return parseFloat(s) || 10;
}

function findCeiling(
  sky: Array<{ cover: string; base?: number | null }> | null | undefined,
): number | undefined {
  if (!Array.isArray(sky) || sky.length === 0) return undefined;
  const layers = sky.filter(
    (s) => s.cover === "BKN" || s.cover === "OVC" || s.cover === "VV",
  );
  if (layers.length === 0) return undefined;
  const bases = layers
    .map((s) => (s.base ?? 0) * 100) // AWC "base" is in hundreds of feet
    .filter((b) => b > 0);
  return bases.length ? Math.min(...bases) : undefined;
}

function deriveFlightCategory(
  visibSM: number,
  ceilingFt: number | undefined,
): FlightCategory {
  const v = visibSM;
  const c = ceilingFt ?? 99_999;
  if (v < 1   || c < 500)  return "LIFR";
  if (v < 3   || c < 1000) return "IFR";
  if (v < 5   || c < 3000) return "MVFR";
  return "VFR";
}

// ── Cache ─────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data:      MetarData;
  timestamp: number;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Fetches METAR data for a list of IATA airport codes.
 * Converts to ICAO codes (already in airports.ts), calls the AWC proxy,
 * caches results for 5 min, and returns a map of IATA → MetarData.
 */
export function useMetar(airportCodes: string[]): Record<string, MetarData> {
  const [metarMap, setMetarMap] = useState<Record<string, MetarData>>({});
  const cacheRef = useRef<Record<string, CacheEntry>>({});

  useEffect(() => {
    if (airportCodes.length === 0) return;

    let cancelled = false;

    async function fetchMetar() {
      const now = Date.now();

      // Which airports need a fresh fetch?
      const toFetch = airportCodes.filter((code) => {
        const airport = AIRPORTS[code];
        if (!airport?.icao) return false;
        const cached = cacheRef.current[code];
        return !cached || now - cached.timestamp > CACHE_TTL_MS;
      });

      // Build result from cache first so stale data shows while re-fetching
      const buildResult = () => {
        const r: Record<string, MetarData> = {};
        for (const code of airportCodes) {
          const c = cacheRef.current[code];
          if (c) r[code] = c.data;
        }
        return r;
      };

      if (toFetch.length === 0) {
        setMetarMap(buildResult());
        return;
      }

      const icaoList = toFetch.map((c) => AIRPORTS[c]!.icao).join(",");

      try {
        const res = await fetch(
          `/api/aviation-weather?ids=${encodeURIComponent(icaoList)}`,
        );
        if (!res.ok) return;

        const json = await res.json() as unknown[];
        if (!Array.isArray(json) || cancelled) return;

        const newCache = { ...cacheRef.current };

        for (const item of json as Record<string, unknown>[]) {
          const icao  = String(item.icaoId ?? "");
          const iata  = toFetch.find((c) => AIRPORTS[c]?.icao === icao);
          if (!iata) continue;

          const visib   = parseVisibility(item.visib);
          const ceiling = findCeiling(item.sky as Parameters<typeof findCeiling>[0]);
          const isVRB   = String(item.wdir ?? "").toUpperCase() === "VRB";

          const metar: MetarData = {
            icao,
            windDirDeg:     isVRB ? 0 : Number(item.wdir ?? 0),
            isVRB,
            windSpeedKt:    Number(item.wspd ?? 0),
            windGustKt:     item.wgst != null ? Number(item.wgst) : undefined,
            visibilitySM:   visib,
            ceilingFt:      ceiling,
            weatherString:  item.wxString as string | undefined || undefined,
            tempC:          Math.round(Number(item.temp ?? 0)),
            flightCategory: deriveFlightCategory(visib, ceiling),
            rawOb:          String(item.rawOb ?? ""),
            obsTime:        Number(item.obsTime ?? 0),
          };

          newCache[iata] = { data: metar, timestamp: now };
        }

        cacheRef.current = newCache;
        if (!cancelled) setMetarMap(buildResult());
      } catch {
        // METAR is supplementary — fail silently
      }
    }

    fetchMetar();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [airportCodes.join(",")]);

  return metarMap;
}
