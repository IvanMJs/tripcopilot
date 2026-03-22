"use client";

import { useState, useRef, useCallback } from "react";
import {
  ExternalLink, Clock, MapPin, Plane,
  AlertTriangle, Globe, Zap, DoorOpen, Trash2,
  Hotel, Radar, Bell, ChevronDown, ChevronUp, Pencil, CalendarPlus,
} from "lucide-react";
import { useNotificationLog } from "@/hooks/useNotificationLog";
import { useFlightNotes } from "@/hooks/useFlightNotes";
import { AirportStatusMap, TripFlight, Accommodation } from "@/lib/types";
import { AIRPORTS } from "@/lib/airports";
import { subtractHours, buildArrivalNote } from "@/lib/flightUtils";
import { StatusBadge } from "./StatusBadge";
import { WeatherData } from "@/hooks/useWeather";
import { TafData, getTafAtTime } from "@/hooks/useTaf";
import { SigmetFeature } from "@/hooks/useSigmet";
import { LinkButton } from "./LinkButton";
import { AccommodationInline, AddAccommodationInlineForm, estimateArrivalDate } from "./AccommodationCard";
import { buildGoogleCalendarUrl } from "@/lib/exportGoogleCalendar";
import { ConnectionAnalysis } from "@/lib/connectionRisk";
import { FlightStatusBadge } from "@/components/FlightStatusBadge";
import { TsaAirportData } from "@/hooks/useTsaWait";
import { TRIP_PANEL_LABELS, AIRLINE_APP_URLS, TripPanelLabels } from "./TripPanelLabels";
import { getVisaRequirement } from "@/lib/visaRequirements";
import { BoardingPassView } from "./BoardingPassView";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import { formatRelativeDate } from "@/lib/formatDate";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTzAbbr(timezone: string, isoDate: string): string {
  try {
    const d = new Date(`${isoDate}T12:00:00`);
    return (
      new Intl.DateTimeFormat("en-US", { timeZone: timezone, timeZoneName: "short" })
        .formatToParts(d)
        .find((p) => p.type === "timeZoneName")?.value ?? ""
    );
  } catch {
    return "";
  }
}

function getDaysUntil(isoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const flight = new Date(isoDate + "T00:00:00");
  return Math.ceil((flight.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function DaysCountdown({ days, L }: { days: number; L: TripPanelLabels }) {
  if (days < 0) {
    return (
      <span className="text-xs font-medium px-2 py-0.5 rounded-full border border-white/6 bg-white/4 text-gray-500">
        {L.completed}
      </span>
    );
  }
  if (days === 0) {
    return (
      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-900/60 border border-red-700/50 text-red-300 animate-pulse">
        {L.today}
      </span>
    );
  }
  const cls = days <= 7
    ? "bg-yellow-900/40 border-yellow-700/40 text-yellow-300"
    : "bg-emerald-900/30 border-emerald-700/30 text-emerald-300";
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cls}`}>
      {L.days(days)}
    </span>
  );
}

// ── FlightCard ────────────────────────────────────────────────────────────────

export interface FlightCardProps {
  flight: TripFlight;
  statusMap: AirportStatusMap;
  weatherMap: Record<string, WeatherData>;
  locale: "es" | "en";
  onRemove: () => void;
  idx: number;
  connectionToNext?: ConnectionAnalysis;
  nextDestination?: string;
  nextDate?: string;
  tafData?: TafData;
  activeSigmets?: SigmetFeature[];
  tsaData?: TsaAirportData;
  accommodation?: Accommodation | null;
  onAddAccommodation: (data: { name: string; checkInTime?: string; checkOutTime?: string; confirmationCode?: string; address?: string }) => void;
  onRemoveAccommodation: () => void;
  onEditAccommodation: (name: string, checkInTime?: string, checkOutTime?: string, confirmationCode?: string, address?: string) => void;
}

function ExchangeRateRow({ destinationCode }: { destinationCode: string }) {
  const result = useExchangeRate(destinationCode);
  if (!result || result.loading || result.error || result.rate === null) return null;

  // Format the rate — for currencies with very small rates (e.g. JPY, KRW) show more decimals
  const formatted = result.rate < 0.001
    ? result.rate.toFixed(6)
    : result.rate < 0.01
    ? result.rate.toFixed(5)
    : result.rate < 0.1
    ? result.rate.toFixed(4)
    : result.rate.toFixed(4);

  return (
    <span className="text-xs text-gray-500">
      1 ARS = {formatted} {result.currency}
    </span>
  );
}

export function FlightCard({
  flight,
  statusMap,
  weatherMap,
  locale,
  onRemove,
  idx,
  connectionToNext,
  nextDestination,
  nextDate,
  tafData,
  activeSigmets,
  tsaData,
  accommodation,
  onAddAccommodation,
  onRemoveAccommodation,
  onEditAccommodation,
}: FlightCardProps) {
  const L = TRIP_PANEL_LABELS[locale];
  const [showHotelForm, setShowHotelForm] = useState(false);
  const [showNotifLog, setShowNotifLog] = useState(false);
  const [showBoardingPass, setShowBoardingPass] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Removal animation state
  const [removing, setRemoving] = useState(false);
  const handleRemove = useCallback(() => {
    setRemoving(true);
    setTimeout(() => onRemove?.(), 280);
  }, [onRemove]);

  // Swipe-to-delete state
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartX = useRef<number>(0);
  const isSwiping = useRef(false);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    isSwiping.current = true;
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!isSwiping.current) return;
    const delta = touchStartX.current - e.touches[0].clientX;
    if (delta > 0) {
      setSwipeOffset(Math.min(delta, 100));
    } else {
      setSwipeOffset(0);
    }
  }

  function handleTouchEnd() {
    isSwiping.current = false;
    if (swipeOffset >= 80) {
      setSwipeOffset(80); // stay open to reveal button
    } else {
      setSwipeOffset(0); // snap back
    }
  }

  function handleDeleteTap() {
    setSwipeOffset(0);
    handleRemove();
  }
  const { logs: notifLogs, loading: notifLoading } = useNotificationLog(flight.id, showNotifLog);

  // Flight notes
  const flightKey = flight.id;
  const { notesMap, updateNote } = useFlightNotes();
  const currentNote = notesMap[flightKey]?.notes ?? "";
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState("");
  const noteTextareaRef = useRef<HTMLTextAreaElement>(null);

  const originInfo  = AIRPORTS[flight.originCode];
  const destInfo    = AIRPORTS[flight.destinationCode];
  const originIcao  = originInfo?.icao ?? `K${flight.originCode}`;
  const originName  = originInfo?.city || flight.originCode;
  const destName    = destInfo?.city   || flight.destinationCode;
  const checkInDate = estimateArrivalDate(flight.isoDate, flight.departureTime, flight.arrivalBuffer);
  const isNonFAA    = originInfo?.isFAA === false;

  const flightUrl   = `https://www.flightaware.com/live/flight/${flight.airlineIcao}${flight.flightNumber}`;
  const routeUrl    = `https://www.google.com/travel/flights?q=flights+from+${flight.originCode}+to+${flight.destinationCode}`;
  const airportUrl  = `https://www.flightaware.com/live/airport/${originIcao}`;

  const arrivalRec  = flight.departureTime ? subtractHours(flight.departureTime, flight.arrivalBuffer) : null;
  const arrivalNote = flight.departureTime ? buildArrivalNote(flight.arrivalBuffer, locale) : null;
  const originTz    = originInfo?.timezone ?? "UTC";
  const tzAbbr      = flight.departureTime ? getTzAbbr(originTz, flight.isoDate) : "";

  const dateLabel = formatRelativeDate(flight.isoDate, locale);
  const daysUntil = getDaysUntil(flight.isoDate);

  // Hours until departure (for boarding pass trigger)
  const hoursUntilDep = (() => {
    if (!flight.departureTime || !flight.isoDate) return null;
    const tz = originInfo?.timezone ?? "UTC";
    try {
      const [h, m] = flight.departureTime.split(":").map(Number);
      const refMs = Date.UTC(
        parseInt(flight.isoDate.slice(0, 4)),
        parseInt(flight.isoDate.slice(5, 7)) - 1,
        parseInt(flight.isoDate.slice(8, 10)),
        h, m, 0,
      );
      const tzParts = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        year: "numeric", month: "numeric", day: "numeric",
        hour: "numeric", minute: "numeric", second: "numeric",
        hour12: false,
      }).formatToParts(new Date(refMs));
      const get = (type: string) =>
        parseInt(tzParts.find((p) => p.type === type)?.value ?? "0");
      const tzHour = get("hour") % 24;
      const tzMin  = get("minute");
      const offsetMin = (h * 60 + m) - (tzHour * 60 + tzMin);
      const midnightUTC = Date.UTC(
        parseInt(flight.isoDate.slice(0, 4)),
        parseInt(flight.isoDate.slice(5, 7)) - 1,
        parseInt(flight.isoDate.slice(8, 10)),
      );
      const depMs = midnightUTC + (h * 60 + m + offsetMin) * 60000;
      return (depMs - Date.now()) / (1000 * 60 * 60);
    } catch {
      return null;
    }
  })();

  const showBoardingPassButton =
    hoursUntilDep !== null && hoursUntilDep < 4 && hoursUntilDep > -1;

  const originStatus = statusMap[flight.originCode];
  const status       = originStatus?.status ?? "ok";
  const hasIssue     = status !== "ok";
  const weather      = weatherMap[flight.originCode];
  const isImminent   = daysUntil >= 0 && daysUntil <= 1;

  const relevantTafPeriod = (() => {
    if (!tafData || !flight.departureTime || !flight.isoDate) return null;
    const depUnix = Math.floor(new Date(`${flight.isoDate}T${flight.departureTime}:00`).getTime() / 1000);
    if (isNaN(depUnix) || depUnix === 0) return null;
    return getTafAtTime(tafData, depUnix);
  })();

  return (
    <div
      id={`flight-card-${idx}`}
      className={`relative rounded-xl border-2 overflow-hidden transition-all animate-fade-in-up ${
        connectionToNext && connectionToNext.risk === "missed"   ? "border-red-700/60"    :
        connectionToNext && connectionToNext.risk === "at_risk"  ? "border-orange-600/60" :
        connectionToNext && connectionToNext.risk === "tight"    ? "border-yellow-700/50" :
        hasIssue                                                  ? "border-orange-600/50" :
        isImminent                                               ? "border-blue-700/40"   :
        "border-white/6"
      } ${removing ? "opacity-0 -translate-x-6 scale-95" : "opacity-100 translate-x-0 scale-100"}`}
      style={{ animationDelay: `${idx * 0.08}s` }}
    >
      {/* Swipe-to-delete: delete button revealed behind card */}
      <button
        onClick={handleDeleteTap}
        aria-label={locale === "es" ? "Eliminar vuelo" : "Delete flight"}
        className="absolute inset-y-0 right-0 bg-red-600 flex items-center px-4 rounded-r-xl z-0 transition-opacity"
        style={{ opacity: swipeOffset >= 80 ? 1 : swipeOffset / 80 }}
      >
        <Trash2 className="h-5 w-5 text-white" />
      </button>

      {/* Card content — slides left on swipe */}
      <div
        className="relative z-10 transition-transform duration-150"
        style={{ transform: `translateX(-${swipeOffset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
      {/* ── Boarding-pass header (always visible) ─────────────────────────── */}
      <div className={`px-4 pt-3 pb-2 ${hasIssue ? "bg-orange-950/20" : "bg-white/[0.02]"}`}>
        {/* Row 1: flight code + status badge + remove */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Plane className="h-3.5 w-3.5 text-gray-500" />
            <span className="text-sm font-bold tracking-wide text-white">{flight.flightCode}</span>
            {flight.airlineName && (
              <span className="text-[11px] text-gray-500 truncate max-w-[120px]">{flight.airlineName}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {isNonFAA && !originStatus ? (
              <span title={L.internationalNote}><Globe className="h-4 w-4 text-blue-400/70" /></span>
            ) : (
              <StatusBadge status={status} className="text-sm px-3 py-1" />
            )}
            <button
              onClick={handleRemove}
              title={L.removeTitle}
              className="rounded-lg p-1.5 text-red-600 hover:text-red-400 hover:bg-red-950/40 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Row 2: EZE → MIA with times */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 mb-2">
          {/* Origin */}
          <div>
            <p className="text-2xl font-bold font-mono text-white leading-none">{flight.originCode}</p>
            {flight.departureTime && (
              <p className="text-lg font-semibold tabular-nums text-white mt-0.5">{flight.departureTime}</p>
            )}
            <p className="text-xs text-gray-400 mt-0.5 truncate">{originName}</p>
          </div>

          {/* Arrow */}
          <div className="flex flex-col items-center gap-0.5 px-1">
            <Plane className="w-4 h-4 text-gray-500 rotate-90" />
          </div>

          {/* Destination */}
          <div className="text-right">
            <p className="text-2xl font-bold font-mono text-white leading-none">{flight.destinationCode}</p>
            {(flight.arrivalTime || flight.arrivalDate) && (
              <p className="text-lg font-semibold tabular-nums text-white mt-0.5">
                {flight.arrivalTime ?? ""}
                {flight.arrivalDate && flight.arrivalDate !== flight.isoDate && (
                  <sup className="text-xs text-gray-400 ml-0.5">+1</sup>
                )}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-0.5 truncate">{destName}</p>
          </div>
        </div>

        {/* Row 3: bottom strip */}
        <div className="border-t border-white/5 pt-2 flex items-center gap-2 flex-wrap text-[11px] text-gray-500">
          <DaysCountdown days={daysUntil} L={L} />
          {flight.departureTime && (
            <span className="tabular-nums">
              {daysUntil === 0
                ? (locale === "es" ? "Hoy" : "Today")
                : daysUntil === 1
                ? (locale === "es" ? "Mañana" : "Tomorrow")
                : new Date(flight.isoDate + "T00:00:00").toLocaleDateString(
                    locale === "en" ? "en-US" : "es-AR",
                    { day: "2-digit", month: locale === "en" ? "short" : "2-digit" },
                  )}{" "}
              {flight.departureTime}
            </span>
          )}
          {flight.airlineName && (
            <>
              <span className="text-gray-700">·</span>
              <span>{flight.airlineName}</span>
            </>
          )}
        </div>
      </div>

      {/* ── Chevron toggle ─────────────────────────────────────────────────── */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex justify-center items-center py-1.5 text-gray-600 hover:text-gray-400 transition-colors border-t border-white/5 mt-0"
        aria-label={expanded ? (locale === "es" ? "Colapsar detalles" : "Collapse details") : (locale === "es" ? "Ver detalles" : "View details")}
      >
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
      </button>

      {/* ── Collapsible detail sections ────────────────────────────────────── */}
      <div className={`overflow-hidden transition-all duration-300 ease-out ${expanded ? "max-h-[1200px] opacity-100" : "max-h-0 opacity-0"}`}>

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
                  ? `Your flight ${flight.flightCode} departs tomorrow`
                  : `Tu vuelo ${flight.flightCode} sale mañana`}
              </p>
            </div>
          </div>
          {AIRLINE_APP_URLS[flight.airlineCode] && (
            <a
              href={AIRLINE_APP_URLS[flight.airlineCode]}
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

      {/* SECTION 1: Airport */}
      <div className={`px-4 py-3 border-t border-white/5 ${hasIssue ? "bg-orange-950/20" : "bg-white/[0.02]"}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {hasIssue && <AlertTriangle className="h-4 w-4 text-orange-400 shrink-0" />}
              {isNonFAA && <Globe className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                {L.sectionAirport}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white tracking-tight font-mono">{flight.originCode}</span>
              <span className="text-sm text-gray-400">{originName}</span>
              {originInfo?.country && (
                <span className="text-xs text-gray-500">{originInfo.country}</span>
              )}
            </div>
            {weather && (
              <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
                <span className="text-sm leading-none">{weather.icon}</span>
                <span className="font-semibold text-gray-300">{weather.temperature}°C</span>
                <span>{weather.description}</span>
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
          <div className="flex flex-col items-end gap-2 shrink-0">
            <LinkButton href={airportUrl} variant={hasIssue ? "orange" : "default"}>
              FlightAware
            </LinkButton>
          </div>
        </div>

        {hasIssue && (
          <div className="mt-3 rounded-xl bg-orange-950/30 border border-orange-800/30 px-3 py-2.5 text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1">
                <Zap className="h-3 w-3" />
                {locale === "en" ? "FAA Live Alert" : "Alerta FAA en vivo"}
              </span>
              <a href={airportUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs text-orange-500/70 hover:text-orange-400 transition-colors">
                FlightAware ↗
              </a>
            </div>
            {originStatus?.delays && (
              <p className="text-orange-200">
                ⚠️ {originStatus.delays.minMinutes}–{originStatus.delays.maxMinutes} min
                {" · "}{originStatus.delays.reason}
              </p>
            )}
            {originStatus?.groundDelay && (
              <p className="text-red-200">
                🔴 avg {originStatus.groundDelay.avgMinutes} min · {originStatus.groundDelay.reason}
              </p>
            )}
            {originStatus?.groundStop && (
              <p className="text-red-200">
                🛑 {locale === "en" ? "until" : "hasta"} {originStatus.groundStop.endTime ?? "?"}{" "}
                · {originStatus.groundStop.reason}
              </p>
            )}
            {originStatus?.closure && (
              <p className="text-gray-200">⛔ {originStatus.closure.reason}</p>
            )}
          </div>
        )}
      </div>

      {/* SECTION 2: Route */}
      <div className="px-4 py-3 border-t border-white/5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">
              {L.sectionRoute}
            </p>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-bold text-white font-mono">{flight.originCode}</span>
              <Plane className="h-3.5 w-3.5 text-gray-700" />
              <span className="font-bold text-gray-400 font-mono">{flight.destinationCode}</span>
              <span className="text-gray-700">·</span>
              <span className="text-gray-500 text-xs">{originName} → {destName}</span>
            </div>
            {/* Visa indicator */}
            {(() => {
              const visa = getVisaRequirement(flight.destinationCode);
              if (!visa) return null;
              return visa.required ? (
                <span className="text-xs text-amber-400">🛂 {visa.notes}</span>
              ) : (
                <span className="text-xs text-green-400">✅ {visa.notes}</span>
              );
            })()}
            {/* Exchange rate */}
            <ExchangeRateRow destinationCode={flight.destinationCode} />
          </div>
          <LinkButton href={routeUrl} variant="default">
            {L.seeOtherFlights(flight.originCode, flight.destinationCode)}
          </LinkButton>
        </div>
      </div>

      {/* SECTION 3: My flight */}
      <div className="px-4 py-3 border-t border-white/5 bg-white/[0.01]">
        <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wider">
          {L.sectionFlight}
        </p>
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-medium px-2 py-0.5 rounded-md border border-white/8 bg-white/4 text-gray-300">
              {dateLabel}
            </span>
            <DaysCountdown days={daysUntil} L={L} />
            <span className="font-bold text-white tracking-wide">{flight.flightCode}</span>
            <span className="text-xs text-gray-500">{flight.airlineName}</span>
            <a
              href={buildGoogleCalendarUrl(flight)}
              target="_blank"
              rel="noopener noreferrer"
              title={locale === "es" ? "Agregar a Google Calendar" : "Add to Google Calendar"}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-400/70 hover:text-blue-300 transition-colors"
            >
              <CalendarPlus className="h-3.5 w-3.5" />
            </a>
          </div>
          {flight.departureTime && (
            <div className="flex items-center gap-4 flex-wrap text-xs">
              <span className="flex items-center gap-1.5 text-gray-400">
                <Clock className="h-3.5 w-3.5 text-gray-600" />
                {L.departs}{" "}
                <span className="font-bold text-white ml-1 tabular-nums">{flight.departureTime}</span>
                {tzAbbr && (
                  <span className="text-xs font-medium text-gray-500 bg-white/5 border border-white/8 rounded px-1 py-0.5">
                    {tzAbbr}
                  </span>
                )}
              </span>
              {arrivalRec && (
                <span className="flex items-start gap-1.5 text-gray-400">
                  <MapPin className="h-3.5 w-3.5 text-yellow-600 shrink-0 mt-0.5" />
                  <span>
                    {L.arriveAt}{" "}
                    <span className="font-bold text-yellow-400 tabular-nums">{arrivalRec}</span>
                    <span className="text-gray-500 ml-1">({arrivalNote})</span>
                  </span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3n: Flight notes */}
      <div className="px-4 py-2.5 border-t border-white/5">
        {currentNote && !showNoteInput && (
          <div className="flex items-start gap-1.5 mb-1.5">
            <Pencil className="h-3 w-3 text-gray-600 shrink-0 mt-0.5" />
            <p className="text-xs text-gray-500 leading-relaxed">{currentNote}</p>
          </div>
        )}
        {showNoteInput ? (
          <div className="space-y-1.5">
            <textarea
              ref={noteTextareaRef}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onBlur={() => {
                const trimmed = noteText.trim();
                updateNote(flightKey, "notes", trimmed);
                setShowNoteInput(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  const trimmed = noteText.trim();
                  updateNote(flightKey, "notes", trimmed);
                  setShowNoteInput(false);
                }
              }}
              placeholder={locale === "es" ? "Agregar nota…" : "Add note…"}
              rows={2}
              className="w-full text-xs bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-gray-300 placeholder-gray-600 resize-none focus:outline-none focus:border-violet-600/50"
              autoFocus
            />
            <p className="text-xs text-gray-600">
              {locale === "es" ? "Enter para guardar · Shift+Enter nueva línea" : "Enter to save · Shift+Enter new line"}
            </p>
          </div>
        ) : (
          <button
            onClick={() => {
              setNoteText(currentNote);
              setShowNoteInput(true);
              setTimeout(() => noteTextareaRef.current?.focus(), 0);
            }}
            className="flex items-center gap-1.5 text-[11px] text-gray-600 hover:text-gray-400 transition-colors"
          >
            <Pencil className="h-3 w-3" />
            {currentNote
              ? (locale === "es" ? "Editar nota" : "Edit note")
              : (locale === "es" ? "Agregar nota" : "Add note")}
          </button>
        )}
      </div>

      {/* SECTION 3c: Gate / Terminal */}
      {daysUntil >= 0 && (() => {
        const airlineAppUrl = AIRLINE_APP_URLS[flight.airlineCode] ?? null;
        const isToday = daysUntil === 0;
        return (
          <div className={`px-4 py-3 border-t border-white/5 ${isToday ? "bg-yellow-950/15" : "bg-transparent"}`}>
            <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <DoorOpen className="h-3 w-3" />
              {L.sectionGate}
              {isToday && (
                <span className="ml-1 text-xs font-bold px-1.5 py-0.5 rounded border border-yellow-600/50 bg-yellow-900/40 text-yellow-400 animate-pulse">
                  LIVE
                </span>
              )}
            </p>
            {daysUntil > 3 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500">{L.gateNotAssigned}</p>
                <LinkButton href={flightUrl} variant="blue">{L.gateLiveStatus} FlightAware</LinkButton>
              </div>
            )}
            {daysUntil >= 1 && daysUntil <= 3 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500">{L.gateConfirmSoon}</p>
                <LinkButton href={flightUrl} variant="blue">{L.gateLiveStatus} FlightAware</LinkButton>
              </div>
            )}
            {isToday && (
              <div className="space-y-2">
                <p className="text-xs text-yellow-300/80">{L.gateLiveDay}</p>
                <p className="text-xs text-gray-500">{L.gateCheckApp}</p>
                <div className="flex gap-2 flex-wrap">
                  <LinkButton href={flightUrl} variant="blue">{L.gateLiveStatus} FlightAware</LinkButton>
                  {airlineAppUrl && (
                    <LinkButton href={airlineAppUrl} variant="default">{L.airlineApp}</LinkButton>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* SECTION 3d: Live flight status */}
      <FlightStatusBadge
        flightIata={flight.flightCode.replace(/\s+/g, "")}
        isoDate={flight.isoDate}
        locale={locale}
      />

      {/* SECTION 3b: TAF Forecast at departure */}
      {relevantTafPeriod && (() => {
        const p = relevantTafPeriod;
        const fcStyles: Record<string, string> = {
          VFR:  "bg-emerald-900/50 border-emerald-600/50 text-emerald-300",
          MVFR: "bg-blue-900/50 border-blue-600/50 text-blue-300",
          IFR:  "bg-orange-900/50 border-orange-600/50 text-orange-300",
          LIFR: "bg-red-900/60 border-red-600/60 text-red-300 animate-pulse",
        };
        const fcStyle = fcStyles[p.flightCategory] ?? fcStyles["VFR"];
        let windStr = p.windSpeedKt === 0 ? "CALM" : p.isVRB ? `VRB/${p.windSpeedKt}kt` : `${String(p.windDirDeg).padStart(3, "0")}°/${p.windSpeedKt}kt`;
        if (p.windGustKt) windStr += ` G${p.windGustKt}kt`;
        const visStr  = p.visibilitySM < 5 ? `${p.visibilitySM} SM` : null;
        const ceilStr = p.ceilingFt != null && p.ceilingFt < 3000 ? `ceil ${p.ceilingFt}ft` : null;
        const nowSec  = Math.floor(Date.now() / 1000);
        const agoHours = Math.round((nowSec - (tafData?.issueTime ?? nowSec)) / 3600);
        const issuedAgo = locale === "es" ? `Emitido hace ${agoHours}h` : `Issued ${agoHours}h ago`;
        const infoChunks = [windStr, visStr, ceilStr, p.weatherString].filter(Boolean) as string[];
        return (
          <div className="px-4 py-3 border-t border-white/5 bg-blue-950/20">
            <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wider">{L.sectionForecast}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${fcStyle}`}>{p.flightCategory}</span>
              <span className="text-xs text-gray-300 font-mono">{infoChunks.join("  ·  ")}</span>
              {p.changeType === "TEMPO" && (
                <span className="text-[11px] text-yellow-500/80 italic">
                  {locale === "es" ? "(temporal)" : "(temporary)"}
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-500 mt-1.5">{issuedAgo}</p>
          </div>
        );
      })()}

      {/* SECTION 3c: SIGMET alerts on route */}
      {activeSigmets && activeSigmets.length > 0 && (
        <div className="px-4 py-3 border-t border-white/5 bg-purple-950/30">
          <p className="text-xs font-semibold text-purple-300 flex items-center gap-1.5 mb-1.5">
            <Zap className="h-3.5 w-3.5 text-purple-400" />
            {activeSigmets.length} {L.sectionSigmet}
          </p>
          <ul className="space-y-0.5">
            {activeSigmets.map((s, i) => {
              const validToDate = s.validTo ? new Date(s.validTo) : null;
              const validUntil = validToDate && !isNaN(validToDate.getTime())
                ? validToDate.toLocaleTimeString(locale === "en" ? "en-US" : "es-AR", { hour: "2-digit", minute: "2-digit", timeZoneName: "short" })
                : s.validTo;
              return (
                <li key={i} className="text-[11px] text-purple-200/70 leading-relaxed">
                  &bull; {[s.hazard, s.severity].filter(Boolean).join(" ")}
                  {validUntil && (
                    <span className="text-purple-300/50">
                      {" "}&middot; {locale === "en" ? "Valid until" : "Válido hasta"} {validUntil}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* SECTION 4: Live tracking */}
      <div className={`px-4 py-3 border-t border-white/5 ${isImminent ? "bg-blue-950/15" : "bg-transparent"}`}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Radar className="h-3 w-3" />
              {L.sectionTracking}
            </p>
            <p className="text-[11px] text-gray-500">{L.trackNote}</p>
          </div>
          <div className="flex flex-col gap-1.5 items-end shrink-0">
            <LinkButton href={flightUrl} variant="blue">
              <Plane className="h-3 w-3" />
              {L.trackFlight(flight.flightCode)}
            </LinkButton>
            <LinkButton href={airportUrl} variant="default">{L.trackInbound}</LinkButton>
          </div>
        </div>
      </div>

      {/* Notification log */}
      <div className="border-t border-white/5">
        <button
          onClick={() => setShowNotifLog((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-[11px] text-gray-500 hover:text-gray-400 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Bell className="h-3 w-3" />
            {L.notifLogTitle}
          </span>
          {showNotifLog ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        {showNotifLog && (
          <div className="px-4 pb-3">
            {notifLoading ? (
              <p className="text-[11px] text-gray-600">{L.notifLogLoading}</p>
            ) : notifLogs.length === 0 ? (
              <p className="text-[11px] text-gray-600">{L.notifLogEmpty}</p>
            ) : (
              <ul className="space-y-1">
                {notifLogs.map((entry, i) => {
                  const typeLabel =
                    L.notifTypes[entry.type] ??
                    (entry.type.startsWith("delay_")
                      ? locale === "es" ? "Alerta de estado" : "Status alert"
                      : entry.type);
                  const sentDate = new Date(entry.sent_at);
                  const timeStr = sentDate.toLocaleString(
                    locale === "en" ? "en-US" : "es-AR",
                    { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" },
                  );
                  return (
                    <li key={i} className="flex items-center justify-between gap-3 text-[11px]">
                      <span className="flex items-center gap-1.5 text-gray-400">
                        <span className="text-emerald-500">✓</span>
                        {typeLabel}
                      </span>
                      <span className="text-gray-600 tabular-nums shrink-0">{timeStr}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      </div>{/* end collapsible */}

      {/* Hotel inline */}
      {(accommodation || nextDate) && (
        <div className="px-4 pb-4">
          {accommodation ? (
            <AccommodationInline
              acc={accommodation}
              checkInDate={checkInDate}
              checkOutDate={nextDate}
              locale={locale}
              L={L}
              onRemove={onRemoveAccommodation}
              onEdit={onEditAccommodation}
            />
          ) : showHotelForm ? (
            <AddAccommodationInlineForm
              destCity={destName}
              locale={locale}
              L={L}
              onAdd={onAddAccommodation}
              onClose={() => setShowHotelForm(false)}
            />
          ) : (
            <button
              onClick={() => setShowHotelForm(true)}
              className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/[0.08] py-2 text-[11px] text-gray-600 hover:text-gray-400 hover:border-white/[0.15] transition-colors"
            >
              <Hotel className="h-3 w-3" />
              {locale === "es" ? `+ Hotel en ${destName}` : `+ Hotel in ${destName}`}
            </button>
          )}
        </div>
      )}
      {/* Boarding pass button — shows within 4h of departure */}
      {showBoardingPassButton && (
        <div className="px-4 pb-4 pt-2 border-t border-violet-800/20">
          <button
            onClick={() => setShowBoardingPass(true)}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-950/40 border border-violet-700/40 hover:bg-violet-950/60 py-2.5 text-xs font-bold text-violet-300 transition-colors"
          >
            <Plane className="h-3.5 w-3.5" />
            {locale === "es" ? "Ver boarding pass" : "View boarding pass"}
          </button>
        </div>
      )}
      </div>{/* end swipeable card content */}

      {/* Boarding pass overlay */}
      {showBoardingPass && (
        <BoardingPassView
          flight={flight}
          onClose={() => setShowBoardingPass(false)}
        />
      )}
    </div>
  );
}
