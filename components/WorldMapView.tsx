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
import { countryFlag } from "@/lib/countryFlags";
import type { FriendWithLocation } from "@/lib/friends";

interface WorldMapViewProps {
  trips: TripTab[];
  locale: "es" | "en";
  onAirportClick?: (iata: string) => void;
  friendLocations?: FriendWithLocation[];
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

export function WorldMapView({ trips, locale, onAirportClick, friendLocations }: WorldMapViewProps) {
  const L = LABELS[locale];
  const supabase = createClient();

  const [tooltip, setTooltip]           = useState<string | null>(null);
  const [position, setPosition]         = useState<ZoomPosition>(DEFAULT_POSITION);
  const [visitedPlaces, setVisitedPlaces] = useState<VisitedPlace[]>([]);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<VisitedPlace | null>(null);

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
              style={{ userSelect: "none", cursor: "pointer" }}
              onClick={() => setSelectedPlace(place)}
              onMouseEnter={() => setTooltip(`📍 ${place.city}`)}
              onMouseLeave={() => setTooltip(null)}
            >
              📍
            </text>
          </Marker>
        ))}

        {/* Friend location pulse markers */}
        {(friendLocations ?? [])
          .filter((f) => f.currentLocation !== null)
          .map((f) => {
            const loc = f.currentLocation!;
            const displayName = (f.displayName ?? f.username ?? f.email.split("@")[0]);
            const r = Math.max(2, 5 / position.zoom);
            return (
              <Marker key={f.userId} coordinates={[loc.lng, loc.lat]}>
                <g
                  style={{ cursor: "default" }}
                  onMouseEnter={() =>
                    setTooltip(
                      `${displayName} ${locale === "es" ? "está en" : "is in"} ${loc.city}`,
                    )
                  }
                  onMouseLeave={() => setTooltip(null)}
                >
                  <circle r={r * 2.8} fill="#FBBF24" fillOpacity="0" stroke="#FBBF24" strokeWidth={r * 0.4}>
                    <animate attributeName="r" values={`${r};${r * 3.5};${r}`} dur="2s" repeatCount="indefinite" />
                    <animate attributeName="stroke-opacity" values="0.7;0;0.7" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <circle r={r} fill="#FBBF24" stroke="white" strokeWidth={r * 0.35} />
                </g>
              </Marker>
            );
          })}
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
      <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(255,184,0,0.15)] border border-[rgba(255,184,0,0.25)] px-2.5 py-1 text-xs font-semibold text-[#FFB800]">
        <span aria-hidden>🌍</span>
        {L.world(worldPct)}
      </span>
      {(friendLocations ?? []).filter((f) => f.currentLocation !== null).length > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 border border-yellow-300/60 px-2.5 py-1 text-xs font-semibold text-yellow-700">
          <span aria-hidden>🟡</span>
          {(friendLocations ?? []).filter((f) => f.currentLocation !== null).length}
          {" "}
          {locale === "es" ? "amigo/s viajando" : "friend/s traveling"}
        </span>
      )}
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

      {/* ── Place stamp card overlay ──────────────────────────────────────── */}
      <AnimatePresence>
        {selectedPlace && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[60] flex items-center justify-center px-6"
            onClick={() => setSelectedPlace(null)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.85, rotate: -4 }}
                animate={{ opacity: 1, scale: 1, rotate: -1.5 }}
                exit={{ opacity: 0, scale: 0.8, rotate: 3 }}
                transition={{ type: "spring", stiffness: 360, damping: 22 }}
                className="relative w-full rounded-2xl p-6"
                style={{
                  background: "linear-gradient(135deg,#fdf8f0 0%,#f5ede0 50%,#faf4ec 100%)",
                  border: "2px dashed #7c3aed",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.25), inset 0 0 0 1px rgba(124,58,237,0.12)",
                  filter: "sepia(0.08)",
                }}
              >
                {/* Watermark */}
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden rounded-2xl"
                  aria-hidden
                >
                  <span
                    className="text-[72px] font-black text-[#FFB800]/10 tracking-widest rotate-[-20deg]"
                    style={{ fontFamily: "serif" }}
                  >
                    VISITED
                  </span>
                </div>

                {/* Close button */}
                <button
                  onClick={() => setSelectedPlace(null)}
                  className="absolute top-3 right-3 flex items-center justify-center h-7 w-7 rounded-full bg-black/[0.08] hover:bg-black/[0.15] transition-colors"
                >
                  <X className="h-3.5 w-3.5 text-gray-600" />
                </button>

                {/* Header label */}
                <p className="text-[10px] font-black tracking-[0.25em] text-[#FFB800] uppercase mb-3 text-center">
                  {locale === "es" ? "Lugar Visitado" : "Visited Place"}
                </p>

                {/* Flag + city */}
                <div className="flex flex-col items-center gap-1 mb-4">
                  <span className="text-5xl" role="img" aria-label={selectedPlace.country}>
                    {countryFlag(selectedPlace.country)}
                  </span>
                  <p className="text-2xl font-black text-gray-800 text-center leading-tight">
                    {selectedPlace.city}
                  </p>
                  <p className="text-sm font-semibold text-gray-500 text-center tracking-wide">
                    {selectedPlace.country}
                  </p>
                </div>

                {/* Divider */}
                <div className="border-t border-dashed border-[rgba(255,184,0,0.35)] my-3" />

                {/* Date */}
                <p className="text-center text-xs font-semibold text-gray-500 tracking-widest uppercase">
                  {new Date(selectedPlace.dateVisited + "T12:00:00").toLocaleDateString(
                    locale === "es" ? "es-ES" : "en-US",
                    { year: "numeric", month: "long", day: "numeric" },
                  )}
                </p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
