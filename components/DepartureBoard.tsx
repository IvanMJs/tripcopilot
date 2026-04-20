"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plane, Clock, MapPin, CloudSun } from "lucide-react";
import { TripTab, AirportStatusMap, DelayStatus, TripFlight } from "@/lib/types";
import { FlightsEmptyState } from "@/components/FlightsEmptyState";
import { AIRPORTS } from "@/lib/airports";
import { flightDepartureISO, minutesUntilISO } from "@/lib/flightTime";
import { NextFlightHero } from "@/components/NextFlightHero";
import { useDestinationWeather } from "@/hooks/useDestinationWeather";
import { useDepartureTime } from "@/hooks/useDepartureTime";
import { GeoPosition } from "@/hooks/useGeolocation";
import { WarRoomMode } from "@/components/WarRoomMode";

// ── Props ──────────────────────────────────────────────────────────────────

interface DepartureBoardProps {
  trips: TripTab[];
  statusMap: AirportStatusMap;
  locale: "es" | "en";
  geoPosition?: GeoPosition | null;
  userPlan?: string | null;
  onUpgrade?: () => void;
  onCreateTrip?: () => void;
}

// ── Internal types ─────────────────────────────────────────────────────────

interface BoardFlight extends TripFlight {
  tripName: string;
  tripId: string;
  status: DelayStatus;
}

// ── Status config ──────────────────────────────────────────────────────────

const STATUS_STYLE: Record<
  DelayStatus,
  { pill: string; label: { es: string; en: string } }
> = {
  ok:             { pill: "bg-emerald-950/60 text-emerald-300 border border-emerald-500/20", label: { es: "A tiempo",     en: "On time"     } },
  delay_minor:    { pill: "bg-yellow-950/60  text-yellow-300  border border-yellow-500/20",  label: { es: "Demora leve",  en: "Minor delay"  } },
  delay_moderate: { pill: "bg-orange-950/60  text-orange-300  border border-orange-500/20",  label: { es: "Demora",       en: "Delay"        } },
  delay_severe:   { pill: "bg-red-950/60     text-red-300     border border-red-500/25",      label: { es: "Demora grave", en: "Severe delay" } },
  ground_delay:   { pill: "bg-red-950/70     text-red-200     border border-red-600/30",      label: { es: "GDP",          en: "GDP"          } },
  ground_stop:    { pill: "bg-red-950/80     text-red-200     border border-red-600/40",      label: { es: "Ground stop",  en: "Ground stop"  } },
  closure:        { pill: "bg-zinc-900/60    text-zinc-300    border border-zinc-600/30",     label: { es: "Cerrado",      en: "Closed"       } },
  unknown:        { pill: "bg-zinc-900/40    text-zinc-400    border border-zinc-700/30",     label: { es: "Desconocido",  en: "Unknown"      } },
};

// ── Urgency gradient helpers ───────────────────────────────────────────────

type UrgencyLevel = "relaxed" | "normal" | "soon" | "critical";

function getUrgency(minutesUntilDeparture: number): UrgencyLevel {
  if (minutesUntilDeparture > 240) return "relaxed";
  if (minutesUntilDeparture > 120) return "normal";
  if (minutesUntilDeparture > 60)  return "soon";
  return "critical";
}

const URGENCY_GRADIENT: Record<UrgencyLevel, string> = {
  relaxed:  "linear-gradient(135deg, rgba(5,46,22,0.95) 0%, rgba(6,32,20,0.98) 100%)",
  normal:   "linear-gradient(135deg, rgba(8,28,60,0.95) 0%, rgba(5,20,50,0.98) 100%)",
  soon:     "linear-gradient(135deg, rgba(55,32,4,0.95) 0%, rgba(45,25,5,0.98) 100%)",
  critical: "linear-gradient(135deg, rgba(60,8,8,0.95) 0%, rgba(45,6,6,0.98) 100%)",
};

const URGENCY_BORDER: Record<UrgencyLevel, string> = {
  relaxed:  "border-emerald-700/40",
  normal:   "border-blue-700/40",
  soon:     "border-amber-600/50",
  critical: "border-red-600/60",
};

const URGENCY_ACCENT: Record<UrgencyLevel, string> = {
  relaxed:  "text-emerald-300",
  normal:   "text-blue-300",
  soon:     "text-amber-300",
  critical: "text-red-300",
};

// ── Utility helpers ────────────────────────────────────────────────────────

function cityName(iata: string): string {
  return AIRPORTS[iata]?.city ?? iata;
}

function formatCountdown(totalMinutes: number, locale: "es" | "en"): string {
  if (totalMinutes <= 0) return locale === "es" ? "Despegando" : "Departing";
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  if (locale === "es") {
    if (h > 0 && m > 0) return `Despega en ${h}h ${m}m`;
    if (h > 0) return `Despega en ${h}h`;
    return `Despega en ${m}m`;
  }
  if (h > 0 && m > 0) return `Takes off in ${h}h ${m}m`;
  if (h > 0) return `Takes off in ${h}h`;
  return `Takes off in ${m}m`;
}

function formatDate(isoDate: string, locale: "es" | "en"): string {
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString(locale === "en" ? "en-US" : "es-AR", {
    weekday: "short",
    day:     "numeric",
    month:   "short",
  });
}

// ── Live countdown hook ────────────────────────────────────────────────────

function useLiveMinutes(isoDatetime: string): number {
  const [minutes, setMinutes] = useState(() => minutesUntilISO(isoDatetime));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isoDatetime) return;
    setMinutes(minutesUntilISO(isoDatetime));
    intervalRef.current = setInterval(() => {
      setMinutes(minutesUntilISO(isoDatetime));
    }, 1000);
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
  }, [isoDatetime]);

  return minutes;
}

// ── Hero card ──────────────────────────────────────────────────────────────

interface HeroCardProps {
  flight: BoardFlight;
  locale: "es" | "en";
  geoPosition: GeoPosition | null | undefined;
}

function HeroCard({ flight, locale, geoPosition }: HeroCardProps) {
  const depISO = flightDepartureISO(flight);
  const liveMinutes = useLiveMinutes(depISO);
  const urgency = liveMinutes === Infinity ? "relaxed" : getUrgency(liveMinutes);
  const accentClass = URGENCY_ACCENT[urgency];

  const { forecast } = useDestinationWeather(
    flight.destinationCode,
    flight.isoDate,
    locale,
    true,
  );

  const departureResult = useDepartureTime(
    depISO,
    flight.originCode,
    geoPosition ?? null,
    locale,
  );

  const statusCfg = STATUS_STYLE[flight.status] ?? STATUS_STYLE.unknown;
  const isOnTime = flight.status === "ok";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 24 }}
      className={`rounded-2xl border ${URGENCY_BORDER[urgency]} overflow-hidden`}
      style={{ background: URGENCY_GRADIENT[urgency] }}
    >
      {/* Top bar */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {/* Flight code */}
          <div className="flex items-center gap-2 mb-1">
            <Plane className={`h-4 w-4 shrink-0 ${accentClass}`} />
            <span className={`text-2xl font-black font-mono tracking-tight ${accentClass}`}>
              {flight.flightCode}
            </span>
          </div>
          {/* Route */}
          <p className="text-lg font-semibold text-white leading-tight">
            {cityName(flight.originCode)}
            <span className="text-gray-500 mx-2">→</span>
            {cityName(flight.destinationCode)}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">{flight.airlineName}</p>
        </div>

        {/* Status pill + live dot */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${statusCfg.pill} flex items-center gap-1.5`}>
            {isOnTime && (
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
            {statusCfg.label[locale]}
          </span>
        </div>
      </div>

      {/* Countdown + departure time */}
      <div className="px-4 pb-3 flex items-end justify-between gap-4">
        <div>
          <p
            aria-live="polite"
            aria-atomic="true"
            className={`text-3xl font-black tabular-nums leading-none ${accentClass}`}
          >
            {liveMinutes === Infinity
              ? "--:--"
              : liveMinutes <= 0
                ? (locale === "es" ? "Despegando" : "Departing")
                : formatCountdown(liveMinutes, locale)}
          </p>
          {liveMinutes !== Infinity && liveMinutes > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              {locale === "es" ? "Salida a las " : "Departs at "}
              <span className="font-bold tabular-nums text-white">
                {flight.departureTime ?? "--:--"}
              </span>
            </p>
          )}
        </div>

        {/* Weather at destination */}
        {forecast && (
          <div className="flex items-center gap-1.5 shrink-0">
            <CloudSun className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-semibold text-gray-300 tabular-nums">
              {forecast.tempMaxC}°/{forecast.tempMinC}°C
            </span>
            <span className="text-base leading-none">{forecast.conditionEmoji}</span>
          </div>
        )}
      </div>

      {/* Gate / terminal / seat row */}
      {(flight.terminal || flight.seatNumber || flight.bookingCode) && (
        <div className="px-4 pb-3 flex items-center gap-4 flex-wrap">
          {flight.terminal && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3 text-gray-600" />
              <span className="text-xs text-gray-400">
                {locale === "es" ? "Terminal" : "Terminal"}{" "}
                <span className="font-semibold text-white">{flight.terminal}</span>
              </span>
            </div>
          )}
          {flight.seatNumber && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400">
                {locale === "es" ? "Asiento" : "Seat"}{" "}
                <span className="font-semibold text-white font-mono">{flight.seatNumber}</span>
              </span>
            </div>
          )}
          {flight.bookingCode && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400">
                {locale === "es" ? "PNR" : "PNR"}{" "}
                <span className="font-semibold text-white font-mono">{flight.bookingCode}</span>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Departure time widget — "when to leave" info */}
      {departureResult && departureResult.urgencyLevel !== "past" && (
        <div className="border-t border-white/[0.07] px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-gray-500 shrink-0" />
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                {locale === "es" ? "¿Cuándo salir?" : "When to leave?"}
              </p>
            </div>
            <span className={`text-base font-black ${accentClass}`}>
              {departureResult.leaveAtFormatted}
            </span>
          </div>
          {/* Buffer breakdown */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <BufferChip
              label={locale === "es" ? "Traslado" : "Drive"}
              minutes={departureResult.travelMinutes}
              locale={locale}
            />
            <span className="text-gray-700 text-xs">+</span>
            <BufferChip
              label={locale === "es" ? "Check-in" : "Check-in"}
              minutes={departureResult.checkInMinutes}
              locale={locale}
            />
            <span className="text-gray-700 text-xs">+</span>
            <BufferChip
              label={locale === "es" ? "Seguridad" : "Security"}
              minutes={departureResult.securityMinutes}
              locale={locale}
            />
          </div>
          {!geoPosition && (
            <p className="text-[10px] text-gray-600 mt-1.5 italic">
              {locale === "es"
                ? "Activá la ubicación para un cálculo exacto"
                : "Enable location for an exact estimate"}
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}

function BufferChip({
  label,
  minutes,
  locale,
}: {
  label: string;
  minutes: number;
  locale: "es" | "en";
}) {
  return (
    <div className="flex items-center gap-1 text-gray-400">
      <span className="text-[11px]">{label}</span>
      <span className="text-[11px] font-bold text-gray-300 tabular-nums">
        {minutes} {locale === "es" ? "min" : "min"}
      </span>
    </div>
  );
}

// ── Compact flight row ─────────────────────────────────────────────────────

interface CompactRowProps {
  flight: BoardFlight;
  locale: "es" | "en";
  index: number;
}

function CompactFlightRow({ flight, locale, index }: CompactRowProps) {
  const depISO = flightDepartureISO(flight);
  const liveMinutes = useLiveMinutes(depISO);
  const statusCfg = STATUS_STYLE[flight.status] ?? STATUS_STYLE.unknown;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, type: "spring", stiffness: 300, damping: 26 }}
      className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02] transition-colors"
    >
      {/* Flight code */}
      <div className="shrink-0 w-20">
        <span className="text-sm font-bold font-mono text-white">{flight.flightCode}</span>
        <p className="text-[10px] text-gray-600 truncate">{flight.tripName}</p>
      </div>

      {/* Route */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-300 truncate">
          {cityName(flight.originCode)}
          <span className="text-gray-600 mx-1">→</span>
          {cityName(flight.destinationCode)}
        </p>
      </div>

      {/* Departure + countdown */}
      <div className="shrink-0 text-right">
        <span className="text-sm font-bold tabular-nums text-white">
          {flight.departureTime ?? "--:--"}
        </span>
        {liveMinutes !== Infinity && liveMinutes > 0 && liveMinutes <= 1440 && (
          <p className="text-[10px] text-gray-500 tabular-nums">
            {formatCountdown(liveMinutes, locale)}
          </p>
        )}
      </div>

      {/* Status pill */}
      <div className="shrink-0">
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusCfg.pill}`}>
          {statusCfg.label[locale]}
        </span>
      </div>
    </motion.div>
  );
}

function NextFlightRelativeDate({
  isoDate,
  locale,
}: {
  isoDate: string;
  locale: "es" | "en";
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const flightDate = new Date(isoDate + "T00:00:00");
  const diffDays = Math.round(
    (flightDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 1) return <span>{locale === "es" ? "mañana" : "tomorrow"}</span>;
  if (diffDays <= 7) {
    return (
      <span>
        {locale === "es" ? `en ${diffDays} días` : `in ${diffDays} days`}
      </span>
    );
  }
  return <span>{formatDate(isoDate, locale)}</span>;
}

// ── Main component ─────────────────────────────────────────────────────────

/**
 * Mission Control — redesigned "Hoy" tab showing a hero card for the next
 * flight (when within 24h), a compact list for other today flights, and a
 * relaxed empty state when there's nothing today.
 */
export function DepartureBoard({
  trips,
  statusMap,
  locale,
  geoPosition,
  userPlan,
  onUpgrade,
  onCreateTrip,
}: DepartureBoardProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [warRoomDismissed, setWarRoomDismissed] = useState(false);

  // All flights today, sorted by departure time
  const todayFlights: BoardFlight[] = trips
    .flatMap((trip) =>
      trip.flights
        .filter((f) => f.isoDate === today)
        .map<BoardFlight>((f) => ({
          ...f,
          tripName: trip.name,
          tripId: trip.id,
          status: statusMap[f.originCode]?.status ?? "unknown",
        })),
    )
    .sort((a, b) =>
      (a.departureTime ?? "").localeCompare(b.departureTime ?? ""),
    );

  // Hero = the next flight within 24h from now
  const heroFlight = todayFlights.find((f) => {
    if (!f.departureTime) return false;
    const depISO = flightDepartureISO(f);
    const mins = minutesUntilISO(depISO);
    return mins > -30; // include flights up to 30 min past departure
  }) ?? null;

  // Other today flights (all except the hero)
  const otherTodayFlights = heroFlight
    ? todayFlights.filter((f) => f.id !== heroFlight.id)
    : todayFlights;

  // Next upcoming flight (for empty state)
  const nextFlight: BoardFlight | null =
    todayFlights.length === 0
      ? trips
          .flatMap((trip) =>
            trip.flights
              .filter((f) => f.isoDate > today)
              .map<BoardFlight>((f) => ({
                ...f,
                tripName: trip.name,
                tripId: trip.id,
                status: statusMap[f.originCode]?.status ?? "unknown",
              })),
          )
          .sort((a, b) =>
            a.isoDate.localeCompare(b.isoDate) ||
            (a.departureTime ?? "").localeCompare(b.departureTime ?? ""),
          )[0] ?? null
      : null;

  const dateLabel = formatDate(today, locale);
  const flightCount = todayFlights.length;

  // Earliest future flight across ALL trips (for the hero countdown)
  const globalNextFlight: TripFlight | null = (() => {
    const now = new Date().toISOString().slice(0, 10);
    const candidates = trips
      .flatMap((t) => t.flights)
      .filter((f) => f.isoDate >= now);
    if (candidates.length === 0) return null;
    candidates.sort((a, b) =>
      a.isoDate.localeCompare(b.isoDate) ||
      (a.departureTime ?? "").localeCompare(b.departureTime ?? ""),
    );
    return candidates[0] ?? null;
  })();

  // War Room: active when the next flight departs within 12 hours
  const warRoomFlight: BoardFlight | null = (() => {
    if (!globalNextFlight) return null;
    const depISO = flightDepartureISO(globalNextFlight);
    const mins = minutesUntilISO(depISO);
    if (mins > 720 || mins < -30) return null; // 12h = 720 min
    // Find the BoardFlight version (has tripId)
    const found = todayFlights.find((f) => f.id === globalNextFlight.id);
    if (found) return found;
    // Fallback: build a minimal BoardFlight from globalNextFlight
    const parentTrip = trips.find((t) => t.flights.some((f) => f.id === globalNextFlight.id));
    if (!parentTrip) return null;
    return {
      ...globalNextFlight,
      tripName: parentTrip.name,
      tripId: parentTrip.id,
      status: statusMap[globalNextFlight.originCode]?.status ?? "unknown",
    };
  })();

  // Find the flight that comes right after warRoomFlight (for connection analysis)
  const nextConnectingFlight: TripFlight | null = (() => {
    if (!warRoomFlight) return null;
    const parentTrip = trips.find((t) => t.id === warRoomFlight.tripId);
    if (!parentTrip) return null;
    const sorted = [...parentTrip.flights].sort((a, b) =>
      a.isoDate.localeCompare(b.isoDate) ||
      (a.departureTime ?? "").localeCompare(b.departureTime ?? ""),
    );
    const idx = sorted.findIndex((f) => f.id === warRoomFlight.id);
    if (idx === -1 || idx >= sorted.length - 1) return null;
    return sorted[idx + 1] ?? null;
  })();

  const showWarRoom = warRoomFlight !== null && !warRoomDismissed;

  return (
    <div className="space-y-3">
      {/* War Room Mode — replaces normal view when flight < 12h */}
      {showWarRoom && warRoomFlight && (
        <WarRoomMode
          flight={warRoomFlight}
          nextFlight={nextConnectingFlight}
          tripId={warRoomFlight.tripId}
          locale={locale}
          statusMap={statusMap}
          geoPosition={geoPosition}
          onExit={() => setWarRoomDismissed(true)}
          userPlan={userPlan ?? undefined}
          onUpgrade={onUpgrade}
        />
      )}

      {/* Normal content — shown when War Room is dismissed or no urgent flight */}
      {!showWarRoom && (
        <>
          {/* Next Flight Hero — shown when no war room */}
          <NextFlightHero nextFlight={globalNextFlight} locale={locale} />

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-white">
                {locale === "es" ? "Vuelos de hoy" : "Today's flights"}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">{dateLabel}</p>
            </div>
            {flightCount > 0 && (
              <span className="text-xs font-semibold text-gray-500 px-2 py-1 rounded-lg border border-white/[0.08] bg-white/[0.03]">
                {flightCount}{" "}
                {flightCount === 1
                  ? (locale === "es" ? "vuelo" : "flight")
                  : (locale === "es" ? "vuelos" : "flights")}
              </span>
            )}
          </div>

          {/* Empty state */}
          {todayFlights.length === 0 && (
            <FlightsEmptyState locale={locale} onCreateTrip={onCreateTrip ?? (() => {})} />
          )}

          {/* Hero card for the next flight */}
          <AnimatePresence>
            {heroFlight && (
              <HeroCard
                key={heroFlight.id}
                flight={heroFlight}
                locale={locale}
                geoPosition={geoPosition}
              />
            )}
          </AnimatePresence>

          {/* Other today flights */}
          {otherTodayFlights.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-white/[0.07] overflow-hidden"
              style={{
                background:
                  "linear-gradient(150deg, rgba(14,14,24,0.97) 0%, rgba(9,9,18,0.99) 100%)",
              }}
            >
              <div className="px-4 py-2 border-b border-white/[0.05]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">
                  {locale === "es" ? "También hoy" : "Also today"}
                </p>
              </div>
              {otherTodayFlights.map((flight, i) => (
                <CompactFlightRow
                  key={flight.id}
                  flight={flight}
                  locale={locale}
                  index={i}
                />
              ))}
            </motion.div>
          )}

          {/* If no hero but there are flights (all past), show them as compact list */}
          {!heroFlight && todayFlights.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl border border-white/[0.07] overflow-hidden"
              style={{
                background:
                  "linear-gradient(150deg, rgba(14,14,24,0.97) 0%, rgba(9,9,18,0.99) 100%)",
              }}
            >
              {todayFlights.map((flight, i) => (
                <CompactFlightRow
                  key={flight.id}
                  flight={flight}
                  locale={locale}
                  index={i}
                />
              ))}
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
