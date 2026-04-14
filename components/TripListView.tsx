"use client";

import { useState } from "react";
import { Plane, ChevronRight, Trash2, Plus, MapPin, X, Clock, ChevronDown, ChevronUp, Eye, Pencil as PencilIcon } from "lucide-react";
import { TripTab } from "@/lib/types";
import { AirportStatusMap } from "@/lib/types";
import { calculateTripRiskScore } from "@/lib/tripRiskScore";
import { TripListSkeleton } from "./TripListSkeleton";
import { formatRelativeDate } from "@/lib/formatDate";
import { AIRPORTS } from "@/lib/airports";

interface TripListViewProps {
  trips: TripTab[];
  statusMap: AirportStatusMap;
  locale: "es" | "en";
  loading?: boolean;
  onSelect: (id: string) => void;
  onCreateTrip: () => void;
  onDeleteTrip: (id: string) => void;
  exampleTrip?: TripTab | null;
  onSelectExample?: () => void;
  onDismissExample?: () => void;
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

function airportLabel(iata: string): string {
  return AIRPORTS[iata]?.city ?? iata;
}

function buildRouteLabel(trip: TripTab): string {
  const codes: string[] = [];
  for (const f of trip.flights) {
    if (!codes.includes(f.originCode)) codes.push(f.originCode);
    if (!codes.includes(f.destinationCode)) codes.push(f.destinationCode);
  }
  if (codes.length === 0) return "";
  if (codes.length <= 4) return codes.map(airportLabel).join(" → ");
  return `${airportLabel(codes[0])} → ${airportLabel(codes[1])} +${codes.length - 2}`;
}

function getNextFlightLabel(trip: TripTab, locale: "es" | "en"): { label: string; isToday: boolean } | null {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = trip.flights
    .filter((f) => f.isoDate >= today)
    .sort((a, b) => {
      const d = a.isoDate.localeCompare(b.isoDate);
      return d !== 0 ? d : (a.departureTime ?? "").localeCompare(b.departureTime ?? "");
    });
  if (upcoming.length === 0) return null;
  const next = upcoming[0];
  const isToday = next.isoDate === today;
  const dateLabel = formatRelativeDate(next.isoDate, locale);
  const timeLabel = next.departureTime ? ` · ${next.departureTime}` : "";
  return { label: `✈ ${dateLabel}${timeLabel}`, isToday };
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
  loading,
  onSelect,
  onCreateTrip,
  onDeleteTrip,
  exampleTrip,
  onSelectExample,
  onDismissExample,
}: TripListViewProps) {
  const [historyOpen, setHistoryOpen] = useState(false);

  if (loading) {
    return <TripListSkeleton />;
  }

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
            {/* Inline SVG: stylized plane with trail */}
            <div className="mb-5 select-none" aria-hidden="true">
              <svg
                width="120"
                height="120"
                viewBox="0 0 120 120"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Soft gradient background circle */}
                <circle cx="60" cy="60" r="54" fill="url(#emptyBg)" opacity="0.6" />
                {/* Trail lines */}
                <line x1="14" y1="78" x2="44" y2="68" stroke="url(#trailGrad)" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
                <line x1="10" y1="86" x2="36" y2="78" stroke="url(#trailGrad)" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
                <line x1="8" y1="94" x2="28" y2="88" stroke="url(#trailGrad)" strokeWidth="1" strokeLinecap="round" opacity="0.2" />
                {/* Plane body */}
                <path
                  d="M52 65 L88 42 C92 39 95 41 94 45 L78 78 C77 81 74 82 71 80 L62 74 L52 78 L54 70 L52 65Z"
                  fill="url(#planeGrad)"
                />
                {/* Left wing */}
                <path
                  d="M62 74 L44 86 C41 88 40 86 42 83 L52 65 L62 74Z"
                  fill="url(#wingGrad)"
                  opacity="0.85"
                />
                {/* Tail fin */}
                <path
                  d="M78 78 L82 90 C83 93 80 94 78 92 L71 80 L78 78Z"
                  fill="url(#wingGrad)"
                  opacity="0.75"
                />
                {/* Window highlight */}
                <circle cx="76" cy="56" r="3" fill="white" opacity="0.35" />
                {/* Star dots around the plane */}
                <circle cx="98" cy="30" r="1.5" fill="#a78bfa" opacity="0.7" />
                <circle cx="104" cy="50" r="1" fill="#60a5fa" opacity="0.5" />
                <circle cx="92" cy="22" r="1" fill="#a78bfa" opacity="0.4" />
                <defs>
                  <radialGradient id="emptyBg" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#312e81" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0" />
                  </radialGradient>
                  <linearGradient id="planeGrad" x1="52" y1="42" x2="94" y2="80" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                  <linearGradient id="wingGrad" x1="40" y1="65" x2="82" y2="94" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#a5b4fc" />
                    <stop offset="100%" stopColor="#818cf8" />
                  </linearGradient>
                  <linearGradient id="trailGrad" x1="8" y1="78" x2="44" y2="68" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0" />
                    <stop offset="100%" stopColor="#818cf8" stopOpacity="0.8" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h3 className="text-base font-bold text-white mb-2">
              {locale === "es" ? "Tu primera aventura empieza aquí" : "Your first adventure starts here"}
            </h3>
            <p className="text-sm text-gray-400 mb-6 max-w-xs leading-relaxed">
              {locale === "es"
                ? "Importá un boarding pass con IA en segundos. Sin tipear nada."
                : "Import a boarding pass with AI in seconds. No typing needed."}
            </p>
            <button
              onClick={onCreateTrip}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-sm font-semibold px-6 py-3 transition-all tap-scale"
            >
              {locale === "es" ? "Crear mi primer viaje →" : "Create my first trip →"}
            </button>
          </div>
        </div>
      )}

      {/* N4: FAB for new trip — only when no trips exist */}
      {trips.length === 0 && (
        <button
          onClick={onCreateTrip}
          className="fixed bottom-24 right-4 z-30 w-14 h-14 rounded-full btn-primary shadow-lg shadow-violet-900/40 flex items-center justify-center"
          aria-label={locale === "es" ? "Crear viaje" : "Create trip"}
        >
          <Plus className="w-6 h-6" />
        </button>
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
                  <span className="text-xs font-bold uppercase tracking-wider text-violet-400 border border-violet-600/40 bg-violet-900/30 px-1.5 py-0.5 rounded">
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

        const flightCount = trip.flights.length;
        const flightLabel =
          flightCount === 0
            ? (locale === "es" ? "Sin vuelos" : "No flights")
            : locale === "es"
            ? `${flightCount} vuelo${flightCount !== 1 ? "s" : ""}`
            : `${flightCount} flight${flightCount !== 1 ? "s" : ""}`;

        const routeLabel = buildRouteLabel(trip);
        const nextFlightLabel = getNextFlightLabel(trip, locale);

        const today = new Date().toISOString().slice(0, 10);
        const isDepartureDay = trip.flights.some((f) => f.isoDate === today);

        const isShared = trip.isShared === true;
        const collabRole = trip.collaboratorRole;

        return (
          <div
            key={trip.id}
            className={`rounded-2xl border overflow-hidden transition-all ${
              isShared
                ? "border-violet-700/40 hover:border-violet-600/60"
                : "border-white/[0.07] hover:border-white/[0.14]"
            } ${isDepartureDay ? "animate-pulse-aura" : ""}`}
            style={{ background: "linear-gradient(150deg, rgba(14,14,24,0.97) 0%, rgba(9,9,18,0.99) 100%)" }}
          >
            <div className="flex items-center gap-2 pr-3">
              <button
                onClick={() => onSelect(trip.id)}
                className="flex-1 min-w-0 text-left px-4 py-4 flex items-center gap-3 tap-scale"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-base font-bold text-white truncate">{trip.name}</span>
                    {isShared && (
                      <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-violet-900/30 border border-violet-700/40 text-violet-300">
                        {locale === "es" ? "Compartido" : "Shared"}
                      </span>
                    )}
                    {isShared && collabRole && collabRole !== "owner" && (
                      <span className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-gray-400">
                        {collabRole === "viewer"
                          ? <><Eye className="h-3 w-3" />{locale === "es" ? "Lector" : "Viewer"}</>
                          : <><PencilIcon className="h-3 w-3" />{locale === "es" ? "Editor" : "Editor"}</>
                        }
                      </span>
                    )}
                    {riskStyle && (
                      <span className={`flex items-center gap-1 text-xs font-semibold shrink-0 ${riskStyle.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${riskStyle.dot}`} />
                        {riskStyle.label[locale]}
                      </span>
                    )}
                  </div>
                  {routeLabel && (
                    <p className="text-xs text-gray-400 mb-1 truncate">{routeLabel}</p>
                  )}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Plane className="h-3 w-3" />
                      {flightLabel}
                    </span>
                    {nextFlightLabel && (
                      <span className={`text-xs font-medium ${nextFlightLabel.isToday ? "text-red-400" : "text-violet-400"}`}>
                        {nextFlightLabel.label}
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
                            <span className="text-xs text-gray-600 font-medium shrink-0">{range}</span>
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
