"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Plane, Hotel } from "lucide-react";
import { TripTab, TripFlight, Accommodation, AirportStatus } from "@/lib/types";
import { AIRPORTS } from "@/lib/airports";

// ── Types ─────────────────────────────────────────────────────────────────────

type FlightEvent = {
  type: "flight";
  sortKey: string;
  flight: TripFlight;
};

type AccommodationEvent = {
  type: "accommodation";
  sortKey: string;
  accommodation: Accommodation;
};

type TimelineEvent = FlightEvent | AccommodationEvent;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDayHeader(isoDate: string, locale: "es" | "en"): string {
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString(locale === "en" ? "en-US" : "es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatShortDate(isoDate: string, locale: "es" | "en"): string {
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString(locale === "en" ? "en-US" : "es-AR", {
    day: "numeric",
    month: "short",
  });
}

function isToday(isoDate: string): boolean {
  return isoDate === new Date().toISOString().slice(0, 10);
}

function isPast(isoDate: string): boolean {
  return isoDate < new Date().toISOString().slice(0, 10);
}

function getAirlineColor(code: string): string {
  const colors: Record<string, string> = {
    AA: "bg-blue-700",
    UA: "bg-blue-900",
    DL: "bg-red-700",
    WN: "bg-orange-600",
    B6: "bg-sky-600",
    NK: "bg-yellow-500",
    F9: "bg-green-600",
    AS: "bg-teal-700",
    HA: "bg-purple-700",
    G4: "bg-orange-700",
    AR: "bg-sky-700",
    LA: "bg-red-800",
    AV: "bg-red-600",
    CM: "bg-blue-600",
  };
  return colors[code] ?? "bg-violet-700";
}

function getStatusPillClass(status: string | undefined): string {
  switch (status) {
    case "delay_minor":    return "bg-yellow-900/50 text-yellow-400 border border-yellow-700/40";
    case "delay_moderate": return "bg-orange-900/50 text-orange-400 border border-orange-700/40";
    case "delay_severe":   return "bg-red-900/50 text-red-400 border border-red-700/40";
    case "ground_stop":    return "bg-red-950/70 text-red-300 border border-red-700/50";
    case "ground_delay":   return "bg-orange-950/70 text-orange-300 border border-orange-700/50";
    case "closure":        return "bg-red-950/80 text-red-200 border border-red-600/60";
    case "ok":             return "bg-emerald-900/40 text-emerald-400 border border-emerald-700/30";
    default:               return "bg-white/[0.04] text-gray-500 border border-white/[0.06]";
  }
}

function getStatusLabel(status: string | undefined, locale: "es" | "en"): string | null {
  if (!status || status === "ok" || status === "unknown") return null;
  const map: Record<string, { es: string; en: string }> = {
    delay_minor:    { es: "Demora leve",   en: "Minor delay"    },
    delay_moderate: { es: "Demora moderada",en: "Moderate delay" },
    delay_severe:   { es: "Demora severa", en: "Severe delay"   },
    ground_stop:    { es: "Ground stop",   en: "Ground stop"    },
    ground_delay:   { es: "Ground delay",  en: "Ground delay"   },
    closure:        { es: "Cerrado",       en: "Closed"         },
  };
  return map[status]?.[locale] ?? null;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FlightEventCard({
  flight,
  locale,
  statusMap,
  isFirst,
}: {
  flight: TripFlight;
  locale: "es" | "en";
  statusMap?: Record<string, AirportStatus>;
  isFirst?: boolean;
}) {
  const originInfo  = AIRPORTS[flight.originCode];
  const destInfo    = AIRPORTS[flight.destinationCode];
  const originCity  = originInfo?.city ?? flight.originCode;
  const destCity    = destInfo?.city   ?? flight.destinationCode;
  const airlineCode = flight.airlineCode;
  const pastFlight  = isPast(flight.isoDate);

  const originStatus = statusMap?.[flight.originCode];
  const statusLabel = getStatusLabel(originStatus?.status, locale);

  return (
    <div
      className={`rounded-xl border p-3 transition-all ${
        pastFlight
          ? "border-white/[0.04] bg-white/[0.02] opacity-60"
          : isFirst
          ? "border-violet-700/30 bg-white/[0.05]"
          : "border-white/[0.06] bg-white/[0.04]"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Airline badge */}
        <div
          className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white ${getAirlineColor(airlineCode)}`}
        >
          {airlineCode.slice(0, 2)}
        </div>

        {/* Route */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-white">
              {flight.originCode}
            </span>
            <Plane className="h-3 w-3 text-gray-500 shrink-0" />
            <span className="text-sm font-bold text-white">
              {flight.destinationCode}
            </span>
            <span className="text-[11px] text-gray-500 font-medium">
              {flight.flightCode}
            </span>
          </div>

          <p className="text-xs text-gray-400 mt-0.5 truncate">
            {originCity} → {destCity}
          </p>

          {/* Times */}
          {(flight.departureTime || flight.arrivalTime) && (
            <div className="flex items-center gap-3 mt-1.5">
              {flight.departureTime && (
                <div>
                  <span className="text-[10px] text-gray-600 uppercase tracking-wide">
                    {locale === "es" ? "Sale" : "Dep"}
                  </span>
                  <span className="ml-1 text-xs font-semibold text-white tabular-nums">
                    {flight.departureTime}
                  </span>
                </div>
              )}
              {flight.arrivalTime && (
                <div>
                  <span className="text-[10px] text-gray-600 uppercase tracking-wide">
                    {locale === "es" ? "Llega" : "Arr"}
                  </span>
                  <span className="ml-1 text-xs font-semibold text-white tabular-nums">
                    {flight.arrivalTime}
                    {flight.arrivalDate && flight.arrivalDate !== flight.isoDate && (
                      <span className="text-[10px] text-gray-500 ml-0.5">+1</span>
                    )}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status pill */}
        {statusLabel && (
          <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${getStatusPillClass(originStatus?.status)}`}>
            {statusLabel}
          </span>
        )}
      </div>

      {/* Cabin / seat */}
      {(flight.cabinClass || flight.seatNumber) && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/[0.04]">
          {flight.cabinClass && (
            <span className="text-[10px] text-gray-500 capitalize">
              {flight.cabinClass.replace("_", " ")}
            </span>
          )}
          {flight.seatNumber && (
            <span className="text-[10px] text-gray-500">
              {locale === "es" ? "Asiento" : "Seat"} {flight.seatNumber}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function AccommodationEventCard({
  accommodation,
  locale,
}: {
  accommodation: Accommodation;
  locale: "es" | "en";
}) {
  const checkIn  = accommodation.checkInDate
    ? formatShortDate(accommodation.checkInDate, locale)
    : null;
  const checkOut = accommodation.checkOutDate
    ? formatShortDate(accommodation.checkOutDate, locale)
    : null;

  return (
    <div className="rounded-xl border border-blue-900/30 bg-blue-950/20 p-3">
      <div className="flex items-start gap-3">
        <div className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-blue-800/40">
          <Hotel className="h-4 w-4 text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{accommodation.name}</p>
          {(checkIn || checkOut) && (
            <p className="text-xs text-gray-400 mt-0.5">
              {checkIn && checkOut
                ? `${checkIn} – ${checkOut}`
                : checkIn ?? checkOut}
            </p>
          )}
          {(accommodation.checkInTime || accommodation.checkOutTime) && (
            <div className="flex items-center gap-3 mt-1">
              {accommodation.checkInTime && (
                <span className="text-[11px] text-gray-500">
                  {locale === "es" ? "Check-in" : "Check-in"} {accommodation.checkInTime}
                </span>
              )}
              {accommodation.checkOutTime && (
                <span className="text-[11px] text-gray-500">
                  {locale === "es" ? "Check-out" : "Check-out"} {accommodation.checkOutTime}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── TripTimelineView ──────────────────────────────────────────────────────────

interface TripTimelineViewProps {
  trip: TripTab;
  locale: "es" | "en";
  statusMap?: Record<string, AirportStatus>;
}

export function TripTimelineView({ trip, locale, statusMap }: TripTimelineViewProps) {
  const todayIso = new Date().toISOString().slice(0, 10);

  // Build merged event list
  const events = useMemo((): TimelineEvent[] => {
    const list: TimelineEvent[] = [];

    for (const flight of trip.flights) {
      list.push({
        type: "flight",
        sortKey: `${flight.isoDate}T${flight.departureTime ?? "00:00"}`,
        flight,
      });
    }

    for (const acc of trip.accommodations) {
      const date = acc.checkInDate ?? "";
      if (!date) continue;
      list.push({
        type: "accommodation",
        sortKey: `${date}T${acc.checkInTime ?? "14:00"}`,
        accommodation: acc,
      });
    }

    return list.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [trip.flights, trip.accommodations]);

  // Group by date
  const grouped = useMemo((): Record<string, TimelineEvent[]> => {
    const map: Record<string, TimelineEvent[]> = {};
    for (const ev of events) {
      const date = ev.sortKey.slice(0, 10);
      if (!map[date]) map[date] = [];
      map[date].push(ev);
    }
    return map;
  }, [events]);

  const sortedDates = Object.keys(grouped).sort();

  if (sortedDates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
        <Plane className="h-8 w-8 text-gray-600" />
        <p className="text-sm text-gray-500">
          {locale === "es"
            ? "No hay vuelos en este viaje"
            : "No flights in this trip"}
        </p>
      </div>
    );
  }

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.06 } },
  };

  const itemVariants = {
    hidden:  { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="relative"
    >
      {/* Vertical line */}
      <div className="absolute left-[19px] top-0 bottom-0 w-px bg-white/[0.06]" />

      <div className="space-y-0">
        {sortedDates.map((date) => {
          const dayEvents  = grouped[date];
          const isTodayDay = isToday(date);
          const isPastDay  = isPast(date);

          return (
            <motion.div key={date} variants={itemVariants}>
              {/* Sticky date header */}
              <div
                className={`sticky top-0 z-10 flex items-center gap-3 py-2 mb-2 ${
                  isTodayDay
                    ? "bg-surface-input/95 backdrop-blur-sm"
                    : "bg-transparent"
                }`}
              >
                {/* Timeline dot */}
                <div
                  className={`relative z-10 shrink-0 h-10 w-10 rounded-full flex items-center justify-center border-2 ${
                    isTodayDay
                      ? "border-violet-500 bg-violet-900/60"
                      : isPastDay
                      ? "border-white/10 bg-white/[0.03]"
                      : "border-white/20 bg-white/[0.06]"
                  }`}
                >
                  {isTodayDay && (
                    <div className="absolute inset-[-3px] rounded-full border border-violet-500/40 animate-pulse" />
                  )}
                  <span
                    className={`text-[10px] font-black uppercase tabular-nums ${
                      isTodayDay
                        ? "text-violet-300"
                        : isPastDay
                        ? "text-gray-600"
                        : "text-gray-400"
                    }`}
                  >
                    {new Date(date + "T00:00:00").getDate()}
                  </span>
                </div>

                {/* Date label */}
                <div>
                  <p
                    className={`text-xs font-bold ${
                      isTodayDay
                        ? "text-violet-300"
                        : isPastDay
                        ? "text-gray-600"
                        : "text-gray-300"
                    }`}
                  >
                    {isTodayDay
                      ? locale === "es"
                        ? "Hoy"
                        : "Today"
                      : formatDayHeader(date, locale)}
                  </p>
                  {isTodayDay && (
                    <p className="text-[10px] text-violet-500 font-semibold uppercase tracking-widest">
                      {formatDayHeader(date, locale)}
                    </p>
                  )}
                </div>

                {isTodayDay && (
                  <span className="ml-auto shrink-0 text-[10px] font-bold uppercase tracking-widest text-violet-400 bg-violet-900/30 border border-violet-700/40 px-2 py-0.5 rounded-full">
                    {locale === "es" ? "Hoy" : "Today"}
                  </span>
                )}
              </div>

              {/* Events for this day */}
              <div className="ml-14 space-y-2 pb-4">
                {dayEvents.map((ev, evIdx) => {
                  const isFirstFlight =
                    ev.type === "flight" &&
                    date >= todayIso &&
                    evIdx === 0 &&
                    date === sortedDates.find((d) => d >= todayIso);

                  return (
                    <div key={ev.type === "flight" ? ev.flight.id : ev.accommodation.id}>
                      {ev.type === "flight" ? (
                        <FlightEventCard
                          flight={ev.flight}
                          locale={locale}
                          statusMap={statusMap}
                          isFirst={isFirstFlight}
                        />
                      ) : (
                        <AccommodationEventCard
                          accommodation={ev.accommodation}
                          locale={locale}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
