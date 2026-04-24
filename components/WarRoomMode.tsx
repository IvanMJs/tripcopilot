"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  Plane,
  Clock,
  MapPin,
  CloudSun,
  CloudRain,
  X,
  Shield,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Lock,
} from "lucide-react";
import { TripFlight, AirportStatusMap, DelayStatus } from "@/lib/types";
import { AIRPORTS } from "@/lib/airports";
import { flightDepartureISO, minutesUntilISO } from "@/lib/flightTime";
import { useDestinationWeather } from "@/hooks/useDestinationWeather";
import { useDepartureTime } from "@/hooks/useDepartureTime";
import { analyzeConnection } from "@/lib/connectionRisk";
import { GeoPosition } from "@/hooks/useGeolocation";

// ── Labels ─────────────────────────────────────────────────────────────────

const LABELS = {
  es: {
    warRoom: "War Room",
    warRoomSub: "Tu vuelo está a menos de 12 horas",
    exit: "Salir del War Room",
    leaveAt: "¿Cuándo salir?",
    weather: "Clima",
    origin: "Origen",
    destination: "Destino",
    checklist: "Checklist",
    items: "ítems",
    allDone: "¡Todo listo!",
    connection: "Conexión",
    bufferDrive: "Traslado",
    bufferCheckin: "Check-in",
    bufferSecurity: "Seguridad",
    noLocation: "Activá la ubicación para un cálculo exacto",
    status: "Estado del aeropuerto",
    gate: "Puerta",
    terminal: "Terminal",
    seat: "Asiento",
    pnr: "PNR",
    departing: "Despegando",
    connectionSafe: "Conexión segura",
    connectionTight: "Conexión justa",
    connectionAtRisk: "Conexión en riesgo",
    connectionMissed: "Conexión perdida",
    bufferMin: "min de margen",
    statusOk: "A tiempo",
    statusDelay: "Demorado",
    noConnection: "Sin conexión próxima",
    checklistEmpty: "Sin checklist",
    complete: "completados",
    lockedTitle: "Solo en Explorer",
    lockedCta: "Mejorar a Explorer →",
  },
  en: {
    warRoom: "War Room",
    warRoomSub: "Your flight is less than 12 hours away",
    exit: "Exit War Room",
    leaveAt: "When to leave?",
    weather: "Weather",
    origin: "Origin",
    destination: "Destination",
    checklist: "Checklist",
    items: "items",
    allDone: "All done!",
    connection: "Connection",
    bufferDrive: "Drive",
    bufferCheckin: "Check-in",
    bufferSecurity: "Security",
    noLocation: "Enable location for an exact estimate",
    status: "Airport status",
    gate: "Gate",
    terminal: "Terminal",
    seat: "Seat",
    pnr: "PNR",
    departing: "Departing",
    connectionSafe: "Safe connection",
    connectionTight: "Tight connection",
    connectionAtRisk: "Connection at risk",
    connectionMissed: "Connection missed",
    bufferMin: "min buffer",
    statusOk: "On time",
    statusDelay: "Delayed",
    noConnection: "No upcoming connection",
    checklistEmpty: "No checklist",
    complete: "complete",
    lockedTitle: "Explorer only",
    lockedCta: "Upgrade to Explorer →",
  },
} as const;

// ── Urgency config ─────────────────────────────────────────────────────────

type WarRoomUrgency = "critical" | "high" | "moderate" | "low";

function getWarRoomUrgency(minutesUntilDeparture: number): WarRoomUrgency {
  if (minutesUntilDeparture <= 60) return "critical";
  if (minutesUntilDeparture <= 180) return "high";
  if (minutesUntilDeparture <= 360) return "moderate";
  return "low";
}

const URGENCY_RING: Record<WarRoomUrgency, string> = {
  critical: "border-red-500 shadow-red-500/40",
  high:     "border-amber-500 shadow-amber-500/30",
  moderate: "border-blue-500 shadow-blue-500/30",
  low:      "border-[rgba(255,184,0,0.35)] shadow-[rgba(255,184,0,0.20)]",
};

const URGENCY_TEXT: Record<WarRoomUrgency, string> = {
  critical: "text-red-400",
  high:     "text-amber-400",
  moderate: "text-blue-400",
  low:      "text-[#FFB800]",
};

const URGENCY_PULSE: Record<WarRoomUrgency, string> = {
  critical: "animate-pulse",
  high:     "animate-pulse",
  moderate: "",
  low:      "",
};

const URGENCY_BG: Record<WarRoomUrgency, string> = {
  critical: "from-red-950/60 to-zinc-950",
  high:     "from-amber-950/60 to-zinc-950",
  moderate: "from-blue-950/40 to-zinc-950",
  low:      "from-[#FFB800]/40 to-zinc-950",
};

// ── Status pill config ─────────────────────────────────────────────────────

const STATUS_PILL: Record<DelayStatus, string> = {
  ok:             "bg-emerald-950/60 text-emerald-300 border border-emerald-500/20",
  delay_minor:    "bg-yellow-950/60  text-yellow-300  border border-yellow-500/20",
  delay_moderate: "bg-orange-950/60  text-orange-300  border border-orange-500/20",
  delay_severe:   "bg-red-950/60     text-red-300     border border-red-500/25",
  ground_delay:   "bg-red-950/70     text-red-200     border border-red-600/30",
  ground_stop:    "bg-red-950/80     text-red-200     border border-red-600/40",
  closure:        "bg-zinc-900/60    text-zinc-300    border border-zinc-600/30",
  unknown:        "bg-zinc-900/40    text-zinc-400    border border-zinc-700/30",
};

// ── Props ──────────────────────────────────────────────────────────────────

export interface WarRoomModeProps {
  flight: TripFlight;
  nextFlight?: TripFlight | null;
  tripId: string;
  locale: "es" | "en";
  statusMap: AirportStatusMap;
  geoPosition?: GeoPosition | null;
  onExit: () => void;
  userPlan?: string;
  onUpgrade?: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function cityName(iata: string): string {
  return AIRPORTS[iata]?.city ?? iata;
}

function useLiveMinutes(isoDatetime: string): number {
  const [minutes, setMinutes] = useState(() => minutesUntilISO(isoDatetime));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isoDatetime) return;
    setMinutes(minutesUntilISO(isoDatetime));
    intervalRef.current = setInterval(() => {
      setMinutes(minutesUntilISO(isoDatetime));
    }, 1000);
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
  }, [isoDatetime]);

  return minutes;
}

function formatLargeCountdown(totalMinutes: number, locale: "es" | "en"): string {
  if (totalMinutes <= 0) return locale === "es" ? "Despegando" : "Departing";
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function readChecklistProgress(tripId: string): { done: number; total: number } {
  if (typeof window === "undefined") return { done: 0, total: 0 };
  try {
    const raw = localStorage.getItem(`tripcopilot-checklist-${tripId}`);
    if (!raw) return { done: 0, total: 0 };
    const data = JSON.parse(raw) as Record<string, boolean>;
    const items = Object.values(data);
    return { done: items.filter(Boolean).length, total: items.length };
  } catch {
    return { done: 0, total: 0 };
  }
}

// ── Locked card ────────────────────────────────────────────────────────────

function LockedCard({
  locale,
  onUpgrade,
}: {
  locale: "es" | "en";
  onUpgrade?: () => void;
}) {
  const L = LABELS[locale];
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Lock className="h-4 w-4 text-gray-600 shrink-0" />
        <span className="text-sm text-gray-600">{L.lockedTitle}</span>
      </div>
      <button
        onClick={onUpgrade}
        className="shrink-0 flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-950/30 px-2.5 py-1.5 text-[11px] font-semibold text-sky-400 hover:bg-sky-950/50 transition-colors"
      >
        {L.lockedCta}
      </button>
    </div>
  );
}

// ── Sub-cards ──────────────────────────────────────────────────────────────

function WeatherCard({
  iata,
  isoDate,
  label,
  locale,
}: {
  iata: string;
  isoDate: string;
  label: string;
  locale: "es" | "en";
}) {
  const { forecast, loading } = useDestinationWeather(iata, isoDate, locale, true);

  return (
    <div className="flex-1 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1.5">{label}</p>
      <p className="text-sm font-bold text-white mb-0.5">{iata} · {cityName(iata)}</p>
      {loading && (
        <div className="h-4 w-16 rounded bg-white/[0.06] animate-pulse mt-1" />
      )}
      {!loading && forecast && (
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-base">{forecast.conditionEmoji}</span>
          <span className="text-sm font-semibold text-gray-300 tabular-nums">
            {forecast.tempMaxC}°/{forecast.tempMinC}°C
          </span>
        </div>
      )}
      {!loading && !forecast && (
        <div className="flex items-center gap-1 mt-1">
          <CloudSun className="h-3.5 w-3.5 text-gray-600" />
          <span className="text-xs text-gray-600">—</span>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

const staggerContainer: Variants = {
  animate: { transition: { staggerChildren: 0.07 } },
};

const staggerItem: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 280, damping: 24 } },
};

export function WarRoomMode({
  flight,
  nextFlight,
  tripId,
  locale,
  statusMap,
  geoPosition,
  onExit,
  userPlan,
  onUpgrade,
}: WarRoomModeProps) {
  const isFree = !userPlan || userPlan === "free";
  const L = LABELS[locale];

  const depISO = flightDepartureISO(flight);
  const liveMinutes = useLiveMinutes(depISO);
  const urgency = liveMinutes === Infinity ? "low" : getWarRoomUrgency(liveMinutes);

  const departureResult = useDepartureTime(depISO, flight.originCode, geoPosition ?? null, locale);
  const originStatus = statusMap[flight.originCode];
  const originDelayStatus: DelayStatus = originStatus?.status ?? "unknown";

  const connectionAnalysis =
    nextFlight ? analyzeConnection(flight, nextFlight, statusMap) : null;

  const [checklist, setChecklist] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  useEffect(() => {
    setChecklist(readChecklistProgress(tripId));
  }, [tripId]);

  const checklistPct = checklist.total > 0 ? Math.round((checklist.done / checklist.total) * 100) : 0;

  return (
    <AnimatePresence>
      <motion.div
        key="war-room"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        className={`rounded-2xl overflow-hidden bg-gradient-to-b ${URGENCY_BG[urgency]} border border-white/[0.08]`}
      >
        {/* Header strip */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <Shield className={`h-4 w-4 ${URGENCY_TEXT[urgency]}`} />
            <span className={`text-xs font-bold uppercase tracking-widest ${URGENCY_TEXT[urgency]}`}>
              {L.warRoom}
            </span>
          </div>
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            {L.exit}
          </button>
        </div>

        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="px-4 pb-5 space-y-3"
        >
          {/* ── Card 1: Live countdown ──────────────────────────────────── */}
          <motion.div variants={staggerItem}>
            <div
              className={`rounded-2xl border-2 shadow-lg ${URGENCY_RING[urgency]} ${URGENCY_PULSE[urgency]} p-5 flex flex-col items-center bg-black/30`}
            >
              <p className={`text-6xl font-black tabular-nums leading-none ${URGENCY_TEXT[urgency]}`}>
                {liveMinutes === Infinity
                  ? "--:--"
                  : formatLargeCountdown(liveMinutes, locale)}
              </p>
              <p className="text-xs text-gray-500 mt-2 font-medium">
                {liveMinutes <= 0
                  ? L.departing
                  : locale === "es"
                    ? `hasta el despegue`
                    : `until takeoff`}
              </p>
            </div>
          </motion.div>

          {/* ── Card 2: Flight info bar ─────────────────────────────────── */}
          <motion.div variants={staggerItem}>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <Plane className={`h-4 w-4 shrink-0 ${URGENCY_TEXT[urgency]}`} />
                  <span className={`text-xl font-black font-mono tracking-tight ${URGENCY_TEXT[urgency]}`}>
                    {flight.flightCode}
                  </span>
                </div>
                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${STATUS_PILL[originDelayStatus]}`}>
                  {originDelayStatus === "ok" ? L.statusOk : L.statusDelay}
                </span>
              </div>
              <p className="text-base font-semibold text-white leading-tight">
                {cityName(flight.originCode)}
                <span className="text-gray-500 mx-2">→</span>
                {cityName(flight.destinationCode)}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{flight.airlineName}</p>

              {/* Gate / Terminal / Seat / PNR row */}
              {(flight.terminal || flight.seatNumber || flight.bookingCode) && (
                <div className="flex items-center gap-4 flex-wrap mt-3 pt-2 border-t border-white/[0.05]">
                  {flight.terminal && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 text-gray-600" />
                      <span className="text-xs text-gray-400">
                        {L.terminal}{" "}
                        <span className="font-semibold text-white">{flight.terminal}</span>
                      </span>
                    </div>
                  )}
                  {flight.seatNumber && (
                    <span className="text-xs text-gray-400">
                      {L.seat}{" "}
                      <span className="font-semibold text-white font-mono">{flight.seatNumber}</span>
                    </span>
                  )}
                  {flight.bookingCode && (
                    <span className="text-xs text-gray-400">
                      {L.pnr}{" "}
                      <span className="font-semibold text-white font-mono">{flight.bookingCode}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </motion.div>

          {/* ── Card 3: Departure calculator ───────────────────────────── */}
          {isFree ? (
            <motion.div variants={staggerItem}>
              <LockedCard locale={locale} onUpgrade={onUpgrade} />
            </motion.div>
          ) : departureResult && departureResult.urgencyLevel !== "past" && (
            <motion.div variants={staggerItem}>
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                    {L.leaveAt}
                  </p>
                  <span className={`ml-auto text-base font-black ${URGENCY_TEXT[urgency]}`}>
                    {departureResult.leaveAtFormatted}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-wrap mt-1">
                  <BufferChip label={L.bufferDrive} minutes={departureResult.travelMinutes} locale={locale} />
                  <span className="text-gray-700 text-xs">+</span>
                  <BufferChip label={L.bufferCheckin} minutes={departureResult.checkInMinutes} locale={locale} />
                  <span className="text-gray-700 text-xs">+</span>
                  <BufferChip label={L.bufferSecurity} minutes={departureResult.securityMinutes} locale={locale} />
                </div>
                {!geoPosition && (
                  <p className="text-[10px] text-gray-600 mt-1.5 italic">{L.noLocation}</p>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Card 4: Weather row ─────────────────────────────────────── */}
          {!isFree && (
            <motion.div variants={staggerItem}>
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <CloudRain className="h-3.5 w-3.5 text-gray-500" />
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                    {L.weather}
                  </p>
                </div>
                <div className="flex gap-3">
                  <WeatherCard
                    iata={flight.originCode}
                    isoDate={flight.isoDate}
                    label={L.origin}
                    locale={locale}
                  />
                  <WeatherCard
                    iata={flight.destinationCode}
                    isoDate={flight.isoDate}
                    label={L.destination}
                    locale={locale}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Card 5: Checklist progress ─────────────────────────────── */}
          {!isFree && (<motion.div variants={staggerItem}>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`h-3.5 w-3.5 ${checklist.total > 0 && checklist.done === checklist.total ? "text-emerald-400" : "text-gray-500"}`} />
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                    {L.checklist}
                  </p>
                </div>
                {checklist.total > 0 ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white tabular-nums">
                      {checklist.done}/{checklist.total}
                    </span>
                    <span className="text-xs text-gray-500">{L.items}</span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-600 italic">{L.checklistEmpty}</span>
                )}
              </div>
              {checklist.total > 0 && (
                <div className="mt-3">
                  {/* Circular-ish progress as ring */}
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 shrink-0">
                      <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                        <circle
                          cx="18" cy="18" r="14"
                          fill="none"
                          stroke="rgba(255,255,255,0.06)"
                          strokeWidth="3"
                        />
                        <circle
                          cx="18" cy="18" r="14"
                          fill="none"
                          stroke={checklist.done === checklist.total ? "#34d399" : "#8b5cf6"}
                          strokeWidth="3"
                          strokeDasharray={`${(checklistPct / 100) * 87.96} 87.96`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white tabular-nums">
                        {checklistPct}%
                      </span>
                    </div>
                    <div>
                      {checklist.done === checklist.total ? (
                        <p className="text-sm font-bold text-emerald-400">{L.allDone}</p>
                      ) : (
                        <p className="text-sm text-gray-300">
                          {checklist.done} {locale === "es" ? "de" : "of"} {checklist.total} {L.complete}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>)}

          {/* ── Card 6: Connection risk ─────────────────────────────────── */}
          {!isFree && (
            <motion.div variants={staggerItem}>
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Plane className="h-3.5 w-3.5 text-gray-500 rotate-45" />
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                    {L.connection}
                  </p>
                </div>
                {connectionAnalysis ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <ConnectionRiskIcon risk={connectionAnalysis.risk} />
                      <span className="text-sm font-bold text-white">
                        {connectionAnalysis.connectionAirport} — {cityName(connectionAnalysis.connectionAirport)}
                      </span>
                    </div>
                    <p className={`text-xs font-semibold ${connectionRiskColor(connectionAnalysis.risk)}`}>
                      {connectionRiskLabel(connectionAnalysis.risk, locale)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {connectionAnalysis.effectiveBufferMinutes} {L.bufferMin}
                      {connectionAnalysis.delayAddedMinutes > 0 && (
                        <span className="text-amber-400 ml-1">
                          ({locale === "es" ? "+" : "+"}{connectionAnalysis.delayAddedMinutes} min {locale === "es" ? "demora" : "delay"})
                        </span>
                      )}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-600 italic">{L.noConnection}</p>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Card 7: Airport status alerts ─────────────────────────── */}
          {originStatus && originDelayStatus !== "ok" && originDelayStatus !== "unknown" && (
            <motion.div variants={staggerItem}>
              <div className="rounded-xl border border-amber-700/30 bg-amber-950/20 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-500/70">
                    {L.status}
                  </p>
                </div>
                <p className="text-sm font-semibold text-amber-300">
                  {flight.originCode} — {originStatus.name ?? cityName(flight.originCode)}
                </p>
                {originStatus.delays?.reason && (
                  <p className="text-xs text-amber-400/70 mt-0.5">{originStatus.delays.reason}</p>
                )}
                {originStatus.groundDelay && (
                  <p className="text-xs text-amber-400/70 mt-0.5">
                    {locale === "es" ? "Demora promedio: " : "Avg delay: "}
                    {originStatus.groundDelay.avgMinutes} min
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Helpers (sub-components) ───────────────────────────────────────────────

function BufferChip({ label, minutes, locale }: { label: string; minutes: number; locale: "es" | "en" }) {
  return (
    <div className="flex items-center gap-1 text-gray-400">
      <span className="text-[11px]">{label}</span>
      <span className="text-[11px] font-bold text-gray-300 tabular-nums">
        {minutes} {locale === "es" ? "min" : "min"}
      </span>
    </div>
  );
}

function connectionRiskLabel(risk: "safe" | "tight" | "at_risk" | "missed", locale: "es" | "en"): string {
  const L = LABELS[locale];
  switch (risk) {
    case "safe":    return L.connectionSafe;
    case "tight":   return L.connectionTight;
    case "at_risk": return L.connectionAtRisk;
    case "missed":  return L.connectionMissed;
  }
}

function connectionRiskColor(risk: "safe" | "tight" | "at_risk" | "missed"): string {
  switch (risk) {
    case "safe":    return "text-emerald-400";
    case "tight":   return "text-amber-400";
    case "at_risk": return "text-orange-400";
    case "missed":  return "text-red-400";
  }
}

function ConnectionRiskIcon({ risk }: { risk: "safe" | "tight" | "at_risk" | "missed" }) {
  switch (risk) {
    case "safe":
      return <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />;
    case "tight":
      return <Info className="h-4 w-4 text-amber-400 shrink-0" />;
    case "at_risk":
      return <AlertTriangle className="h-4 w-4 text-orange-400 shrink-0" />;
    case "missed":
      return <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />;
  }
}
