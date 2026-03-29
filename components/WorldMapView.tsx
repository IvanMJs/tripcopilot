"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { AIRPORTS } from "@/lib/airports";
import { TripTab } from "@/lib/types";

interface WorldMapViewProps {
  trips: TripTab[];
  locale: "es" | "en";
}

const WORLD_COUNTRIES = 195;
const MAP_WIDTH = 1000;
const MAP_HEIGHT = 500;

const LABELS = {
  es: {
    countries:   (n: number) => `${n} país${n !== 1 ? "es" : ""}`,
    airports:    (n: number) => `${n} aeropuerto${n !== 1 ? "s" : ""}`,
    world:       (pct: number) => `${pct}% del mundo`,
    emptyState:  "Guardá tus vuelos para ver tu mapa",
  },
  en: {
    countries:   (n: number) => `${n} countr${n !== 1 ? "ies" : "y"}`,
    airports:    (n: number) => `${n} airport${n !== 1 ? "s" : ""}`,
    world:       (pct: number) => `${pct}% of world`,
    emptyState:  "Save your flights to see your map",
  },
} as const;

function project(
  lat: number,
  lng: number,
  width: number,
  height: number,
): { x: number; y: number } {
  const x = ((lng + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;
  return { x, y };
}

function buildGridLines(): React.ReactNode[] {
  const lines: React.ReactNode[] = [];

  // Latitude lines every 30°: -60, -30, 0, 30, 60
  for (let lat = -60; lat <= 60; lat += 30) {
    const { y } = project(lat, 0, MAP_WIDTH, MAP_HEIGHT);
    lines.push(
      <line
        key={`lat-${lat}`}
        x1={0}
        y1={y}
        x2={MAP_WIDTH}
        y2={y}
        stroke="rgba(255,255,255,0.04)"
        strokeWidth={1}
      />,
    );
  }

  // Longitude lines every 30°: -150 to 150
  for (let lng = -150; lng <= 150; lng += 30) {
    const { x } = project(0, lng, MAP_WIDTH, MAP_HEIGHT);
    lines.push(
      <line
        key={`lng-${lng}`}
        x1={x}
        y1={0}
        x2={x}
        y2={MAP_HEIGHT}
        stroke="rgba(255,255,255,0.04)"
        strokeWidth={1}
      />,
    );
  }

  return lines;
}

export function WorldMapView({ trips, locale }: WorldMapViewProps) {
  const L = LABELS[locale];

  const { visitedCodes, countriesSet } = useMemo(() => {
    const codes = new Set<string>();
    const countries = new Set<string>();

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
      }
    }

    return { visitedCodes: codes, countriesSet: countries };
  }, [trips]);

  const plottableAirports = useMemo(() => {
    return Array.from(visitedCodes).filter((code) => {
      const a = AIRPORTS[code];
      return a && typeof a.lat === "number" && typeof a.lng === "number";
    });
  }, [visitedCodes]);

  const worldPct = useMemo(() => {
    if (countriesSet.size === 0) return 0;
    return Math.round((countriesSet.size / WORLD_COUNTRIES) * 100);
  }, [countriesSet]);

  const isEmpty = plottableAirports.length === 0;

  const gridLines = useMemo(() => buildGridLines(), []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-[#07070f] rounded-2xl overflow-hidden border border-white/[0.06]"
    >
      {/* Map area */}
      <div className="relative w-full" style={{ aspectRatio: "2 / 1" }}>
        <svg
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          className="w-full h-full"
          aria-label={locale === "es" ? "Mapa mundial de aeropuertos visitados" : "World map of visited airports"}
        >
          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background */}
          <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="#0a0a18" />

          {/* Grid lines */}
          {gridLines}

          {/* Airport dots */}
          {plottableAirports.map((code) => {
            const airport = AIRPORTS[code];
            // TypeScript guard: lat/lng already confirmed above but narrowing here
            if (!airport || typeof airport.lat !== "number" || typeof airport.lng !== "number") {
              return null;
            }
            const { x, y } = project(airport.lat, airport.lng, MAP_WIDTH, MAP_HEIGHT);
            const label = airport.city ?? code;

            return (
              <g key={code} filter="url(#glow)">
                <circle
                  cx={x}
                  cy={y}
                  r={3}
                  fill="rgba(139,92,246,0.9)"
                  className="animate-pulse"
                >
                  <title>{label}</title>
                </circle>
              </g>
            );
          })}

          {/* Empty state overlay */}
          {isEmpty && (
            <text
              x={MAP_WIDTH / 2}
              y={MAP_HEIGHT / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="rgba(255,255,255,0.3)"
              fontSize={18}
              fontFamily="sans-serif"
            >
              {L.emptyState}
            </text>
          )}
        </svg>
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
