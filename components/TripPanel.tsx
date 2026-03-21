"use client";

import { useState, useMemo, Fragment } from "react";
import toast from "react-hot-toast";
import {
  Plus, X, Calendar, Share2, CheckCheck,
  Plane, Trash2, Pencil, Copy,
  Save, PlaneTakeoff, ChevronRight, AlertTriangle, Clock, CheckCircle, Link,
} from "lucide-react";
import { AirportStatusMap, TripFlight, TripTab, Accommodation } from "@/lib/types";
import { AIRPORTS } from "@/lib/airports";
import { subtractHours } from "@/lib/flightUtils";
import { useLanguage } from "@/contexts/LanguageContext";
import { WeatherData } from "@/hooks/useWeather";
import { useTaf } from "@/hooks/useTaf";
import { useSigmet, SigmetFeature, routeIntersectsSigmet } from "@/hooks/useSigmet";
import { TripTimeline } from "./TripTimeline";
import { AddFlightForm } from "./FlightForm";
import { estimateArrivalDate } from "./AccommodationCard";
import { CalendarFlight, generateICS, downloadICS, buildGoogleCalendarURL } from "@/lib/calendarExport";
import { buildShareURL, copyToClipboard, buildWhatsAppMessage, buildWhatsAppURL, WhatsAppFlight } from "@/lib/tripShare";
import { analyzeAllConnections, ConnectionAnalysis } from "@/lib/connectionRisk";
import { calculateTripRiskScore } from "@/lib/tripRiskScore";
import { TripRiskBadge } from "./TripRiskBadge";
import { TripAdvisor } from "./TripAdvisor";
import { ImportFlightsModal } from "./ImportFlightsModal";
import { ParsedFlight } from "@/lib/importFlights";
import { useTsaWait } from "@/hooks/useTsaWait";
import { FlightCard } from "./FlightCard";
import { FlightCardSkeleton } from "./FlightCardSkeleton";
import { TRIP_PANEL_LABELS } from "./TripPanelLabels";
import { analytics } from "@/lib/analytics";
import { FlightCountdownBadge } from "./FlightCountdownBadge";

// ── Connection Separator ──────────────────────────────────────────────────────

function formatBuffer(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ── TripPanel ─────────────────────────────────────────────────────────────────

interface TripPanelProps {
  trip: TripTab;
  statusMap: AirportStatusMap;
  weatherMap: Record<string, WeatherData>;
  onAddFlight: (tripId: string, flight: TripFlight) => void;
  onRemoveFlight: (tripId: string, flightId: string) => void;
  onAddAccommodation: (tripId: string, acc: Omit<Accommodation, "id" | "tripId">) => void;
  onRemoveAccommodation: (tripId: string, accId: string) => void;
  onUpdateAccommodation: (tripId: string, accId: string, updates: Pick<Accommodation, "name" | "checkInTime" | "checkOutTime" | "confirmationCode" | "address">) => void;
  onDeleteTrip?: () => void;
  onRenameTrip?: (name: string) => void;
  onDuplicateTrip?: () => void;
  isDraft?: boolean;
  onSave?: () => void;
  loading?: boolean;
}

export function TripPanel({
  trip,
  statusMap,
  weatherMap,
  onAddFlight,
  onRemoveFlight,
  onAddAccommodation,
  onRemoveAccommodation,
  onUpdateAccommodation,
  onDeleteTrip,
  onRenameTrip,
  onDuplicateTrip,
  isDraft,
  onSave,
  loading,
}: TripPanelProps) {
  const { locale } = useLanguage();
  const L = TRIP_PANEL_LABELS[locale];
  const [copied, setCopied]             = useState(false);
  const [waCopied, setWaCopied]         = useState(false);
  const [linkCopied, setLinkCopied]     = useState(false);
  const [showGcal, setShowGcal]         = useState(false);
  const [showImport, setShowImport]     = useState(false);
  const [showAddForm, setShowAddForm]   = useState(false);
  const [isRenamingTrip, setIsRenamingTrip]     = useState(false);
  const [renamingTripName, setRenamingTripName] = useState("");

  const sorted = useMemo(
    () => [...trip.flights].sort((a, b) => {
      const d = a.isoDate.localeCompare(b.isoDate);
      return d !== 0 ? d : (a.departureTime ?? "").localeCompare(b.departureTime ?? "");
    }),
    [trip.flights],
  );

  const nextFlight = useMemo(() => {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    return sorted.find((f) => {
      if (!f.departureTime) return false;
      const tz = AIRPORTS[f.originCode]?.timezone ?? "UTC";
      const parts = f.departureTime.split(":").map(Number);
      if (parts.length < 2) return false;
      const [h, m] = parts;
      try {
        const refMs = Date.UTC(
          parseInt(f.isoDate.slice(0, 4)),
          parseInt(f.isoDate.slice(5, 7)) - 1,
          parseInt(f.isoDate.slice(8, 10)),
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
          parseInt(f.isoDate.slice(0, 4)),
          parseInt(f.isoDate.slice(5, 7)) - 1,
          parseInt(f.isoDate.slice(8, 10)),
        );
        const depMs = midnightUTC + (h * 60 + m + offsetMin) * 60000;
        const msLeft = depMs - now;
        return msLeft > 0 && msLeft <= oneDayMs;
      } catch {
        return false;
      }
    }) ?? null;
  }, [sorted]);

  const tsaData    = useTsaWait();
  const tafMap     = useTaf(sorted.map((f) => f.originCode));
  const allSigmets = useSigmet();

  const sigmetsByFlight = useMemo(() => {
    const map = new Map<string, SigmetFeature[]>();
    for (const flight of sorted) {
      const origin = AIRPORTS[flight.originCode];
      const dest   = AIRPORTS[flight.destinationCode];
      if (!origin?.lat || !dest?.lat) continue;
      const matches = routeIntersectsSigmet(origin.lat, origin.lng, dest.lat, dest.lng, allSigmets);
      if (matches.length > 0) map.set(flight.id, matches);
    }
    return map;
  }, [sorted, allSigmets]);

  const connectionMap = useMemo(
    () => analyzeAllConnections(sorted, statusMap),
    [sorted, statusMap],
  );

  const connByFlight = useMemo(() => {
    const map = new Map<string, ConnectionAnalysis>();
    connectionMap.forEach((analysis, key) => {
      map.set(key.split("→")[0], analysis);
    });
    return map;
  }, [connectionMap]);

  const riskScore = useMemo(
    () => calculateTripRiskScore(sorted, statusMap, locale),
    [sorted, statusMap, locale],
  );

  const advisorFlights = useMemo(() =>
    sorted.map((f) => ({
      isoDate:           f.isoDate,
      originCode:        f.originCode,
      destinationCode:   f.destinationCode,
      destinationName:   AIRPORTS[f.destinationCode]?.city ?? f.destinationCode,
      destinationNameEn: AIRPORTS[f.destinationCode]?.city ?? f.destinationCode,
    })),
    [sorted],
  );

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
    analytics.calendarExported();
  }

  async function handleShareWhatsApp() {
    analytics.sharedWhatsApp();
    const waFlights: WhatsAppFlight[] = sorted.map((f) => ({
      flightCode:      f.flightCode,
      airlineName:     f.airlineName,
      originCode:      f.originCode,
      originCity:      AIRPORTS[f.originCode]?.city ?? f.originCode,
      destinationCode: f.destinationCode,
      destinationCity: AIRPORTS[f.destinationCode]?.city ?? f.destinationCode,
      isoDate:         f.isoDate,
      departureTime:   f.departureTime || undefined,
      arrivalTime:     f.arrivalTime   || undefined,
      arrivalDate:     f.arrivalDate   || undefined,
      arrivalBuffer:   f.arrivalBuffer,
      arrivalRec:      f.departureTime ? subtractHours(f.departureTime, f.arrivalBuffer) : undefined,
    }));
    const msg = buildWhatsAppMessage(trip.name, waFlights, locale, trip.accommodations);
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
    if (ok) analytics.sharedLink();
    setCopied(ok);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleFamilyLink() {
    try {
      const res = await fetch("/api/share/trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId: trip.id }),
      });
      if (!res.ok) throw new Error("Failed to create share token");
      const json = await res.json() as { token?: string };
      if (!json.token) throw new Error("No token returned");
      const url = `${window.location.origin}/share/${json.token}`;
      const ok = await copyToClipboard(url);
      if (ok) {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 3000);
      }
    } catch {
      navigator.vibrate?.([100, 50, 100]);
      toast.error(locale === "es" ? "No se pudo crear el link familiar" : "Could not create family link");
    }
  }

  function handleImportFlights(parsedFlights: ParsedFlight[]) {
    analytics.flightImported({ count: parsedFlights.length });
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
    const n = parsedFlights.length;
    toast.success(`${n} ${locale === "es" ? "vuelos importados ✓" : "flights imported ✓"}`);
  }

  return (
    <div className="space-y-4">
      {/* Trip header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-0.5">
            {locale === "es" ? "Viaje" : "Trip"}
          </p>
          {isRenamingTrip ? (
            <input
              autoFocus
              value={renamingTripName}
              onChange={(e) => setRenamingTripName(e.target.value)}
              onBlur={() => {
                if (renamingTripName.trim() && onRenameTrip) onRenameTrip(renamingTripName.trim());
                setIsRenamingTrip(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (renamingTripName.trim() && onRenameTrip) onRenameTrip(renamingTripName.trim());
                  setIsRenamingTrip(false);
                }
                if (e.key === "Escape") setIsRenamingTrip(false);
              }}
              maxLength={40}
              className="w-full bg-white/[0.06] border border-blue-500/50 rounded-lg px-3 py-1.5 text-base font-black text-white outline-none"
            />
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-white truncate">{trip.name}</h2>
              {onRenameTrip && (
                <button
                  onClick={() => { setRenamingTripName(trip.name); setIsRenamingTrip(true); }}
                  title={locale === "es" ? "Renombrar viaje" : "Rename trip"}
                  className="shrink-0 p-1 rounded-md text-gray-600 hover:text-gray-300 transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
        {!isRenamingTrip && !isDraft && (
          <div className="flex items-center gap-2">
            {onDuplicateTrip && (
              <button
                onClick={onDuplicateTrip}
                title={locale === "es" ? "Duplicar viaje" : "Duplicate trip"}
                className="shrink-0 flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-semibold text-gray-400 hover:text-white hover:border-white/20 transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{locale === "es" ? "Duplicar" : "Duplicate"}</span>
              </button>
            )}
            {onDeleteTrip && (
              <button
                onClick={() => { navigator.vibrate?.([50, 30, 50]); onDeleteTrip(); }}
                title={locale === "es" ? "Eliminar viaje" : "Delete trip"}
                className="shrink-0 flex items-center gap-1.5 rounded-xl border border-red-900/40 bg-red-950/20 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-950/40 hover:text-red-400 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{locale === "es" ? "Eliminar" : "Delete"}</span>
              </button>
            )}
          </div>
        )}
        {isDraft && onDeleteTrip && !isRenamingTrip && (
          <button
            onClick={() => { navigator.vibrate?.([50, 30, 50]); onDeleteTrip(); }}
            title={locale === "es" ? "Eliminar viaje" : "Delete trip"}
            className="shrink-0 flex items-center gap-1.5 rounded-xl border border-red-900/40 bg-red-950/20 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-950/40 hover:text-red-400 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{locale === "es" ? "Eliminar" : "Delete"}</span>
          </button>
        )}
      </div>

      {/* Draft banner */}
      {isDraft && (
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-3 bg-violet-950/80 border border-violet-700/40 rounded-xl backdrop-blur-sm mx-0 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-violet-400">✏️</span>
            <div>
              <p className="text-xs font-bold text-violet-300">{locale === "es" ? "Borrador — no guardado" : "Draft — not saved"}</p>
              <p className="text-[10px] text-violet-500">
                {locale === "es"
                  ? `${trip.flights.length} vuelo${trip.flights.length !== 1 ? "s" : ""} · listo para guardar`
                  : `${trip.flights.length} flight${trip.flights.length !== 1 ? "s" : ""} · ready to save`}
              </p>
            </div>
          </div>
          <button
            onClick={() => { navigator.vibrate?.(30); onSave?.(); }}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 px-4 py-2 text-xs font-bold text-white transition-colors shrink-0"
          >
            <Save className="h-3.5 w-3.5" />
            {locale === "es" ? "Guardar viaje" : "Save trip"}
          </button>
        </div>
      )}

      {/* Flight Countdown Badge */}
      {nextFlight && (
        <FlightCountdownBadge flight={nextFlight} locale={locale} />
      )}

      {/* Trip Risk Score */}
      {sorted.length > 0 && <TripRiskBadge risk={riskScore} locale={locale} />}

      {/* Trip Timeline */}
      <TripTimeline flights={trip.flights} statusMap={statusMap} connectionMap={connectionMap} />

      {/* Flight cards */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-6 py-12 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-14 w-14 rounded-2xl bg-blue-950/40 border border-blue-800/30 flex items-center justify-center">
              <PlaneTakeoff className="h-7 w-7 text-blue-400" />
            </div>
            <p className="text-sm font-semibold text-white">{locale === "es" ? "Tu itinerario está vacío" : "Your itinerary is empty"}</p>
            <p className="text-xs text-gray-500 max-w-xs">{locale === "es" ? "Agregá tus vuelos para ver el riesgo de conexión, clima y alertas en tiempo real" : "Add your flights to see connection risk, weather and real-time alerts"}</p>
          </div>

          {/* 3 micro-steps */}
          <div className="flex items-center gap-2 text-[11px] text-gray-600">
            {[
              locale === "es" ? "Agregá un vuelo" : "Add a flight",
              locale === "es" ? "Monitoreá el aeropuerto" : "Monitor airport",
              locale === "es" ? "Recibí alertas" : "Get alerts",
            ].map((step, i) => (
              <Fragment key={i}>
                {i > 0 && <ChevronRight className="h-3 w-3 text-gray-700 shrink-0" />}
                <span className={i === 0 ? "text-blue-400 font-medium" : ""}>{step}</span>
              </Fragment>
            ))}
          </div>

          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors"
          >
            <Plus className="h-4 w-4" />
            {locale === "es" ? "Agregar primer vuelo" : "Add first flight"}
          </button>
        </div>
      ) : loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <FlightCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="space-y-0">
          {sorted.map((flight, idx) => {
            const acc = trip.accommodations.find((a) => a.flightId === flight.id) ?? null;
            const connAnalysis = connByFlight.get(flight.id);
            return (
              <Fragment key={flight.id}>
                <div className="mb-4">
                  <FlightCard
                    flight={flight}
                    statusMap={statusMap}
                    weatherMap={weatherMap}
                    locale={locale}
                    onRemove={() => onRemoveFlight(trip.id, flight.id)}
                    idx={idx}
                    connectionToNext={connAnalysis}
                    nextDestination={sorted[idx + 1]?.destinationCode}
                    nextDate={sorted[idx + 1]?.isoDate}
                    tafData={tafMap[flight.originCode]}
                    activeSigmets={sigmetsByFlight.get(flight.id)}
                    tsaData={tsaData[flight.originCode]}
                    accommodation={acc}
                    onAddAccommodation={(data) =>
                      onAddAccommodation(trip.id, {
                        flightId:         flight.id,
                        name:             data.name,
                        checkInDate:      estimateArrivalDate(flight.isoDate, flight.departureTime, flight.arrivalBuffer),
                        checkInTime:      data.checkInTime,
                        checkOutDate:     sorted[idx + 1]?.isoDate,
                        checkOutTime:     data.checkOutTime,
                        confirmationCode: data.confirmationCode,
                        address:          data.address,
                      })
                    }
                    onRemoveAccommodation={() => acc && onRemoveAccommodation(trip.id, acc.id)}
                    onEditAccommodation={(name, checkInTime, checkOutTime, confirmationCode, address) =>
                      acc && onUpdateAccommodation(trip.id, acc.id, { name, checkInTime, checkOutTime, confirmationCode, address })
                    }
                  />
                </div>
                {connAnalysis && connAnalysis.risk !== "safe" && idx < sorted.length - 1 && (
                  <div className="flex items-center gap-2 my-1 px-2">
                    <div className={`flex-1 h-px ${
                      connAnalysis.risk === "missed" || connAnalysis.risk === "at_risk"
                        ? "bg-red-500/40"
                        : "bg-yellow-500/40"
                    }`} />
                    <span className={`text-xs flex items-center gap-1 ${
                      connAnalysis.risk === "missed" || connAnalysis.risk === "at_risk"
                        ? "text-red-400"
                        : "text-yellow-400"
                    }`}>
                      <AlertTriangle className="w-3 h-3" />
                      {connAnalysis.risk === "missed"
                        ? (locale === "es" ? "Conexión imposible" : "Missed connection")
                        : connAnalysis.risk === "at_risk"
                        ? (locale === "es" ? "Conexión en riesgo" : "Connection at risk")
                        : (locale === "es" ? "Conexión ajustada" : "Tight connection")
                      }
                    </span>
                    <div className={`flex-1 h-px ${
                      connAnalysis.risk === "missed" || connAnalysis.risk === "at_risk"
                        ? "bg-red-500/40"
                        : "bg-yellow-500/40"
                    }`} />
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>
      )}

      {/* Action bar */}
      {trip.flights.length > 0 && (
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

          {!isDraft && (
            <button
              onClick={handleFamilyLink}
              title={locale === "es" ? "Genera un link de seguimiento en tiempo real para tu familia" : "Generate a real-time tracking link for your family"}
              className="flex items-center gap-1.5 rounded-lg border border-violet-800/50 bg-violet-950/20 px-3 py-1.5 text-xs text-violet-400 hover:bg-violet-950/40 hover:text-violet-300 transition-colors"
            >
              <Link className="h-3.5 w-3.5" />
              {linkCopied
                ? (locale === "en" ? "Link copied!" : "¡Link copiado!")
                : (locale === "en" ? "Family link" : "Link familiar")}
            </button>
          )}

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
      )}

      {/* Trip guide */}
      {sorted.length > 0 && <TripAdvisor flights={advisorFlights} locale={locale} />}

      {/* Add flight */}
      {sorted.length > 0 && !showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] py-3 text-sm font-semibold text-gray-400 hover:text-white transition-all"
        >
          <Plus className="h-4 w-4" />
          {L.addMoreFlights}
        </button>
      )}

      {(sorted.length === 0 || showAddForm) && (
        <div>
          {showAddForm && sorted.length > 0 && (
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{L.addMoreFlights}</span>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-1 rounded-lg text-gray-600 hover:text-gray-300 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <AddFlightForm
            tripId={trip.id}
            existingFlights={trip.flights}
            onAdd={(tid, flight) => { onAddFlight(tid, flight); if (sorted.length > 0) setShowAddForm(false); }}
            onOpenImport={() => setShowImport(true)}
            locale={locale}
            L={L}
          />
        </div>
      )}

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
