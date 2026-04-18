"use client";

import { useState, useEffect, useRef } from "react";
import { AIRPORTS } from "@/lib/airports";

// ── Types ─────────────────────────────────────────────────────────────────────

export type TafFlightCategory = "VFR" | "MVFR" | "IFR" | "LIFR";

export interface TafPeriod {
  timeFrom:        number;   // unix seconds
  timeTo:          number;   // unix seconds
  windDirDeg:      number;
  isVRB:           boolean;
  windSpeedKt:     number;
  windGustKt?:     number;
  visibilitySM:    number;
  ceilingFt?:      number;
  weatherString?:  string;
  changeType?:     string;
  flightCategory:  TafFlightCategory;
}

export interface TafData {
  icao:      string;
  issueTime: number;   // unix seconds
  periods:   TafPeriod[];
}

// ── Helpers (copied from useMetar — no cross-hook import to avoid coupling) ───

function parseVisibility(raw: unknown): number {
  if (raw == null) return 10;
  const s = String(raw).trim();
  if (s === "10+" || parseFloat(s) >= 10) return 10;

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
): TafFlightCategory {
  const v = visibSM;
  const c = ceilingFt ?? 99_999;
  if (v < 1   || c < 500)  return "LIFR";
  if (v < 3   || c < 1000) return "IFR";
  if (v < 5   || c < 3000) return "MVFR";
  return "VFR";
}

// ── Public helper ─────────────────────────────────────────────────────────────

/**
 * Returns the TAF period that covers `unixSeconds`, or null if none found.
 */
export function getTafAtTime(
  taf: TafData,
  unixSeconds: number,
): TafPeriod | null {
  const period = taf.periods.find(
    (p) => unixSeconds >= p.timeFrom && unixSeconds < p.timeTo,
  );
  return period ?? null;
}

// ── Cache ─────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes (TAFs issued every 6h)

interface CacheEntry {
  data:      TafData;
  timestamp: number;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Fetches TAF data for a list of IATA airport codes.
 * Converts to ICAO codes, calls the AWC proxy with type=taf,
 * caches for 30 min, returns a map of IATA → TafData.
 */
export function useTaf(airportCodes: string[]): Record<string, TafData> {
  const [tafMap, setTafMap] = useState<Record<string, TafData>>({});
  const cacheRef = useRef<Record<string, CacheEntry>>({});

  useEffect(() => {
    if (airportCodes.length === 0) return;

    let cancelled = false;

    async function fetchTaf() {
      const now = Date.now();

      const toFetch = airportCodes.filter((code) => {
        const airport = AIRPORTS[code];
        if (!airport?.icao) return false;
        const cached = cacheRef.current[code];
        return !cached || now - cached.timestamp > CACHE_TTL_MS;
      });

      const buildResult = (): Record<string, TafData> => {
        const r: Record<string, TafData> = {};
        for (const code of airportCodes) {
          const c = cacheRef.current[code];
          if (c) r[code] = c.data;
        }
        return r;
      };

      if (toFetch.length === 0) {
        setTafMap(buildResult());
        return;
      }

      const icaoList = toFetch.map((c) => AIRPORTS[c]!.icao).join(",");

      try {
        const res = await fetch(
          `/api/aviation-weather?ids=${encodeURIComponent(icaoList)}&type=taf`,
        );
        if (!res.ok) return;

        const json = await res.json() as unknown[];
        if (!Array.isArray(json) || cancelled) return;

        const newCache = { ...cacheRef.current };

        for (const item of json as Record<string, unknown>[]) {
          const icao = String((item as Record<string, unknown>).icaoId ?? "");
          const iata = toFetch.find((c) => AIRPORTS[c]?.icao === icao);
          if (!iata) continue;

          const rawFcsts: Record<string, unknown>[] = Array.isArray(item.fcsts) ? item.fcsts as Record<string, unknown>[] : [];

          const periods: TafPeriod[] = rawFcsts.map((f) => {
            const isVRB  = String(f.wdir ?? "").toUpperCase() === "VRB";
            const visib  = parseVisibility(f.visib);
            const ceiling = findCeiling(f.sky as Parameters<typeof findCeiling>[0]);

            const period: TafPeriod = {
              timeFrom:       Number(f.timeFrom ?? 0),
              timeTo:         Number(f.timeTo   ?? 0),
              windDirDeg:     isVRB ? 0 : Number(f.wdir ?? 0),
              isVRB,
              windSpeedKt:    Number(f.wspd ?? 0),
              windGustKt:     f.wgst != null ? Number(f.wgst) : undefined,
              visibilitySM:   visib,
              ceilingFt:      ceiling,
              weatherString:  f.wxString as string | undefined || undefined,
              changeType:     f.changeType as string | undefined || undefined,
              flightCategory: deriveFlightCategory(visib, ceiling),
            };
            return period;
          });

          const taf: TafData = {
            icao,
            issueTime: Number(item.issueTime ?? 0),
            periods,
          };

          newCache[iata] = { data: taf, timestamp: now };
        }

        cacheRef.current = newCache;
        if (!cancelled) setTafMap(buildResult());
      } catch {
        // TAF is supplementary — fail silently
      }
    }

    fetchTaf();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [airportCodes.join(",")]);

  return tafMap;
}
