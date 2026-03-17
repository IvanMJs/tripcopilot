"use client";

import { useState } from "react";
import { AirportStatusMap } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
import { ExternalLink, Clock, MapPin, Plane, AlertTriangle, Calendar, Share2, DoorOpen } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { WeatherData } from "@/hooks/useWeather";
import { TripTimeline } from "./TripTimeline";
import { CalendarFlight, generateICS, downloadICS, buildGoogleCalendarURL } from "@/lib/calendarExport";
import { buildWhatsAppMessage, buildWhatsAppURL, WhatsAppFlight } from "@/lib/tripShare";
import { FlightStatusBadge } from "@/components/FlightStatusBadge";
import { useTsaWait, TsaAirportData } from "@/hooks/useTsaWait";

interface FlightData {
  date: string;
  dateEn: string;
  isoDate: string;
  flightNum: string;
  airline: string;
  originCode: string;
  originName: string;
  originNameEn: string;
  originICAO: string;
  destinationCode: string;
  destinationName: string;
  destinationNameEn: string;
  destinationICAO: string;
  departureTime: string;
  arrivalRecommendation: string;
  arrivalNoteEs: string;
  arrivalNoteEn: string;
  flightUrl: string;
  routeUrl: string;
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
    : `${days} día${days > 1 ? "s" : ""}`;

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

const MY_FLIGHTS: FlightData[] = [
  {
    date: "29 Mar", dateEn: "Mar 29", isoDate: "2026-03-29",
    flightNum: "AA 900", airline: "American Airlines",
    originCode: "EZE", originName: "Buenos Aires", originNameEn: "Buenos Aires", originICAO: "SAEZ",
    destinationCode: "MIA", destinationName: "Miami", destinationNameEn: "Miami", destinationICAO: "KMIA",
    departureTime: "20:30",
    arrivalRecommendation: "17:30",
    arrivalNoteEs: "3 hs antes — internacional + migraciones EZE",
    arrivalNoteEn: "3 hrs before — international + EZE immigration",
    flightUrl: "https://www.flightaware.com/live/flight/AAL900",
    routeUrl: "https://www.google.com/travel/flights?q=flights+from+EZE+to+MIA",
  },
  {
    date: "31 Mar", dateEn: "Mar 31", isoDate: "2026-03-31",
    flightNum: "AA 956", airline: "American Airlines",
    originCode: "MIA", originName: "Miami", originNameEn: "Miami", originICAO: "KMIA",
    destinationCode: "GCM", destinationName: "Grand Cayman", destinationNameEn: "Grand Cayman", destinationICAO: "MWCR",
    departureTime: "12:55",
    arrivalRecommendation: "10:55",
    arrivalNoteEs: "2 hs antes — internacional desde MIA",
    arrivalNoteEn: "2 hrs before — international from MIA",
    flightUrl: "https://www.flightaware.com/live/flight/AAL956",
    routeUrl: "https://www.google.com/travel/flights?q=flights+from+MIA+to+GCM",
  },
  {
    date: "05 Abr", dateEn: "Apr 5", isoDate: "2026-04-05",
    flightNum: "B6 766", airline: "JetBlue Airways",
    originCode: "GCM", originName: "Grand Cayman", originNameEn: "Grand Cayman", originICAO: "MWCR",
    destinationCode: "JFK", destinationName: "New York", destinationNameEn: "New York", destinationICAO: "KJFK",
    departureTime: "15:40",
    arrivalRecommendation: "13:10",
    arrivalNoteEs: "2.5 hs antes — GCM pequeño, vuelo internacional",
    arrivalNoteEn: "2.5 hrs before — GCM small airport, international flight",
    flightUrl: "https://www.flightaware.com/live/flight/JBU766",
    routeUrl: "https://www.google.com/travel/flights?q=flights+from+GCM+to+JFK",
  },
  {
    date: "11 Abr", dateEn: "Apr 11", isoDate: "2026-04-11",
    flightNum: "DL 1514", airline: "Delta Air Lines",
    originCode: "JFK", originName: "New York", originNameEn: "New York", originICAO: "KJFK",
    destinationCode: "MIA", destinationName: "Miami", destinationNameEn: "Miami", destinationICAO: "KMIA",
    departureTime: "11:10",
    arrivalRecommendation: "09:10",
    arrivalNoteEs: "2 hs antes — doméstico USA, JFK es grande",
    arrivalNoteEn: "2 hrs before — domestic US, JFK is large",
    flightUrl: "https://www.flightaware.com/live/flight/DAL1514",
    routeUrl: "https://www.google.com/travel/flights?q=flights+from+JFK+to+MIA",
  },
  {
    date: "11 Abr", dateEn: "Apr 11", isoDate: "2026-04-11",
    flightNum: "AA 931", airline: "American Airlines",
    originCode: "MIA", originName: "Miami", originNameEn: "Miami", originICAO: "KMIA",
    destinationCode: "EZE", destinationName: "Buenos Aires", destinationNameEn: "Buenos Aires", destinationICAO: "SAEZ",
    departureTime: "21:15",
    arrivalRecommendation: "18:15",
    arrivalNoteEs: "3 hs antes — internacional largo + migraciones USA",
    arrivalNoteEn: "3 hrs before — long international + US immigration",
    flightUrl: "https://www.flightaware.com/live/flight/AAL931",
    routeUrl: "https://www.google.com/travel/flights?q=flights+from+MIA+to+EZE",
  },
];

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

interface FlightCardItemProps {
  flight: FlightData;
  statusMap: AirportStatusMap;
  weatherMap?: Record<string, WeatherData>;
  locale: "es" | "en";
  tsaData?: TsaAirportData;
}

function FlightCardItem({ flight, statusMap, weatherMap, locale, tsaData }: FlightCardItemProps) {
  const originStatus = statusMap[flight.originCode];
  const status = originStatus?.status ?? "ok";
  const hasIssue = status !== "ok";
  const date = locale === "en" ? flight.dateEn : flight.date;
  const originName = locale === "en" ? flight.originNameEn : flight.originName;
  const destName   = locale === "en" ? flight.destinationNameEn : flight.destinationName;
  const arrivalNote = locale === "en" ? flight.arrivalNoteEn : flight.arrivalNoteEs;
  const daysUntil = getDaysUntil(flight.isoDate);
  const airlineCode = flight.flightNum.split(" ")[0];

  return (
    <div
      className={`rounded-xl border-2 overflow-hidden transition-all ${
        hasIssue ? "border-orange-600/50" : "border-gray-800"
      }`}
    >
      {/* Check-in banner */}
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

      {/* SECCIÓN 1: AEROPUERTO */}
      <div className={`px-4 py-3 ${hasIssue ? "bg-orange-950/30" : "bg-gray-900/60"}`}>
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
            {weatherMap?.[flight.originCode] && (
              <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400">
                <span className="text-sm leading-none">{weatherMap[flight.originCode].icon}</span>
                <span className="font-medium text-gray-300">{weatherMap[flight.originCode].temperature}°C</span>
                <span>{weatherMap[flight.originCode].description}</span>
              </div>
            )}
            {tsaData && tsaData.avgWaitTime > 0 && (
              <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
                <span>🛡️</span>
                <span>{locale === "en" ? "TSA avg wait:" : "Espera TSA prom:"}</span>
                <span className={`font-semibold ${
                  tsaData.avgWaitTime <= 15 ? "text-emerald-400" :
                  tsaData.avgWaitTime <= 30 ? "text-yellow-400" : "text-orange-400"
                }`}>{tsaData.avgWaitTime} min</span>
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
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400">
                {locale === "en" ? "FAA Live Alert" : "Alerta FAA en vivo"}
              </span>
              <a
                href={`https://www.flightaware.com/live/airport/${flight.originICAO}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] text-orange-500 hover:text-orange-300 transition-colors"
              >
                {locale === "en" ? "See on FlightAware ↗" : "Ver en FlightAware ↗"}
              </a>
            </div>
            {originStatus?.delays && (
              <p className="text-orange-200">
                <span className="font-bold">⚠️ {locale === "en" ? "Delay" : "Demora"}:</span>{" "}
                {originStatus.delays.minMinutes}–{originStatus.delays.maxMinutes} min
                {originStatus.delays.trend && ` · ${locale === "en" ? "Trend" : "Tendencia"}: ${originStatus.delays.trend}`}
                <br />
                <span className="text-orange-400">{locale === "en" ? "Cause" : "Causa"}: {originStatus.delays.reason}</span>
              </p>
            )}
            {originStatus?.groundDelay && (
              <p className="text-red-200">
                <span className="font-bold">🔴 {locale === "en" ? "Ground Delay Program" : "Programa de Demora en Tierra"}:</span>{" "}
                {locale === "en" ? "Average" : "Promedio"} {originStatus.groundDelay.avgMinutes} min · {locale === "en" ? "Max" : "Máx"} {originStatus.groundDelay.maxTime}
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
      <div className="px-4 py-3 border-t border-gray-800 bg-gray-900/30">
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
      <div className="px-4 py-3 border-t border-gray-800 bg-gray-950/40">
        <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wider">
          {locale === "en" ? "My Flight" : "Mi vuelo"}
        </p>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-medium bg-gray-800 text-gray-300 px-2 py-0.5 rounded">
                {date}
              </span>
              <DaysCountdown days={daysUntil} locale={locale} />
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
            {locale === "en" ? `Track flight ${flight.flightNum}` : `Tracking vuelo ${flight.flightNum}`}
          </LinkButton>
        </div>
      </div>

      {/* SECCIÓN 4: PUERTA / TERMINAL */}
      {daysUntil >= 0 && (() => {
        const airlineAppUrl = AIRLINE_APP_URLS[airlineCode] ?? null;
        const isToday = daysUntil === 0;
        return (
          <div className={`px-4 py-3 border-t border-gray-800 ${isToday ? "bg-yellow-950/15" : ""}`}>
            <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wider flex items-center gap-1.5">
              <DoorOpen className="h-3 w-3" />
              {locale === "en" ? "Gate / Terminal" : "Puerta / Terminal"}
              {isToday && (
                <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded border border-yellow-600/50 bg-yellow-900/40 text-yellow-400 animate-pulse">
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

      {/* SECCIÓN 5: Estado vuelo en vivo */}
      <FlightStatusBadge
        flightIata={flight.flightNum.replace(/\s+/g, "")}
        isoDate={flight.isoDate}
        locale={locale}
      />
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
  const tsaData = useTsaWait();

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
    const tripName = locale === "en" ? "My Flights 2026" : "Mis Vuelos 2026";
    const msg = buildWhatsAppMessage(tripName, waFlights, locale);
    try {
      await navigator.clipboard.writeText(msg);
      setWaCopied(true);
      setTimeout(() => setWaCopied(false), 2500);
    } catch {
      window.open(buildWhatsAppURL(msg), "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-gray-500">{t.trip}</p>
        <div className="flex items-center gap-2 flex-wrap">
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
      </div>

      {/* Timeline */}
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

      {/* Vuelos */}
      <div className="space-y-4">
        {MY_FLIGHTS.map((flight, idx) => (
          <div
            key={`${flight.flightNum}-${flight.isoDate}`}
            id={`flight-card-${idx}`}
            className="animate-fade-in-up"
            style={{ animationDelay: `${idx * 0.08}s` }}
          >
            <FlightCardItem
              flight={flight}
              statusMap={statusMap}
              weatherMap={weatherMap}
              locale={locale}
              tsaData={tsaData[flight.originCode]}
            />
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500 pt-1">{t.flightLinkNote}</p>
    </div>
  );
}
