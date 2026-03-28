"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Plane, PlaneTakeoff, Globe, Trash2, ChevronDown, Check, ArrowUpCircle } from "lucide-react";
import { TripFlight, AirportStatus } from "@/lib/types";
import { WeatherData } from "@/hooks/useWeather";
import { StatusBadge } from "@/components/StatusBadge";
import { TripPanelLabels } from "@/components/TripPanelLabels";
import { DaysCountdown } from "./helpers";
import { useFlightLiveStatus } from "@/hooks/useFlightLiveStatus";
import { LiveStatusPill } from "./LiveStatusPill";

const SONAR_RINGS = [0, 1, 2];

function SonarIcon() {
  return (
    <div className="relative flex items-center justify-center w-10 h-10">
      {SONAR_RINGS.map((i) => (
        <motion.span
          key={i}
          className="absolute inset-0 rounded-full border-2 border-green-400"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: [0.5, 2.6], opacity: [0.85, 0] }}
          transition={{
            duration: 1.8,
            ease: "easeOut",
            repeat: Infinity,
            repeatDelay: 0.4,
            delay: i * 0.6,
            times: [0, 1],
          }}
        />
      ))}
      <PlaneTakeoff className="relative z-10 w-4 h-4 text-green-400 drop-shadow-[0_0_6px_rgba(74,222,128,0.8)]" />
    </div>
  );
}

export interface FlightCardHeaderProps {
  flight: TripFlight;
  locale: "es" | "en";
  L: TripPanelLabels;
  // derived values (pre-computed in root)
  daysUntil: number;
  hasIssue: boolean;
  isNonFAA: boolean;
  originName: string;
  destName: string;
  originStatus: AirportStatus | undefined;
  // delete state
  confirmDelete: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onRemove: () => void;
  // upgrade toggle
  wantsUpgrade?: boolean;
  onToggleUpgrade?: (flightId: string, value: boolean) => void;
  // expand toggle
  expanded: boolean;
  onToggleExpanded: () => void;
  // device timezone display overrides
  displayDepartureTime?: string;
  displayArrivalTime?: string;
  // current weather at origin airport
  originWeather?: WeatherData;
  // sonar icon for next flight
  isNextFlight?: boolean;
}

export function FlightCardHeader({
  flight,
  locale,
  L,
  daysUntil,
  hasIssue,
  isNonFAA,
  originName,
  destName,
  originStatus,
  confirmDelete,
  onConfirmDelete,
  onCancelDelete,
  onRemove,
  wantsUpgrade,
  onToggleUpgrade,
  expanded,
  onToggleExpanded,
  displayDepartureTime,
  displayArrivalTime,
  originWeather,
  isNextFlight,
}: FlightCardHeaderProps) {
  const status = originStatus?.status ?? "ok";

  // daysUntil: 0 = today, 1 = tomorrow; only fetch live status for those days
  const liveEnabled = daysUntil === 0 || daysUntil === 1;
  const { liveData } = useFlightLiveStatus(flight.flightCode, flight.isoDate, liveEnabled);

  return (
    <>
      {/* ── Boarding-pass header (always visible) ─────────────────────────── */}
      <div className={`px-4 pt-3 pb-2 rounded-t-xl ${hasIssue ? "bg-orange-950/20" : "bg-white/[0.02]"}`}>
        {/* Row 1: flight code + remove */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <Plane className="h-3.5 w-3.5 text-gray-500" />
            <span className="text-sm font-bold tracking-wide text-white">{flight.flightCode}</span>
            {flight.airlineName && (
              <span className="text-[11px] text-gray-500 truncate max-w-[120px]">{flight.airlineName}</span>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {/* Trash / confirm-delete */}
            {confirmDelete ? (
              <div className="flex items-center gap-1.5 animate-scale-in">
                <button
                  onClick={onCancelDelete}
                  className="text-xs text-gray-400 hover:text-gray-200 px-2 py-1 transition-colors"
                >
                  {locale === "es" ? "Cancelar" : "Cancel"}
                </button>
                <button
                  onClick={onRemove}
                  className="text-xs bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded-lg transition-colors"
                >
                  {locale === "es" ? "Eliminar" : "Delete"}
                </button>
              </div>
            ) : (
              <button
                onClick={onConfirmDelete}
                title={L.removeTitle}
                aria-label={locale === "es" ? "Eliminar vuelo" : "Delete flight"}
                className="rounded-lg p-1.5 text-red-600 hover:text-red-400 hover:bg-red-950/40 transition-colors flex items-center justify-center"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            {/* Upgrade toggle — moved from Row 1b */}
            {daysUntil > 0 && onToggleUpgrade && (
              <button
                onClick={() => onToggleUpgrade(flight.id, !wantsUpgrade)}
                title={
                  wantsUpgrade
                    ? (locale === "es" ? "Upgrade activado" : "Upgrade alert on")
                    : (locale === "es" ? "Avisarme si hay upgrade disponible" : "Notify me if upgrade is available")
                }
                aria-label={
                  wantsUpgrade
                    ? (locale === "es" ? "Upgrade activado" : "Upgrade alert on")
                    : (locale === "es" ? "Avisarme si hay upgrade disponible" : "Notify me if upgrade is available")
                }
                aria-pressed={wantsUpgrade}
                className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors ${
                  wantsUpgrade
                    ? "bg-violet-600 text-white"
                    : "border border-white/15 text-gray-400 hover:text-white hover:border-white/30"
                }`}
              >
                {wantsUpgrade ? (
                  <>
                    <Check className="h-3 w-3" />
                    <span className="hidden sm:inline">Upgrade</span>
                  </>
                ) : (
                  <>
                    <ArrowUpCircle className="h-3 w-3" />
                    <span className="hidden sm:inline">Upgrade</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Row 1b: status badge + live status pill */}
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          {isNonFAA && !originStatus ? (
            <span title={L.internationalNote}><Globe className="h-4 w-4 text-blue-400/70" /></span>
          ) : (
            <StatusBadge status={status} className="text-sm px-3 py-1" />
          )}
          {liveData && liveEnabled && (
            <LiveStatusPill liveData={liveData} locale={locale} />
          )}
        </div>

        {/* Row 2: EZE → MIA with times */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 mb-2">
          {/* Origin */}
          <div>
            <p className="text-2xl font-bold font-mono text-white leading-none">{flight.originCode}</p>
            {(displayDepartureTime ?? flight.departureTime) && (
              <p className="text-lg font-semibold tabular-nums text-white mt-0.5">{displayDepartureTime ?? flight.departureTime}</p>
            )}
            <p className="text-xs text-gray-400 mt-0.5 truncate">{originName}</p>
          </div>

          {/* Arrow */}
          <div className="flex flex-col items-center gap-0.5 px-1">
            {isNextFlight ? <SonarIcon /> : <Plane className="w-4 h-4 text-gray-500 rotate-90" />}
          </div>

          {/* Destination */}
          <div className="text-right">
            <p className="text-2xl font-bold font-mono text-white leading-none">{flight.destinationCode}</p>
            {((displayArrivalTime ?? flight.arrivalTime) || flight.arrivalDate) && (
              <p className="text-lg font-semibold tabular-nums text-white mt-0.5">
                {displayArrivalTime ?? flight.arrivalTime ?? ""}
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
          {(displayDepartureTime ?? flight.departureTime) && (
            <span className="tabular-nums">
              {daysUntil === 0
                ? (locale === "es" ? "Hoy" : "Today")
                : daysUntil === 1
                ? (locale === "es" ? "Mañana" : "Tomorrow")
                : new Date(flight.isoDate + "T00:00:00").toLocaleDateString(
                    locale === "en" ? "en-US" : "es-AR",
                    { day: "2-digit", month: locale === "en" ? "short" : "2-digit" },
                  )}{" "}
              {displayDepartureTime ?? flight.departureTime}
            </span>
          )}
          {flight.airlineName && (
            <>
              <span className="text-gray-700">·</span>
              <span>{flight.airlineName}</span>
            </>
          )}
          <AnimatePresence>
            {originWeather && (
              <motion.span
                key="weather"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.25 }}
                className="ml-auto flex items-center gap-1 shrink-0 text-[11px] text-gray-400"
              >
                <span className="leading-none">{originWeather.icon}</span>
                <span className="tabular-nums font-medium">{originWeather.temperature}°C</span>
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Chevron toggle ─────────────────────────────────────────────────── */}
      <button
        onClick={onToggleExpanded}
        className="w-full flex justify-center items-center py-1.5 text-gray-600 hover:text-gray-400 transition-colors border-t border-white/5 mt-0"
        aria-label={expanded ? (locale === "es" ? "Colapsar detalles" : "Collapse details") : (locale === "es" ? "Ver detalles" : "View details")}
      >
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
      </button>
    </>
  );
}
