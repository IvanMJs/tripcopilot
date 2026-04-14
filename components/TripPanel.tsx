"use client";

import { useState, useMemo, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  Plus, X, Calendar, Share2,
  Plane, Bell, Trash2, Pencil, Copy, Check,
  Save, ChevronRight,
  Sparkles, Loader2, List, GitBranch,
  Eye, Users,
} from "lucide-react";
import { AirportStatusMap, TripFlight, TripTab, Accommodation, Passenger } from "@/lib/types";
import { haptics } from "@/lib/haptics";
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
import { ItineraryImportModal } from "./ItineraryImportModal";
import { CarbonFootprint } from "./CarbonFootprint";
import { TripExpenses } from "./TripExpenses";
import { TripBudgetCard } from "./TripBudgetCard";
import { ParsedFlight } from "@/lib/importFlights";
import { FlightCard } from "./FlightCard";
import { FlightCardSkeleton } from "./FlightCardSkeleton";
import { TRIP_PANEL_LABELS } from "./TripPanelLabels";
import { formatRelativeDate } from "@/lib/formatDate";
import { analytics } from "@/lib/analytics";
import { FlightCountdownBadge } from "./FlightCountdownBadge";
import { ConnectionRiskBar } from "./ConnectionRiskBar";
import { StopoverBadge } from "./StopoverBadge";
import { TripStatsCard } from "./TripStatsCard";
import { TripShareModal } from "./TripShareModal";
import { TripPassengers } from "./TripPassengers";
import { TripChecklist } from "./TripChecklist";
import { PriceAlerts } from "./PriceAlerts";
import { LoungeInfo } from "./LoungeInfo";
import { VisaInfo } from "./VisaInfo";
import { airportToCountry } from "@/lib/visaRequirements";
import { LayoverGuide } from "./LayoverGuide";
import { EmptyState } from "./EmptyState";
import { DepartureTimeWidget } from "./DepartureTimeWidget";
import { GeoPosition } from "@/hooks/useGeolocation";

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
  onBoardingPassSaved?: (flightId: string, url: string | null) => void;
  onToggleUpgrade?: (flightId: string, wants: boolean) => void;
  globalNextFlightId?: string | null;
  isDraft?: boolean;
  onSave?: () => void;
  loading?: boolean;
  showDeviceTz?: boolean;
  deviceTz?: string;
  onToggleDeviceTz?: () => void;
  onUpdatePassengers?: (tripId: string, passengers: Passenger[]) => void;
  geoPosition?: GeoPosition | null;
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
  onBoardingPassSaved,
  onToggleUpgrade,
  globalNextFlightId,
  isDraft,
  onSave,
  loading,
  showDeviceTz,
  deviceTz,
  onToggleDeviceTz,
  onUpdatePassengers,
  geoPosition = null,
}: TripPanelProps) {
  const { locale } = useLanguage();
  const L = TRIP_PANEL_LABELS[locale];

  // Role-based access: viewers can read but not write
  const canEdit = trip.collaboratorRole !== "viewer";
  // Owners can also delete/rename/manage collaborators
  const isOwner = !trip.isShared || trip.collaboratorRole === "owner";

  const [copied, setCopied]             = useState(false);
  const [waCopied, setWaCopied]         = useState(false);
  const [showGcal, setShowGcal]         = useState(false);
  const [showImport, setShowImport]     = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAddForm, setShowAddForm]   = useState(false);
  const [isRenamingTrip, setIsRenamingTrip]     = useState(false);
  const [renamingTripName, setRenamingTripName] = useState("");
  const [saving, setSaving]             = useState(false);
  const [viewMode, setViewMode]         = useState<"list" | "timeline">("list");
  const [panelTab, setPanelTab]         = useState<"flights" | "expenses" | "alerts" | "passengers" | "checklist">("flights");

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
    analytics.shareTrip({ method: "whatsapp" });
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
    if (ok) { analytics.sharedLink(); analytics.shareTrip({ method: "link" }); }
    setCopied(ok);
    setTimeout(() => setCopied(false), 1500);
  }


  async function handleExportPdf() {
    const win = window.open("", "_blank", "noopener,noreferrer");
    if (!win) return;
    try {
      const res = await fetch("/api/itinerary-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trip, locale }),
      });
      if (!res.ok) {
        win.close();
        toast.error(locale === "es" ? "Error al generar PDF" : "Failed to generate PDF");
        return;
      }
      const html = await res.text();
      win.document.open();
      win.document.write(html);
      win.document.close();
    } catch {
      win.close();
      toast.error(locale === "es" ? "Error al generar PDF" : "Failed to generate PDF");
    }
  }

  function handleImportFlights(parsedFlights: ParsedFlight[]) {
    analytics.flightImported({ count: parsedFlights.length });
    for (const pf of parsedFlights) {
      const newFlight: TripFlight = {
        id:              crypto.randomUUID(),
        flightCode:      pf.flightCode,
        airlineCode:     pf.airlineCode,
        airlineName:     pf.airlineName,
        airlineIcao:     pf.airlineIcao,
        flightNumber:    pf.flightNumber,
        originCode:      pf.originCode,
        destinationCode: pf.destinationCode,
        isoDate:         pf.isoDate,
        departureTime:   pf.departureTime,
        arrivalDate:     pf.arrivalDate   || undefined,
        arrivalTime:     pf.arrivalTime   || undefined,
        arrivalBuffer:   pf.arrivalBuffer,
        bookingCode:     pf.bookingCode || undefined,
      };
      onAddFlight(trip.id, newFlight);
    }
    const n = parsedFlights.length;
    toast.success(`${n} ${locale === "es" ? "vuelos importados ✓" : "flights imported ✓"}`);
  }

  return (
    <section aria-label={locale === "es" ? "Detalles del viaje" : "Trip details"} className="space-y-4">
      {/* Trip header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-0.5">
            {locale === "es" ? "Viaje" : "Trip"}
          </p>
          {trip.isShared && (
            <div className="flex items-center gap-1.5 mb-1">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-violet-900/30 border border-violet-700/40 text-violet-300">
                <Users className="h-3 w-3" />
                {locale === "es" ? "Viaje compartido" : "Shared trip"}
              </span>
              {trip.collaboratorRole && trip.collaboratorRole !== "owner" && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400">
                  {trip.collaboratorRole === "viewer"
                    ? <><Eye className="h-3 w-3" />{locale === "es" ? "Lector" : "Viewer"}</>
                    : <><Pencil className="h-3 w-3" />{locale === "es" ? "Editor" : "Editor"}</>
                  }
                </span>
              )}
            </div>
          )}
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
              {onRenameTrip && isOwner && (
                <button
                  onClick={() => { setRenamingTripName(trip.name); setIsRenamingTrip(true); }}
                  title={locale === "es" ? "Renombrar viaje" : "Rename trip"}
                  aria-label={locale === "es" ? "Editar" : "Edit"}
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
            {isOwner && (
              <button
                onClick={() => setShowShareModal(true)}
                title={locale === "es" ? "Compartir viaje" : "Share trip"}
                aria-label={locale === "es" ? "Compartir viaje" : "Share trip"}
                className="shrink-0 p-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-gray-400 hover:text-white hover:border-white/20 transition-colors"
              >
                <Share2 className="h-3.5 w-3.5" />
              </button>
            )}
            {onDuplicateTrip && isOwner && (
              <button
                onClick={onDuplicateTrip}
                title={locale === "es" ? "Duplicar viaje" : "Duplicate trip"}
                aria-label={locale === "es" ? "Duplicar viaje" : "Duplicate trip"}
                className="shrink-0 flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-semibold text-gray-400 hover:text-white hover:border-white/20 transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{locale === "es" ? "Duplicar" : "Duplicate"}</span>
              </button>
            )}
            {onDeleteTrip && isOwner && (
              <button
                onClick={() => { haptics.delete(); onDeleteTrip(); }}
                title={locale === "es" ? "Eliminar viaje" : "Delete trip"}
                aria-label={locale === "es" ? "Eliminar viaje" : "Delete trip"}
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
            onClick={() => { haptics.delete(); onDeleteTrip(); }}
            title={locale === "es" ? "Eliminar viaje" : "Delete trip"}
            aria-label={locale === "es" ? "Eliminar viaje" : "Delete trip"}
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
              <p className="text-xs text-violet-500">
                {locale === "es"
                  ? `${trip.flights.length} vuelo${trip.flights.length !== 1 ? "s" : ""} · listo para guardar`
                  : `${trip.flights.length} flight${trip.flights.length !== 1 ? "s" : ""} · ready to save`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              haptics.success();
              setSaving(true);
              try { await Promise.resolve(onSave?.()); } finally { setSaving(false); }
            }}
            disabled={saving}
            className={`btn-primary flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold shrink-0 ${saving ? "opacity-70 cursor-not-allowed" : ""}`}
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {locale === "es" ? "Guardando..." : "Saving..."}
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                {locale === "es" ? "Guardar viaje" : "Save trip"}
              </>
            )}
          </button>
        </div>
      )}

      {/* Flight Countdown Badge */}
      {nextFlight && (
        <FlightCountdownBadge flight={nextFlight} locale={locale} />
      )}

      {/* Trip Risk Score */}
      {sorted.length > 0 && <TripRiskBadge risk={riskScore} locale={locale} />}

      {/* Trip Stats */}
      {!isDraft && trip.flights.length > 0 && <TripStatsCard trip={trip} locale={locale} />}

      {/* Panel tab switcher */}
      {!isDraft && (
        <div className="flex items-center bg-white/5 rounded-xl p-0.5 gap-0.5">
          {(
            [
              { id: "flights",    label: locale === "es" ? "Vuelos"    : "Flights",    icon: <Plane className="h-3.5 w-3.5" /> },
              { id: "expenses",   label: locale === "es" ? "Gastos"    : "Expenses",   icon: "💰" },
              { id: "alerts",     label: locale === "es" ? "Alertas"   : "Alerts",     icon: "🔔" },
              { id: "passengers", label: locale === "es" ? "Pasajeros" : "Passengers", icon: "👥" },
              { id: "checklist",  label: locale === "es" ? "Lista"     : "Checklist",  icon: "✅" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => { haptics.impact(); setPanelTab(tab.id); }}
              className={`relative flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                panelTab === tab.id ? "text-white" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {panelTab === tab.id && (
                <motion.span
                  layoutId="panel-tab-pill"
                  className="absolute inset-0 rounded-lg bg-white/10"
                  layout
                  transition={{ type: "spring", stiffness: 420, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                {tab.icon}
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Expenses tab */}
      {panelTab === "expenses" && !isDraft && (
        <>
          <TripBudgetCard trip={trip} locale={locale} />
          <TripExpenses tripId={trip.id} locale={locale} readOnly={!canEdit} />
        </>
      )}

      {/* Alerts tab */}
      {panelTab === "alerts" && !isDraft && (() => {
        const flightAirports = sorted.flatMap((f) => [f.originCode, f.destinationCode]);
        const hasDelayedAirport = flightAirports.some((code) => {
          const s = statusMap[code];
          return s && s.status !== "ok" && s.status !== "unknown";
        });
        const hasConnectionRisk = Array.from(connectionMap.values()).some(
          (a) => a.risk === "tight" || a.risk === "at_risk" || a.risk === "missed",
        );
        const hasActiveAlerts = hasDelayedAirport || hasConnectionRisk;
        return (
          <>
            {!hasActiveAlerts && (
              <EmptyState
                icon={<Bell className="w-8 h-8" />}
                title={locale === "es" ? "Todo en orden" : "All clear"}
                description={locale === "es" ? "No hay alertas activas para este viaje" : "No active alerts for this trip"}
              />
            )}
            <PriceAlerts locale={locale} />
          </>
        );
      })()}

      {/* Passengers tab */}
      {panelTab === "passengers" && !isDraft && (
        <TripPassengers tripId={trip.id} locale={locale} readOnly={!canEdit} />
      )}

      {/* Checklist tab */}
      {panelTab === "checklist" && !isDraft && (
        <TripChecklist tripId={trip.id} locale={locale} readOnly={!canEdit} />
      )}

      {/* Departure time widget — shown when a flight departs within 24 hours */}
      {(panelTab === "flights" || isDraft) && nextFlight && (
        <DepartureTimeWidget
          flight={nextFlight}
          geoPosition={geoPosition}
          locale={locale}
        />
      )}

      {/* Flight cards */}
      {(panelTab === "flights" || isDraft) && (sorted.length === 0 ? (
        <EmptyState
          icon={<Plane className="w-8 h-8" />}
          title={locale === "es" ? "Agrega vuelos a tu viaje" : "Add flights to your trip"}
          description={locale === "es" ? "Importa con IA o agrega manualmente" : "Import with AI or add manually"}
          cta={{ label: locale === "es" ? "Importar con IA" : "Import with AI", onClick: () => setShowImport(true) }}
          secondaryCta={{ label: locale === "es" ? "Agregar manualmente" : "Add manually", onClick: () => setShowAddForm(true) }}
        />
      ) : loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <FlightCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="space-y-0">
          {/* View mode toggle + Timeline header */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
              {locale === "es" ? "Vuelos" : "Flights"}
            </span>
            <div className="flex items-center bg-white/5 rounded-lg p-0.5 gap-0.5">
              <button
                onClick={() => setViewMode("list")}
                aria-label={locale === "es" ? "Vista lista" : "List view"}
                className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"}`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("timeline")}
                aria-label={locale === "es" ? "Vista cronograma" : "Timeline view"}
                className={`p-1.5 rounded-md transition-all ${viewMode === "timeline" ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"}`}
              >
                <GitBranch className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {viewMode === "timeline" ? (
            <TripTimeline flights={trip.flights} accommodations={trip.accommodations} statusMap={statusMap} connectionMap={connectionMap} />
          ) : (
            (() => {
              const todayIso = new Date().toISOString().slice(0, 10);
              const todayFlights = sorted.filter((f) => f.isoDate === todayIso);
              const otherFlights = sorted.filter((f) => f.isoDate !== todayIso);
              const nextFlight = sorted.find((f) => f.isoDate >= todayIso);
              const nextFlightId = globalNextFlightId !== undefined ? globalNextFlightId : (nextFlight?.id ?? null);

              function renderFlightCard(flight: TripFlight) {
                const globalIdx = sorted.indexOf(flight);
                const acc = trip.accommodations.find((a) => a.flightId === flight.id) ?? null;
                const connAnalysis = connByFlight.get(flight.id);
                return (
                  <Fragment key={flight.id}>
                    <motion.div
                      className="mb-4"
                      layout
                      initial={{ opacity: 0, y: 32, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -50, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 340, damping: 28, delay: globalIdx * 0.08 }}
                    >
                      <FlightCard
                        flight={flight}
                        statusMap={statusMap}
                        weatherMap={weatherMap}
                        locale={locale}
                        isNextFlight={flight.id === nextFlightId}
                        onRemove={canEdit ? () => onRemoveFlight(trip.id, flight.id) : undefined}
                        idx={globalIdx}
                        connectionToNext={connAnalysis}
                        nextDestination={sorted[globalIdx + 1]?.destinationCode}
                        nextDate={sorted[globalIdx + 1]?.isoDate}
                        tafData={tafMap[flight.originCode]}
                        activeSigmets={sigmetsByFlight.get(flight.id)}
                        accommodation={acc}
                        onAddAccommodation={canEdit ? (data) =>
                          onAddAccommodation(trip.id, {
                            flightId:         flight.id,
                            name:             data.name,
                            checkInDate:      estimateArrivalDate(flight.isoDate, flight.departureTime, flight.arrivalBuffer),
                            checkInTime:      data.checkInTime,
                            checkOutDate:     sorted[globalIdx + 1]?.isoDate,
                            checkOutTime:     data.checkOutTime,
                            confirmationCode: data.confirmationCode,
                            address:          data.address,
                          }) : undefined}
                        onRemoveAccommodation={canEdit ? () => acc && onRemoveAccommodation(trip.id, acc.id) : undefined}
                        onEditAccommodation={canEdit ? (name, checkInTime, checkOutTime, confirmationCode, address) =>
                          acc && onUpdateAccommodation(trip.id, acc.id, { name, checkInTime, checkOutTime, confirmationCode, address })
                        : undefined}
                        showDeviceTz={showDeviceTz}
                        deviceTz={deviceTz}
                        onToggleDeviceTz={onToggleDeviceTz}
                        onToggleUpgrade={onToggleUpgrade}
                      />
                    </motion.div>
                    {airportToCountry(flight.originCode) !== airportToCountry(flight.destinationCode) && (
                      <VisaInfo
                        originAirport={flight.originCode}
                        destinationAirport={flight.destinationCode}
                        locale={locale}
                      />
                    )}
                    {globalIdx < sorted.length - 1 && (() => {
                      const nextFlight = sorted[globalIdx + 1];
                      if (connAnalysis) {
                        return <ConnectionRiskBar analysis={connAnalysis} locale={locale} />;
                      }
                      // No connection analysis → check if it's an intentional stopover
                      // (same route, but gap ≥ 24h so analyzeConnection returned null)
                      if (
                        nextFlight &&
                        nextFlight.originCode === flight.destinationCode &&
                        flight.isoDate && nextFlight.isoDate &&
                        nextFlight.isoDate > flight.isoDate
                      ) {
                        const days = Math.round(
                          (new Date(nextFlight.isoDate).getTime() - new Date(flight.isoDate).getTime()) /
                          (1000 * 60 * 60 * 24),
                        );
                        return <StopoverBadge airport={flight.destinationCode} days={days} locale={locale} />;
                      }
                      return null;
                    })()}
                  </Fragment>
                );
              }

              // Group other flights by date
              const grouped = otherFlights.reduce((acc, f) => {
                (acc[f.isoDate] = acc[f.isoDate] || []).push(f);
                return acc;
              }, {} as Record<string, TripFlight[]>);

              return (
                <AnimatePresence initial={false}>
                  {/* Today pinned section */}
                  {todayFlights.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2 px-1">
                        <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse inline-block" />
                        <span className="text-[11px] font-bold text-violet-400 uppercase tracking-widest">
                          {locale === "es" ? "Hoy" : "Today"}
                        </span>
                      </div>
                      {todayFlights.map((flight, index) => (
                        <motion.div
                          key={flight.id}
                          className="relative"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(index, 8) * 0.05, duration: 0.25 }}
                        >
                          <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-violet-600/30 to-transparent pointer-events-none" />
                          <div className="relative">{renderFlightCard(flight)}</div>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* Remaining flights grouped by date */}
                  {Object.entries(grouped)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([date, dayFlights]) => (
                      <div key={date}>
                        <div className="flex items-center gap-3 my-3">
                          <div className="flex-1 h-px bg-white/5" />
                          <span className="text-xs text-gray-500 font-medium px-2">
                            {formatRelativeDate(date, locale)}
                          </span>
                          <div className="flex-1 h-px bg-white/5" />
                        </div>
                        {dayFlights.map((flight, index) => (
                          <motion.div
                            key={flight.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(index, 8) * 0.05, duration: 0.25 }}
                          >
                            {renderFlightCard(flight)}
                          </motion.div>
                        ))}
                      </div>
                    ))}
                </AnimatePresence>
              );
            })()
          )}
        </div>
      ))}

      {/* Carbon footprint — shown in flights tab when there are flights */}
      {(panelTab === "flights" || isDraft) && sorted.length > 0 && (
        <CarbonFootprint flights={sorted} locale={locale} />
      )}

      {/* Action bar */}
      {(panelTab === "flights" || isDraft) && trip.flights.length > 0 && (
        <div className="space-y-2">
          {/* Primary actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleShareWhatsApp}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-800/50 bg-emerald-950/30 px-3 py-2.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-950/50 transition-colors"
            >
              <Share2 className="h-3.5 w-3.5" />
              {waCopied
                ? (locale === "en" ? "Copied!" : "¡Copiado!")
                : "WhatsApp"}
            </button>

            {!isDraft ? (
              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-violet-800/50 bg-violet-950/30 px-3 py-2.5 text-xs font-semibold text-violet-400 hover:bg-violet-950/50 transition-colors"
              >
                <Share2 className="h-3.5 w-3.5" />
                {locale === "en" ? "Share" : "Compartir"}
              </button>
            ) : (
              <button
                onClick={handleShareLink}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 text-xs font-semibold text-gray-300 hover:bg-white/8 transition-colors"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? (locale === "en" ? "Copied!" : "¡Copiado!") : (locale === "en" ? "Copy link" : "Copiar link")}
              </button>
            )}
          </div>

          {/* Secondary actions */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleExportICS}
              className="flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/4 px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/8 transition-colors"
            >
              <Calendar className="h-3.5 w-3.5" />
              {locale === "en" ? "Export .ics" : "Exportar .ics"}
            </button>

            <div className="relative">
              <button
                onClick={() => setShowGcal((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/4 px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/8 transition-colors"
              >
                <Calendar className="h-3.5 w-3.5 text-blue-400/70" />
                Google Cal
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

            {!isDraft && (
              <button
                onClick={handleExportPdf}
                className="flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/4 px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/8 transition-colors"
              >
                🖨️ PDF
              </button>
            )}

            {!isDraft && (
              <button
                onClick={handleShareLink}
                className="flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/4 px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/8 transition-colors"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? (locale === "en" ? "Copied!" : "¡Copiado!") : (locale === "en" ? "Copy link" : "Copiar link")}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Trip guide */}
      {(panelTab === "flights" || isDraft) && sorted.length > 0 && <TripAdvisor flights={advisorFlights} locale={locale} />}

      {/* Add flight — hidden for viewer role */}
      {canEdit && (panelTab === "flights" || isDraft) && sorted.length > 0 && !showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] py-3 text-sm font-semibold text-gray-400 hover:text-white transition-all"
        >
          <Plus className="h-4 w-4" />
          {L.addMoreFlights}
        </button>
      )}

      {canEdit && (panelTab === "flights" || isDraft) && (sorted.length === 0 || showAddForm) && (
        <div>
          {showAddForm && sorted.length > 0 && (
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">{L.addMoreFlights}</span>
              <button
                onClick={() => setShowAddForm(false)}
                aria-label={locale === "es" ? "Cerrar" : "Close"}
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

      {showImport && canEdit && (
        <ItineraryImportModal
          isOpen={showImport}
          onImport={handleImportFlights}
          onClose={() => setShowImport(false)}
          locale={locale}
          tripId={trip.id}
        />
      )}

      {showShareModal && !isDraft && isOwner && (
        <TripShareModal
          tripId={trip.id}
          tripName={trip.name}
          locale={locale}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </section>
  );
}
