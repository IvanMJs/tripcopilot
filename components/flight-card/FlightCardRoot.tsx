"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { AirportStatusMap, TripFlight, Accommodation } from "@/lib/types";
import { AIRPORTS } from "@/lib/airports";
import { subtractHours, buildArrivalNote } from "@/lib/flightUtils";
import { WeatherData } from "@/hooks/useWeather";
import { TafData, getTafAtTime } from "@/hooks/useTaf";
import { SigmetFeature } from "@/hooks/useSigmet";
import { ConnectionAnalysis } from "@/lib/connectionRisk";
import { TsaAirportData } from "@/hooks/useTsaWait";
import { TRIP_PANEL_LABELS } from "@/components/TripPanelLabels";
import { formatRelativeDate } from "@/lib/formatDate";
import { getTzAbbr, getDaysUntil } from "./helpers";
import { FlightCardHeader } from "./FlightCardHeader";
import { FlightCardBody } from "./FlightCardBody";
import { FlightCardAccommodation } from "./FlightCardAccommodation";
import { FlightCardBoardingPass } from "./FlightCardBoardingPass";

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
  onBoardingPassSaved: (url: string | null) => void;
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
  onBoardingPassSaved,
}: FlightCardProps) {
  const L = TRIP_PANEL_LABELS[locale];

  // Expand/collapse state
  const [expanded, setExpanded] = useState(false);

  // Removal animation state
  const [removing, setRemoving] = useState(false);
  const handleRemove = useCallback(() => {
    setRemoving(true);
    setTimeout(() => onRemove?.(), 280);
  }, [onRemove]);

  // Confirm-delete state
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    if (!confirmDelete) return;
    const timer = setTimeout(() => setConfirmDelete(false), 4000);
    return () => clearTimeout(timer);
  }, [confirmDelete]);

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
      setSwipeOffset(80);
    } else {
      setSwipeOffset(0);
    }
  }

  function handleDeleteTap() {
    setSwipeOffset(0);
    setConfirmDelete(true);
  }

  // ── Derived values ─────────────────────────────────────────────────────────

  const originInfo  = AIRPORTS[flight.originCode];
  const destInfo    = AIRPORTS[flight.destinationCode];
  const originIcao  = originInfo?.icao ?? `K${flight.originCode}`;
  const originName  = originInfo?.city || flight.originCode;
  const destName    = destInfo?.city   || flight.destinationCode;
  const isNonFAA    = originInfo?.isFAA === false;

  const flightUrl   = `https://www.flightaware.com/live/flight/${flight.airlineIcao}${flight.flightNumber}`;
  const routeUrl    = `https://www.google.com/travel/flights?q=flights+from+${flight.originCode}+to+${flight.destinationCode}`;
  const originUrl   = `https://www.flightaware.com/live/airport/${originIcao}`;

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
    Boolean(flight.boardingPassUrl) ||
    (hoursUntilDep !== null && hoursUntilDep < 24 && hoursUntilDep > -1);

  const originStatus = statusMap[flight.originCode];
  const status       = originStatus?.status ?? "ok";
  const hasIssue     = status !== "ok";
  const isImminent   = daysUntil >= 0 && daysUntil <= 1;

  const relevantTafPeriod = (() => {
    if (!tafData || !flight.departureTime || !flight.isoDate) return null;
    const depUnix = Math.floor(new Date(`${flight.isoDate}T${flight.departureTime}:00`).getTime() / 1000);
    if (isNaN(depUnix) || depUnix === 0) return null;
    return getTafAtTime(tafData, depUnix);
  })();

  const leftBorderClass = (() => {
    if (status === "ground_stop" || status === "ground_delay" || status === "closure") {
      return "border-l-2 border-l-red-500/60";
    }
    if (status === "delay_minor" || status === "delay_moderate" || status === "delay_severe") {
      return "border-l-2 border-l-yellow-500/60";
    }
    if (status === "ok") {
      return "border-l-2 border-l-emerald-500/40";
    }
    return "";
  })();

  return (
    <div
      id={`flight-card-${idx}`}
      className={`relative rounded-xl border-2 overflow-hidden transition-all animate-fade-in-up stagger-item hover:-translate-y-1 ${
        connectionToNext && connectionToNext.risk === "missed"   ? "border-red-700/60"    :
        connectionToNext && connectionToNext.risk === "at_risk"  ? "border-orange-600/60" :
        connectionToNext && connectionToNext.risk === "tight"    ? "border-yellow-700/50" :
        hasIssue                                                  ? "border-orange-600/50" :
        isImminent                                               ? "border-blue-700/40"   :
        "border-white/6"
      } ${leftBorderClass} ${removing ? "opacity-0 -translate-x-6 scale-95" : "opacity-100 translate-x-0 scale-100"}`}
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
        <FlightCardHeader
          flight={flight}
          locale={locale}
          L={L}
          daysUntil={daysUntil}
          hasIssue={hasIssue}
          isNonFAA={isNonFAA}
          originName={originName}
          destName={destName}
          originStatus={originStatus}
          confirmDelete={confirmDelete}
          onConfirmDelete={() => setConfirmDelete(true)}
          onCancelDelete={() => setConfirmDelete(false)}
          onRemove={handleRemove}
          expanded={expanded}
          onToggleExpanded={() => setExpanded((v) => !v)}
        />

        <FlightCardBody
          flight={flight}
          locale={locale}
          L={L}
          expanded={expanded}
          daysUntil={daysUntil}
          dateLabel={dateLabel}
          arrivalRec={arrivalRec}
          arrivalNote={arrivalNote}
          tzAbbr={tzAbbr}
          originName={originName}
          destName={destName}
          originInfo={originInfo}
          originUrl={originUrl}
          routeUrl={routeUrl}
          flightUrl={flightUrl}
          isImminent={isImminent}
          hasIssue={hasIssue}
          isNonFAA={isNonFAA}
          relevantTafPeriod={relevantTafPeriod}
          statusMap={statusMap}
          weatherMap={weatherMap}
          tafData={tafData}
          activeSigmets={activeSigmets}
          tsaData={tsaData}
          connectionToNext={connectionToNext}
        />

        <FlightCardAccommodation
          accommodation={accommodation}
          flightIsoDate={flight.isoDate}
          flightDepartureTime={flight.departureTime}
          flightArrivalBuffer={flight.arrivalBuffer}
          nextDate={nextDate}
          destName={destName}
          locale={locale}
          L={L}
          onAddAccommodation={onAddAccommodation}
          onRemoveAccommodation={onRemoveAccommodation}
          onEditAccommodation={onEditAccommodation}
        />

        <FlightCardBoardingPass
          flight={flight}
          showButton={showBoardingPassButton}
          locale={locale}
          onBoardingPassSaved={onBoardingPassSaved}
        />
      </div>
    </div>
  );
}
