"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plane, PlaneTakeoff, Globe, Trash2, ChevronDown, ExternalLink, Copy, Check } from "lucide-react";
import { TripFlight, AirportStatus } from "@/lib/types";
import { WeatherData } from "@/hooks/useWeather";
import { TripPanelLabels, AIRLINE_CHECKIN_URLS, AIRLINE_APP_URLS } from "@/components/TripPanelLabels";
import { DaysCountdown } from "./helpers";
import { useFlightLiveStatus } from "@/hooks/useFlightLiveStatus";
import { LiveStatusPill } from "./LiveStatusPill";
import { FlightPunctualityBadge } from "@/components/FlightPunctualityBadge";

const SONAR_RINGS = [0, 1, 2];

function SonarIcon() {
  return (
    <div className="relative flex items-center justify-center w-12 h-12">
      <motion.div
        className="absolute inset-0 rounded-full bg-green-400/15"
        animate={{ scale: [1, 1.18, 1], opacity: [0.4, 0.75, 0.4] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      />
      {SONAR_RINGS.map((i) => (
        <motion.span
          key={i}
          className="absolute inset-0 rounded-full border border-green-400/60"
          initial={{ scale: 0.35, opacity: 0 }}
          animate={{ scale: [0.35, 2.2], opacity: [0.65, 0] }}
          transition={{
            duration: 2.1,
            ease: "easeOut",
            repeat: Infinity,
            repeatDelay: 0.35,
            delay: i * 0.68,
            times: [0, 1],
          }}
        />
      ))}
      <motion.div
        className="relative z-10"
        animate={{ y: [0, -2.5, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <PlaneTakeoff className="w-5 h-5 text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.95)]" />
      </motion.div>
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
  onRemove?: () => void;
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
  // hours until departure (for action row highlight)
  hoursUntilDep?: number | null;
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
  hoursUntilDep,
}: FlightCardHeaderProps) {
  const status = originStatus?.status ?? "ok";
  const [copiedBooking, setCopiedBooking] = useState(false);

  function copyBookingCode() {
    if (!flight.bookingCode) return;
    navigator.clipboard.writeText(flight.bookingCode).then(() => {
      setCopiedBooking(true);
      setTimeout(() => setCopiedBooking(false), 2000);
    });
  }

  // only fetch live status for today/tomorrow
  const liveEnabled = daysUntil === 0 || daysUntil === 1;
  const { liveData } = useFlightLiveStatus(flight.flightCode, flight.isoDate, liveEnabled);

  // Action row URLs
  const flightUrl    = `https://www.flightaware.com/live/flight/${flight.airlineIcao}${flight.flightNumber}`;
  const checkinUrl   = AIRLINE_CHECKIN_URLS[flight.airlineCode] ?? AIRLINE_APP_URLS[flight.airlineCode];
  const airlineAppUrl = AIRLINE_APP_URLS[flight.airlineCode];

  // Actual departure time when delayed: add delayMinutes to the scheduled local time
  const delayMinutes = liveData?.delayMinutes ?? 0;
  const actualDepTime = (() => {
    if (delayMinutes <= 0 || !flight.departureTime) return null;
    const [h, m] = flight.departureTime.split(":").map(Number);
    const totalMin = h * 60 + m + delayMinutes;
    const ah = Math.floor(totalMin / 60) % 24;
    const am = totalMin % 60;
    return `${String(ah).padStart(2, "0")}:${String(am).padStart(2, "0")}`;
  })();

  // Countdown uses actual departure time when delayed
  const effectiveHoursUntilDep =
    hoursUntilDep !== null && hoursUntilDep !== undefined && delayMinutes > 0
      ? hoursUntilDep + delayMinutes / 60
      : hoursUntilDep;

  // Check-in highlight: ≤24h before actual departure (accounts for delay)
  const showCheckinHighlight =
    effectiveHoursUntilDep !== null &&
    effectiveHoursUntilDep !== undefined &&
    effectiveHoursUntilDep <= 24 &&
    effectiveHoursUntilDep > -1;

  // Contextual "Sale en Xh" chip
  const departureCountdown = (() => {
    if (effectiveHoursUntilDep === null || effectiveHoursUntilDep === undefined) return null;
    if (effectiveHoursUntilDep < -6 || effectiveHoursUntilDep > 72) return null;
    if (effectiveHoursUntilDep < 0) {
      const minAgo = Math.abs(Math.round(effectiveHoursUntilDep * 60));
      return locale === "es" ? `Salió hace ${minAgo}min` : `Departed ${minAgo}min ago`;
    }
    const h = Math.floor(effectiveHoursUntilDep);
    const min = Math.round((effectiveHoursUntilDep - h) * 60);
    if (h === 0) return locale === "es" ? `Sale en ${min}min` : `Departs in ${min}min`;
    if (min === 0) return locale === "es" ? `Sale en ${h}h` : `Departs in ${h}h`;
    return locale === "es" ? `Sale en ${h}h ${min}min` : `Departs in ${h}h ${min}min`;
  })();

  const depCountdownColor =
    effectiveHoursUntilDep !== null && effectiveHoursUntilDep !== undefined && effectiveHoursUntilDep <= 3
      ? "text-red-400 font-bold"
      : effectiveHoursUntilDep !== null && effectiveHoursUntilDep !== undefined && effectiveHoursUntilDep <= 24
      ? "text-emerald-400 font-semibold"
      : "text-gray-400";

  // Short airline display name for action button
  const airlineShort = flight.airlineName
    ? flight.airlineName.split(" ").slice(0, 1).join(" ")
    : locale === "es" ? "Aerolínea" : "Airline";

  return (
    <>
      {/* ── Glance Layer (always visible) ────────────────────────────────────── */}
      <div className={`px-4 pt-3 pb-0 rounded-t-xl ${hasIssue ? "bg-orange-950/20" : "bg-white/[0.02]"}`}>

        {/* Row 1: Flight code · status chip · [trash] */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <Plane className="h-3.5 w-3.5 text-gray-500 shrink-0" />
            <span className="text-sm font-bold tracking-wide text-white">{flight.flightCode}</span>
            {flight.bookingCode && (
              <button
                onClick={copyBookingCode}
                title={copiedBooking ? (locale === "es" ? "¡Copiado!" : "Copied!") : (locale === "es" ? "Copiar código de reserva" : "Copy booking code")}
                className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-violet-400 bg-violet-950/40 border border-violet-700/30 rounded px-1.5 py-0.5 shrink-0 hover:bg-violet-900/50 hover:border-violet-600/50 transition-colors"
              >
                {flight.bookingCode}
                {copiedBooking
                  ? <Check className="h-2.5 w-2.5 text-emerald-400" />
                  : <Copy className="h-2.5 w-2.5 opacity-50" />}
              </button>
            )}
            {/* Exception-first status chip */}
            {isNonFAA && !originStatus ? (
              <span title={L.internationalNote}>
                <Globe className="h-3.5 w-3.5 text-blue-400/70" />
              </span>
            ) : hasIssue ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-400 bg-orange-950/50 border border-orange-700/50 rounded px-1.5 py-0.5">
                ⚠ {locale === "es" ? "Alerta" : "Alert"}
              </span>
            ) : status !== "unknown" ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-gray-600 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600/80" />
                {locale === "es" ? "Normal" : "Normal"}
              </span>
            ) : null}
            {/* Live status pill (today/tomorrow only) */}
            {liveData && liveEnabled && (
              <LiveStatusPill liveData={liveData} locale={locale} />
            )}
            {/* On-time punctuality estimate */}
            {(() => {
              const hour = parseInt(flight.departureTime?.split(":")[0] ?? "", 10);
              return !isNaN(hour) ? (
                <FlightPunctualityBadge
                  flight={{
                    airline: flight.airlineCode,
                    origin: flight.originCode,
                    dest: flight.destinationCode,
                    departureHour: hour,
                  }}
                  locale={locale}
                  pillOnly
                />
              ) : null;
            })()}
          </div>

          {/* Trash / confirm-delete — only shown when onRemove is provided */}
          {onRemove && (
            <div className="shrink-0">
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
                  className="rounded-lg p-1.5 text-red-600/60 hover:text-red-400 hover:bg-red-950/40 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Row 2: Route hero — EZE ──✈── MIA */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 mb-2">
          {/* Origin */}
          <div>
            <p className="text-2xl font-bold font-mono text-white leading-none">{flight.originCode}</p>
            {(displayDepartureTime ?? flight.departureTime) && (
              actualDepTime ? (
                <div className="mt-0.5">
                  <p className="text-sm tabular-nums text-gray-500 line-through leading-none">
                    {displayDepartureTime ?? flight.departureTime}
                  </p>
                  <p className="text-lg font-bold tabular-nums text-amber-400 leading-tight">
                    {actualDepTime}
                    <span className="text-xs font-semibold text-amber-500 ml-1">
                      +{delayMinutes >= 60
                        ? `${Math.floor(delayMinutes / 60)}h${delayMinutes % 60 > 0 ? `${delayMinutes % 60}m` : ""}`
                        : `${delayMinutes}m`}
                    </span>
                  </p>
                </div>
              ) : (
                <p className="text-lg font-semibold tabular-nums text-white mt-0.5">
                  {displayDepartureTime ?? flight.departureTime}
                </p>
              )
            )}
            <p className="text-xs text-gray-400 mt-0.5 truncate">{originName}</p>
          </div>

          {/* Arrow / sonar */}
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

        {/* Row 3: Contextual strip — date · countdown · airline · weather */}
        <div className="border-t border-white/5 pt-2 pb-2 flex items-center gap-2 flex-wrap text-[11px] text-gray-500">
          <DaysCountdown days={daysUntil} L={L} />
          {flight.departureTime && (
            <span className="tabular-nums">
              {daysUntil === 0
                ? locale === "es" ? "Hoy" : "Today"
                : daysUntil === 1
                ? locale === "es" ? "Mañana" : "Tomorrow"
                : new Date(flight.isoDate + "T00:00:00").toLocaleDateString(
                    locale === "en" ? "en-US" : "es-AR",
                    { day: "2-digit", month: locale === "en" ? "short" : "2-digit" },
                  )}
              {" · "}
              {displayDepartureTime ?? flight.departureTime}
            </span>
          )}
          {departureCountdown && (
            <>
              <span className="text-gray-700">·</span>
              <span className={`tabular-nums ${depCountdownColor}`}>{departureCountdown}</span>
            </>
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

      {/* ── Action Layer (always visible CTAs) ───────────────────────────────── */}
      <div className={`px-4 py-2.5 border-b border-white/5 flex items-center gap-2 flex-wrap ${hasIssue ? "bg-orange-950/10" : "bg-white/[0.01]"}`}>
        {checkinUrl && (
          <a
            href={checkinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg px-3 py-1.5 transition-all border ${
              showCheckinHighlight
                ? "text-white bg-emerald-600 border-emerald-500 hover:bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                : "text-gray-400 border-white/10 bg-white/[0.03] hover:text-white hover:border-white/20"
            }`}
          >
            {locale === "es" ? "Check-in" : "Check in"}
            {showCheckinHighlight && <ExternalLink className="h-3 w-3" />}
          </a>
        )}
        {airlineAppUrl && (
          <a
            href={airlineAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium rounded-lg px-3 py-1.5 text-gray-400 border border-white/10 bg-white/[0.03] hover:text-white hover:border-white/20 transition-colors"
          >
            {airlineShort}
          </a>
        )}
        <a
          href={flightUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium rounded-lg px-3 py-1.5 text-gray-400 border border-white/10 bg-white/[0.03] hover:text-blue-300 hover:border-blue-700/40 transition-colors"
        >
          Tracking ↗
        </a>
        {/* Upgrade toggle */}
        {daysUntil > 0 && onToggleUpgrade && (
          <button
            onClick={() => onToggleUpgrade(flight.id, !wantsUpgrade)}
            aria-pressed={wantsUpgrade}
            title={
              wantsUpgrade
                ? locale === "es" ? "Upgrade activado" : "Upgrade alert on"
                : locale === "es" ? "Avisarme si hay upgrade" : "Notify me of upgrades"
            }
            className={`ml-auto inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
              wantsUpgrade
                ? "bg-violet-600 text-white"
                : "border border-white/15 text-gray-500 hover:text-white hover:border-white/30"
            }`}
          >
            {wantsUpgrade ? "✓ Upgrade" : "↑ Upgrade"}
          </button>
        )}
      </div>

      {/* ── Expand / collapse affordance ─────────────────────────────────────── */}
      <button
        onClick={onToggleExpanded}
        className="w-full flex justify-center items-center gap-1 py-2 text-gray-600 hover:text-gray-400 transition-colors"
        aria-label={
          expanded
            ? locale === "es" ? "Ocultar detalles" : "Hide details"
            : locale === "es" ? "Ver detalles" : "View details"
        }
      >
        <span className="text-[11px]">
          {expanded
            ? locale === "es" ? "ocultar detalles" : "hide details"
            : locale === "es" ? "ver detalles" : "view details"}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        />
      </button>
    </>
  );
}
