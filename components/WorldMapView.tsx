"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize2, X, Plus, Minus, RotateCcw } from "lucide-react";
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
    countries:   (n: number) => `${n} país${n !== 1 ? "es" : ""}`,
    airports:    (n: number) => `${n} aeropuerto${n !== 1 ? "s" : ""}`,
    places:      (n: number) => `${n} lugar${n !== 1 ? "es" : ""} visitado${n !== 1 ? "s" : ""}`,
    world:       (pct: number) => `${pct}% del mundo`,
    emptyState:  "Guardá tus vuelos para ver tu mapa",
    expand:      "Ver mapa completo",
    close:       "Cerrar mapa",
  },
  en: {
    countries:   (n: number) => `${n} countr${n !== 1 ? "ies" : "y"}`,
    airports:    (n: number) => `${n} airport${n !== 1 ? "s" : ""}`,
    places:      (n: number) => `${n} place${n !== 1 ? "s" : ""} visited`,
    world:       (pct: number) => `${pct}% of world`,
    emptyState:  "Save your flights to see your map",
    expand:      "Open full map",
    close:       "Close map",
  },
} as const;

// City → [lng, lat] lookup from AIRPORTS (built once at module load)
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

const DEFAULT_POSITION: ZoomPosition = { coordinates: [0, 0], zoom: 1 };

// ── Paris-style map colors ────────────────────────────────────────────────────
const MAP_BG         = "#f2ede4";   // warm parchment
const COUNTRY_DEFAULT = "#e8e3d9";  // slightly darker parchment for land
const COUNTRY_STROKE  = "#1a1825";  // near-black fine lines
const COUNTRY_FLIGHT  = "rgba(109,40,217,0.28)";  // violet — flew there
const COUNTRY_PLACE   = "rgba(109,40,217,0.12)";  // softer violet — visited by land
const COUNTRY_HOVER   = "rgba(109,40,217,0.50)";
const COUNTRY_UNVISITED_HOVER = "rgba(0,0,0,0.08)";

export function WorldMapView({ trips, locale, onAirportClick }: WorldMapViewProps) {
  const L = LABELS[locale];
  const supabase = createClient();

  const [tooltip, setTooltip]         = useState<string | null>(null);
  const [position, setPosition]       = useState<ZoomPosition>(DEFAULT_POSITION);
  const [visitedPlaces, setVisitedPlaces] = useState<VisitedPlace[]>([]);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    fetchDBPlaces(supabase).then(setVisitedPlaces);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lock body scroll when full-screen
  useEffect(() => {
    if (isFullScreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isFullScreen]);

  // ── Flight data ───────────────────────────────────────────────────────────
  const { visitedCodes, flightTopoNames, flightCountries } = useMemo(() => {
    const codes     = new Set<string>();
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

  // ── Visited-place data ────────────────────────────────────────────────────
  const plottableVisitedPlaces = useMemo(() =>
    visitedPlaces
      .filter((p) => p.source === "manual")
      .map((p) => {
        const key = `${p.city.toLowerCase()}|${p.country.toLowerCase()}`;
        const coords = CITY_COORDS.get(key);
        return coords ? { ...p, coords } : null;
      })
      .filter((p): p is VisitedPlace & { coords: [number, number] } => p !== null),
  [visitedPlaces]);

  const placeTopoNames = useMemo(() => {
    const names = new Set<string>();
    for (const p of visitedPlaces) names.add(COUNTRY_NAME_MAP[p.country] ?? p.country);
    return names;
  }, [visitedPlaces]);

  // ── Plottable airports ────────────────────────────────────────────────────
  const plottableAirports = useMemo(
    () => Array.from(visitedCodes).filter((code) => {
      const a = AIRPORTS[code];
      return a && typeof a.lat === "number" && typeof a.lng === "number";
    }),
    [visitedCodes],
  );

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalCountries = useMemo(() => {
    const all = new Set(Array.from(flightCountries));
    for (const p of visitedPlaces) all.add(p.country);
    return all.size;
  }, [flightCountries, visitedPlaces]);

  const worldPct = useMemo(
    () => totalCountries === 0 ? 0 : Math.round((totalCountries / WORLD_COUNTRIES) * 100),
    [totalCountries],
  );

  const isEmpty = plottableAirports.length === 0 && plottableVisitedPlaces.length === 0;

  const handleMoveEnd = useCallback((pos: ZoomPosition) => setPosition(pos), []);

  const handleZoomIn  = useCallback(() =>
    setPosition((p) => ({ ...p, zoom: Math.min(p.zoom * 1.6, 8) })), []);
  const handleZoomOut = useCallback(() =>
    setPosition((p) => ({ ...p, zoom: Math.max(p.zoom / 1.6, 1) })), []);
  const handleReset   = useCallback(() => setPosition(DEFAULT_POSITION), []);

  const emojiSize = Math.max(5, 13 / position.zoom);

  // ── Reusable map content ──────────────────────────────────────────────────
  const mapContent = (
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
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const name     = geo.properties.name as string;
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
                        ? COUNTRY_FLIGHT
                        : isPlace
                        ? COUNTRY_PLACE
                        : COUNTRY_DEFAULT,
                      stroke: COUNTRY_STROKE,
                      strokeWidth: 0.35,
                      outline: "none",
                    },
                    hover: {
                      fill: isFlight || isPlace ? COUNTRY_HOVER : COUNTRY_UNVISITED_HOVER,
                      stroke: COUNTRY_STROKE,
                      strokeWidth: 0.35,
                      outline: "none",
                    },
                    pressed: { fill: COUNTRY_HOVER, outline: "none" },
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
  );

  // ── Stats bar ─────────────────────────────────────────────────────────────
  const statsBar = !isEmpty && (
    <div className="px-4 py-3 flex flex-wrap gap-2 border-t border-black/[0.08] bg-white/60">
      <span className="inline-flex items-center gap-1 rounded-full bg-black/[0.06] border border-black/[0.10] px-2.5 py-1 text-xs font-semibold text-gray-700">
        <span aria-hidden>🗺️</span>
        {L.countries(totalCountries)}
      </span>
      <span className="inline-flex items-center gap-1 rounded-full bg-black/[0.06] border border-black/[0.10] px-2.5 py-1 text-xs font-semibold text-gray-700">
        <span aria-hidden>✈️</span>
        {L.airports(visitedCodes.size)}
      </span>
      {visitedPlaces.length > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-black/[0.06] border border-black/[0.10] px-2.5 py-1 text-xs font-semibold text-gray-700">
          <span aria-hidden>📍</span>
          {L.places(visitedPlaces.length)}
        </span>
      )}
      <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 border border-violet-300/60 px-2.5 py-1 text-xs font-semibold text-violet-700">
        <span aria-hidden>🌍</span>
        {L.world(worldPct)}
      </span>
    </div>
  );

  return (
    <>
      {/* ── Normal card ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl overflow-hidden border border-black/[0.10] shadow-md"
        style={{ background: MAP_BG }}
      >
        <div className="relative w-full" style={{ aspectRatio: "2 / 1" }}>
          {/* Tooltip */}
          {tooltip && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 px-2.5 py-1 rounded-md bg-gray-900/85 text-white text-xs pointer-events-none whitespace-nowrap shadow-lg">
              {tooltip}
            </div>
          )}

          {mapContent}

          {/* Expand button */}
          {!isEmpty && (
            <button
              onClick={() => setIsFullScreen(true)}
              aria-label={L.expand}
              className="absolute bottom-2 right-2 z-10 flex items-center gap-1.5 rounded-lg bg-white/80 hover:bg-white border border-black/[0.12] shadow px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition-colors"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{L.expand}</span>
            </button>
          )}

          {isEmpty && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-gray-400 text-sm">{L.emptyState}</span>
            </div>
          )}
        </div>

        {statsBar}
      </motion.div>

      {/* ── Full-screen modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {isFullScreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex flex-col"
            style={{ background: MAP_BG }}
          >
            {/* Tooltip (full-screen) */}
            {tooltip && (
              <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-lg bg-gray-900/85 text-white text-sm pointer-events-none whitespace-nowrap shadow-lg">
                {tooltip}
              </div>
            )}

            {/* Top bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.08] bg-white/50 backdrop-blur-sm shrink-0">
              <p className="text-sm font-bold text-gray-800">
                {locale === "es" ? "Países visitados" : "Countries visited"}
              </p>
              <button
                onClick={() => setIsFullScreen(false)}
                aria-label={L.close}
                className="flex items-center justify-center h-8 w-8 rounded-full bg-black/[0.08] hover:bg-black/[0.14] transition-colors"
              >
                <X className="h-4 w-4 text-gray-700" />
              </button>
            </div>

            {/* Map (fills remaining space) */}
            <div className="flex-1 relative overflow-hidden">
              {mapContent}

              {/* Zoom controls — large, accessible for all ages */}
              <div className="absolute bottom-6 right-4 z-10 flex flex-col gap-2">
                <button
                  onClick={handleZoomIn}
                  aria-label="Acercar"
                  className="flex items-center justify-center h-11 w-11 rounded-xl bg-white shadow-lg border border-black/[0.12] text-gray-700 hover:bg-gray-50 active:scale-95 transition-all"
                >
                  <Plus className="h-5 w-5" />
                </button>
                <button
                  onClick={handleZoomOut}
                  aria-label="Alejar"
                  className="flex items-center justify-center h-11 w-11 rounded-xl bg-white shadow-lg border border-black/[0.12] text-gray-700 hover:bg-gray-50 active:scale-95 transition-all"
                >
                  <Minus className="h-5 w-5" />
                </button>
                <button
                  onClick={handleReset}
                  aria-label="Restablecer zoom"
                  className="flex items-center justify-center h-11 w-11 rounded-xl bg-white shadow-lg border border-black/[0.12] text-gray-500 hover:bg-gray-50 active:scale-95 transition-all"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Stats bar at bottom */}
            {statsBar}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
