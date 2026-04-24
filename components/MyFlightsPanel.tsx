"use client";

import { useState, useEffect, useCallback } from "react";
import { AirportStatusMap } from "@/lib/types";
import { useMyFlights, FlightData } from "@/hooks/useMyFlights";
import { useFlightNotes, FlightNote } from "@/hooks/useFlightNotes";
import { StatusBadge } from "./StatusBadge";
import { ExternalLink, Clock, MapPin, Plane, AlertTriangle, Calendar, Share2, DoorOpen, ChevronDown, ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { WeatherData } from "@/hooks/useWeather";
import { TripTimeline } from "./TripTimeline";
import { TripSummaryHero } from "./TripSummaryHero";
import { CalendarFlight, generateICS, downloadICS, buildGoogleCalendarURL } from "@/lib/calendarExport";
import { buildWhatsAppMessage, buildWhatsAppURL, WhatsAppFlight } from "@/lib/tripShare";
import { FlightStatusBadge } from "@/components/FlightStatusBadge";
import { useTsaWait } from "@/hooks/useTsaWait";
import { AIRPORTS } from "@/lib/airports";
import { DayOfTravelBanner } from "@/components/DayOfTravelBanner";
import { TripCopilot } from "@/components/TripCopilot";
import { TripClocks } from "@/components/TripClocks";
import { TripEmptyState } from "@/components/TripEmptyState";
import { getAirportTime, getAirportTzLabel } from "@/lib/airportTimezone";

function formatMinutes(min: number | undefined): string {
  if (min == null) return "?";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

function getDaysUntil(isoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const flight = new Date(isoDate + "T00:00:00");
  return Math.ceil((flight.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function DaysCountdown({ days, locale }: { days: number; locale: "es" | "en" }) {
  if (days < 0) {
    return (
      <span className="text-xs font-medium bg-gray-800 text-gray-500 px-2 py-0.5 rounded">
        {locale === "en" ? "Completed" : "Completado"}
      </span>
    );
  }
  if (days === 0) {
    return (
      <span className="text-xs font-bold bg-red-900/60 text-red-300 px-2 py-0.5 rounded animate-pulse">
        {locale === "en" ? "TODAY" : "HOY"}
      </span>
    );
  }

  const colorClass = days <= 7
    ? "bg-yellow-900/50 text-yellow-300"
    : "bg-green-900/40 text-green-300";

  const label = locale === "en"
    ? `${days} day${days > 1 ? "s" : ""} left`
    : `en ${days} día${days > 1 ? "s" : ""}`;

  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded ${colorClass}`}>
      {label}
    </span>
  );
}

const AIRLINE_APP_URLS: Record<string, string> = {
  AA: "https://www.aa.com/travelInformation/flightStatus/aa",
  UA: "https://www.united.com/en/us/flightstatus",
  DL: "https://www.delta.com/us/en/flight-search/check-in",
  B6: "https://www.jetblue.com/manage-trips/check-in",
  WN: "https://www.southwest.com/air/check-in/index.html",
  LA: "https://www.latamairlines.com/us/en/check-in",
  AR: "https://www.aerolineas.com.ar/ar/es/check-in-online",
};

function LinkButton({
  href,
  children,
  variant = "default",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "default" | "blue" | "orange";
}) {
  const colors = {
    default: "border-gray-700 bg-gray-800/60 text-gray-300 hover:bg-gray-700/60 hover:text-white",
    blue:    "border-blue-700/60 bg-blue-900/20 text-blue-400 hover:bg-blue-900/40 hover:text-blue-300",
    orange:  "border-orange-700/60 bg-orange-900/20 text-orange-400 hover:bg-orange-900/40 hover:text-orange-300",
  };
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${colors[variant]}`}
    >
      {children}
      <ExternalLink className="h-3 w-3 shrink-0" />
    </a>
  );
}

const CARD_ACCENTS = [
  { bar: "bg-blue-400/80",   border: "border-blue-500/25",   bg: "bg-blue-950/35"   },
  { bar: "bg-[rgba(255,184,0,0.25)]/80", border: "border-[rgba(255,184,0,0.25)]", bg: "bg-[rgba(255,184,0,0.06)]" },
  { bar: "bg-teal-400/80",   border: "border-teal-500/25",   bg: "bg-teal-950/35"   },
  { bar: "bg-amber-400/80",  border: "border-amber-500/25",  bg: "bg-amber-950/35"  },
  { bar: "bg-rose-400/80",   border: "border-rose-500/25",   bg: "bg-rose-950/35"   },
] as const;

interface FlightCardItemProps {
  flight: FlightData;
  statusMap: AirportStatusMap;
  weatherMap?: Record<string, WeatherData>;
  locale: "es" | "en";
  index: number;
  isNext?: boolean;
  note: FlightNote;
  onUpdateNote: (flightKey: string, field: keyof FlightNote, value: string) => void;
}

function FlightCardItem({ flight, statusMap, weatherMap, locale, index, isNext = false, note, onUpdateNote }: FlightCardItemProps) {
  const originStatus = statusMap[flight.originCode];
  const status = originStatus?.status ?? "ok";
  const hasIssue = status !== "ok";
  const date = locale === "en" ? flight.dateEn : flight.date;
  const originName = locale === "en" ? flight.originNameEn : flight.originName;
  const destName   = locale === "en" ? flight.destinationNameEn : flight.destinationName;
  const arrivalNote = locale === "en" ? flight.arrivalNoteEn : flight.arrivalNoteEs;
  const daysUntil = getDaysUntil(flight.isoDate);

  // TSA wait times — US airports only, today or tomorrow only
  const originInfo = AIRPORTS[flight.originCode];
  const isUsAirport = originInfo?.isFAA !== false && !originInfo?.country;
  const tsa = useTsaWait(flight.originCode, isUsAirport && daysUntil >= 0 && daysUntil <= 1);
  const isPast = daysUntil < 0;
  const airlineCode = flight.flightNum.split(" ")[0];
  const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];
  const noteKey = `${flight.flightNum.replace(/\s+/g, "")}-${flight.isoDate}`;

  // Only next leg and issues start expanded — past and future legs start collapsed
  const [isExpanded, setIsExpanded] = useState((isNext && !isPast) || hasIssue);
  const [showNotes, setShowNotes] = useState(false);

  const updateNote = useCallback((field: keyof FlightNote, value: string) => {
    onUpdateNote(noteKey, field, value);
  }, [noteKey, onUpdateNote]);

  const hasAnyNote = note.pnr || note.seat || note.notes;

  // Live clock — ticks every minute synced to boundary
  const [, setClockTick] = useState(0);
  useEffect(() => {
    const msToNext = 60000 - (Date.now() % 60000);
    const t = setTimeout(() => {
      setClockTick((n) => n + 1);
      const interval = setInterval(() => setClockTick((n) => n + 1), 60000);
      return () => clearInterval(interval);
    }, msToNext);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`relative rounded-xl border overflow-hidden transition-all shadow-[0_1px_3px_rgba(0,0,0,0.5),0_4px_20px_rgba(0,0,0,0.35)] ${
        isPast
          ? "border-gray-800/50 bg-gray-900/20 opacity-55"
          : hasIssue
          ? "border-orange-500/40 bg-orange-950/15"
          : `${accent.border} ${accent.bg}`
      }`}
    >
      {/* Left accent bar */}
      <div className={`absolute left-0 inset-y-0 w-[3px] ${
        isPast ? "bg-gray-700/40" : hasIssue ? "bg-orange-500" : accent.bar
      }`} />

      {/* ── Context label — Próximo tramo or Atención ─────────────────────── */}
      {(isNext || hasIssue) && !isPast && (
        <div className={`pl-5 pr-4 py-1.5 flex items-center gap-1.5 border-b ${
          hasIssue
            ? "bg-orange-950/30 border-orange-800/20"
            : "bg-emerald-950/20 border-emerald-800/10"
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
            hasIssue ? "bg-orange-400 animate-pulse" : "bg-emerald-400"
          }`} />
          <span className={`text-xs font-bold uppercase tracking-widest ${
            hasIssue ? "text-orange-400" : "text-emerald-400"
          }`}>
            {hasIssue
              ? (locale === "es" ? "Atención" : "Attention")
              : (locale === "es" ? "Próximo tramo" : "Next leg")}
          </span>
        </div>
      )}

      {/* ── Accordion header — always visible, tap to expand/collapse ─────── */}
      <button
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full pl-5 pr-4 py-3.5 flex items-center justify-between gap-3 text-left tap-scale"
      >
        <div className="min-w-0 flex-1">
          {/* Row 1: flight identity */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-base font-black ${isPast ? "text-gray-500" : "text-white"}`}>
              {flight.flightNum}
            </span>
            <div className="flex items-center gap-1 text-sm">
              <span className={`font-bold ${isPast ? "text-gray-600" : "text-white"}`}>{flight.originCode}</span>
              <ArrowRight className="h-3 w-3 text-gray-600 shrink-0" />
              <span className={`font-bold ${isPast ? "text-gray-600" : "text-gray-300"}`}>{flight.destinationCode}</span>
            </div>
          </div>
          {/* Row 2: date · time · countdown — temporal info together */}
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[11px] text-gray-500 tabular">{date} · {flight.departureTime}</span>
            <DaysCountdown days={daysUntil} locale={locale} />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`h-2 w-2 rounded-full ${
            hasIssue ? "bg-orange-400 animate-pulse" : isPast ? "bg-gray-700" : "bg-emerald-500"
          }`} />
          <ChevronDown
            className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* Check-in banner — always visible when applicable */}
      {daysUntil === 1 && (
        <div className="px-4 py-2.5 bg-emerald-950/30 border-b border-emerald-800/40 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm">✈️</span>
            <div>
              <p className="text-xs font-bold text-emerald-300">
                {locale === "en" ? "Check-in is open!" : "¡Check-in disponible!"}
              </p>
              <p className="text-[11px] text-emerald-400/70">
                {locale === "en"
                  ? `Your flight ${flight.flightNum} departs tomorrow`
                  : `Tu vuelo ${flight.flightNum} sale mañana`}
              </p>
            </div>
          </div>
          {AIRLINE_APP_URLS[airlineCode] && (
            <a
              href={AIRLINE_APP_URLS[airlineCode]}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300 border border-emerald-700/50 bg-emerald-900/20 rounded-lg px-3 py-1.5 hover:bg-emerald-900/40 transition-colors"
            >
              {locale === "en" ? "Check in now" : "Hacer check-in"}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}

      {/* ── Expandable content ─────────────────────────────────────────────── */}
      {isExpanded && (
      <div className="border-t border-white/[0.05]">

      {/* SECCIÓN 1: AEROPUERTO */}
      <div className={`px-4 py-3 ${hasIssue ? "bg-orange-950/25" : "bg-white/[0.03]"}`}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {hasIssue && <AlertTriangle className="h-4 w-4 text-orange-400 shrink-0" />}
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                {locale === "en" ? "Departure Airport" : "Aeropuerto de salida"}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{flight.originCode}</span>
              <span className="text-sm text-gray-400">{originName}</span>
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {weatherMap?.[flight.originCode] && (
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <span className="text-sm leading-none">{weatherMap[flight.originCode].icon}</span>
                  <span className="font-medium text-gray-300">{weatherMap[flight.originCode].temperature}°C</span>
                  <span>{weatherMap[flight.originCode].description}</span>
                </div>
              )}
              {(() => {
                const t = getAirportTime(flight.originCode);
                const tz = getAirportTzLabel(flight.originCode);
                if (!t) return null;
                return (
                  <span className="flex items-center gap-1 text-xs text-gray-400 tabular font-medium">
                    🕐 {t}{tz && <span className="text-gray-600 text-xs ml-0.5">{tz}</span>}
                  </span>
                );
              })()}
            </div>
            {tsa.waitMinutes !== null && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${
                  tsa.level === "low"
                    ? "bg-emerald-950/40 border-emerald-700/50 text-emerald-400"
                    : tsa.level === "medium"
                    ? "bg-yellow-950/40 border-yellow-700/50 text-yellow-400"
                    : "bg-red-950/40 border-red-700/50 text-red-400"
                }`}>
                  <span>{tsa.level === "low" ? "🟢" : tsa.level === "medium" ? "🟡" : "🔴"}</span>
                  TSA ~{tsa.waitMinutes}min
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={status} className="text-sm px-3 py-1" />
            <LinkButton
              href={`https://www.flightaware.com/live/airport/${flight.originICAO}`}
              variant={hasIssue ? "orange" : "default"}
            >
              {locale === "en" ? `FlightAware · Flights from ${flight.originCode}` : `FlightAware · Vuelos de ${flight.originCode}`}
            </LinkButton>
          </div>
        </div>

        {hasIssue && (
          <div className="mt-2 rounded-lg bg-orange-950/40 border border-orange-800/40 px-3 py-2 text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
                {locale === "en" ? "FAA Live Alert" : "Alerta FAA en vivo"}
              </span>
              <a
                href={`https://www.flightaware.com/live/airport/${flight.originICAO}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-orange-500 hover:text-orange-300 transition-colors"
              >
                {locale === "en" ? "See on FlightAware ↗" : "Ver en FlightAware ↗"}
              </a>
            </div>
            {originStatus?.delays && (
              <p className="text-orange-200">
                <span className="font-bold">⚠️ {locale === "en" ? "Delay" : "Demora"}:</span>{" "}
                {formatMinutes(originStatus.delays.minMinutes)}–{formatMinutes(originStatus.delays.maxMinutes)}
                {originStatus.delays.trend && ` · ${locale === "en" ? "Trend" : "Tendencia"}: ${originStatus.delays.trend}`}
                <br />
                <span className="text-orange-400">{locale === "en" ? "Cause" : "Causa"}: {originStatus.delays.reason}</span>
              </p>
            )}
            {originStatus?.groundDelay && (
              <p className="text-red-200">
                <span className="font-bold">🔴 {locale === "en" ? "Ground Delay Program" : "Programa de Demora en Tierra"}:</span>{" "}
                {locale === "en" ? "Average" : "Promedio"} {formatMinutes(originStatus.groundDelay.avgMinutes)} · {locale === "en" ? "Max" : "Máx"} {originStatus.groundDelay.maxTime}
                <br />
                <span className="text-red-400">{locale === "en" ? "Cause" : "Causa"}: {originStatus.groundDelay.reason}</span>
              </p>
            )}
            {originStatus?.groundStop && (
              <p className="text-red-200">
                <span className="font-bold">🛑 {locale === "en" ? "Ground Stop" : "Paro en Tierra"}</span>{" "}
                {locale === "en" ? "until" : "hasta"} {originStatus.groundStop.endTime ?? (locale === "en" ? "indefinite" : "indefinido")}
                <br />
                <span className="text-red-400">{locale === "en" ? "Cause" : "Causa"}: {originStatus.groundStop.reason}</span>
              </p>
            )}
            {originStatus?.closure && (
              <p className="text-gray-200">
                <span className="font-bold">⛔ {locale === "en" ? "Airport Closed" : "Aeropuerto Cerrado"}</span>
                <br />
                <span className="text-gray-400">{locale === "en" ? "Cause" : "Causa"}: {originStatus.closure.reason}</span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* SECCIÓN 2: RUTA */}
      <div className="px-4 py-3 border-t border-white/[0.06]">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wider">
              {locale === "en" ? "Route" : "Ruta"}
            </p>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-bold text-white">{flight.originCode}</span>
              <Plane className="h-3.5 w-3.5 text-gray-600" />
              <span className="font-bold text-gray-400">{flight.destinationCode}</span>
              <span className="text-gray-600">·</span>
              <span className="text-gray-500 text-xs">{originName} → {destName}</span>
            </div>
          </div>
          <LinkButton href={flight.routeUrl} variant="default">
            {locale === "en" ? `Alternative flights ${flight.originCode}→${flight.destinationCode}` : `Vuelos alternativos ${flight.originCode}→${flight.destinationCode}`}
          </LinkButton>
        </div>
      </div>

      {/* SECCIÓN 3: MI VUELO */}
      <div className="px-4 py-3 border-t border-white/[0.06]">
        <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wider">
          {locale === "en" ? "My Flight" : "Mi vuelo"}
        </p>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-medium bg-gray-800 text-gray-300 px-2 py-0.5 rounded">
                {date}
              </span>
              <span className="font-bold text-white">{flight.flightNum}</span>
              <span className="text-xs text-gray-500">{flight.airline}</span>
            </div>
            <div className="flex items-center gap-4 flex-wrap text-xs">
              <span className="flex items-center gap-1.5 text-gray-400">
                <Clock className="h-3.5 w-3.5 text-gray-600" />
                {locale === "en" ? "Departs" : "Sale"} <span className="font-bold text-white ml-1">{flight.departureTime}</span>
              </span>
              <span className="flex items-start gap-1.5 text-gray-400">
                <MapPin className="h-3.5 w-3.5 text-yellow-600 shrink-0 mt-0.5" />
                <span>
                  {locale === "en" ? "Arrive at airport by" : "Llegar al aeropuerto:"}{" "}
                  <span className="font-bold text-yellow-400">{flight.arrivalRecommendation}</span>
                  <span className="text-gray-500 ml-1">({arrivalNote})</span>
                </span>
              </span>
            </div>
          </div>
          <LinkButton href={flight.flightUrl} variant="blue">
            {locale === "en" ? `Track flight ${flight.flightNum}` : `Rastrear vuelo ${flight.flightNum}`}
          </LinkButton>
        </div>
      </div>

      {/* SECCIÓN 4: PUERTA / TERMINAL */}
      {daysUntil >= 0 && (() => {
        const airlineAppUrl = AIRLINE_APP_URLS[airlineCode] ?? null;
        const isToday = daysUntil === 0;
        return (
          <div className={`px-4 py-3 border-t border-white/[0.06] ${isToday ? "bg-yellow-950/15" : ""}`}>
            <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wider flex items-center gap-1.5">
              <DoorOpen className="h-3 w-3" />
              {locale === "en" ? "Gate / Terminal" : "Puerta / Terminal"}
              {isToday && (
                <span className="ml-1 text-xs font-bold px-1.5 py-0.5 rounded border border-yellow-600/50 bg-yellow-900/40 text-yellow-400 animate-pulse">
                  LIVE
                </span>
              )}
            </p>
            {daysUntil > 3 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500">
                  {locale === "en"
                    ? "Gates typically assigned 24–48h before departure"
                    : "Las puertas se asignan 24–48h antes de la salida"}
                </p>
                <LinkButton href={flight.flightUrl} variant="blue">
                  {locale === "en" ? "Live status FlightAware" : "Estado en vivo FlightAware"}
                </LinkButton>
              </div>
            )}
            {daysUntil >= 1 && daysUntil <= 3 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500">
                  {locale === "en"
                    ? "Usually confirmed the day before · Verify at airport"
                    : "Se confirma normalmente el día anterior · Verificar en el aeropuerto"}
                </p>
                <LinkButton href={flight.flightUrl} variant="blue">
                  {locale === "en" ? "Live status FlightAware" : "Estado en vivo FlightAware"}
                </LinkButton>
              </div>
            )}
            {isToday && (
              <div className="space-y-2">
                <p className="text-xs text-yellow-300/80">
                  {locale === "en"
                    ? "Gates can change up to 30 min before boarding"
                    : "Las puertas pueden cambiar hasta 30 min antes del embarque"}
                </p>
                <p className="text-xs text-gray-500">
                  {locale === "en"
                    ? "Check airline app or airport departure board"
                    : "Verificar en app de la aerolínea o panel del aeropuerto"}
                </p>
                <div className="flex gap-2 flex-wrap">
                  <LinkButton href={flight.flightUrl} variant="blue">
                    {locale === "en" ? "Live status FlightAware" : "Estado en vivo FlightAware"}
                  </LinkButton>
                  {airlineAppUrl && (
                    <LinkButton href={airlineAppUrl} variant="default">
                      {locale === "en" ? "Airline app" : "App aerolínea"}
                    </LinkButton>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* SECCIÓN 5: Notas del vuelo */}
      <div className="border-t border-white/[0.05]">
        <button
          onClick={() => setShowNotes((v) => !v)}
          className="w-full flex items-center justify-between gap-3 px-4 py-2.5 tap-scale"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">🗒️</span>
            <span className="text-xs font-semibold text-gray-400">
              {locale === "es" ? "Mis notas del vuelo" : "My flight notes"}
            </span>
            {hasAnyNote && (
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
            )}
          </div>
          <ChevronDown className={`h-3.5 w-3.5 text-gray-600 transition-transform duration-200 ${showNotes ? "rotate-180" : ""}`} />
        </button>
        {showNotes && (
          <div className="px-4 pb-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-600 block mb-1">
                  {locale === "es" ? "Localizador / PNR" : "Locator / PNR"}
                </label>
                <input
                  type="text"
                  value={note.pnr}
                  onChange={(e) => updateNote("pnr", e.target.value)}
                  placeholder="XYZABC"
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-blue-600/60 focus:outline-none font-mono uppercase tracking-widest"
                  maxLength={8}
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-600 block mb-1">
                  {locale === "es" ? "Asiento" : "Seat"}
                </label>
                <input
                  type="text"
                  value={note.seat}
                  onChange={(e) => updateNote("seat", e.target.value)}
                  placeholder="12A"
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-blue-600/60 focus:outline-none font-mono uppercase tracking-widest"
                  maxLength={5}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-600 block mb-1">
                {locale === "es" ? "Notas" : "Notes"}
              </label>
              <textarea
                value={note.notes}
                onChange={(e) => updateNote("notes", e.target.value)}
                placeholder={locale === "es" ? "Hotel, transfer, equipaje..." : "Hotel, transfer, baggage..."}
                rows={2}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-blue-600/60 focus:outline-none resize-none leading-relaxed"
              />
            </div>
          </div>
        )}
      </div>

      {/* SECCIÓN 6: Estado vuelo en vivo */}
      <FlightStatusBadge
        flightIata={flight.flightNum.replace(/\s+/g, "")}
        isoDate={flight.isoDate}
        locale={locale}
      />

      </div>
      )}
    </div>
  );
}

interface MyFlightsPanelProps {
  statusMap: AirportStatusMap;
  weatherMap?: Record<string, WeatherData>;
}

export function MyFlightsPanel({ statusMap, weatherMap }: MyFlightsPanelProps) {
  const { t, locale } = useLanguage();
  const [showGcal, setShowGcal] = useState(false);
  const [waCopied, setWaCopied] = useState(false);
  const { flights: MY_FLIGHTS, loading: flightsLoading } = useMyFlights();
  const { notesMap, updateNote } = useFlightNotes();

  if (flightsLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-white/[0.04] border border-white/[0.06]" />
        ))}
      </div>
    );
  }

  if (MY_FLIGHTS.length === 0) {
    return <TripEmptyState locale={locale} />;
  }

  const calFlights: CalendarFlight[] = MY_FLIGHTS.map((f) => ({
    flightCode:      f.flightNum,
    originCode:      f.originCode,
    originCity:      locale === "en" ? f.originNameEn : f.originName,
    destinationCode: f.destinationCode,
    destinationCity: locale === "en" ? f.destinationNameEn : f.destinationName,
    isoDate:         f.isoDate,
    departureTime:   f.departureTime,
    airlineName:     f.airline,
    flightAwareUrl:  f.flightUrl,
  }));

  function handleExportICS() {
    downloadICS("mis-vuelos-2026.ics", generateICS(calFlights));
  }

  async function handleShareWhatsApp() {
    const waFlights: WhatsAppFlight[] = MY_FLIGHTS.map((f) => ({
      flightCode:      f.flightNum,
      airlineName:     f.airline,
      originCode:      f.originCode,
      originCity:      locale === "en" ? f.originNameEn : f.originName,
      destinationCode: f.destinationCode,
      destinationCity: locale === "en" ? f.destinationNameEn : f.destinationName,
      isoDate:         f.isoDate,
      departureTime:   f.departureTime,
      arrivalRec:      f.arrivalRecommendation,
    }));
    const msg = buildWhatsAppMessage(tripName, waFlights, locale);
    try {
      await navigator.clipboard.writeText(msg);
      setWaCopied(true);
      setTimeout(() => setWaCopied(false), 2500);
    } catch {
      window.open(buildWhatsAppURL(msg), "_blank", "noopener,noreferrer");
    }
  }

  const tripName = locale === "en" ? "My Flights 2026" : "Mis Vuelos 2026";

  // Determine if any "today" flight exists
  const todayFlight = MY_FLIGHTS.find((f) => getDaysUntil(f.isoDate) === 0);
  const airlineCode = todayFlight ? todayFlight.flightNum.split(" ")[0] : null;

  // Index of the next upcoming flight (first with daysUntil >= 0)
  const nextFlightIndex = MY_FLIGHTS.findIndex((f) => getDaysUntil(f.isoDate) >= 0);

  return (
    <div className="space-y-5">

      {/* 1. Day-of-travel emergency mode */}
      {todayFlight && airlineCode && (
        <DayOfTravelBanner
          flightNum={todayFlight.flightNum}
          airline={todayFlight.airline}
          originCode={todayFlight.originCode}
          destinationCode={todayFlight.destinationCode}
          departureTime={todayFlight.departureTime}
          flightUrl={todayFlight.flightUrl}
          airlineCode={airlineCode}
          locale={locale}
        />
      )}

      {/* 2. Trip summary hero — status + next flight */}
      <TripSummaryHero statusMap={statusMap} locale={locale} flights={MY_FLIGHTS} />

      {/* 3. Flight cards — primary content, shown first */}
      <div className="space-y-5">
        {MY_FLIGHTS.map((flight, idx) => (
          <div
            key={`${flight.flightNum}-${flight.isoDate}`}
            id={`flight-card-${idx}`}
            className="animate-fade-in-up"
            style={{ animationDelay: `${idx * 0.05}s` }}
          >
            <FlightCardItem
              flight={flight}
              statusMap={statusMap}
              weatherMap={weatherMap}
              locale={locale}
              index={idx}
              isNext={idx === nextFlightIndex}
              note={notesMap[`${flight.flightNum.replace(/\s+/g, "")}-${flight.isoDate}`] ?? { pnr: "", seat: "", notes: "" }}
              onUpdateNote={updateNote}
            />
          </div>
        ))}
      </div>

      {/* 4. Timeline — visual overview after reading individual flights */}
      <TripTimeline
        flights={MY_FLIGHTS.map((f) => ({
          originCode: f.originCode,
          destinationCode: f.destinationCode,
          isoDate: f.isoDate,
          flightCode: f.flightNum,
          departureTime: f.departureTime,
        }))}
        statusMap={statusMap}
      />

      {/* 5. Action bar — export / share utilities */}
      <div className="flex items-center justify-end flex-wrap gap-2">
          {/* ICS */}
          <button
            onClick={handleExportICS}
            className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800/60 text-gray-300 hover:bg-gray-700/60 hover:text-white px-3 py-1.5 text-xs font-medium transition-all"
          >
            <Calendar className="h-3.5 w-3.5" />
            {locale === "en" ? "Export .ics" : "Exportar .ics"}
          </button>
          {/* Google Calendar dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowGcal((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800/60 text-gray-300 hover:bg-gray-700/60 hover:text-white px-3 py-1.5 text-xs font-medium transition-all"
            >
              <Calendar className="h-3.5 w-3.5 text-blue-400" />
              Google Cal
            </button>
            {showGcal && (
              <div className="absolute top-full mt-1 right-0 z-20 min-w-[220px] rounded-lg border border-gray-700 bg-gray-900 shadow-xl py-1">
                {calFlights.map((cf, i) => (
                  <a
                    key={i}
                    href={buildGoogleCalendarURL(cf)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowGcal(false)}
                    className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                  >
                    <span>
                      <span className="font-semibold">{cf.flightCode}</span>
                      <span className="text-gray-500 ml-1">{cf.originCode}→{cf.destinationCode}</span>
                    </span>
                    <span className="text-gray-500 shrink-0">
                      {new Date(cf.isoDate + "T00:00:00").toLocaleDateString(locale === "en" ? "en-US" : "es-AR", { day: "numeric", month: "short" })}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
          {/* WhatsApp */}
          <button
            onClick={handleShareWhatsApp}
            className="flex items-center gap-1.5 rounded-lg border border-green-800/60 bg-green-900/20 text-green-400 hover:bg-green-900/40 hover:text-green-300 px-3 py-1.5 text-xs font-medium transition-all"
          >
            <Share2 className="h-3.5 w-3.5" />
            {waCopied
              ? (locale === "en" ? "Copied! Paste in WhatsApp" : "¡Copiado! Pegalo en WhatsApp")
              : "WhatsApp"}
          </button>
          <LinkButton href="https://nasstatus.faa.gov" variant="blue">
            <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
            {t.faaButton}
          </LinkButton>
      </div>

      {/* 6. TripCopilot — AI travel guide, collapsed by default */}
      <TripCopilot flights={MY_FLIGHTS} locale={locale} tripName={tripName} statusMap={statusMap} weatherMap={weatherMap} />

      {/* 7. Trip clocks — secondary detail */}
      <TripClocks locale={locale} />

      <p className="text-xs text-gray-500 pt-1">{t.flightLinkNote}</p>
    </div>
  );
}
