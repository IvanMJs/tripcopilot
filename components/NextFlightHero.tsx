"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Plane, MapPin } from "lucide-react";
import { TripFlight } from "@/lib/types";
import { AIRPORTS } from "@/lib/airports";
import { useDestinationWeather } from "@/hooks/useDestinationWeather";

// ── Labels ────────────────────────────────────────────────────────────────────

const LABELS = {
  es: {
    days:    (n: number) => `${n} día${n !== 1 ? "s" : ""}`,
    hours:   (n: number) => `${n} hora${n !== 1 ? "s" : ""}`,
    minutes: (n: number) => `${n} min`,
    today:   "Hoy",
    tomorrow:"Mañana",
    departure:"Salida",
    cta:     "Planificá tu próximo viaje",
    ctaSub:  "Agregá un viaje para ver la cuenta regresiva",
  },
  en: {
    days:    (n: number) => `${n} day${n !== 1 ? "s" : ""}`,
    hours:   (n: number) => `${n} hour${n !== 1 ? "s" : ""}`,
    minutes: (n: number) => `${n} min`,
    today:   "Today",
    tomorrow:"Tomorrow",
    departure:"Departure",
    cta:     "Plan your next trip",
    ctaSub:  "Add a trip to see the countdown",
  },
} as const;

// ── Urgency helpers ───────────────────────────────────────────────────────────

type HeroUrgency = "far" | "week" | "near" | "imminent";

function getHeroUrgency(diffMs: number): HeroUrgency {
  const days = diffMs / (1000 * 60 * 60 * 24);
  if (days > 7)   return "far";
  if (days > 2)   return "week";
  if (days > 1)   return "near";
  return "imminent";
}

const URGENCY_GRADIENT: Record<HeroUrgency, string> = {
  far:      "linear-gradient(135deg, rgba(76,29,149,0.92) 0%, rgba(30,27,75,0.97) 100%)",
  week:     "linear-gradient(135deg, rgba(23,37,84,0.92) 0%, rgba(15,23,42,0.97) 100%)",
  near:     "linear-gradient(135deg, rgba(78,30,4,0.92) 0%, rgba(30,15,4,0.97) 100%)",
  imminent: "linear-gradient(135deg, rgba(127,29,29,0.92) 0%, rgba(50,10,10,0.97) 100%)",
};

const URGENCY_BORDER: Record<HeroUrgency, string> = {
  far:      "border-violet-700/40",
  week:     "border-blue-700/40",
  near:     "border-amber-600/40",
  imminent: "border-red-600/50",
};

const URGENCY_TEXT: Record<HeroUrgency, string> = {
  far:      "text-violet-300",
  week:     "text-blue-300",
  near:     "text-amber-300",
  imminent: "text-red-300",
};

// ── Countdown helpers ─────────────────────────────────────────────────────────

function buildCountdownLabel(
  diffMs: number,
  locale: "es" | "en",
): string {
  const L = LABELS[locale];
  if (diffMs <= 0) return L.today;

  const totalMinutes = Math.floor(diffMs / 60000);
  const totalHours   = Math.floor(totalMinutes / 60);
  const totalDays    = Math.floor(totalHours / 24);
  const remHours     = totalHours % 24;
  const remMinutes   = totalMinutes % 60;

  if (totalDays >= 1) {
    if (remHours > 0) {
      return `${L.days(totalDays)}, ${L.hours(remHours)}`;
    }
    return L.days(totalDays);
  }
  if (totalHours >= 1) {
    if (remMinutes > 0) {
      return `${L.hours(totalHours)}, ${L.minutes(remMinutes)}`;
    }
    return L.hours(totalHours);
  }
  return L.minutes(totalMinutes);
}

function formatHeroDate(isoDate: string, locale: "es" | "en"): string {
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString(locale === "en" ? "en-US" : "es-AR", {
    weekday: "long",
    day:     "numeric",
    month:   "long",
  });
}

function getFlightDepartureMs(flight: TripFlight): number {
  if (!flight.departureTime) {
    return new Date(flight.isoDate + "T00:00:00").getTime();
  }
  const airport = AIRPORTS[flight.originCode];
  const tz = airport?.timezone ?? "UTC";
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
    return midnightUTC + (h * 60 + m + offsetMin) * 60000;
  } catch {
    return new Date(`${flight.isoDate}T${flight.departureTime ?? "00:00"}:00`).getTime();
  }
}

// ── Live countdown hook ───────────────────────────────────────────────────────

function useLiveMs(targetMs: number): number {
  const [diffMs, setDiffMs] = useState(() => Math.max(0, targetMs - Date.now()));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setDiffMs(Math.max(0, targetMs - Date.now()));
    intervalRef.current = setInterval(() => {
      setDiffMs(Math.max(0, targetMs - Date.now()));
    }, 60_000);
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
  }, [targetMs]);

  return diffMs;
}

// ── Route breadcrumb ──────────────────────────────────────────────────────────

function buildRouteBreadcrumb(flight: TripFlight): string {
  return `${flight.originCode} → ${flight.destinationCode}`;
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface NextFlightHeroProps {
  /** The earliest upcoming flight across all trips, or null if none */
  nextFlight: TripFlight | null;
  locale: "es" | "en";
}

// ── Component ─────────────────────────────────────────────────────────────────

export function NextFlightHero({ nextFlight, locale }: NextFlightHeroProps) {
  const L = LABELS[locale];

  if (!nextFlight) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
        className="rounded-2xl border border-white/[0.07] overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, rgba(20,10,40,0.90) 0%, rgba(10,10,20,0.97) 100%)",
        }}
      >
        <div className="px-5 py-8 flex flex-col items-center text-center gap-3">
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          >
            <Plane className="h-10 w-10 text-violet-400/60" />
          </motion.div>
          <div>
            <p className="text-base font-bold text-white leading-tight">{L.cta}</p>
            <p className="text-sm text-gray-500 mt-1">{L.ctaSub}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  const depMs   = getFlightDepartureMs(nextFlight);
  const destCity = AIRPORTS[nextFlight.destinationCode]?.city ?? nextFlight.destinationCode;
  const dateLabel = formatHeroDate(nextFlight.isoDate, locale);
  const route    = buildRouteBreadcrumb(nextFlight);

  return (
    <HeroContent
      flight={nextFlight}
      depMs={depMs}
      destCity={destCity}
      dateLabel={dateLabel}
      route={route}
      locale={locale}
    />
  );
}

// ── HeroContent (inner) ───────────────────────────────────────────────────────
// Separate so the hook runs inside a component that always has `flight`.

interface HeroContentProps {
  flight: TripFlight;
  depMs: number;
  destCity: string;
  dateLabel: string;
  route: string;
  locale: "es" | "en";
}

function HeroContent({
  flight,
  depMs,
  destCity,
  dateLabel,
  route,
  locale,
}: HeroContentProps) {
  const L = LABELS[locale];
  const diffMs  = useLiveMs(depMs);
  const urgency = getHeroUrgency(diffMs);
  const accentClass = URGENCY_TEXT[urgency];

  const { forecast } = useDestinationWeather(
    flight.destinationCode,
    flight.isoDate,
    locale,
    true,
  );

  const countdownLabel = buildCountdownLabel(diffMs, locale);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 24 }}
      className={`rounded-2xl border ${URGENCY_BORDER[urgency]} overflow-hidden`}
      style={{ background: URGENCY_GRADIENT[urgency] }}
    >
      {/* Animated plane strip */}
      <div className="relative h-1 overflow-hidden">
        <motion.div
          className="absolute inset-y-0 w-12 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{ x: ["-48px", "calc(100vw + 48px)"] }}
          transition={{ repeat: Infinity, duration: 4, ease: "linear", repeatDelay: 3 }}
        />
      </div>

      <div className="px-5 pt-5 pb-5">
        {/* Destination hero text */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${accentClass} opacity-70`}>
              {L.departure}
            </p>
            <h2 className="text-3xl font-black text-white leading-none truncate">
              {destCity}
            </h2>
          </div>

          {/* Weather badge */}
          {forecast && (
            <div className="shrink-0 flex flex-col items-end gap-0.5">
              <span className="text-2xl leading-none">{forecast.conditionEmoji}</span>
              <span className={`text-sm font-bold tabular-nums ${accentClass}`}>
                {forecast.tempMaxC}°
              </span>
            </div>
          )}
        </div>

        {/* Route breadcrumb */}
        <div className="flex items-center gap-1.5 mb-4">
          <MapPin className="h-3 w-3 text-gray-500 shrink-0" />
          <span className="text-sm font-mono font-semibold text-gray-400 tracking-wider">
            {route}
          </span>
          {flight.departureTime && (
            <>
              <span className="text-gray-600 mx-1">·</span>
              <span className="text-sm text-gray-500 tabular-nums font-semibold">
                {flight.departureTime}
              </span>
            </>
          )}
        </div>

        {/* Countdown — big hero number */}
        <div className="mb-3">
          <motion.p
            key={countdownLabel}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            className={`text-4xl font-black leading-none tabular-nums ${accentClass}`}
          >
            {countdownLabel}
          </motion.p>
        </div>

        {/* Date label */}
        <p className="text-sm text-gray-400 font-medium capitalize">{dateLabel}</p>
      </div>
    </motion.div>
  );
}
