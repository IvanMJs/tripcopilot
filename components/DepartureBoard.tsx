"use client";

import { Plane } from "lucide-react";
import { TripTab, AirportStatusMap, DelayStatus } from "@/lib/types";

interface DepartureBoardProps {
  trips: TripTab[];
  statusMap: AirportStatusMap;
  locale: "es" | "en";
}

interface BoardRow {
  flightCode: string;
  airlineName: string;
  originCode: string;
  destinationCode: string;
  departureTime: string;
  isoDate: string;
  status: DelayStatus;
  tripName: string;
}

const STATUS_STYLE: Record<
  DelayStatus,
  { pill: string; label: { es: string; en: string } }
> = {
  ok:             { pill: "bg-emerald-950/60 text-emerald-300 border border-emerald-500/20", label: { es: "A tiempo",    en: "On time"    } },
  delay_minor:    { pill: "bg-yellow-950/60  text-yellow-300  border border-yellow-500/20",  label: { es: "Demora leve", en: "Minor delay" } },
  delay_moderate: { pill: "bg-orange-950/60  text-orange-300  border border-orange-500/20",  label: { es: "Demora",      en: "Delay"       } },
  delay_severe:   { pill: "bg-red-950/60     text-red-300     border border-red-500/25",      label: { es: "Demora grave",en: "Severe delay"} },
  ground_delay:   { pill: "bg-red-950/70     text-red-200     border border-red-600/30",      label: { es: "GDP",         en: "GDP"         } },
  ground_stop:    { pill: "bg-red-950/80     text-red-200     border border-red-600/40",      label: { es: "Ground stop", en: "Ground stop" } },
  closure:        { pill: "bg-zinc-900/60    text-zinc-300    border border-zinc-600/30",     label: { es: "Cerrado",     en: "Closed"      } },
  unknown:        { pill: "bg-zinc-900/40    text-zinc-400    border border-zinc-700/30",     label: { es: "Desconocido", en: "Unknown"     } },
};

function formatDate(isoDate: string, locale: "es" | "en"): string {
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString(locale === "en" ? "en-US" : "es-AR", {
    weekday: "short",
    day:     "numeric",
    month:   "short",
  });
}

/**
 * Shows all of today's flights across all user trips, sorted by departure time.
 * Displayed as a compact departure-board style list.
 */
export function DepartureBoard({ trips, statusMap, locale }: DepartureBoardProps) {
  const today = new Date().toISOString().slice(0, 10);

  const rows: BoardRow[] = trips
    .flatMap((trip) =>
      trip.flights
        .filter((f) => f.isoDate === today)
        .map<BoardRow>((f) => ({
          flightCode:      f.flightCode,
          airlineName:     f.airlineName,
          originCode:      f.originCode,
          destinationCode: f.destinationCode,
          departureTime:   f.departureTime ?? "--:--",
          isoDate:         f.isoDate,
          status:          statusMap[f.originCode]?.status ?? "unknown",
          tripName:        trip.name,
        })),
    )
    .sort((a, b) => a.departureTime.localeCompare(b.departureTime));

  const dateLabel = formatDate(today, locale);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-white">
            {locale === "es" ? "Vuelos de hoy" : "Today's flights"}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">{dateLabel}</p>
        </div>
        <span className="text-xs font-semibold text-gray-500 px-2 py-1 rounded-lg border border-white/8 bg-white/[0.03]">
          {rows.length}{" "}
          {rows.length === 1
            ? (locale === "es" ? "vuelo" : "flight")
            : (locale === "es" ? "vuelos" : "flights")}
        </span>
      </div>

      {/* Empty state */}
      {rows.length === 0 && (
        <div className="rounded-2xl border border-white/[0.06] overflow-hidden"
          style={{ background: "linear-gradient(150deg, rgba(12,12,22,0.97) 0%, rgba(8,8,16,0.99) 100%)" }}
        >
          <div className="px-6 py-12 flex flex-col items-center text-center gap-4">
            {/* SVG plane silhouette */}
            <svg viewBox="0 0 120 80" className="w-32 h-20 opacity-40" fill="none">
              <ellipse cx="30" cy="62" rx="26" ry="12" fill="rgba(139,92,246,0.15)" />
              <ellipse cx="75" cy="57" rx="36" ry="16" fill="rgba(139,92,246,0.12)" />
              <path d="M18 38 L54 26 L92 31 L76 40 L54 38 Z" fill="rgba(139,92,246,0.55)" />
              <path d="M54 38 L57 56 L48 52 Z" fill="rgba(139,92,246,0.45)" />
              <path d="M26 35 L38 28 L42 33 Z" fill="rgba(139,92,246,0.35)" />
              {/* Trail dots */}
              <circle cx="100" cy="29" r="2.5" fill="rgba(139,92,246,0.3)" />
              <circle cx="108" cy="26" r="1.8" fill="rgba(139,92,246,0.2)" />
              <circle cx="114" cy="24" r="1.2" fill="rgba(139,92,246,0.1)" />
            </svg>
            <div>
              <p className="text-base font-semibold text-gray-300 mb-1">
                {locale === "es" ? "No tenés vuelos hoy" : "No flights today"}
              </p>
              <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
                {locale === "es"
                  ? "Cuando tengas vuelos programados para hoy, aparecerán acá"
                  : "When you have flights scheduled for today, they'll appear here"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Board rows */}
      {rows.length > 0 && (
        <div className="rounded-2xl border border-white/[0.07] overflow-hidden"
          style={{ background: "linear-gradient(150deg, rgba(14,14,24,0.97) 0%, rgba(9,9,18,0.99) 100%)" }}
        >
          {/* Table header */}
          <div className="grid grid-cols-[auto_1fr_auto_auto] gap-3 px-4 py-2 border-b border-white/5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">
              {locale === "es" ? "Vuelo" : "Flight"}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">
              {locale === "es" ? "Ruta" : "Route"}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 text-right">
              {locale === "es" ? "Salida" : "Departs"}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 text-right">
              {locale === "es" ? "Estado" : "Status"}
            </span>
          </div>

          {/* Rows */}
          {rows.map((row, i) => {
            const statusCfg = STATUS_STYLE[row.status] ?? STATUS_STYLE.unknown;
            return (
              <div
                key={`${row.flightCode}-${i}`}
                className="grid grid-cols-[auto_1fr_auto_auto] gap-3 px-4 py-3 border-b border-white/5 last:border-0 items-center hover:bg-white/[0.02] transition-colors"
              >
                {/* Flight code + airline */}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Plane className="h-3 w-3 text-gray-500 shrink-0" />
                    <span className="text-sm font-bold text-white font-mono">{row.flightCode}</span>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-0.5 truncate max-w-[80px]">
                    {row.tripName}
                  </p>
                </div>

                {/* Route */}
                <div className="min-w-0">
                  <div className="flex items-center gap-1 text-sm">
                    <span className="font-bold text-white font-mono">{row.originCode}</span>
                    <span className="text-gray-700">→</span>
                    <span className="font-bold text-gray-400 font-mono">{row.destinationCode}</span>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-0.5 truncate">{row.airlineName}</p>
                </div>

                {/* Departure time */}
                <div className="text-right shrink-0">
                  <span className="text-sm font-bold tabular-nums text-white">{row.departureTime}</span>
                </div>

                {/* Status pill */}
                <div className="text-right shrink-0">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusCfg.pill}`}>
                    {statusCfg.label[locale]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
