"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";
import { AIRPORTS } from "@/lib/airports";
import { TripTab } from "@/lib/types";
import { createClient } from "@/utils/supabase/client";
import { fetchDBPlaces, VisitedPlace } from "@/lib/visitedPlaces";

interface WorldMapViewProps {
  trips: TripTab[];
  locale: "es" | "en";
  onAirportClick?: (iata: string) => void;
}

const GEO_URL = "/world-110m.json";
const WORLD_COUNTRIES = 195;

const COUNTRY_NAME_MAP: Record<string, string> = {
  USA: "United States of America",
  UAE: "United Arab Emirates",
  "Czech Republic": "Czechia",
  "Dominican Republic": "Dominican Rep.",
  "Trinidad & Tobago": "Trinidad and Tobago",
};

const LABELS = {
  es: {
    countries:  (n: number) => `${n} país${n !== 1 ? "es" : ""}`,
    airports:   (n: number) => `${n} aeropuerto${n !== 1 ? "s" : ""}`,
    places:     (n: number) => `${n} lugar${n !== 1 ? "es" : ""} visitado${n !== 1 ? "s" : ""}`,
    world:      (pct: number) => `${pct}% del mundo`,
    emptyState: "Guardá tus vuelos para ver tu mapa",
  },
  en: {
    countries:  (n: number) => `${n} countr${n !== 1 ? "ies" : "y"}`,
    airports:   (n: number) => `${n} airport${n !== 1 ? "s" : ""}`,
    places:     (n: number) => `${n} place${n !== 1 ? "s" : ""} visited`,
    world:      (pct: number) => `${pct}% of world`,
    emptyState: "Save your flights to see your map",
  },
} as const;

// Precomputed city → [lng, lat] from AIRPORTS (computed once at module load)
const CITY_COORDS = (() => {
  const map = new Map<string, [number, number]>();
  for (const a of Object.values(AIRPORTS)) {
    if (!a.city || typeof a.lat !== "number" || typeof a.lng !== "number") continue;
    const country = a.country ?? "USA";
    const key = `${a.city.toLowerCase()}|${country.toLowerCase()}`;
    if (!map.has(key)) map.set(key, [a.lng, a.lat]);
  }
  return map;
})();

interface ZoomPosition {
  coordinates: [number, number];
  zoom: number;
}

export function WorldMapView({ trips, locale, onAirportClick }: WorldMapViewProps) {
  const L = LABELS[locale];
  const supabase = createClient();

  const [tooltip, setTooltip] = useState<string | null>(null);
  const [position, setPosition] = useState<ZoomPosition>({ coordinates: [0, 0], zoom: 1 });
  const [visitedPlaces, setVisitedPlaces] = useState<VisitedPlace[]>([]);

  useEffect(() => {
    fetchDBPlaces(supabase).then(setVisitedPlaces);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Flight airport data ──────────────────────────────────────────────────
  const { visitedCodes, flightTopoNames, flightCountries } = useMemo(() => {
    const codes = new Set<string>();
    const countries = new Set<string>();
    const topoNames = new Set<string>();

    for (const trip of trips) {
      for (const flight of trip.flights) {
        codes.add(flight.originCode);
        codes.add(flight.destinationCode);
      }
    }
    for (const code of Array.from(codes)) {
      const airport = AIRPORTS[code];
      if (airport) {
        const country = airport.country ?? "USA";
        countries.add(country);
        topoNames.add(COUNTRY_NAME_MAP[country] ?? country);
      }
    }
    return { visitedCodes: codes, flightTopoNames: topoNames, flightCountries: countries };
  }, [trips]);

  // ── Visited-place data ───────────────────────────────────────────────────
  const plottableVisitedPlaces = useMemo(() => {
    return visitedPlaces
      .filter((p) => p.source === "manual")
      .map((p) => {
        const key = `${p.city.toLowerCase()}|${p.country.toLowerCase()}`;
        const coords = CITY_COORDS.get(key);
        return coords ? { ...p, coords } : null;
      })
      .filter((p): p is VisitedPlace & { coords: [number, number] } => p !== null);
  }, [visitedPlaces]);

  const placeTopoNames = useMemo(() => {
    const names = new Set<string>();
    for (const p of visitedPlaces) {
      names.add(COUNTRY_NAME_MAP[p.country] ?? p.country);
    }
    return names;
  }, [visitedPlaces]);

  // ── Plottable airports ───────────────────────────────────────────────────
  const plottableAirports = useMemo(
    () =>
      Array.from(visitedCodes).filter((code) => {
        const a = AIRPORTS[code];
        return a && typeof a.lat === "number" && typeof a.lng === "number";
      }),
    [visitedCodes],
  );

  // ── Stats ────────────────────────────────────────────────────────────────
  const totalCountries = useMemo(() => {
    const all = new Set(Array.from(flightCountries));
    for (const p of visitedPlaces) all.add(p.country);
    return all.size;
  }, [flightCountries, visitedPlaces]);

  const worldPct = useMemo(
    () => (totalCountries === 0 ? 0 : Math.round((totalCountries / WORLD_COUNTRIES) * 100)),
    [totalCountries],
  );

  const isEmpty = plottableAirports.length === 0 && plottableVisitedPlaces.length === 0;

  const handleMoveEnd = useCallback((pos: ZoomPosition) => setPosition(pos), []);

  const emojiSize = Math.max(6, 14 / position.zoom);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-surface-overlay rounded-2xl overflow-hidden border border-white/[0.07]"
    >
      <div className="relative w-full bg-[#080814]" style={{ aspectRatio: "2 / 1" }}>
        {tooltip && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 px-2.5 py-1 rounded-md bg-black/75 border border-white/10 text-white text-xs pointer-events-none whitespace-nowrap">
            {tooltip}
          </div>
        )}

        <ComposableMap
          projectionConfig={{ scale: 147, center: [0, 0] }}
          style={{ width: "100%", height: "100%" }}
          aria-label={
            locale === "es"
              ? "Mapa mundial de aeropuertos y lugares visitados"
              : "World map of airports and visited places"
          }
        >
          <ZoomableGroup
            zoom={position.zoom}
            center={position.coordinates}
            onMoveEnd={handleMoveEnd}
            maxZoom={8}
          >
            {/* Country fills */}
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const name = geo.properties.name as string;
                  const isFlight = flightTopoNames.has(name);
                  const isPlace  = !isFlight && placeTopoNames.has(name);
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onMouseEnter={() => setTooltip(name)}
                      onMouseLeave={() => setTooltip(null)}
                      style={{
                        default: {
                          fill: isFlight
                            ? "rgba(139,92,246,0.70)"   // full violet for flights
                            : isPlace
                            ? "rgba(139,92,246,0.30)"   // muted violet for surface visits
                            : "#131326",
                          stroke: "rgba(255,255,255,0.07)",
                          strokeWidth: 0.5,
                          outline: "none",
                        },
                        hover: {
                          fill: isFlight || isPlace ? "rgba(167,139,250,0.90)" : "#1e1e3a",
                          stroke: "rgba(255,255,255,0.15)",
                          strokeWidth: 0.5,
                          outline: "none",
                        },
                        pressed: {
                          fill: isFlight || isPlace ? "rgba(139,92,246,0.95)" : "#1e1e3a",
                          outline: "none",
                        },
                      }}
                    />
                  );
                })
              }
            </Geographies>

            {/* ✈️ Flight airport markers */}
            {plottableAirports.map((code) => {
              const airport = AIRPORTS[code];
              if (!airport || typeof airport.lat !== "number" || typeof airport.lng !== "number")
                return null;
              const label = airport.city ?? code;
              const isClickable = !!onAirportClick;
              return (
                <Marker key={code} coordinates={[airport.lng, airport.lat]}>
                  {isClickable && (
                    <circle
                      r={8 / position.zoom}
                      fill="transparent"
                      style={{ cursor: "pointer" }}
                      onClick={() => onAirportClick(code)}
                    />
                  )}
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={emojiSize}
                    style={{ userSelect: "none", cursor: isClickable ? "pointer" : "default" }}
                    onClick={isClickable ? () => onAirportClick(code) : undefined}
                    onMouseEnter={() => setTooltip(`✈️ ${label}`)}
                    onMouseLeave={() => setTooltip(null)}
                  >
                    ✈️
                  </text>
                </Marker>
              );
            })}

            {/* 📍 Visited place markers */}
            {plottableVisitedPlaces.map((place) => (
              <Marker key={place.id} coordinates={place.coords}>
                <text
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={emojiSize}
                  style={{ userSelect: "none" }}
                  onMouseEnter={() => setTooltip(`📍 ${place.city}`)}
                  onMouseLeave={() => setTooltip(null)}
                >
                  📍
                </text>
              </Marker>
            ))}
          </ZoomableGroup>
        </ComposableMap>

        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white/30 text-sm">{L.emptyState}</span>
          </div>
        )}
      </div>

      {/* Stats bar */}
      {!isEmpty && (
        <div className="px-4 py-3 flex flex-wrap gap-2 border-t border-white/[0.06]">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] border border-white/[0.08] px-2.5 py-1 text-xs font-semibold text-gray-300">
            <span aria-hidden>🗺️</span>
            {L.countries(totalCountries)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] border border-white/[0.08] px-2.5 py-1 text-xs font-semibold text-gray-300">
            <span aria-hidden>✈️</span>
            {L.airports(visitedCodes.size)}
          </span>
          {visitedPlaces.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] border border-white/[0.08] px-2.5 py-1 text-xs font-semibold text-gray-300">
              <span aria-hidden>📍</span>
              {L.places(visitedPlaces.length)}
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-950/40 border border-violet-800/30 px-2.5 py-1 text-xs font-semibold text-violet-300">
            <span aria-hidden>🌍</span>
            {L.world(worldPct)}
          </span>
        </div>
      )}
    </motion.div>
  );
}
