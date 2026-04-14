"use client";

import { motion } from "framer-motion";
import { Car, PersonStanding, ShieldCheck, Clock } from "lucide-react";
import { TripFlight } from "@/lib/types";
import { GeoPosition } from "@/hooks/useGeolocation";
import { useDepartureTime } from "@/hooks/useDepartureTime";
import { UrgencyLevel } from "@/lib/departureCalculator";
import { AIRPORTS } from "@/lib/airports";

// ── Labels ─────────────────────────────────────────────────────────────────

const LABELS = {
  es: {
    sectionTitle: "¿Cuándo salir al aeropuerto?",
    drive:        "Traslado",
    checkin:      "Check-in",
    security:     "Seguridad",
    totalBuffer:  "Buffer total",
    min:          "min",
    noGeo:        "Activá la ubicación para un cálculo exacto",
  },
  en: {
    sectionTitle: "When to leave for the airport?",
    drive:        "Drive",
    checkin:      "Check-in",
    security:     "Security",
    totalBuffer:  "Total buffer",
    min:          "min",
    noGeo:        "Enable location for an exact estimate",
  },
} as const;

// ── Urgency styling ────────────────────────────────────────────────────────

interface UrgencyStyle {
  border: string;
  bg: string;
  text: string;
  badge: string;
  badgeText: string;
  badgeLabel: { es: string; en: string };
}

const URGENCY_STYLES: Record<UrgencyLevel, UrgencyStyle> = {
  relaxed: {
    border:      "border-emerald-800/50",
    bg:          "bg-emerald-950/20",
    text:        "text-emerald-300",
    badge:       "bg-emerald-900/60",
    badgeText:   "text-emerald-300",
    badgeLabel:  { es: "Con tiempo", en: "Relaxed" },
  },
  normal: {
    border:      "border-blue-800/50",
    bg:          "bg-blue-950/20",
    text:        "text-blue-300",
    badge:       "bg-blue-900/60",
    badgeText:   "text-blue-300",
    badgeLabel:  { es: "Normal", en: "Normal" },
  },
  soon: {
    border:      "border-amber-700/60",
    bg:          "bg-amber-950/20",
    text:        "text-amber-300",
    badge:       "bg-amber-900/60",
    badgeText:   "text-amber-200",
    badgeLabel:  { es: "Pronto", en: "Soon" },
  },
  now: {
    border:      "border-red-700/70",
    bg:          "bg-red-950/20",
    text:        "text-red-300",
    badge:       "bg-red-900/60",
    badgeText:   "text-red-200",
    badgeLabel:  { es: "¡Ya!", en: "Now!" },
  },
  past: {
    border:      "border-white/[0.08]",
    bg:          "bg-white/[0.03]",
    text:        "text-gray-500",
    badge:       "bg-white/[0.08]",
    badgeText:   "text-gray-500",
    badgeLabel:  { es: "Pasado", en: "Past" },
  },
};

// ── Component ──────────────────────────────────────────────────────────────

interface DepartureTimeWidgetProps {
  flight: TripFlight;
  geoPosition: GeoPosition | null;
  locale: "es" | "en";
}

export function DepartureTimeWidget({
  flight,
  geoPosition,
  locale,
}: DepartureTimeWidgetProps) {
  const L = LABELS[locale];

  // Build the ISO datetime for the flight departure
  const flightDepartureISO = (() => {
    if (!flight.departureTime) return "";
    // isoDate = "2026-03-29", departureTime = "20:30"
    const airport = AIRPORTS[flight.originCode];
    const tz = airport?.timezone ?? "UTC";
    // Build a naive local datetime string and convert via Intl
    // We use the airport's timezone to anchor the local time
    // (same approach as TripPanel's nextFlight memo)
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
      return new Date(depMs).toISOString();
    } catch {
      return `${flight.isoDate}T${flight.departureTime}:00`;
    }
  })();

  const result = useDepartureTime(
    flightDepartureISO,
    flight.originCode,
    geoPosition,
    locale,
  );

  // Don't render if the hook determined it's not within 24 hours
  if (!result) return null;

  const style = URGENCY_STYLES[result.urgencyLevel];
  const isPast = result.urgencyLevel === "past";

  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className={`rounded-xl border ${style.border} ${style.bg} overflow-hidden`}
    >
      {/* Header row */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Clock className={`h-3.5 w-3.5 shrink-0 ${style.text}`} />
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
            {L.sectionTitle}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${style.badge} ${style.badgeText}`}
        >
          {style.badgeLabel[locale]}
        </span>
      </div>

      {/* Main time display */}
      <div className="px-4 pb-3">
        <p
          className={`text-2xl font-black tracking-tight ${isPast ? "line-through text-gray-600" : style.text} ${result.isUrgent ? "animate-pulse" : ""}`}
        >
          {result.leaveAtFormatted}
        </p>

        {!isPast && (
          <p className="text-xs text-gray-500 mt-0.5">{result.countdownText}</p>
        )}

        {/* No-geo notice */}
        {!geoPosition && (
          <p className="text-[10px] text-gray-600 mt-1 italic">{L.noGeo}</p>
        )}
      </div>

      {/* Buffer breakdown */}
      {!isPast && (
        <div className="border-t border-white/[0.06] px-4 py-2.5 flex items-center gap-4 flex-wrap">
          <BufferItem
            icon={<Car className="h-3 w-3" />}
            label={L.drive}
            minutes={result.travelMinutes}
            unit={L.min}
          />
          <span className="text-gray-700 text-xs">+</span>
          <BufferItem
            icon={<PersonStanding className="h-3 w-3" />}
            label={L.checkin}
            minutes={result.checkInMinutes}
            unit={L.min}
          />
          <span className="text-gray-700 text-xs">+</span>
          <BufferItem
            icon={<ShieldCheck className="h-3 w-3" />}
            label={L.security}
            minutes={result.securityMinutes}
            unit={L.min}
          />
        </div>
      )}
    </motion.div>
  );
}

// ── Sub-component ──────────────────────────────────────────────────────────

function BufferItem({
  icon,
  label,
  minutes,
  unit,
}: {
  icon: React.ReactNode;
  label: string;
  minutes: number;
  unit: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-gray-400">
      <span className="text-gray-600">{icon}</span>
      <span className="text-[11px]">{label}</span>
      <span className="text-[11px] font-bold text-gray-300">
        {minutes} {unit}
      </span>
    </div>
  );
}
