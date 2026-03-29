"use client";

import { useMemo } from "react";
import { TripTab } from "@/lib/types";
import { computeTripStats } from "@/lib/tripStats";

interface TripStatsCardProps {
  trip: TripTab;
  locale: "es" | "en";
}

const LABELS = {
  es: {
    title:        "Resumen del viaje",
    flights:      (n: number) => `${n} vuelo${n !== 1 ? "s" : ""}`,
    countries:    (n: number) => `${n} país${n !== 1 ? "es" : ""}`,
    duration:     (h: number) => `${h}h`,
    co2:          (kg: number) => `${kg} kg CO2`,
    longestLabel: "Vuelo más largo",
    minutes:      "min",
    airline:      "Aerolínea principal",
    offsetCta:    "Compensar →",
    airports:     (n: number) => `${n} aeropuerto${n !== 1 ? "s" : ""}`,
    km:            (n: number) => `${Math.round(n).toLocaleString()} km`,
    destinations:  (n: number) => `${n} destino${n !== 1 ? "s" : ""}`,
    aroundEarth:   (n: number) => `${n}× Tierra`,
    mostRoute:     "Ruta frecuente",
  },
  en: {
    title:        "Trip summary",
    flights:      (n: number) => `${n} flight${n !== 1 ? "s" : ""}`,
    countries:    (n: number) => `${n} countr${n !== 1 ? "ies" : "y"}`,
    duration:     (h: number) => `${h}h`,
    co2:          (kg: number) => `${kg} kg CO2`,
    longestLabel: "Longest flight",
    minutes:      "min",
    airline:      "Main airline",
    offsetCta:    "Offset →",
    airports:     (n: number) => `${n} airport${n !== 1 ? "s" : ""}`,
    km:            (n: number) => `${Math.round(n).toLocaleString()} km`,
    destinations:  (n: number) => `${n} destination${n !== 1 ? "s" : ""}`,
    aroundEarth:   (n: number) => `${n}× Earth`,
    mostRoute:     "Top route",
  },
} as const;

export function TripStatsCard({ trip, locale }: TripStatsCardProps) {
  const stats = useMemo(() => computeTripStats(trip), [trip]);
  const L = LABELS[locale];

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 border-b border-white/[0.06]">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
          {L.title}
        </p>
      </div>

      {/* Stat pills grid */}
      <div className="px-4 py-3 flex flex-wrap gap-2">
        {/* Flights */}
        <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] border border-white/[0.08] px-2.5 py-1 text-xs font-semibold text-gray-300">
          <span aria-hidden>✈️</span>
          {L.flights(stats.totalFlights)}
        </span>

        {/* Countries */}
        <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] border border-white/[0.08] px-2.5 py-1 text-xs font-semibold text-gray-300">
          <span aria-hidden>🌍</span>
          {L.countries(stats.countriesVisited.length)}
        </span>

        {/* Airports */}
        <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] border border-white/[0.08] px-2.5 py-1 text-xs font-semibold text-gray-300">
          <span aria-hidden>🛬</span>
          {L.airports(stats.airportsVisited.length)}
        </span>

        {/* Duration */}
        {stats.totalDurationHours > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] border border-white/[0.08] px-2.5 py-1 text-xs font-semibold text-gray-300">
            <span aria-hidden>⏱</span>
            {L.duration(stats.totalDurationHours)}
          </span>
        )}

        {/* Km flown */}
        {stats.totalDistanceKm > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] border border-white/[0.08] px-2.5 py-1 text-xs font-semibold text-gray-300">
            <span aria-hidden>📏</span>
            {L.km(stats.totalDistanceKm)}
          </span>
        )}

        {/* Unique destinations */}
        {stats.uniqueDestinations.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] border border-white/[0.08] px-2.5 py-1 text-xs font-semibold text-gray-300">
            <span aria-hidden>📍</span>
            {L.destinations(stats.uniqueDestinations.length)}
          </span>
        )}

        {/* Times around Earth */}
        {stats.timesAroundEarth >= 0.1 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-950/40 border border-blue-800/30 px-2.5 py-1 text-xs font-semibold text-blue-300">
            <span aria-hidden>🌏</span>
            {L.aroundEarth(stats.timesAroundEarth)}
          </span>
        )}

        {/* CO2 */}
        {stats.co2Kg > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/40 border border-emerald-800/30 px-2.5 py-1 text-xs font-semibold text-emerald-400">
            <span aria-hidden>🌱</span>
            {L.co2(stats.co2Kg)}
          </span>
        )}
      </div>

      {/* Details row */}
      {(stats.longestFlight || stats.mostUsedAirline) && (
        <div className="px-4 pb-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {/* Longest flight */}
          {stats.longestFlight && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="font-semibold text-gray-400">{L.longestLabel}:</span>
              <span className="font-mono text-gray-300 font-semibold">
                {stats.longestFlight.flightCode}
              </span>
              <span>{stats.longestFlight.durationMin} {L.minutes}</span>
            </div>
          )}

          {/* Most used airline */}
          {stats.mostUsedAirline && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="font-semibold text-gray-400">{L.airline}:</span>
              <span className="text-gray-300">{stats.mostUsedAirline}</span>
            </div>
          )}

          {/* Most frequent route */}
          {stats.mostFrequentRoute && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="font-semibold text-gray-400">{L.mostRoute}:</span>
              <span className="font-mono text-gray-300 font-semibold">{stats.mostFrequentRoute}</span>
            </div>
          )}
        </div>
      )}

      {/* Carbon offset CTA */}
      {stats.co2Kg > 0 && (
        <div className="px-4 pb-3 pt-0 border-t border-white/[0.04]">
          <a
            href="https://www.goldstandard.org/impact-quantification/carbon-offset-projects"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-500 hover:text-emerald-400 transition-colors"
          >
            <span aria-hidden>🌱</span>
            {L.offsetCta}
          </a>
        </div>
      )}
    </div>
  );
}
