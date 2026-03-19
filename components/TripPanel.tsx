"use client";

import { useState, useMemo } from "react";
import {
  Plus, X, Calendar, Share2, CheckCheck,
  Plane, Trash2, BookmarkCheck, Pencil, Copy,
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
import { TRIP_PANEL_LABELS } from "./TripPanelLabels";
import { analytics } from "@/lib/analytics";

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
}: TripPanelProps) {
  const { locale } = useLanguage();
  const L = TRIP_PANEL_LABELS[locale];
  const [copied, setCopied]             = useState(false);
  const [waCopied, setWaCopied]         = useState(false);
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
    if (ok) analytics.sharedLink();
    setCopied(ok);
    setTimeout(() => setCopied(false), 2000);
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
                onClick={onDeleteTrip}
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
            onClick={onDeleteTrip}
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
      {sorted.length > 0 && <TripRiskBadge risk={riskScore} locale={locale} />}

      {/* Trip Timeline */}
      <TripTimeline flights={trip.flights} statusMap={statusMap} connectionMap={connectionMap} />

      {/* Flight cards */}
      {sorted.length === 0 ? (
        <div className="rounded-xl border border-white/6 bg-white/[0.02] px-5 py-8 text-center">
          <Plane className="h-8 w-8 text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-300 font-medium mb-1">{L.noFlights}</p>
          <p className="text-xs text-gray-500 leading-relaxed max-w-sm mx-auto">
            {locale === "en"
              ? "Add your flights to see connection risk, weather forecast, and airport status."
              : "Agregá tus vuelos para ver riesgo de conexión, pronóstico y estado de aeropuertos."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map((flight, idx) => {
            const acc = trip.accommodations.find((a) => a.flightId === flight.id) ?? null;
            return (
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
