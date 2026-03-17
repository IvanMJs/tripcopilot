"use client";

import { useState, useEffect } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SigmetFeature {
  hazard:    string;   // "CONVECTIVE", "TURB", "ICE", "IFR", "ASH", "MTW", "TS"
  severity:  string;   // "MOD", "SEV", "EXTM"
  validFrom: string;   // ISO string
  validTo:   string;   // ISO string
  raw:       string;   // rawAirSigmet
  polygon:   Array<[number, number]> | null;  // [lng, lat] pairs, or null if point
}

// ── Module-level cache (shared across all hook instances) ─────────────────────

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

let _cache: { data: SigmetFeature[]; ts: number } | null = null;

// ── Route intersection helper ─────────────────────────────────────────────────

/**
 * Point-in-polygon test using the ray casting algorithm.
 * `point` is [lng, lat], `polygon` is an array of [lng, lat] pairs.
 */
function pointInPolygon(
  point: [number, number],
  polygon: Array<[number, number]>,
): boolean {
  const [px, py] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Returns true if the straight-line route between originLat/Lng and destLat/Lng
 * passes through or near (within ~150km) any of the given SIGMETs.
 * Uses bounding-box intersection as an efficient approximation.
 */
export function routeIntersectsSigmet(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  sigmets: SigmetFeature[],
): SigmetFeature[] {
  const BUFFER = 1.5; // ~150 km in degrees

  const routeMinLat = Math.min(originLat, destLat) - BUFFER;
  const routeMaxLat = Math.max(originLat, destLat) + BUFFER;
  const routeMinLng = Math.min(originLng, destLng) - BUFFER;
  const routeMaxLng = Math.max(originLng, destLng) + BUFFER;

  // Center of the route bounding box (used for point-in-polygon fallback)
  const centerLng = (routeMinLng + routeMaxLng) / 2;
  const centerLat = (routeMinLat + routeMaxLat) / 2;

  return sigmets.filter((sigmet) => {
    if (!sigmet.polygon || sigmet.polygon.length === 0) return false;

    // Check if any polygon vertex falls inside the route bounding box
    const anyVertexInBox = sigmet.polygon.some(([lng, lat]) =>
      lat >= routeMinLat &&
      lat <= routeMaxLat &&
      lng >= routeMinLng &&
      lng <= routeMaxLng,
    );
    if (anyVertexInBox) return true;

    // Fallback: check if the route bounding box center is inside the SIGMET polygon
    return pointInPolygon([centerLng, centerLat], sigmet.polygon);
  });
}

// ── Raw GeoJSON types (internal) ──────────────────────────────────────────────

interface RawSigmetProperties {
  icaoId:        string;
  seriesId:      string;
  hazard:        string;
  severity:      string;
  qualifier:     string;
  validTimeFrom: string;
  validTimeTo:   string;
  rawAirSigmet:  string;
  alphaChar:     string;
  base:          string;
  top:           string;
  area:          string;
  dir:           string;
  spd:           string;
  chng:          string;
  cancelFlag:    boolean;
}

interface RawSigmetFeature {
  type:     "Feature";
  geometry: {
    type:        "Polygon" | "Point";
    coordinates: number[][][] | [number, number];
  } | null;
  properties: RawSigmetProperties;
}

interface RawSigmetGeoJSON {
  type:     "FeatureCollection";
  features: RawSigmetFeature[];
}

// ── Parsing ───────────────────────────────────────────────────────────────────

function parseGeoJSON(data: RawSigmetGeoJSON): SigmetFeature[] {
  if (!data?.features || !Array.isArray(data.features)) return [];

  const results: SigmetFeature[] = [];

  for (const feature of data.features) {
    const props = feature.properties;
    if (!props) continue;
    if (props.cancelFlag === true) continue;

    let polygon: Array<[number, number]> | null = null;

    if (feature.geometry?.type === "Polygon") {
      const coords = feature.geometry.coordinates as number[][][];
      // GeoJSON polygon outer ring is coords[0]
      if (Array.isArray(coords[0])) {
        polygon = coords[0].map((c) => [c[0], c[1]] as [number, number]);
      }
    }
    // Point geometry → polygon stays null (will be skipped in intersection)

    results.push({
      hazard:    props.hazard    ?? "",
      severity:  props.severity  ?? "",
      validFrom: props.validTimeFrom ?? "",
      validTo:   props.validTimeTo   ?? "",
      raw:       props.rawAirSigmet  ?? "",
      polygon,
    });
  }

  return results;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Fetches all globally active SIGMETs from AWC.
 * Caches for 10 minutes using a module-level variable shared across instances.
 * Returns an empty array while loading or on error.
 */
export function useSigmet(): SigmetFeature[] {
  const [sigmets, setSigmets] = useState<SigmetFeature[]>(() => {
    // Initialise from cache if available and fresh
    if (_cache && Date.now() - _cache.ts < CACHE_TTL_MS) {
      return _cache.data;
    }
    return [];
  });

  useEffect(() => {
    const now = Date.now();
    if (_cache && now - _cache.ts < CACHE_TTL_MS) {
      setSigmets(_cache.data);
      return;
    }

    let cancelled = false;

    async function fetchSigmets() {
      try {
        const res = await fetch("/api/aviation-sigmet");
        if (!res.ok) return;

        const json = (await res.json()) as RawSigmetGeoJSON;
        if (cancelled) return;

        const parsed = parseGeoJSON(json);
        _cache = { data: parsed, ts: Date.now() };
        setSigmets(parsed);
      } catch {
        // SIGMET data is supplementary — fail silently
      }
    }

    fetchSigmets();
    return () => { cancelled = true; };
  }, []);

  return sigmets;
}
