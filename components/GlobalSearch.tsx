"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Plane, Map, MapPin } from "lucide-react";
import { TripTab } from "@/lib/types";
import { AIRPORTS } from "@/lib/airports";

interface GlobalSearchProps {
  locale: "es" | "en";
  userTrips: TripTab[];
  onSelectTrip: (tripId: string) => void;
  onWatchAirport: (iata: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  type: "flight" | "trip" | "airport";
  id: string;
  primary: string;
  secondary: string;
  tripId?: string;
}

const MAX_PER_CATEGORY = 5;

function useKeyboardShortcutClose(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);
}

export function GlobalSearch({
  locale,
  userTrips,
  onSelectTrip,
  onWatchAirport,
  isOpen,
  onClose,
}: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useKeyboardShortcutClose(isOpen, onClose);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  const results = useCallback(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 1) return { flights: [], trips: [], airports: [] };

    // Search flights
    const flights: SearchResult[] = [];
    for (const trip of userTrips) {
      for (const f of trip.flights) {
        if (
          f.flightCode.toLowerCase().includes(q) ||
          f.originCode.toLowerCase().includes(q) ||
          f.destinationCode.toLowerCase().includes(q) ||
          f.airlineName.toLowerCase().includes(q)
        ) {
          flights.push({
            type: "flight",
            id: f.id,
            primary: f.flightCode,
            secondary: `${f.originCode} → ${f.destinationCode} · ${f.isoDate}`,
            tripId: trip.id,
          });
        }
        if (flights.length >= MAX_PER_CATEGORY) break;
      }
      if (flights.length >= MAX_PER_CATEGORY) break;
    }

    // Search trips
    const trips: SearchResult[] = userTrips
      .filter((t) => t.name.toLowerCase().includes(q))
      .slice(0, MAX_PER_CATEGORY)
      .map((t) => {
        const dates = t.flights
          .map((f) => f.isoDate)
          .sort();
        const dateRange =
          dates.length > 0
            ? dates.length > 1
              ? `${dates[0]} – ${dates[dates.length - 1]}`
              : dates[0]
            : locale === "es" ? "Sin vuelos" : "No flights";
        return {
          type: "trip" as const,
          id: t.id,
          primary: t.name,
          secondary: dateRange,
        };
      });

    // Search airports
    const airports: SearchResult[] = Object.entries(AIRPORTS)
      .filter(([iata, info]) =>
        iata.toLowerCase().includes(q) ||
        info.city.toLowerCase().includes(q) ||
        info.name.toLowerCase().includes(q)
      )
      .slice(0, MAX_PER_CATEGORY)
      .map(([iata, info]) => ({
        type: "airport" as const,
        id: iata,
        primary: `${iata} · ${info.city}`,
        secondary: info.name,
      }));

    return { flights, trips, airports };
  }, [query, userTrips, locale]);

  const { flights, trips, airports } = results();
  const hasResults = flights.length > 0 || trips.length > 0 || airports.length > 0;

  const L = {
    placeholder: locale === "es" ? "Buscar vuelos, viajes, aeropuertos..." : "Search flights, trips, airports...",
    flightsLabel: locale === "es" ? "Vuelos" : "Flights",
    tripsLabel: locale === "es" ? "Viajes" : "Trips",
    airportsLabel: locale === "es" ? "Aeropuertos" : "Airports",
    openTrip: locale === "es" ? "Abrir viaje" : "Open trip",
    watchAirport: locale === "es" ? "Monitorear" : "Watch",
    noResults: locale === "es" ? "Sin resultados para" : "No results for",
    hint: locale === "es" ? "Ctrl+K para buscar" : "Ctrl+K to search",
  };

  function handleSelectFlight(result: SearchResult) {
    if (result.tripId) onSelectTrip(result.tripId);
    onClose();
  }

  function handleSelectTrip(result: SearchResult) {
    onSelectTrip(result.id);
    onClose();
  }

  function handleSelectAirport(result: SearchResult) {
    onWatchAirport(result.id);
    onClose();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Search panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            role="dialog"
            aria-modal="true"
            aria-label={locale === "es" ? "Búsqueda global" : "Global search"}
            className="fixed top-4 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-[61] sm:w-full sm:max-w-lg"
          >
            <div className="rounded-2xl border border-white/10 bg-surface-elevated shadow-2xl overflow-hidden">
              {/* Input row */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.07]">
                <Search className="h-4 w-4 text-gray-500 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={L.placeholder}
                  className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none"
                  aria-label={L.placeholder}
                  autoComplete="off"
                  spellCheck={false}
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    aria-label={locale === "es" ? "Limpiar búsqueda" : "Clear search"}
                    className="text-gray-600 hover:text-gray-400 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  aria-label={locale === "es" ? "Cerrar búsqueda" : "Close search"}
                  className="text-gray-600 hover:text-gray-400 transition-colors ml-1"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Results */}
              <div
                className="max-h-[min(60vh,calc(100dvh-8rem))] overflow-y-auto py-2"
                role="listbox"
                aria-label={locale === "es" ? "Resultados de búsqueda" : "Search results"}
              >
                {query.length === 0 && (
                  <p className="text-xs text-gray-600 text-center py-6">{L.hint}</p>
                )}

                {query.length > 0 && !hasResults && (
                  <p className="text-sm text-gray-500 text-center py-6">
                    {L.noResults} &ldquo;{query}&rdquo;
                  </p>
                )}

                {/* Flights section */}
                {flights.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 px-4 py-2">
                      {L.flightsLabel}
                    </p>
                    {flights.map((r) => (
                      <button
                        key={r.id}
                        role="option"
                        aria-selected="false"
                        onClick={() => handleSelectFlight(r)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.05] transition-colors text-left"
                      >
                        <div className="h-8 w-8 rounded-lg bg-blue-950/40 border border-blue-800/30 flex items-center justify-center shrink-0">
                          <Plane className="h-3.5 w-3.5 text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white">{r.primary}</p>
                          <p className="text-xs text-gray-500 truncate">{r.secondary}</p>
                        </div>
                        <span className="shrink-0 text-[10px] font-semibold text-gray-600 border border-white/[0.06] rounded px-1.5 py-0.5">
                          {L.openTrip}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Trips section */}
                {trips.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 px-4 py-2">
                      {L.tripsLabel}
                    </p>
                    {trips.map((r) => (
                      <button
                        key={r.id}
                        role="option"
                        aria-selected="false"
                        onClick={() => handleSelectTrip(r)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.05] transition-colors text-left"
                      >
                        <div className="h-8 w-8 rounded-lg bg-violet-950/40 border border-violet-800/30 flex items-center justify-center shrink-0">
                          <Map className="h-3.5 w-3.5 text-violet-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{r.primary}</p>
                          <p className="text-xs text-gray-500">{r.secondary}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Airports section */}
                {airports.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 px-4 py-2">
                      {L.airportsLabel}
                    </p>
                    {airports.map((r) => (
                      <button
                        key={r.id}
                        role="option"
                        aria-selected="false"
                        onClick={() => handleSelectAirport(r)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.05] transition-colors text-left"
                      >
                        <div className="h-8 w-8 rounded-lg bg-emerald-950/40 border border-emerald-800/30 flex items-center justify-center shrink-0">
                          <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white">{r.primary}</p>
                          <p className="text-xs text-gray-500 truncate">{r.secondary}</p>
                        </div>
                        <span className="shrink-0 text-[10px] font-semibold text-gray-600 border border-white/[0.06] rounded px-1.5 py-0.5">
                          {L.watchAirport}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
