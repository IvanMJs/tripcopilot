"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plane, ChevronRight, Trash2, Plus, MapPin, X, History, ChevronDown, ChevronUp, Eye, Pencil as PencilIcon, Camera, Compass } from "lucide-react";
import { TripArchiveCard } from "./TripArchiveCard";
import { TripTab } from "@/lib/types";
import { AirportStatusMap } from "@/lib/types";
import { calculateTripRiskScore } from "@/lib/tripRiskScore";
import { TripListSkeleton } from "./TripListSkeleton";
import { formatRelativeDate } from "@/lib/formatDate";
import { AIRPORTS } from "@/lib/airports";
import { usePostFlightWelcome } from "@/hooks/usePostFlightWelcome";
import { PostFlightWelcomeBanner } from "./PostFlightWelcomeBanner";
import { TripTemplates, type SelectedTemplate } from "./TripTemplates";

// ── Travel facts (bilingual) ───────────────────────────────────────────────
const TRAVEL_FACTS: Array<{ es: string; en: string }> = [
  { es: "El aeropuerto más transitado del mundo es Hartsfield-Jackson Atlanta (ATL) con 93M pasajeros/año.", en: "The world's busiest airport is Hartsfield-Jackson Atlanta (ATL) with 93M passengers/year." },
  { es: "Dubai (DXB) conecta más de 240 destinos en 6 continentes.", en: "Dubai (DXB) connects over 240 destinations across 6 continents." },
  { es: "El vuelo comercial más largo es Singapore–New York (SIN–JFK): 19 horas sin escala.", en: "The world's longest commercial flight is Singapore–New York (SIN–JFK): 19 hours nonstop." },
  { es: "Los aviones vuelan a unos 900 km/h, casi velocidad de crucero del sonido.", en: "Planes fly at around 900 km/h — close to the cruising speed of sound." },
  { es: "El 96 % de los pasajeros del mundo vuelan en menos del 10 % de los aeropuertos.", en: "96% of the world's passengers fly through less than 10% of airports." },
  { es: "Los aeropuertos de Japón tienen puntualidad récord: el 90 % de los vuelos salen a tiempo.", en: "Japanese airports hold a record for punctuality: 90% of flights depart on time." },
  { es: "El Boeing 747 tiene unas 6 millones de piezas. Si te perdés el vuelo, contalas.", en: "A Boeing 747 has about 6 million parts. If you miss your flight, start counting." },
  { es: "La ruta aérea más corta del mundo (Westray–Papa Westray, Escocia) dura solo 57 segundos.", en: "The world's shortest scheduled flight (Westray–Papa Westray, Scotland) lasts just 57 seconds." },
  { es: "Los vuelos nocturnos suelen tener menos turbulencias que los diurnos.", en: "Night flights typically have less turbulence than daytime flights." },
  { es: "La altitud de crucero habitual es 10.000 m — más alta que el Everest (8.849 m).", en: "Typical cruising altitude is 10,000 m — higher than Mount Everest (8,849 m)." },
];

// ── Destination inspirations (subset, keyed by IATA) ─────────────────────
const INSPIRATION_DESTINATIONS = [
  { iata: "JFK", gradient: "from-indigo-700/40 to-gray-900/40", emoji: "🗽", es: "Nueva York", en: "New York" },
  { iata: "CDG", gradient: "from-blue-600/40 to-purple-800/40", emoji: "🗼", es: "París",      en: "Paris" },
  { iata: "NRT", gradient: "from-pink-600/40 to-red-900/40",    emoji: "⛩️", es: "Tokio",      en: "Tokyo" },
  { iata: "DXB", gradient: "from-amber-400/40 to-yellow-900/40",emoji: "🏙️", es: "Dubái",      en: "Dubai" },
  { iata: "SYD", gradient: "from-sky-500/40 to-blue-800/40",    emoji: "🦘", es: "Sídney",     en: "Sydney" },
  { iata: "MIA", gradient: "from-cyan-600/40 to-blue-800/40",   emoji: "🏖️", es: "Miami",      en: "Miami" },
  { iata: "BCN", gradient: "from-yellow-600/40 to-red-800/40",  emoji: "🎨", es: "Barcelona",  en: "Barcelona" },
  { iata: "BKK", gradient: "from-yellow-500/40 to-orange-800/40",emoji: "🛕",es: "Bangkok",    en: "Bangkok" },
];

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
  onSelectTemplate?: (template: SelectedTemplate) => void;
  onSwitchTab?: (tab: string) => void;
  onAIImport?: () => void;
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

interface NextFlightInfo {
  tripId: string;
  destCode: string;
  isoDate: string;
  daysUntil: number;
}

function findNextFlightAcrossTrips(trips: TripTab[]): NextFlightInfo | null {
  const todayStr = new Date().toISOString().slice(0, 10);
  let best: NextFlightInfo | null = null;

  for (const trip of trips) {
    for (const f of trip.flights) {
      if (f.isoDate < todayStr) continue;
      const daysUntil = Math.round(
        (new Date(f.isoDate + "T00:00:00").getTime() - new Date(todayStr + "T00:00:00").getTime()) /
          (1000 * 60 * 60 * 24)
      );
      if (daysUntil > 30) continue;
      if (!best || f.isoDate < best.isoDate) {
        best = { tripId: trip.id, destCode: f.destinationCode, isoDate: f.isoDate, daysUntil };
      }
    }
  }

  return best;
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
  onSelectTemplate,
  onSwitchTab,
  onAIImport,
}: TripListViewProps) {
  const [historyOpen, setHistoryOpen]   = useState(false);
  const [showAllPast, setShowAllPast]   = useState(false);
  const { landedFlight, dismiss: dismissWelcome } = usePostFlightWelcome(trips);

  // Pick a stable daily fact and inspiration based on the day of year
  const dailyFact = useMemo(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return TRAVEL_FACTS[dayOfYear % TRAVEL_FACTS.length];
  }, []);

  const inspirationDest = useMemo(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return INSPIRATION_DESTINATIONS[(dayOfYear + 3) % INSPIRATION_DESTINATIONS.length];
  }, []);

  if (loading) {
    return <TripListSkeleton />;
  }

  const activeTrips = trips.filter((t) => !isTripPast(t));
  const pastTrips   = trips.filter((t) =>  isTripPast(t));
  const nextFlight  = findNextFlightAcrossTrips(activeTrips);

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

      {/* Post-flight welcome banner */}
      <AnimatePresence>
        {landedFlight && (
          <PostFlightWelcomeBanner
            key={landedFlight.flightId}
            flight={landedFlight}
            locale={locale}
            onDismiss={dismissWelcome}
          />
        )}
      </AnimatePresence>

      {/* Next flight countdown pill */}
      {nextFlight && (() => {
        const cityName = AIRPORTS[nextFlight.destCode]?.city ?? nextFlight.destCode;
        const { daysUntil } = nextFlight;

        let pillText: string;
        if (daysUntil === 0) {
          pillText = locale === "es"
            ? `¡Hoy volás a ${cityName}!`
            : `Flying to ${cityName} today!`;
        } else if (daysUntil === 1) {
          pillText = locale === "es"
            ? `Mañana volás a ${cityName}`
            : `Flying to ${cityName} tomorrow!`;
        } else if (daysUntil <= 7) {
          pillText = locale === "es"
            ? `${cityName} en ${daysUntil} días`
            : `${cityName} in ${daysUntil} days`;
        } else {
          pillText = locale === "es"
            ? `Próximo viaje: ${cityName} · en ${daysUntil} días`
            : `Next trip: ${cityName} · in ${daysUntil} days`;
        }

        const pillStyle =
          daysUntil === 0
            ? "from-amber-950/60 to-orange-950/60 border-amber-700/40 text-amber-300 shadow-amber-900/20"
            : daysUntil === 1
            ? "from-blue-950/60 to-blue-900/40 border-blue-700/40 text-blue-300 shadow-blue-900/20"
            : daysUntil <= 7
            ? "from-indigo-950/60 to-violet-950/40 border-indigo-700/40 text-indigo-300 shadow-indigo-900/20"
            : "from-gray-900/60 to-gray-900/40 border-white/[0.08] text-gray-400 shadow-black/20";

        return (
          <button
            onClick={() => onSelect(nextFlight.tripId)}
            className={`w-full flex items-center gap-2.5 rounded-xl bg-gradient-to-r ${pillStyle} border px-4 py-2.5 shadow-lg transition-all active:scale-[0.98] tap-scale`}
          >
            <Plane className="h-4 w-4 shrink-0" />
            <span className="text-sm font-semibold">{pillText}</span>
          </button>
        );
      })()}

      {/* Empty state — only when no active trips and no past trips */}
      {activeTrips.length === 0 && pastTrips.length === 0 && !exampleTrip && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="rounded-2xl border border-white/[0.06] overflow-hidden empty-state-card"
        >
          <div className="px-6 pt-12 pb-8 flex flex-col items-center text-center">

            {/* Animated plane icon */}
            <motion.div
              className="mb-6 select-none"
              aria-hidden="true"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="relative h-24 w-24 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-violet-600/10 border border-violet-500/20" />
                <motion.div
                  className="absolute inset-0 rounded-full bg-violet-500/5"
                  animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                />
                <Plane className="h-10 w-10 text-violet-400 relative z-10 -rotate-45" />
              </div>
            </motion.div>

            {/* Heading */}
            <motion.h3
              className="text-xl font-black text-white mb-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.35 }}
            >
              {locale === "es"
                ? "Tu próxima aventura empieza acá"
                : "Your next adventure starts here"}
            </motion.h3>

            <motion.p
              className="text-sm text-gray-400 mb-6 max-w-xs leading-relaxed"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.35 }}
            >
              {locale === "es"
                ? "Agregá tu primer vuelo y dejá que TripCopilot se encargue del resto"
                : "Add your first flight and let TripCopilot handle the rest"}
            </motion.p>

            {/* Daily travel fact */}
            <motion.div
              className="w-full max-w-xs mb-6 rounded-xl border border-amber-700/30 bg-amber-950/20 px-4 py-3 text-left"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.35 }}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400/70 mb-1">
                {locale === "es" ? "Dato del día" : "Travel fact of the day"}
              </p>
              <p className="text-xs text-amber-200/80 leading-relaxed">{dailyFact[locale]}</p>
            </motion.div>

            {/* Quick action cards */}
            <motion.div
              className="w-full max-w-xs space-y-2 mb-6"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.35 }}
            >
              {onAIImport && (
                <button
                  onClick={onAIImport}
                  className="w-full flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] px-4 py-3 transition-all tap-scale text-left"
                >
                  <Camera className="h-5 w-5 shrink-0 text-violet-400" />
                  <div>
                    <p className="text-sm font-semibold text-white leading-none mb-0.5">
                      {locale === "es" ? "Escaneá tu boarding pass" : "Scan your boarding pass"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {locale === "es" ? "Importá vuelos con IA" : "Import flights with AI"}
                    </p>
                  </div>
                </button>
              )}
              <button
                onClick={onCreateTrip}
                className="shimmer-btn w-full flex items-center gap-3 rounded-xl btn-primary px-4 py-3 transition-all tap-scale text-left"
              >
                <Plane className="h-5 w-5 shrink-0 text-white -rotate-45" />
                <div>
                  <p className="text-sm font-bold text-white leading-none mb-0.5">
                    {locale === "es" ? "Agregá tu próximo vuelo" : "Add your next flight"}
                  </p>
                  <p className="text-xs text-violet-200/70">
                    {locale === "es" ? "Monitoreo en tiempo real" : "Real-time monitoring"}
                  </p>
                </div>
              </button>
              {onSwitchTab && (
                <button
                  onClick={() => onSwitchTab("discover")}
                  className="w-full flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] px-4 py-3 transition-all tap-scale text-left"
                >
                  <Compass className="h-5 w-5 shrink-0 text-sky-400" />
                  <div>
                    <p className="text-sm font-semibold text-white leading-none mb-0.5">
                      {locale === "es" ? "Explorá destinos" : "Explore destinations"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {locale === "es" ? "Inspiración para tu próximo viaje" : "Inspiration for your next trip"}
                    </p>
                  </div>
                </button>
              )}
            </motion.div>

            {/* Travel inspiration destination card */}
            <motion.div
              className="w-full max-w-xs"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.4 }}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2 text-left">
                {locale === "es" ? "Inspiración de hoy" : "Today's inspiration"}
              </p>
              <div
                className={`rounded-xl bg-gradient-to-br ${inspirationDest.gradient} border border-white/[0.06] px-4 py-4 flex items-center gap-3`}
              >
                <span className="text-3xl leading-none">{inspirationDest.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-white">{inspirationDest[locale]}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" />
                    {inspirationDest.iata}
                  </p>
                </div>
                {onSwitchTab && (
                  <button
                    onClick={() => onSwitchTab("discover")}
                    className="shrink-0 rounded-lg bg-white/10 hover:bg-white/20 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors"
                  >
                    {locale === "es" ? "Explorar" : "Explore"}
                  </button>
                )}
              </div>
            </motion.div>

            {/* Example trip CTA */}
            {onSelectExample && (
              <motion.div
                className="mt-4 w-full max-w-xs"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.32, duration: 0.35 }}
              >
                <button
                  onClick={onSelectExample}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.10] bg-white/[0.03] hover:bg-white/[0.06] text-gray-300 text-sm font-medium px-6 py-3 transition-all tap-scale"
                >
                  {locale === "es" ? "Ver viaje de ejemplo" : "See example trip"}
                </button>
              </motion.div>
            )}

          </div>

          {/* Trip templates — visible in empty state */}
          {onSelectTemplate && (
            <div className="px-4 pb-6">
              <TripTemplates locale={locale} onSelectTemplate={onSelectTemplate} />
            </div>
          )}
        </motion.div>
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

      {/* Trip templates — shown when user has few active trips */}
      {activeTrips.length > 0 && activeTrips.length < 3 && onSelectTemplate && (
        <TripTemplates locale={locale} onSelectTemplate={onSelectTemplate} />
      )}

      {/* Past trips — collapsible history section */}
      {pastTrips.length > 0 && (
        <div className="pt-1">
          <button
            onClick={() => setHistoryOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-2 py-2 text-xs text-gray-500 hover:text-gray-400 transition-colors group"
          >
            <div className="flex items-center gap-2">
              <History className="h-3.5 w-3.5" />
              <span className="font-semibold uppercase tracking-wider">
                {locale === "es" ? "Historial de viajes" : "Trip history"}
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
              {(showAllPast ? pastTrips : pastTrips.slice(0, 3)).map((trip) => (
                <TripArchiveCard
                  key={trip.id}
                  trip={trip}
                  locale={locale}
                  onSelect={onSelect}
                  onDelete={onDeleteTrip}
                />
              ))}
              {pastTrips.length > 3 && (
                <button
                  onClick={() => setShowAllPast((v) => !v)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-gray-600 hover:text-gray-400 transition-colors"
                >
                  {showAllPast ? (
                    <>
                      <ChevronUp className="h-3.5 w-3.5" />
                      {locale === "es" ? "Ver menos" : "See less"}
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3.5 w-3.5" />
                      {locale === "es"
                        ? `Ver todo (${pastTrips.length - 3} más)`
                        : `See all (${pastTrips.length - 3} more)`}
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
