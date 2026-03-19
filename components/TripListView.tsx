"use client";

import { useState } from "react";
import { Plane, ChevronRight, Trash2, Plus, MapPin, X, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { TripTab } from "@/lib/types";
import { AirportStatusMap } from "@/lib/types";
import { calculateTripRiskScore } from "@/lib/tripRiskScore";

interface TripListViewProps {
  trips: TripTab[];
  statusMap: AirportStatusMap;
  locale: "es" | "en";
  onSelect: (id: string) => void;
  onCreateTrip: () => void;
  onDeleteTrip: (id: string) => void;
  exampleTrip?: TripTab | null;
  onSelectExample?: () => void;
  onDismissExample?: () => void;
}

function getDaysUntil(isoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(isoDate + "T00:00:00").getTime() - today.getTime()) / 86400000);
}

function isTripPast(trip: TripTab): boolean {
  if (trip.flights.length === 0) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return trip.flights.every((f) => new Date(f.isoDate + "T00:00:00") < today);
}

function formatMonthYear(isoDate: string, locale: "es" | "en"): string {
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString(locale === "en" ? "en-US" : "es-AR", { month: "short", year: "numeric" });
}

function tripDateRange(trip: TripTab, locale: "es" | "en"): string {
  const dates = trip.flights.map((f) => f.isoDate).sort();
  if (dates.length === 0) return "";
  const first = formatMonthYear(dates[0], locale);
  const last  = formatMonthYear(dates[dates.length - 1], locale);
  return first === last ? first : `${first} – ${last}`;
}

function uniqueDestinations(trip: TripTab): string[] {
  return Array.from(new Set(trip.flights.map((f) => f.destinationCode)));
}

const RISK_STYLE = {
  low:      { dot: "bg-emerald-400", text: "text-emerald-400", label: { es: "Sin alertas", en: "No alerts"  } },
  medium:   { dot: "bg-yellow-400",  text: "text-yellow-400",  label: { es: "Revisar",     en: "Review"     } },
  high:     { dot: "bg-orange-400",  text: "text-orange-400",  label: { es: "Atención",    en: "Attention"  } },
  critical: { dot: "bg-red-400",     text: "text-red-400",     label: { es: "Crítico",     en: "Critical"   } },
} as const;

export function TripListView({
  trips,
  statusMap,
  locale,
  onSelect,
  onCreateTrip,
  onDeleteTrip,
  exampleTrip,
  onSelectExample,
  onDismissExample,
}: TripListViewProps) {
  const [historyOpen, setHistoryOpen] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeTrips = trips.filter((t) => !isTripPast(t));
  const pastTrips   = trips.filter((t) =>  isTripPast(t));

  return (
    <div className="space-y-4 animate-fade-in-up">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-white">
            {locale === "es" ? "Mis viajes" : "My trips"}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {locale === "es"
              ? "FAA en tiempo real para cada ruta"
              : "Real-time FAA monitoring for every route"}
          </p>
        </div>
        <button
          onClick={onCreateTrip}
          className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-sm font-semibold px-4 py-2 transition-all tap-scale"
        >
          <Plus className="h-4 w-4" />
          {locale === "es" ? "Nuevo" : "New"}
        </button>
      </div>

      {/* Empty state — only when no active trips and no past trips */}
      {activeTrips.length === 0 && pastTrips.length === 0 && !exampleTrip && (
        <div
          className="rounded-2xl border border-white/[0.06] overflow-hidden"
          style={{ background: "linear-gradient(150deg, rgba(12,12,22,0.97) 0%, rgba(8,8,16,0.99) 100%)" }}
        >
          <div className="px-6 py-12 flex flex-col items-center text-center">
            <div className="text-5xl mb-4 select-none">🗺️</div>
            <h3 className="text-base font-bold text-white mb-2">
              {locale === "es" ? "Todavía no creaste ningún viaje" : "No trips created yet"}
            </h3>
            <p className="text-sm text-gray-400 mb-6 max-w-xs leading-relaxed">
              {locale === "es"
                ? "Creá un viaje, agregá tus vuelos y monitoreamos aeropuertos, conexiones y clima en tiempo real."
                : "Create a trip, add your flights and we'll monitor airports, connections, and weather in real time."}
            </p>
            <button
              onClick={onCreateTrip}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-sm font-semibold px-6 py-3 transition-all tap-scale"
            >
              <Plus className="h-4 w-4" />
              {locale === "es" ? "Crear mi primer viaje" : "Create my first trip"}
            </button>
          </div>
        </div>
      )}

      {/* Example trip card */}
      {exampleTrip && (
        <div className="rounded-2xl border border-dashed border-violet-600/40 overflow-hidden bg-violet-950/10">
          <div className="flex items-center gap-2 pr-3">
            <button
              onClick={onSelectExample}
              className="flex-1 min-w-0 text-left px-4 py-4 flex items-center gap-3 tap-scale"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400 border border-violet-600/40 bg-violet-900/30 px-1.5 py-0.5 rounded">
                    {locale === "es" ? "Ejemplo" : "Example"}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-base font-bold text-white">{exampleTrip.name}</span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Plane className="h-3 w-3" />
                    {locale === "es" ? "1 vuelo" : "1 flight"}
                  </span>
                  <span className="text-xs text-gray-600 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    EZE → MIA
                  </span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-600 shrink-0" />
            </button>
            <button
              onClick={onDismissExample}
              className="shrink-0 p-2 rounded-xl text-gray-700 hover:text-gray-400 hover:bg-white/[0.05] transition-colors tap-scale"
              title={locale === "es" ? "Descartar ejemplo" : "Dismiss example"}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Active trip cards */}
      {activeTrips.map((trip) => {
        const risk = trip.flights.length > 0
          ? calculateTripRiskScore(trip.flights, statusMap, locale)
          : null;
        const riskStyle = risk ? RISK_STYLE[risk.level] : null;

        const nextFlight = trip.flights.find(
          (f) => new Date(f.isoDate + "T00:00:00") >= today,
        );
        const daysUntil = nextFlight ? getDaysUntil(nextFlight.isoDate) : null;

        const flightCount = trip.flights.length;
        const flightLabel =
          flightCount === 0
            ? (locale === "es" ? "Sin vuelos" : "No flights")
            : locale === "es"
            ? `${flightCount} vuelo${flightCount !== 1 ? "s" : ""}`
            : `${flightCount} flight${flightCount !== 1 ? "s" : ""}`;

        return (
          <div
            key={trip.id}
            className="rounded-2xl border border-white/[0.07] overflow-hidden transition-all hover:border-white/[0.14]"
            style={{ background: "linear-gradient(150deg, rgba(14,14,24,0.97) 0%, rgba(9,9,18,0.99) 100%)" }}
          >
            <div className="flex items-center gap-2 pr-3">
              <button
                onClick={() => onSelect(trip.id)}
                className="flex-1 min-w-0 text-left px-4 py-4 flex items-center gap-3 tap-scale"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-base font-bold text-white truncate">{trip.name}</span>
                    {riskStyle && (
                      <span className={`flex items-center gap-1 text-[10px] font-semibold shrink-0 ${riskStyle.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${riskStyle.dot}`} />
                        {riskStyle.label[locale]}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Plane className="h-3 w-3" />
                      {flightLabel}
                    </span>
                    {nextFlight && daysUntil !== null && (
                      <span className={`text-xs font-medium ${
                        daysUntil === 0 ? "text-red-400" :
                        daysUntil <= 7  ? "text-yellow-400" :
                                          "text-gray-500"
                      }`}>
                        {daysUntil === 0
                          ? (locale === "es" ? "✈ HOY" : "✈ TODAY")
                          : daysUntil === 1
                          ? (locale === "es" ? "mañana" : "tomorrow")
                          : locale === "es"
                          ? `en ${daysUntil} días`
                          : `in ${daysUntil} days`}
                      </span>
                    )}
                    {nextFlight && (
                      <span className="text-xs text-gray-600 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {nextFlight.originCode} → {nextFlight.destinationCode}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-600 shrink-0" />
              </button>
              <button
                onClick={() => onDeleteTrip(trip.id)}
                className="shrink-0 p-2 rounded-xl text-gray-700 hover:text-red-400 hover:bg-red-950/30 transition-colors tap-scale"
                title={locale === "es" ? "Eliminar viaje" : "Delete trip"}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}

      {/* Past trips — collapsible history section */}
      {pastTrips.length > 0 && (
        <div className="pt-1">
          <button
            onClick={() => setHistoryOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-2 py-2 text-xs text-gray-500 hover:text-gray-400 transition-colors group"
          >
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              <span className="font-semibold uppercase tracking-wider">
                {locale === "es" ? "Historial" : "History"}
              </span>
              <span className="px-1.5 py-0.5 rounded-full bg-white/[0.06] text-gray-600 font-medium">
                {pastTrips.length}
              </span>
            </div>
            {historyOpen
              ? <ChevronUp  className="h-3.5 w-3.5" />
              : <ChevronDown className="h-3.5 w-3.5" />
            }
          </button>

          {historyOpen && (
            <div className="space-y-2 mt-1">
              {pastTrips.map((trip) => {
                const dests   = uniqueDestinations(trip);
                const range   = tripDateRange(trip, locale);
                const fCount  = trip.flights.length;
                const fLabel  = locale === "es"
                  ? `${fCount} vuelo${fCount !== 1 ? "s" : ""}`
                  : `${fCount} flight${fCount !== 1 ? "s" : ""}`;

                return (
                  <div
                    key={trip.id}
                    className="rounded-2xl border border-white/[0.05] overflow-hidden opacity-70 hover:opacity-90 transition-opacity"
                    style={{ background: "linear-gradient(150deg, rgba(12,12,20,0.97) 0%, rgba(8,8,16,0.99) 100%)" }}
                  >
                    <div className="flex items-center gap-2 pr-3">
                      <button
                        onClick={() => onSelect(trip.id)}
                        className="flex-1 min-w-0 text-left px-4 py-3.5 flex items-center gap-3 tap-scale"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-bold text-gray-300 truncate">{trip.name}</span>
                            <span className="text-[10px] text-gray-600 font-medium shrink-0">{range}</span>
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="flex items-center gap-1 text-xs text-gray-600">
                              <Plane className="h-3 w-3" />
                              {fLabel}
                            </span>
                            {dests.length > 0 && (
                              <span className="flex items-center gap-1 text-xs text-gray-600">
                                <MapPin className="h-3 w-3" />
                                {dests.join(", ")}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-gray-700 shrink-0" />
                      </button>
                      <button
                        onClick={() => onDeleteTrip(trip.id)}
                        className="shrink-0 p-2 rounded-xl text-gray-800 hover:text-red-400 hover:bg-red-950/30 transition-colors tap-scale"
                        title={locale === "es" ? "Eliminar viaje" : "Delete trip"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
