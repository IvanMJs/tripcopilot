"use client";

import { useState, useMemo, useCallback } from "react";
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

interface WorldMapViewProps {
  trips: TripTab[];
  locale: "es" | "en";
  onAirportClick?: (iata: string) => void;
}

const GEO_URL = "/world-110m.json";
const WORLD_COUNTRIES = 195;

// Normalize airport country names to match TopoJSON property names
const COUNTRY_NAME_MAP: Record<string, string> = {
  USA: "United States of America",
  UAE: "United Arab Emirates",
  "Czech Republic": "Czechia",
  "Dominican Republic": "Dominican Rep.",
  "Trinidad & Tobago": "Trinidad and Tobago",
};

const LABELS = {
  es: {
    countries: (n: number) => `${n} país${n !== 1 ? "es" : ""}`,
    airports:  (n: number) => `${n} aeropuerto${n !== 1 ? "s" : ""}`,
    world:     (pct: number) => `${pct}% del mundo`,
    emptyState: "Guardá tus vuelos para ver tu mapa",
  },
  en: {
    countries: (n: number) => `${n} countr${n !== 1 ? "ies" : "y"}`,
    airports:  (n: number) => `${n} airport${n !== 1 ? "s" : ""}`,
    world:     (pct: number) => `${pct}% of world`,
    emptyState: "Save your flights to see your map",
  },
} as const;

interface ZoomPosition {
  coordinates: [number, number];
  zoom: number;
}

export function WorldMapView({ trips, locale, onAirportClick }: WorldMapViewProps) {
  const L = LABELS[locale];
  const [tooltip, setTooltip] = useState<string | null>(null);
  const [position, setPosition] = useState<ZoomPosition>({ coordinates: [0, 0], zoom: 1 });

  const { visitedCodes, visitedTopoNames, countriesSet } = useMemo(() => {
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

    return { visitedCodes: codes, visitedTopoNames: topoNames, countriesSet: countries };
  }, [trips]);

  const plottableAirports = useMemo(
    () =>
      Array.from(visitedCodes).filter((code) => {
        const a = AIRPORTS[code];
        return a && typeof a.lat === "number" && typeof a.lng === "number";
      }),
    [visitedCodes],
  );

  const worldPct = useMemo(() => {
    if (countriesSet.size === 0) return 0;
    return Math.round((countriesSet.size / WORLD_COUNTRIES) * 100);
  }, [countriesSet]);

  const isEmpty = plottableAirports.length === 0;

  const handleMoveEnd = useCallback((pos: ZoomPosition) => {
    setPosition(pos);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-surface-overlay rounded-2xl overflow-hidden border border-white/[0.07]"
    >
      {/* Map area */}
      <div className="relative w-full bg-[#080814]" style={{ aspectRatio: "2 / 1" }}>
        {/* Hover tooltip */}
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
              ? "Mapa mundial de aeropuertos visitados"
              : "World map of visited airports"
          }
        >
          <ZoomableGroup
            zoom={position.zoom}
            center={position.coordinates}
            onMoveEnd={handleMoveEnd}
            maxZoom={8}
          >
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const name = geo.properties.name as string;
                  const visited = visitedTopoNames.has(name);
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onMouseEnter={() => setTooltip(name)}
                      onMouseLeave={() => setTooltip(null)}
                      style={{
                        default: {
                          fill: visited ? "rgba(139,92,246,0.70)" : "#131326",
                          stroke: "rgba(255,255,255,0.07)",
                          strokeWidth: 0.5,
                          outline: "none",
                        },
                        hover: {
                          fill: visited ? "rgba(167,139,250,0.90)" : "#1e1e3a",
                          stroke: "rgba(255,255,255,0.15)",
                          strokeWidth: 0.5,
                          outline: "none",
                        },
                        pressed: {
                          fill: visited ? "rgba(139,92,246,0.95)" : "#1e1e3a",
                          outline: "none",
                        },
                      }}
                    />
                  );
                })
              }
            </Geographies>

            {/* Airport markers */}
            {plottableAirports.map((code) => {
              const airport = AIRPORTS[code];
              if (
                !airport ||
                typeof airport.lat !== "number" ||
                typeof airport.lng !== "number"
              )
                return null;
              const label = airport.city ?? code;
              const isClickable = !!onAirportClick;
              return (
                <Marker key={code} coordinates={[airport.lng, airport.lat]}>
                  {isClickable && (
                    <circle r={8} fill="transparent" style={{ cursor: "pointer" }} />
                  )}
                  <circle
                    r={3 / position.zoom}
                    fill="rgba(216,180,254,0.95)"
                    stroke="rgba(139,92,246,0.7)"
                    strokeWidth={0.8 / position.zoom}
                    style={{ cursor: isClickable ? "pointer" : "default" }}
                    onClick={isClickable ? () => onAirportClick(code) : undefined}
                    onMouseEnter={() => setTooltip(label)}
                    onMouseLeave={() => setTooltip(null)}
                  />
                </Marker>
              );
            })}
          </ZoomableGroup>
        </ComposableMap>

        {/* Empty state */}
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
            {L.countries(countriesSet.size)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] border border-white/[0.08] px-2.5 py-1 text-xs font-semibold text-gray-300">
            <span aria-hidden>✈️</span>
            {L.airports(visitedCodes.size)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-950/40 border border-violet-800/30 px-2.5 py-1 text-xs font-semibold text-violet-300">
            <span aria-hidden>🌍</span>
            {L.world(worldPct)}
          </span>
        </div>
      )}
    </motion.div>
  );
}
