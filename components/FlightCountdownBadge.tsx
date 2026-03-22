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

  // Don't render if already departed or more than 24h away
  if (totalMinutes < 0) return null;
  if (totalMinutes > 24 * 60) return null;

  const isUrgent = totalMinutes <= 60;

  let label: string;
  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const mins  = totalMinutes % 60;
    label = locale === "es"
      ? `Sale en ${hours}h ${mins}min`
      : `Departs in ${hours}h ${mins}min`;
  } else {
    label = locale === "es"
      ? `Sale en ${totalMinutes}min`
      : `Departs in ${totalMinutes}min`;
  }

  return (
    <div
      className={[
        "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm",
        isUrgent
          ? "bg-amber-900/40 border border-amber-700/40 text-amber-300"
          : "bg-violet-900/40 border border-violet-700/40 text-violet-300",
        flashing ? "animate-success-flash" : "",
      ].join(" ")}
    >
      <Plane className="h-3.5 w-3.5 shrink-0" />
      <span className="font-semibold tabular-nums">{label}</span>
    </div>
  );
}
