"use client";

import { useState, useEffect, useRef } from "react";
import { Plane } from "lucide-react";
import { TripFlight } from "@/lib/types";
import { AIRPORTS } from "@/lib/airports";

interface FlightCountdownBadgeProps {
  flight: TripFlight;
  locale: "es" | "en";
}

/**
 * Converts a local departure time (HH:MM in the airport's timezone) to a UTC Date.
 * Reuses the same Intl-based offset trick from lib/connectionRisk.ts.
 */
function localToUTCDate(isoDate: string, timeHHMM: string, timezone: string): Date | null {
  if (!timeHHMM) return null;
  const parts = timeHHMM.split(":").map(Number);
  if (parts.length < 2) return null;
  const [h, m] = parts;

  try {
    // Treat the local time as UTC to get a reference Date
    const refMs = Date.UTC(
      parseInt(isoDate.slice(0, 4)),
      parseInt(isoDate.slice(5, 7)) - 1,
      parseInt(isoDate.slice(8, 10)),
      h, m, 0,
    );

    // Find what that UTC moment looks like in the target timezone
    const tzParts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
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
      parseInt(isoDate.slice(0, 4)),
      parseInt(isoDate.slice(5, 7)) - 1,
      parseInt(isoDate.slice(8, 10)),
    );

    return new Date(midnightUTC + (h * 60 + m + offsetMin) * 60000);
  } catch {
    // Fallback: treat time as UTC
    const midnightUTC = Date.UTC(
      parseInt(isoDate.slice(0, 4)),
      parseInt(isoDate.slice(5, 7)) - 1,
      parseInt(isoDate.slice(8, 10)),
    );
    return new Date(midnightUTC + (h * 60 + m) * 60000);
  }
}

export function FlightCountdownBadge({ flight, locale }: FlightCountdownBadgeProps) {
  const [msLeft, setMsLeft] = useState<number | null>(null);
  const [flashing, setFlashing] = useState(false);
  const celebratedRef = useRef(false);

  useEffect(() => {
    const timezone = AIRPORTS[flight.originCode]?.timezone ?? "UTC";
    const departureDate = localToUTCDate(flight.isoDate, flight.departureTime, timezone);
    if (!departureDate) return;

    function tick() {
      if (!departureDate) return;
      const remaining = departureDate.getTime() - Date.now();
      setMsLeft(remaining);
      if (remaining <= 0 && !celebratedRef.current) {
        celebratedRef.current = true;
        setFlashing(true);
        setTimeout(() => setFlashing(false), 2200);
      }
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [flight.isoDate, flight.departureTime, flight.originCode]);

  if (msLeft === null) return null;

  const totalMinutes = Math.floor(msLeft / 60000);

  // Don't render if already departed or more than 30 days away
  if (totalMinutes < 0) return null;
  if (totalMinutes > 30 * 24 * 60) return null;

  // Urgency tiers
  const isUrgent    = totalMinutes <= 60;                                      // ≤1h  — amber
  const isToday     = totalMinutes > 60 && totalMinutes <= 24 * 60;           // 1–24h — violet (existing)
  const isSoon      = totalMinutes > 24 * 60 && totalMinutes <= 2 * 24 * 60;  // 1–2 days — violet
  const isComingUp  = totalMinutes > 2 * 24 * 60 && totalMinutes <= 7 * 24 * 60; // 2–7 days — blue
  const isFar       = totalMinutes > 7 * 24 * 60;                              // 7–30 days — slate

  // Only show progress bar within 24h
  const showProgress = totalMinutes <= 24 * 60;

  // Label
  let label: string;
  if (isFar || isComingUp || isSoon) {
    const daysLeft = Math.ceil(totalMinutes / (24 * 60));
    label = locale === "es" ? `Sale en ${daysLeft}d` : `Departs in ${daysLeft}d`;
  } else if (isToday || isUrgent) {
    if (totalMinutes >= 60) {
      const hours = Math.floor(totalMinutes / 60);
      const mins  = totalMinutes % 60;
      label = locale === "es"
        ? (mins === 0 ? `Sale en ${hours}h` : `Sale en ${hours}h ${mins}min`)
        : (mins === 0 ? `Departs in ${hours}h` : `Departs in ${hours}h ${mins}min`);
    } else {
      label = locale === "es"
        ? `Sale en ${totalMinutes}min`
        : `Departs in ${totalMinutes}min`;
    }
  } else {
    label = "";
  }

  // Color scheme per tier
  const colorScheme = (() => {
    if (isUrgent)   return { bg: "bg-amber-950/40",  border: "border-amber-700/40",  text: "text-amber-300",   sub: "text-amber-400/60",  icon: "text-amber-400",  track: "bg-amber-900/50",  fill: "bg-amber-500/70"  };
    if (isToday || isSoon) return { bg: "bg-violet-950/40", border: "border-violet-700/40", text: "text-violet-300",  sub: "text-violet-400/60", icon: "text-violet-400", track: "bg-violet-900/50", fill: "bg-violet-500/70" };
    if (isComingUp) return { bg: "bg-blue-950/40",   border: "border-blue-700/40",   text: "text-blue-300",    sub: "text-blue-400/60",   icon: "text-blue-400",   track: "bg-blue-900/50",   fill: "bg-blue-500/70"   };
    // isFar — slate
    return           { bg: "bg-slate-900/40",  border: "border-slate-700/40",  text: "text-slate-300",   sub: "text-slate-400/60",  icon: "text-slate-400",  track: "bg-slate-800/50",  fill: "bg-slate-500/70"  };
  })();

  const totalDuration = 24 * 60; // 24h window in minutes (for progress bar only)
  const elapsed = Math.max(0, totalDuration - totalMinutes);
  const progress = Math.min(100, (elapsed / totalDuration) * 100);

  return (
    <div
      className={[
        "w-full rounded-xl overflow-hidden border",
        colorScheme.bg,
        colorScheme.border,
        flashing ? "animate-success-flash" : "",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3 px-4 pt-2.5 pb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <Plane className={`h-4 w-4 shrink-0 ${colorScheme.icon}`} />
          <div className="min-w-0">
            <p className={`text-xs font-bold ${colorScheme.text}`}>
              {label}
            </p>
            <p className={`text-[11px] truncate ${colorScheme.sub}`}>
              {flight.flightCode} · {flight.originCode} → {flight.destinationCode} · {flight.departureTime}
            </p>
          </div>
        </div>
        {isUrgent && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-900/50 border border-amber-700/40 rounded-full px-2 py-0.5 shrink-0 animate-pulse">
            {locale === "es" ? "Hoy" : "Today"}
          </span>
        )}
      </div>

      {/* Progress bar with airplane — only within 24h */}
      {showProgress && (
        <div className="px-4 pb-3">
          <div className="relative h-2 rounded-full overflow-visible">
            {/* Track */}
            <div className={`absolute inset-0 rounded-full ${colorScheme.track}`} />
            {/* Fill */}
            <div
              className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${colorScheme.fill}`}
              style={{ width: `${progress}%` }}
            />
            {/* Airplane indicator */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 transition-all duration-1000"
              style={{ left: `clamp(6px, ${progress}%, calc(100% - 6px))` }}
            >
              <Plane className={`h-3.5 w-3.5 drop-shadow-lg ${colorScheme.text}`} />
            </div>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className={`text-[10px] ${colorScheme.sub}`}>
              {locale === "es" ? "24h antes" : "24h before"}
            </span>
            <span className={`text-[10px] font-bold tabular-nums ${colorScheme.text}`}>
              {Math.round(progress)}%
            </span>
            <span className={`text-[10px] ${colorScheme.sub}`}>
              {locale === "es" ? "Salida" : "Departure"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
