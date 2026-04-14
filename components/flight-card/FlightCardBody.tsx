"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  ExternalLink, Clock, MapPin, Plane,
  AlertTriangle, Globe, Zap, DoorOpen,
  Bell, Pencil, CalendarPlus, ChevronDown, Radar,
} from "lucide-react";
import { useNotificationLog } from "@/hooks/useNotificationLog";
import { useFlightNotes } from "@/hooks/useFlightNotes";
import { useDestinationWeather } from "@/hooks/useDestinationWeather";
import { useGeolocation } from "@/hooks/useGeolocation";
import { AirportStatusMap, TripFlight, AirportStatus } from "@/lib/types";
import { AIRPORTS, drivingEstimate } from "@/lib/airports";
import { WeatherData } from "@/hooks/useWeather";
import { TafData, TafPeriod } from "@/hooks/useTaf";
import { SigmetFeature } from "@/hooks/useSigmet";
import { LinkButton } from "@/components/LinkButton";
import { buildGoogleCalendarUrl } from "@/lib/exportGoogleCalendar";
import { ConnectionAnalysis } from "@/lib/connectionRisk";
import { FlightStatusBadge } from "@/components/FlightStatusBadge";
import { TsaAirportData } from "@/hooks/useTsaWait";
import { TRIP_PANEL_LABELS, AIRLINE_APP_URLS, AIRLINE_UPGRADE_URLS, TripPanelLabels } from "@/components/TripPanelLabels";
import { DaysCountdown, ExchangeRateRow } from "./helpers";
import { WeatherWidget } from "@/components/WeatherWidget";
import { AirportInfoCard } from "@/components/AirportInfoCard";
import { LiveFlightTracker } from "@/components/LiveFlightTracker";
import { AirportGuide } from "@/components/AirportGuide";
import { DestinationTips } from "@/components/DestinationTips";

export interface FlightCardBodyProps {
  flight: TripFlight;
  locale: "es" | "en";
  L: TripPanelLabels;
  expanded: boolean;
  // pre-computed derived values
  daysUntil: number;
  dateLabel: string;
  arrivalRec: string | null;
  arrivalNote: string | null;
  tzAbbr: string;
  displayTzAbbr?: string;
  originName: string;
  destName: string;
  originInfo: (typeof AIRPORTS)[string] | undefined;
  originUrl: string;
  routeUrl: string;
  flightUrl: string;
  isImminent: boolean;
  isNextFlight?: boolean;
  hasIssue: boolean;
  isNonFAA: boolean;
  relevantTafPeriod: TafPeriod | null;
  // props data
  statusMap: AirportStatusMap;
  weatherMap: Record<string, WeatherData>;
  tafData: TafData | undefined;
  activeSigmets: SigmetFeature[] | undefined;
  tsaData?: TsaAirportData;
  connectionToNext: ConnectionAnalysis | undefined;
  hoursUntilDep?: number | null;
  wantsUpgrade?: boolean;
  // device timezone
  displayDepartureTime?: string;
  showDeviceTz?: boolean;
  onToggleDeviceTz?: () => void;
}

// Section header with collapse toggle
function SectionHeader({
  label,
  icon,
  open,
  onToggle,
  badge,
}: {
  label: string;
  icon: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  badge?: React.ReactNode;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-white/[0.02] transition-colors"
    >
      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
        {icon}
        {label}
        {badge}
      </span>
      <ChevronDown
        className={`h-3 w-3 text-gray-600 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      />
    </button>
  );
}

function formatMinutes(min: number | undefined): string {
  if (min == null) return "?";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

function parseTzOffset(tzAbbr: string): number | null {
  if (!tzAbbr || tzAbbr === "UTC") return 0;
  const match = tzAbbr.match(/UTC([+-])(\d+)(?::(\d+))?/);
  if (!match) return null;
  const sign = match[1] === "+" ? 1 : -1;
  const hours = parseInt(match[2], 10);
  const minutes = match[3] ? parseInt(match[3], 10) : 0;
  return sign * (hours + minutes / 60);
}

export function FlightCardBody({
  flight,
  locale,
  L,
  expanded,
  daysUntil,
  dateLabel,
  arrivalRec,
  arrivalNote,
  tzAbbr,
  displayTzAbbr,
  originName,
  destName,
  originInfo,
  originUrl,
  routeUrl,
  flightUrl,
  isImminent,
  isNextFlight,
  hasIssue,
  isNonFAA,
  relevantTafPeriod,
  statusMap,
  weatherMap,
  tafData,
  activeSigmets,
  tsaData,
  hoursUntilDep,
  wantsUpgrade,
  displayDepartureTime,
  showDeviceTz,
  onToggleDeviceTz,
}: FlightCardBodyProps) {
  const originStatus: AirportStatus | undefined = statusMap[flight.originCode];
  const weather = weatherMap[flight.originCode];
  const { forecast: originForecast } = useDestinationWeather(flight.originCode, flight.isoDate, locale);
  const geoEnabled = isNextFlight === true;
  const userPosition = useGeolocation(geoEnabled);
  const driving = userPosition ? drivingEstimate(userPosition.lat, userPosition.lng, flight.originCode) : null;

  const [showNotifLog, setShowNotifLog] = useState(false);
  const { logs: notifLogs, loading: notifLoading } = useNotificationLog(flight.id, showNotifLog);

  const flightKey = flight.id;
  const { notesMap, updateNote } = useFlightNotes();
  const currentNote = notesMap[flightKey]?.notes ?? "";
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState("");
  const noteTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Section open/close state
  // Operativo: open when there's an issue; Salida/Ruta: open; Aeropuerto/Extras: closed
  const hasOperativoContent = hasIssue || (activeSigmets && activeSigmets.length > 0) || !!relevantTafPeriod;
  const [openOperativo, setOpenOperativo] = useState(hasOperativoContent);
  const [openSalida, setOpenSalida] = useState(true);
  const [openAeropuerto, setOpenAeropuerto] = useState(false);
  const [openRuta, setOpenRuta] = useState(true);
  const [openExtras, setOpenExtras] = useState(false);
  const [showAirportGuide, setShowAirportGuide] = useState(false);
  const [showDestTips, setShowDestTips] = useState(false);

  const isToday = daysUntil === 0;
  const airlineAppUrl = AIRLINE_APP_URLS[flight.airlineCode] ?? null;

  const deviceOffsetHours = -new Date().getTimezoneOffset() / 60;
  const airportOffsetHours = parseTzOffset(displayTzAbbr ?? tzAbbr);
  const isLocalTime = airportOffsetHours === null ||
    Math.abs(deviceOffsetHours - airportOffsetHours) < 0.01;

  // Build ISO datetime strings for live position tracking
  const departureISO =
    flight.departureTime
      ? `${flight.isoDate}T${flight.departureTime}:00`
      : `${flight.isoDate}T00:00:00`;
  const arrivalDate = flight.arrivalDate ?? flight.isoDate;
  const arrivalISO =
    flight.arrivalTime
      ? `${arrivalDate}T${flight.arrivalTime}:00`
      : null;

  return (
    <motion.div
      initial={false}
      animate={{ height: expanded ? "auto" : 0, opacity: expanded ? 1 : 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      style={{ overflow: "hidden" }}
    >

      {/* ── Live flight position tracker (shown when flight is currently active) ── */}
      {arrivalISO && (
        <LiveFlightTracker
          originIata={flight.originCode}
          destIata={flight.destinationCode}
          departureISO={departureISO}
          arrivalISO={arrivalISO}
          locale={locale}
        />
      )}

      {/* ── SECTION: Operativo (exception-first, only when relevant) ─────────── */}
      {hasOperativoContent && (
        <div className="border-t border-white/5">
          <SectionHeader
            label={locale === "es" ? "Operativo" : "Operations"}
            icon={<AlertTriangle className="h-3 w-3" />}
            open={openOperativo}
            onToggle={() => setOpenOperativo((v) => !v)}
            badge={
              hasIssue ? (
                <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-900/60 text-orange-300 border border-orange-700/40">
                  {locale === "es" ? "Alerta" : "Alert"}
                </span>
              ) : undefined
            }
          />
          {openOperativo && (
            <div className={`px-4 pb-3 space-y-3 ${hasIssue ? "bg-orange-950/15" : ""}`}>
              {/* FAA Alert */}
              {hasIssue && (
                <div className="rounded-xl bg-orange-950/30 border border-orange-800/30 px-3 py-2.5 text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      {locale === "en" ? "FAA Live Alert" : "Alerta FAA en vivo"}
                    </span>
                    <a
                      href={originUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-orange-500/70 hover:text-orange-400 transition-colors"
                    >
                      FlightAware ↗
                    </a>
                  </div>
                  {originStatus?.delays && (
                    <p className="text-orange-200">
                      ⚠️ {formatMinutes(originStatus.delays.minMinutes)}–{formatMinutes(originStatus.delays.maxMinutes)}
                      {" · "}{originStatus.delays.reason}
                    </p>
                  )}
                  {originStatus?.groundDelay && (
                    <p className="text-red-200">
                      🔴 avg {formatMinutes(originStatus.groundDelay.avgMinutes)} · {originStatus.groundDelay.reason}
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

              {/* TAF Forecast */}
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
                  <div className="rounded-lg bg-blue-950/20 border border-blue-900/30 px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-2">{L.sectionForecast}</p>
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

              {/* SIGMETs */}
              {activeSigmets && activeSigmets.length > 0 && (
                <div className="rounded-lg bg-purple-950/30 border border-purple-900/30 px-3 py-2.5">
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
            </div>
          )}
        </div>
      )}

      {/* ── SECTION: Salida (departure details) ──────────────────────────────── */}
      <div className="border-t border-white/5">
        <SectionHeader
          label={locale === "es" ? "Salida" : "Departure"}
          icon={<Clock className="h-3 w-3" />}
          open={openSalida}
          onToggle={() => setOpenSalida((v) => !v)}
        />
        {openSalida && (
          <div className="px-4 pb-3 space-y-2">
            {/* Date + flight code */}
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

            {/* Time details */}
            {flight.departureTime && (
              <div className="flex items-center gap-4 flex-wrap text-xs">
                <span className="flex items-center gap-1.5 text-gray-400">
                  <Clock className="h-3.5 w-3.5 text-gray-600" />
                  {L.departs}{" "}
                  <span className="font-bold text-white ml-1 tabular-nums">
                    {displayDepartureTime ?? flight.departureTime}
                  </span>
                  {!isLocalTime && (displayTzAbbr ?? tzAbbr) && (
                    <span className="text-xs font-medium text-amber-400 bg-amber-950/40 border border-amber-700/40 rounded px-1 py-0.5">
                      {locale === "es" ? "hora del aeropuerto" : "airport time"}
                    </span>
                  )}
                  {onToggleDeviceTz && (
                    <button
                      onClick={onToggleDeviceTz}
                      className="text-[10px] text-blue-400/70 hover:text-blue-400 transition-colors underline-offset-2 hover:underline ml-1"
                    >
                      {showDeviceTz
                        ? locale === "es" ? "ver hora del aeropuerto" : "show airport time"
                        : locale === "es" ? "ver en mi hora" : "show in my time"}
                    </button>
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

            {/* Driving estimate */}
            {driving && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${AIRPORTS[flight.originCode]?.lat},${AIRPORTS[flight.originCode]?.lng}&travelmode=driving`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-950/40 border border-blue-700/30 text-xs text-blue-300 hover:bg-blue-900/50 transition-colors"
              >
                <span>🚗</span>
                <span className="font-semibold tabular-nums">{driving.km} km</span>
                <span className="text-blue-400/70">·</span>
                <span className="tabular-nums">~{driving.minutes >= 60
                  ? `${Math.floor(driving.minutes / 60)}h ${driving.minutes % 60}min`
                  : `${driving.minutes} min`}
                </span>
                <span className="text-blue-500/50 text-[10px]">↗</span>
              </a>
            )}

            {/* Notes */}
            {currentNote && !showNoteInput && (
              <div className="flex items-start gap-1.5">
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
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  setNoteText(currentNote);
                  setShowNoteInput(true);
                  setTimeout(() => noteTextareaRef.current?.focus(), 0);
                }}
                className="flex items-center gap-1.5 text-[11px] text-gray-600 hover:text-gray-400 transition-colors"
              >
                <Pencil className="h-3 w-3" />
                {currentNote
                  ? locale === "es" ? "Editar nota" : "Edit note"
                  : locale === "es" ? "Agregar nota" : "Add note"}
              </motion.button>
            )}

            {/* Upgrade indicator */}
            {wantsUpgrade && (
              <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm">⬆️</span>
                  <p className="text-xs font-bold text-violet-300">
                    {locale === "en" ? "Upgrade requested" : "Upgrade solicitado"}
                  </p>
                </div>
                {AIRLINE_UPGRADE_URLS[flight.airlineCode] && (
                  <a
                    href={AIRLINE_UPGRADE_URLS[flight.airlineCode]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg px-3 py-1.5 border text-violet-300 border-violet-700/50 bg-violet-900/20 hover:bg-violet-900/40 transition-colors"
                  >
                    {locale === "en" ? "Manage upgrade" : "Gestionar upgrade"}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── SECTION: Aeropuerto (airport info) ───────────────────────────────── */}
      <div className="border-t border-white/5">
        <SectionHeader
          label={locale === "es" ? "Aeropuerto" : "Airport"}
          icon={isNonFAA ? <Globe className="h-3 w-3 text-blue-500" /> : <MapPin className="h-3 w-3" />}
          open={openAeropuerto}
          onToggle={() => setOpenAeropuerto((v) => !v)}
        />
        {openAeropuerto && (
          <div className="px-4 pb-3 space-y-2">
            {/* Airport name + link */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white tracking-tight font-mono">{flight.originCode}</span>
                  <span className="text-sm text-gray-400">{originName}</span>
                  {originInfo?.country && (
                    <span className="text-xs text-gray-500">{originInfo.country}</span>
                  )}
                </div>
              </div>
              <LinkButton href={originUrl} variant={hasIssue ? "orange" : "default"}>
                FlightAware
              </LinkButton>
            </div>

            {/* Weather at origin */}
            {(weather || originForecast) && (
              <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] divide-y divide-white/[0.05]">
                {weather && (
                  <div className="flex items-center gap-2 px-3 py-2 text-xs">
                    <span className="text-base leading-none">{weather.icon}</span>
                    <span className="font-semibold text-gray-200 tabular-nums">{weather.temperature}°C</span>
                    <span className="text-gray-400">{weather.description}</span>
                    <span className="ml-auto text-[10px] uppercase tracking-widest text-gray-600">{locale === "es" ? "ahora" : "now"}</span>
                  </div>
                )}
                {originForecast && (
                  <div className="flex items-center gap-2 px-3 py-2 text-xs">
                    <span className="text-base leading-none">{originForecast.conditionEmoji}</span>
                    <span className="font-semibold text-gray-200 tabular-nums">{originForecast.tempMaxC}°/{originForecast.tempMinC}°</span>
                    <span className="text-gray-400 truncate">{originForecast.conditionLabel}</span>
                    {originForecast.precipitationMm > 0 && (
                      <span className="text-blue-400 tabular-nums shrink-0">{originForecast.precipitationMm}mm</span>
                    )}
                    <span className="ml-auto text-[10px] uppercase tracking-widest text-gray-600">{locale === "es" ? "día del vuelo" : "flight day"}</span>
                  </div>
                )}
              </div>
            )}

            {/* TSA wait */}
            {tsaData && tsaData.avgWaitTime > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span>🛡️</span>
                <span>{locale === "en" ? "TSA avg wait:" : "Espera TSA prom:"}</span>
                <span className={`font-semibold ${
                  tsaData.avgWaitTime <= 15 ? "text-emerald-400" :
                  tsaData.avgWaitTime <= 30 ? "text-yellow-400" : "text-orange-400"
                }`}>{tsaData.avgWaitTime} min</span>
              </div>
            )}

            <AirportInfoCard iata={flight.originCode} locale={locale} terminal={null} />
          </div>
        )}
      </div>

      {/* ── SECTION: Ruta (route + destination) ──────────────────────────────── */}
      <div className="border-t border-white/5">
        <SectionHeader
          label={locale === "es" ? "Ruta" : "Route"}
          icon={<Plane className="h-3 w-3" />}
          open={openRuta}
          onToggle={() => setOpenRuta((v) => !v)}
        />
        {openRuta && (
          <div className="px-4 pb-3 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-bold text-white font-mono">{flight.originCode}</span>
                <Plane className="h-3.5 w-3.5 text-gray-700" />
                <span className="font-bold text-gray-400 font-mono">{flight.destinationCode}</span>
                <span className="text-gray-700">·</span>
                <span className="text-gray-500 text-xs">{originName} → {destName}</span>
              </div>
              <LinkButton href={routeUrl} variant="default">
                {L.seeOtherFlights(flight.originCode, flight.destinationCode)}
              </LinkButton>
            </div>
            {/* Destination weather */}
            <WeatherWidget
              airportIata={flight.destinationCode}
              isoDate={flight.isoDate}
              locale={locale}
              defaultExpanded={daysUntil <= 7}
            />
            {/* Exchange rate */}
            <ExchangeRateRow destinationCode={flight.destinationCode} />
          </div>
        )}
      </div>

      {/* ── SECTION: Extras (gate, tracking, live status, notif log) ─────────── */}
      <div className="border-t border-white/5">
        <SectionHeader
          label={locale === "es" ? "Extras" : "More"}
          icon={<Radar className="h-3 w-3" />}
          open={openExtras}
          onToggle={() => setOpenExtras((v) => !v)}
          badge={
            isToday ? (
              <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded border border-yellow-600/50 bg-yellow-900/40 text-yellow-400 animate-pulse">
                LIVE
              </span>
            ) : undefined
          }
        />
        {openExtras && (
          <div className="pb-1">
            {/* Gate / Terminal */}
            {daysUntil >= 0 && (
              <div className={`px-4 py-3 border-b border-white/5 ${isToday ? "bg-yellow-950/10" : ""}`}>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-1.5">
                  <DoorOpen className="h-3 w-3" />
                  {L.sectionGate}
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
            )}

            {/* Live flight status badge */}
            <FlightStatusBadge
              flightIata={flight.flightCode.replace(/\s+/g, "")}
              isoDate={flight.isoDate}
              locale={locale}
            />

            {/* Live tracking */}
            <div className={`px-4 py-3 border-t border-white/5 ${isImminent ? "bg-blue-950/10" : ""}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-1.5">
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
                  <LinkButton href={originUrl} variant="default">{L.trackInbound}</LinkButton>
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
                <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${showNotifLog ? "rotate-180" : ""}`} />
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
                          (entry.type.startsWith("flight_delay_real_")
                            ? locale === "es" ? "Demora en tiempo real" : "Real-time delay"
                            : entry.type.startsWith("delay_")
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
          </div>
        )}
      </div>

      {/* ── SECTION: Airport Guide (destination) ─────────────────────────────── */}
      <div className="border-t border-white/5">
        <SectionHeader
          label={locale === "es" ? "Guía del aeropuerto" : "Airport Guide"}
          icon={<Globe className="h-3 w-3" />}
          open={showAirportGuide}
          onToggle={() => setShowAirportGuide((v) => !v)}
        />
        {showAirportGuide && (
          <div className="px-4 pb-3">
            <AirportGuide
              airportIata={flight.destinationCode}
              airportName={destName}
              locale={locale}
            />
          </div>
        )}
      </div>

      {/* ── SECTION: Destination Tips ─────────────────────────────────────────── */}
      <div className="border-t border-white/5">
        <SectionHeader
          label={locale === "es" ? "Tips del destino" : "Destination Tips"}
          icon={<MapPin className="h-3 w-3" />}
          open={showDestTips}
          onToggle={() => setShowDestTips((v) => !v)}
        />
        {showDestTips && (
          <div className="px-4 pb-3">
            <DestinationTips
              city={AIRPORTS[flight.destinationCode]?.city ?? flight.destinationCode}
              country={AIRPORTS[flight.destinationCode]?.country ?? "USA"}
              locale={locale}
            />
          </div>
        )}
      </div>

    </motion.div>
  );
}
