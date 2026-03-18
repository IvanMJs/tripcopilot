"use client";

import { useState, useMemo } from "react";
import {
  Plus, X, ExternalLink, Clock, MapPin, Plane,
  AlertTriangle, Search, Calendar, Share2, CheckCheck,
  Upload, Radar, Globe, Zap, DoorOpen, Trash2, BookmarkCheck,
} from "lucide-react";
import { AirportStatusMap, TripFlight, TripTab } from "@/lib/types";
import { AIRPORTS } from "@/lib/airports";
import { AIRLINES, parseFlightCode, subtractHours, buildArrivalNote } from "@/lib/flightUtils";
import { StatusBadge } from "./StatusBadge";
import { useLanguage } from "@/contexts/LanguageContext";
import { WeatherData } from "@/hooks/useWeather";
import { useTaf, TafData, getTafAtTime } from "@/hooks/useTaf";
import { useSigmet, SigmetFeature, routeIntersectsSigmet } from "@/hooks/useSigmet";
import { TripTimeline } from "./TripTimeline";
import { CalendarFlight, generateICS, downloadICS, buildGoogleCalendarURL } from "@/lib/calendarExport";
import { buildShareURL, copyToClipboard, buildWhatsAppMessage, buildWhatsAppURL, WhatsAppFlight } from "@/lib/tripShare";
import { analyzeAllConnections, ConnectionAnalysis } from "@/lib/connectionRisk";
import { calculateTripRiskScore } from "@/lib/tripRiskScore";
import { TripRiskBadge } from "./TripRiskBadge";
import { ImportFlightsModal } from "./ImportFlightsModal";
import { ParsedFlight } from "@/lib/importFlights";
import { FlightStatusBadge } from "@/components/FlightStatusBadge";
import { useTsaWait, TsaAirportData } from "@/hooks/useTsaWait";

// ── i18n ─────────────────────────────────────────────────────────────────────

const LABELS = {
  es: {
    addTitle: "Agregar vuelo",
    flightPlaceholder: "Código (AA900, B6766…)",
    originPlaceholder: "Origen IATA",
    destPlaceholder: "Destino IATA",
    bufferLabel: "Llegar",
    addBtn: "Agregar",
    importBtn: "Importar",
    noFlights: "No hay vuelos todavía. Agregá el primero.",
    bufferOptions: [
      { value: 1,   label: "1h antes" },
      { value: 1.5, label: "1:30h antes" },
      { value: 2,   label: "2h antes" },
      { value: 2.5, label: "2:30h antes" },
      { value: 3,   label: "3h antes" },
    ],
    errInvalidCode:    "Código inválido. Usá: AA900, B6766 o EDV5068",
    errUnknownAirline: "Aerolínea no reconocida. Verificá el código.",
    errUnknownOrigin:  "Aeropuerto de origen no reconocido.",
    errUnknownDest:    "Aeropuerto de destino no reconocido.",
    errSameAirport:    "Origen y destino no pueden ser iguales.",
    errMissingDate:    "Ingresá la fecha del vuelo.",
    sectionAirport:   "Aeropuerto de salida",
    sectionRoute:     "Ruta",
    sectionFlight:    "Mi vuelo",
    sectionForecast:  "Pronóstico en la salida",
    sectionTracking:  "Seguimiento en vivo",
    departs: "Sale:",
    arriveAt: "Llegar al aeropuerto:",
    removeTitle: "Eliminar vuelo",
    seeAllFlightsFrom: (code: string) => `FlightAware · Vuelos de ${code}`,
    seeOtherFlights: (o: string, d: string) => `Vuelos alternativos ${o}→${d}`,
    trackFlight: (num: string) => `Tracking vuelo ${num}`,
    trackLive: "Seguir este vuelo en vivo",
    trackInbound: "Ver avión entrante",
    trackNote: "FlightAware muestra posición, velocidad y estado en tiempo real",
    days: (n: number) => `${n} día${n !== 1 ? "s" : ""}`,
    today: "HOY",
    completed: "Completado",
    internationalNote: "Internacional — sin cobertura FAA",
    sectionSigmet: "SIGMET activo en ruta",
    sectionGate:    "Puerta / Terminal",
    gateNotAssigned: "Las puertas se asignan 24–48h antes de la salida",
    gateConfirmSoon: "Se confirma normalmente el día anterior · Verificar en el aeropuerto",
    gateLiveDay:    "Las puertas pueden cambiar hasta 30 min antes del embarque",
    gateCheckApp:   "Verificar en app de la aerolínea o panel del aeropuerto",
    gateLiveStatus: "Estado en vivo",
    airlineApp:     "App aerolínea",
    connectionRisk: {
      at_risk: (airport: string, mins: number) =>
        `⚠️ Conexión en riesgo en ${airport}${mins > 0 ? ` (+${mins}min demora)` : ""}`,
      tight: (airport: string, mins: number) =>
        `⏱ Conexión ajustada en ${airport}${mins > 0 ? ` (+${mins}min demora)` : ""}`,
      missed: (airport: string, mins: number) =>
        `🚨 Conexión posiblemente perdida en ${airport}${mins > 0 ? ` (+${mins}min demora)` : ""}`,
    },
  },
  en: {
    addTitle: "Add flight",
    flightPlaceholder: "Code (AA900, B6766…)",
    originPlaceholder: "Origin IATA",
    destPlaceholder: "Dest. IATA",
    bufferLabel: "Arrive",
    addBtn: "Add",
    importBtn: "Import",
    noFlights: "No flights yet. Add the first one.",
    bufferOptions: [
      { value: 1,   label: "1h before" },
      { value: 1.5, label: "1:30h before" },
      { value: 2,   label: "2h before" },
      { value: 2.5, label: "2:30h before" },
      { value: 3,   label: "3h before" },
    ],
    errInvalidCode:    "Invalid code. Use: AA900, B6766 or EDV5068",
    errUnknownAirline: "Airline not recognized. Check the code.",
    errUnknownOrigin:  "Origin airport not recognized.",
    errUnknownDest:    "Destination airport not recognized.",
    errSameAirport:    "Origin and destination can't be the same.",
    errMissingDate:    "Enter the flight date.",
    sectionAirport:   "Departure airport",
    sectionRoute:     "Route",
    sectionFlight:    "My flight",
    sectionForecast:  "Forecast at departure",
    sectionTracking:  "Live tracking",
    departs: "Departs:",
    arriveAt: "Arrive at airport by:",
    removeTitle: "Remove flight",
    seeAllFlightsFrom: (code: string) => `FlightAware · Flights from ${code}`,
    seeOtherFlights: (o: string, d: string) => `Alternative flights ${o}→${d}`,
    trackFlight: (num: string) => `Track flight ${num}`,
    trackLive: "Track this flight live",
    trackInbound: "View inbound aircraft",
    trackNote: "FlightAware shows real-time position, speed, and status",
    days: (n: number) => `${n} day${n !== 1 ? "s" : ""} left`,
    today: "TODAY",
    completed: "Completed",
    internationalNote: "International — no FAA coverage",
    sectionSigmet: "SIGMET active on route",
    sectionGate:    "Gate / Terminal",
    gateNotAssigned: "Gates typically assigned 24–48h before departure",
    gateConfirmSoon: "Usually confirmed the day before · Verify at airport",
    gateLiveDay:    "Gates can change up to 30 min before boarding",
    gateCheckApp:   "Check airline app or airport departure board",
    gateLiveStatus: "Live status",
    airlineApp:     "Airline app",
    connectionRisk: {
      at_risk: (airport: string, mins: number) =>
        `⚠️ Connection at risk at ${airport}${mins > 0 ? ` (+${mins}min delay)` : ""}`,
      tight: (airport: string, mins: number) =>
        `⏱ Tight connection at ${airport}${mins > 0 ? ` (+${mins}min delay)` : ""}`,
      missed: (airport: string, mins: number) =>
        `🚨 Connection possibly missed at ${airport}${mins > 0 ? ` (+${mins}min delay)` : ""}`,
    },
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDaysUntil(isoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const flight = new Date(isoDate + "T00:00:00");
  return Math.ceil((flight.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function DaysCountdown({ days, L }: { days: number; L: typeof LABELS["es"] }) {
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

function LinkButton({
  href,
  children,
  variant = "default",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "default" | "blue" | "orange" | "green";
}) {
  const colors = {
    default: "border-white/8 bg-white/4 text-gray-300 hover:bg-white/8 hover:text-white",
    blue:    "border-blue-700/40 bg-blue-950/30 text-blue-400 hover:bg-blue-900/50 hover:text-blue-300",
    orange:  "border-orange-700/40 bg-orange-950/30 text-orange-400 hover:bg-orange-900/50 hover:text-orange-300",
    green:   "border-emerald-700/40 bg-emerald-950/30 text-emerald-400 hover:bg-emerald-900/50 hover:text-emerald-300",
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

// ── Connection risk banner ────────────────────────────────────────────────────

function ConnectionRiskBanner({
  analysis,
  locale,
  nextDestination,
  nextDate,
}: {
  analysis:         ConnectionAnalysis;
  locale:           "es" | "en";
  nextDestination?: string;
  nextDate?:        string;
}) {
  if (analysis.risk === "safe") return null;

  const styles = {
    at_risk: {
      bg:     "bg-orange-950/50 border-orange-700/50",
      text:   "text-orange-300",
      icon:   "text-orange-400",
      iconBg: "bg-orange-900/40",
    },
    tight: {
      bg:     "bg-yellow-950/40 border-yellow-700/40",
      text:   "text-yellow-300",
      icon:   "text-yellow-400",
      iconBg: "bg-yellow-900/40",
    },
    missed: {
      bg:     "bg-red-950/60 border-red-700/60",
      text:   "text-red-300",
      icon:   "text-red-400",
      iconBg: "bg-red-900/40",
    },
  };

  const s = styles[analysis.risk];
  const L = LABELS[locale];
  const label = L.connectionRisk[analysis.risk](
    analysis.connectionAirport,
    analysis.delayAddedMinutes,
  );

  const details =
    locale === "en"
      ? `Buffer: ${Math.round(analysis.effectiveBufferMinutes)}min · MCT: ${analysis.mctMinutes}min`
      : `Margen: ${Math.round(analysis.effectiveBufferMinutes)}min · MCT: ${analysis.mctMinutes}min`;

  // Re-routing links — only when connection is at_risk or missed
  const showReroute =
    (analysis.risk === "at_risk" || analysis.risk === "missed") &&
    !!nextDestination;

  const origin = analysis.connectionAirport;
  const dest   = nextDestination ?? "";
  const googleUrl = showReroute
    ? `https://www.google.com/travel/flights?q=Flights+from+${origin}+to+${dest}`
    : "";
  const kayakUrl = showReroute && nextDate
    ? `https://www.kayak.com/flights/${origin}-${dest}/${nextDate}`
    : "";

  return (
    <div className={`mt-2 rounded-xl border px-4 py-3 ${s.bg}`}>
      <div className="flex items-start gap-3">
        <div className={`p-1.5 rounded-lg ${s.iconBg} shrink-0 mt-0.5`}>
          <AlertTriangle className={`h-3.5 w-3.5 ${s.icon}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold ${s.text}`}>{label}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">{details}</p>
          {showReroute && (
            <div className="flex gap-2 mt-2.5 flex-wrap">
              <LinkButton href={googleUrl} variant="orange">
                {locale === "en" ? "Find alternatives" : "Buscar alternativas"}
              </LinkButton>
              {kayakUrl && (
                <LinkButton href={kayakUrl} variant="default">
                  Kayak
                </LinkButton>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Add-flight form ───────────────────────────────────────────────────────────

interface AddFlightFormProps {
  tripId: string;
  onAdd: (tripId: string, flight: TripFlight) => void;
  onOpenImport: () => void;
  locale: "es" | "en";
}

const BLANK_FORM = {
  flightCode:    "",
  originCode:    "",
  destCode:      "",
  isoDate:       "",
  departureTime: "",
  arrivalBuffer: 2 as number,
};

function AddFlightForm({ tripId, onAdd, onOpenImport, locale }: AddFlightFormProps) {
  const L = LABELS[locale];
  const [form, setForm] = useState(BLANK_FORM);
  const [error, setError] = useState("");

  function update(field: keyof typeof BLANK_FORM, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  }

  function handleAdd() {
    setError("");
    const parsed = parseFlightCode(form.flightCode);
    if (!parsed) {
      const clean = form.flightCode.trim().toUpperCase().replace(/\s+/g, "");
      const codeMatch = clean.match(/^([A-Z]{2,3}|[A-Z0-9]{2})\d+$/);
      setError(codeMatch && !AIRLINES[codeMatch[1]] ? L.errUnknownAirline : L.errInvalidCode);
      return;
    }
    const origin = form.originCode.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(origin)) { setError(L.errUnknownOrigin); return; }
    const dest = form.destCode.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(dest)) { setError(L.errUnknownDest); return; }
    if (origin === dest)  { setError(L.errSameAirport); return; }
    if (!form.isoDate)    { setError(L.errMissingDate); return; }

    const newFlight: TripFlight = {
      id:              `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
      flightCode:      parsed.fullCode,
      airlineCode:     parsed.airlineCode,
      airlineName:     parsed.airlineName,
      airlineIcao:     parsed.airlineIcao,
      flightNumber:    parsed.flightNumber,
      originCode:      origin,
      destinationCode: dest,
      isoDate:         form.isoDate,
      departureTime:   form.departureTime,
      arrivalBuffer:   form.arrivalBuffer,
    };
    onAdd(tripId, newFlight);
    setForm(BLANK_FORM);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleAdd();
  }

  const inputClass =
    "w-full rounded-xl border border-white/[0.12] bg-[#080810] px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500/70";
  const labelClass =
    "block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5";

  return (
    <div
      className="rounded-xl border border-white/[0.08] p-4 space-y-4"
      style={{ background: "linear-gradient(135deg, rgba(15,15,23,0.8) 0%, rgba(10,10,18,0.9) 100%)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="h-3.5 w-3.5 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-300">{L.addTitle}</h3>
        </div>
        <button
          onClick={onOpenImport}
          className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/[0.08] transition-colors"
        >
          <Upload className="h-3 w-3" />
          {L.importBtn}
        </button>
      </div>

      {/* Row 1: Flight code — full width */}
      <div>
        <label className={labelClass}>
          {locale === "es" ? "Código de vuelo" : "Flight code"}
        </label>
        <input
          value={form.flightCode}
          onChange={(e) => update("flightCode", e.target.value)}
          onKeyDown={handleKey}
          placeholder={L.flightPlaceholder}
          className={inputClass}
        />
      </div>

      {/* Row 2: Origin · Destination · Date */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>
            {locale === "es" ? "Origen" : "Origin"}
          </label>
          <input
            value={form.originCode}
            onChange={(e) => update("originCode", e.target.value.toUpperCase())}
            onKeyDown={handleKey}
            placeholder="EZE"
            maxLength={3}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>
            {locale === "es" ? "Destino" : "Destination"}
          </label>
          <input
            value={form.destCode}
            onChange={(e) => update("destCode", e.target.value.toUpperCase())}
            onKeyDown={handleKey}
            placeholder="MIA"
            maxLength={3}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>
            {locale === "es" ? "Fecha" : "Date"}
          </label>
          <input
            type="date"
            value={form.isoDate}
            onChange={(e) => update("isoDate", e.target.value)}
            onKeyDown={handleKey}
            className={inputClass}
          />
        </div>
      </div>

      {/* Row 3: Time (optional) · Buffer */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>
            {locale === "es" ? "Hora de salida" : "Departure time"}
            {" "}<span className="normal-case font-normal tracking-normal text-gray-700">
              ({locale === "es" ? "opcional" : "optional"})
            </span>
          </label>
          <input
            type="time"
            value={form.departureTime}
            onChange={(e) => update("departureTime", e.target.value)}
            onKeyDown={handleKey}
            className={inputClass}
          />
        </div>
        {form.departureTime && (
          <div>
            <label className={labelClass}>
              {locale === "es" ? "Llegar al aeropuerto" : "Arrive at airport"}
            </label>
            <select
              value={form.arrivalBuffer}
              onChange={(e) => update("arrivalBuffer", Number(e.target.value))}
              className={inputClass}
            >
              {L.bufferOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Error */}
      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Add button — full width on mobile */}
      <button
        onClick={handleAdd}
        className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 px-5 py-2.5 text-sm font-semibold text-white transition-all tap-scale"
      >
        <Plus className="h-3.5 w-3.5" />
        {L.addBtn}
      </button>
    </div>
  );
}

// ── Airline app URLs ──────────────────────────────────────────────────────────

const AIRLINE_APP_URLS: Record<string, string> = {
  AA: "https://www.aa.com/travelInformation/flights/status",
  UA: "https://www.united.com/ual/en/us/flight-status",
  DL: "https://www.delta.com/us/en/flight-status/overview",
  B6: "https://www.jetblue.com/manage-trips/flightstatus",
  WN: "https://www.southwest.com/air/flight-status/",
  AS: "https://www.alaskaair.com/flight-status",
  LA: "https://www.latamairlines.com/us/en/manage-your-trip",
  AR: "https://www.aerolineas.com.ar/es-ar/informacion-de-vuelo",
  NK: "https://www.spirit.com/booking/flight-status",
  F9: "https://www.flyfrontier.com/travel/my-trips/flight-status/",
  G4: "https://www.allegiantair.com/manage-travel",
  AM: "https://www.aeromexico.com/en-us/flight-status",
  CM: "https://www.copaair.com/en/web/us/check-in",
  AV: "https://www.avianca.com/us/en/manage-your-trip/flight-status/",
  AC: "https://www.aircanada.com/us/en/aco/home/fly/onboard/flight-status.html",
};

// ── Flight card ───────────────────────────────────────────────────────────────

interface FlightCardProps {
  flight: TripFlight;
  statusMap: AirportStatusMap;
  weatherMap: Record<string, WeatherData>;
  locale: "es" | "en";
  onRemove: () => void;
  idx: number;
  /** Connection risk TO the NEXT flight (if this is a layover origin) */
  connectionToNext?: ConnectionAnalysis;
  /** Destination of the NEXT flight — used for re-routing links */
  nextDestination?: string;
  nextDate?: string;
  /** TAF data for the departure airport */
  tafData?: TafData;
  /** Active SIGMETs intersecting this flight's route */
  activeSigmets?: SigmetFeature[];
  /** TSA wait time data for the origin airport */
  tsaData?: TsaAirportData;
}

function FlightCard({
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
}: FlightCardProps) {
  const L = LABELS[locale];

  const originInfo  = AIRPORTS[flight.originCode];
  const destInfo    = AIRPORTS[flight.destinationCode];
  const originIcao  = originInfo?.icao ?? `K${flight.originCode}`;
  const originName  = originInfo?.city || flight.originCode;
  const destName    = destInfo?.city   || flight.destinationCode;
  const isNonFAA    = originInfo?.isFAA === false;

  const flightUrl   = `https://www.flightaware.com/live/flight/${flight.airlineIcao}${flight.flightNumber}`;
  const routeUrl    = `https://www.google.com/travel/flights?q=flights+from+${flight.originCode}+to+${flight.destinationCode}`;
  const airportUrl  = `https://www.flightaware.com/live/airport/${originIcao}`;

  const arrivalRec  = flight.departureTime
    ? subtractHours(flight.departureTime, flight.arrivalBuffer)
    : null;
  const arrivalNote = flight.departureTime
    ? buildArrivalNote(flight.arrivalBuffer, locale)
    : null;

  const dateLabel = new Date(flight.isoDate + "T00:00:00").toLocaleDateString(
    locale === "en" ? "en-US" : "es-AR",
    { day: "2-digit", month: locale === "en" ? "short" : "2-digit" }
  );
  const daysUntil = getDaysUntil(flight.isoDate);

  const originStatus = statusMap[flight.originCode];
  const status       = originStatus?.status ?? "ok";
  const hasIssue     = !isNonFAA && status !== "ok";
  const weather      = weatherMap[flight.originCode];
  const isImminent   = daysUntil >= 0 && daysUntil <= 1;

  // TAF: find the forecast period that covers the departure time
  const relevantTafPeriod = (() => {
    if (!tafData || !flight.departureTime || !flight.isoDate) return null;
    const depUnix = Math.floor(
      new Date(`${flight.isoDate}T${flight.departureTime}:00`).getTime() / 1000,
    );
    if (isNaN(depUnix) || depUnix === 0) return null;
    return getTafAtTime(tafData, depUnix);
  })();

  return (
    <div
      id={`flight-card-${idx}`}
      className={`rounded-xl border-2 overflow-hidden transition-all animate-fade-in-up ${
        connectionToNext && connectionToNext.risk === "missed"   ? "border-red-700/60"    :
        connectionToNext && connectionToNext.risk === "at_risk"  ? "border-orange-600/60" :
        connectionToNext && connectionToNext.risk === "tight"    ? "border-yellow-700/50" :
        hasIssue                                                  ? "border-orange-600/50" :
        isImminent                                               ? "border-blue-700/40"   :
        "border-white/6"
      }`}
      style={{ animationDelay: `${idx * 0.08}s` }}
    >
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
      <div className={`px-4 py-3 ${
        hasIssue ? "bg-orange-950/20" : "bg-white/[0.02]"
      }`}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {hasIssue && <AlertTriangle className="h-4 w-4 text-orange-400 shrink-0" />}
              {isNonFAA && <Globe className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                {L.sectionAirport}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white tracking-tight">{flight.originCode}</span>
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
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={onRemove}
              title={L.removeTitle}
              className="rounded-lg p-1.5 text-red-600 hover:text-red-400 hover:bg-red-950/40 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            {isNonFAA ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 bg-white/4 border border-white/8 px-2.5 py-1 rounded-lg">
                <Globe className="h-3 w-3" />
                {L.internationalNote}
              </span>
            ) : (
              <StatusBadge status={status} className="text-sm px-3 py-1" />
            )}
            <LinkButton href={airportUrl} variant={hasIssue ? "orange" : "default"}>
              {L.seeAllFlightsFrom(flight.originCode)}
            </LinkButton>
          </div>
        </div>

        {hasIssue && (
          <div className="mt-3 rounded-xl bg-orange-950/30 border border-orange-800/30 px-3 py-2.5 text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1">
                <Zap className="h-3 w-3" />
                {locale === "en" ? "FAA Live Alert" : "Alerta FAA en vivo"}
              </span>
              <a href={airportUrl} target="_blank" rel="noopener noreferrer"
                className="text-[10px] text-orange-500/70 hover:text-orange-400 transition-colors">
                {locale === "en" ? "FlightAware ↗" : "FlightAware ↗"}
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
              <span className="font-bold text-white">{flight.originCode}</span>
              <Plane className="h-3.5 w-3.5 text-gray-700" />
              <span className="font-bold text-gray-400">{flight.destinationCode}</span>
              <span className="text-gray-700">·</span>
              <span className="text-gray-500 text-xs">{originName} → {destName}</span>
            </div>
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
          </div>
          {flight.departureTime && (
            <div className="flex items-center gap-4 flex-wrap text-xs">
              <span className="flex items-center gap-1.5 text-gray-400">
                <Clock className="h-3.5 w-3.5 text-gray-600" />
                {L.departs}{" "}
                <span className="font-bold text-white ml-1">{flight.departureTime}</span>
              </span>
              {arrivalRec && (
                <span className="flex items-start gap-1.5 text-gray-400">
                  <MapPin className="h-3.5 w-3.5 text-yellow-600 shrink-0 mt-0.5" />
                  <span>
                    {L.arriveAt}{" "}
                    <span className="font-bold text-yellow-400">{arrivalRec}</span>
                    <span className="text-gray-500 ml-1">({arrivalNote})</span>
                  </span>
                </span>
              )}
            </div>
          )}
        </div>
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
                <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded border border-yellow-600/50 bg-yellow-900/40 text-yellow-400 animate-pulse">
                  LIVE
                </span>
              )}
            </p>

            {daysUntil > 3 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500">{L.gateNotAssigned}</p>
                <LinkButton href={flightUrl} variant="blue">
                  {L.gateLiveStatus} FlightAware
                </LinkButton>
              </div>
            )}

            {daysUntil >= 1 && daysUntil <= 3 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500">{L.gateConfirmSoon}</p>
                <LinkButton href={flightUrl} variant="blue">
                  {L.gateLiveStatus} FlightAware
                </LinkButton>
              </div>
            )}

            {isToday && (
              <div className="space-y-2">
                <p className="text-xs text-yellow-300/80">{L.gateLiveDay}</p>
                <p className="text-xs text-gray-500">{L.gateCheckApp}</p>
                <div className="flex gap-2 flex-wrap">
                  <LinkButton href={flightUrl} variant="blue">
                    {L.gateLiveStatus} FlightAware
                  </LinkButton>
                  {airlineAppUrl && (
                    <LinkButton href={airlineAppUrl} variant="default">
                      {L.airlineApp}
                    </LinkButton>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* SECTION 3d: Live flight status (AviationStack) */}
      <FlightStatusBadge
        flightIata={flight.flightCode.replace(/\s+/g, "")}
        isoDate={flight.isoDate}
        locale={locale}
      />

      {/* SECTION 3b: TAF Forecast at departure */}
      {relevantTafPeriod && (() => {
        const p = relevantTafPeriod;

        // Flight category badge styles
        const fcStyles: Record<string, string> = {
          VFR:  "bg-emerald-900/50 border-emerald-600/50 text-emerald-300",
          MVFR: "bg-blue-900/50 border-blue-600/50 text-blue-300",
          IFR:  "bg-orange-900/50 border-orange-600/50 text-orange-300",
          LIFR: "bg-red-900/60 border-red-600/60 text-red-300 animate-pulse",
        };
        const fcStyle = fcStyles[p.flightCategory] ?? fcStyles["VFR"];

        // Wind string
        let windStr: string;
        if (p.windSpeedKt === 0) {
          windStr = "CALM";
        } else if (p.isVRB) {
          windStr = `VRB/${p.windSpeedKt}kt`;
        } else {
          windStr = `${String(p.windDirDeg).padStart(3, "0")}°/${p.windSpeedKt}kt`;
        }
        if (p.windGustKt) windStr += ` G${p.windGustKt}kt`;

        // Visibility — only show if < 5SM
        const visStr = p.visibilitySM < 5 ? `${p.visibilitySM} SM` : null;

        // Ceiling — only show if < 3000ft
        const ceilStr = p.ceilingFt != null && p.ceilingFt < 3000
          ? `ceil ${p.ceilingFt}ft`
          : null;

        // Issue time ago
        const nowSec   = Math.floor(Date.now() / 1000);
        const agoHours = Math.round((nowSec - tafData!.issueTime) / 3600);
        const issuedAgo = locale === "es"
          ? `Emitido hace ${agoHours}h`
          : `Issued ${agoHours}h ago`;

        const isTemporary = p.changeType === "TEMPO";

        const infoChunks: string[] = [windStr];
        if (visStr)  infoChunks.push(visStr);
        if (ceilStr) infoChunks.push(ceilStr);
        if (p.weatherString) infoChunks.push(p.weatherString);

        return (
          <div className="px-4 py-3 border-t border-white/5 bg-blue-950/20">
            <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wider">
              {L.sectionForecast}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${fcStyle}`}>
                {p.flightCategory}
              </span>
              <span className="text-xs text-gray-300 font-mono">
                {infoChunks.join("  ·  ")}
              </span>
              {isTemporary && (
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
                ? validToDate.toLocaleTimeString(
                    locale === "en" ? "en-US" : "es-AR",
                    { hour: "2-digit", minute: "2-digit", timeZoneName: "short" },
                  )
                : s.validTo;
              const label = [s.hazard, s.severity].filter(Boolean).join(" ");
              return (
                <li key={i} className="text-[11px] text-purple-200/70 leading-relaxed">
                  &bull; {label}
                  {validUntil && (
                    <span className="text-purple-300/50">
                      {" "}
                      &middot; {locale === "en" ? "Valid until" : "Válido hasta"} {validUntil}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* SECTION 4: Live tracking */}
      <div className={`px-4 py-3 border-t border-white/5 ${
        isImminent ? "bg-blue-950/15" : "bg-transparent"
      }`}>
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
            <LinkButton href={airportUrl} variant="default">
              {L.trackInbound}
            </LinkButton>
          </div>
        </div>
      </div>

      {/* Connection risk banner (between this flight and the next) */}
      {connectionToNext && connectionToNext.risk !== "safe" && (
        <div className="px-4 pb-3 border-t border-white/5">
          <ConnectionRiskBanner
            analysis={connectionToNext}
            locale={locale}
            nextDestination={nextDestination}
            nextDate={nextDate}
          />
        </div>
      )}
    </div>
  );
}

// ── TripPanel ─────────────────────────────────────────────────────────────────

interface TripPanelProps {
  trip: TripTab;
  statusMap: AirportStatusMap;
  weatherMap: Record<string, WeatherData>;
  onAddFlight: (tripId: string, flight: TripFlight) => void;
  onRemoveFlight: (tripId: string, flightId: string) => void;
  isDraft?: boolean;
  onSave?: () => void;
}

export function TripPanel({
  trip,
  statusMap,
  weatherMap,
  onAddFlight,
  onRemoveFlight,
  isDraft,
  onSave,
}: TripPanelProps) {
  const { locale } = useLanguage();
  const L = LABELS[locale];
  const [copied, setCopied]         = useState(false);
  const [waCopied, setWaCopied]     = useState(false);
  const [showGcal, setShowGcal]     = useState(false);
  const [showImport, setShowImport] = useState(false);

  const sorted = useMemo(
    () => [...trip.flights].sort((a, b) => {
      const d = a.isoDate.localeCompare(b.isoDate);
      return d !== 0 ? d : (a.departureTime ?? "").localeCompare(b.departureTime ?? "");
    }),
    [trip.flights],
  );

  // ── TSA data ─────────────────────────────────────────────────────────────────
  const tsaData = useTsaWait();

  // ── TAF data ────────────────────────────────────────────────────────────────
  const tafMap = useTaf(sorted.map((f) => f.originCode));

  // ── SIGMET data ──────────────────────────────────────────────────────────────
  const allSigmets = useSigmet();

  const sigmetsByFlight = useMemo(() => {
    const map = new Map<string, SigmetFeature[]>();
    for (const flight of sorted) {
      const origin = AIRPORTS[flight.originCode];
      const dest   = AIRPORTS[flight.destinationCode];
      if (!origin?.lat || !dest?.lat) continue;
      const matches = routeIntersectsSigmet(
        origin.lat, origin.lng,
        dest.lat,   dest.lng,
        allSigmets,
      );
      if (matches.length > 0) map.set(flight.id, matches);
    }
    return map;
  }, [sorted, allSigmets]);

  // ── Connection analysis ─────────────────────────────────────────────────────
  const connectionMap = useMemo(
    () => analyzeAllConnections(sorted, statusMap),
    [sorted, statusMap],
  );

  // Build lookup: flightId → ConnectionAnalysis for the connection FROM that flight to the next
  const connByFlight = useMemo(() => {
    const map = new Map<string, ConnectionAnalysis>();
    connectionMap.forEach((analysis, key) => {
      const fromId = key.split("→")[0];
      map.set(fromId, analysis);
    });
    return map;
  }, [connectionMap]);

  // ── Trip risk score ─────────────────────────────────────────────────────────
  const riskScore = useMemo(
    () => calculateTripRiskScore(sorted, statusMap, locale),
    [sorted, statusMap, locale],
  );

  // ── Calendar flights ────────────────────────────────────────────────────────
  const calFlights: CalendarFlight[] = sorted.map((f) => ({
    flightCode:      f.flightCode,
    originCode:      f.originCode,
    originCity:      AIRPORTS[f.originCode]?.city ?? f.originCode,
    destinationCode: f.destinationCode,
    destinationCity: AIRPORTS[f.destinationCode]?.city ?? f.destinationCode,
    isoDate:         f.isoDate,
    departureTime:   f.departureTime || undefined,
    airlineName:     f.airlineName,
    flightAwareUrl:  `https://www.flightaware.com/live/flight/${f.airlineIcao}${f.flightNumber}`,
  }));

  function handleExportICS() {
    downloadICS(`${trip.name.replace(/\s+/g, "-")}.ics`, generateICS(calFlights));
  }

  async function handleShareWhatsApp() {
    const waFlights: WhatsAppFlight[] = sorted.map((f) => ({
      flightCode:      f.flightCode,
      airlineName:     f.airlineName,
      originCode:      f.originCode,
      originCity:      AIRPORTS[f.originCode]?.city ?? f.originCode,
      destinationCode: f.destinationCode,
      destinationCity: AIRPORTS[f.destinationCode]?.city ?? f.destinationCode,
      isoDate:         f.isoDate,
      departureTime:   f.departureTime || undefined,
      arrivalBuffer:   f.arrivalBuffer,
      arrivalRec:      f.departureTime ? subtractHours(f.departureTime, f.arrivalBuffer) : undefined,
    }));
    const msg = buildWhatsAppMessage(trip.name, waFlights, locale);
    try {
      await navigator.clipboard.writeText(msg);
      setWaCopied(true);
      setTimeout(() => setWaCopied(false), 2500);
    } catch {
      window.open(buildWhatsAppURL(msg), "_blank", "noopener,noreferrer");
    }
  }

  async function handleShareLink() {
    const url = buildShareURL(trip.name, trip.flights);
    const ok = await copyToClipboard(url);
    setCopied(ok);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Import handler ──────────────────────────────────────────────────────────
  function handleImportFlights(parsedFlights: ParsedFlight[]) {
    for (const pf of parsedFlights) {
      const newFlight: TripFlight = {
        id:              `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
        flightCode:      pf.flightCode,
        airlineCode:     pf.airlineCode,
        airlineName:     pf.airlineName,
        airlineIcao:     pf.airlineIcao,
        flightNumber:    pf.flightNumber,
        originCode:      pf.originCode,
        destinationCode: pf.destinationCode,
        isoDate:         pf.isoDate,
        departureTime:   pf.departureTime,
        arrivalBuffer:   pf.arrivalBuffer,
      };
      onAddFlight(trip.id, newFlight);
    }
  }

  return (
    <div className="space-y-4">
      {/* Draft banner */}
      {isDraft && (
        <div className="rounded-xl border border-yellow-700/40 bg-yellow-950/20 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-yellow-400 px-2 py-0.5 rounded-md border border-yellow-700/50 bg-yellow-900/30">
              {locale === "es" ? "Borrador" : "Draft"}
            </span>
            <p className="text-xs text-yellow-300/70">
              {locale === "es"
                ? "Agregá tus vuelos y guardá el viaje cuando estés listo"
                : "Add your flights and save the trip when you're ready"}
            </p>
          </div>
          <button
            onClick={onSave}
            className="shrink-0 flex items-center gap-1.5 rounded-xl bg-yellow-600 hover:bg-yellow-500 active:scale-95 text-white text-xs font-bold px-3 py-2 transition-all tap-scale"
          >
            <BookmarkCheck className="h-3.5 w-3.5" />
            {locale === "es" ? "Guardar viaje" : "Save trip"}
          </button>
        </div>
      )}

      {/* Trip Risk Score */}
      {sorted.length > 0 && (
        <TripRiskBadge risk={riskScore} locale={locale} />
      )}

      {/* Trip Timeline */}
      <TripTimeline
        flights={trip.flights}
        statusMap={statusMap}
        connectionMap={connectionMap}
      />

      {/* Empty state — shown before the form when no flights yet */}
      {sorted.length === 0 && (
        <div className="rounded-xl border border-white/6 bg-white/[0.02] px-5 py-6 text-center">
          <p className="text-sm text-gray-300 font-medium mb-1">
            {locale === "en" ? "No flights added yet" : "Todavía no hay vuelos"}
          </p>
          <p className="text-xs text-gray-500 leading-relaxed max-w-sm mx-auto">
            {locale === "en"
              ? "Add your flights to see connection risk, weather forecast, and airport status — all in one place."
              : "Agregá tus vuelos para ver riesgo de conexión, pronóstico meteorológico y estado de cada aeropuerto — todo en una sola vista."}
          </p>
        </div>
      )}

      {/* Add flight form */}
      <AddFlightForm
        tripId={trip.id}
        onAdd={onAddFlight}
        onOpenImport={() => setShowImport(true)}
        locale={locale}
      />

      {/* Action bar */}
      {trip.flights.length > 0 && (
        <div className="space-y-2">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleExportICS}
              className="flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/4 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/8 hover:text-white transition-colors"
            >
              <Calendar className="h-3.5 w-3.5" />
              {locale === "en" ? "Export .ics" : "Exportar .ics"}
            </button>

            <div className="relative">
              <button
                onClick={() => setShowGcal((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/4 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/8 hover:text-white transition-colors"
              >
                <Calendar className="h-3.5 w-3.5 text-blue-400" />
                Google Calendar
              </button>
              {showGcal && (
                <div className="absolute top-full mt-1 left-0 z-20 min-w-[220px] rounded-xl border border-white/8 bg-[#0f0f17] shadow-2xl py-1">
                  {calFlights.map((cf, i) => (
                    <a
                      key={i}
                      href={buildGoogleCalendarURL(cf)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setShowGcal(false)}
                      className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-white/6 hover:text-white transition-colors"
                    >
                      <span>
                        <span className="font-semibold">{cf.flightCode}</span>
                        <span className="text-gray-500 ml-1">{cf.originCode}→{cf.destinationCode}</span>
                      </span>
                      <span className="text-gray-500 shrink-0">
                        {new Date(cf.isoDate + "T00:00:00").toLocaleDateString(
                          locale === "en" ? "en-US" : "es-AR",
                          { day: "numeric", month: "short" }
                        )}
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-800/50 bg-emerald-950/20 px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-950/40 hover:text-emerald-300 transition-colors"
            >
              <Share2 className="h-3.5 w-3.5" />
              {waCopied
                ? (locale === "en" ? "Copied! Paste in WhatsApp" : "¡Copiado! Pegalo en WhatsApp")
                : "WhatsApp"}
            </button>

            <button
              onClick={handleShareLink}
              className="flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/4 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/8 hover:text-white transition-colors"
            >
              {copied ? <CheckCheck className="h-3.5 w-3.5 text-emerald-400" /> : <Share2 className="h-3.5 w-3.5" />}
              {copied
                ? (locale === "en" ? "Copied!" : "¡Copiado!")
                : (locale === "en" ? "Copy link" : "Copiar link")}
            </button>
          </div>
        </div>
      )}

      {/* Flight cards */}
      {sorted.length === 0 ? (
        <div className="rounded-xl border border-white/6 py-12 text-center">
          <Plane className="h-8 w-8 text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500">{L.noFlights}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map((flight, idx) => (
            <FlightCard
              key={flight.id}
              flight={flight}
              statusMap={statusMap}
              weatherMap={weatherMap}
              locale={locale}
              onRemove={() => onRemoveFlight(trip.id, flight.id)}
              idx={idx}
              connectionToNext={connByFlight.get(flight.id)}
              nextDestination={sorted[idx + 1]?.destinationCode}
              nextDate={sorted[idx + 1]?.isoDate}
              tafData={tafMap[flight.originCode]}
              activeSigmets={sigmetsByFlight.get(flight.id)}
              tsaData={tsaData[flight.originCode]}
            />
          ))}
        </div>
      )}

      {/* Import modal */}
      {showImport && (
        <ImportFlightsModal
          onImport={handleImportFlights}
          onClose={() => setShowImport(false)}
          locale={locale}
        />
      )}
    </div>
  );
}
