"use client";

import { useMemo } from "react";
import { ArrowRight, CheckCircle, AlertTriangle, ShieldAlert, ShieldCheck, Shield, ShieldOff } from "lucide-react";
import { AirportStatusMap, TripFlight } from "@/lib/types";
import { FlightData } from "@/hooks/useMyFlights";
import { calculateTripRiskScore } from "@/lib/tripRiskScore";
import { analyzeAllConnections } from "@/lib/connectionRisk";

interface TripSummaryHeroProps {
  statusMap: AirportStatusMap;
  locale: "es" | "en";
  flights: FlightData[];
}

// Convert display-oriented FlightData → data model TripFlight for risk functions
function toTripFlight(f: FlightData, idx: number): TripFlight {
  const parts = f.flightNum.split(" ");
  return {
    id:              f.isoDate + idx,
    flightCode:      f.flightNum.replace(/\s+/g, ""),
    airlineCode:     parts[0] ?? "",
    airlineName:     f.airline,
    airlineIcao:     "",
    flightNumber:    parts[1] ?? "",
    originCode:      f.originCode,
    destinationCode: f.destinationCode,
    isoDate:         f.isoDate,
    departureTime:   f.departureTime,
    arrivalBuffer:   f.arrivalBuffer,
  };
}

function getDaysUntil(isoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(isoDate + "T00:00:00").getTime() - today.getTime()) / 86400000);
}

const LEVEL_CONFIG = {
  low: {
    outerBorder: "border-emerald-800/30",
    gradient:    "linear-gradient(150deg, rgba(6,30,20,0.98) 0%, rgba(8,8,16,0.99) 100%)",
    statusBg:    "bg-emerald-950/50",
    statusBorder:"border-emerald-800/40",
    dot:         "bg-emerald-400",
    text:        "text-emerald-400",
    scoreColor:  "text-emerald-300",
    icon:        ShieldCheck,
    headline:    { es: "Tu viaje está en orden",          en: "Your trip looks good"             },
    sub:         { es: "Sin alertas en ningún tramo",     en: "No alerts on any leg"             },
  },
  medium: {
    outerBorder: "border-yellow-800/40",
    gradient:    "linear-gradient(150deg, rgba(30,22,4,0.98) 0%, rgba(8,8,16,0.99) 100%)",
    statusBg:    "bg-yellow-950/50",
    statusBorder:"border-yellow-700/40",
    dot:         "bg-yellow-400 animate-pulse",
    text:        "text-yellow-400",
    scoreColor:  "text-yellow-300",
    icon:        Shield,
    headline:    { es: "Hay algo que revisar",            en: "Worth a closer look"              },
    sub:         { es: "Revisá los vuelos abajo",         en: "Check the flights below"          },
  },
  high: {
    outerBorder: "border-orange-700/50",
    gradient:    "linear-gradient(150deg, rgba(36,14,4,0.98) 0%, rgba(8,8,16,0.99) 100%)",
    statusBg:    "bg-orange-950/50",
    statusBorder:"border-orange-700/40",
    dot:         "bg-orange-400 animate-pulse",
    text:        "text-orange-400",
    scoreColor:  "text-orange-300",
    icon:        ShieldAlert,
    headline:    { es: "Atención — hay alertas activas",  en: "Attention — active alerts"        },
    sub:         { es: "Revisá cada tramo",               en: "Review each leg below"            },
  },
  critical: {
    outerBorder: "border-red-700/50",
    gradient:    "linear-gradient(150deg, rgba(36,4,4,0.99) 0%, rgba(8,8,16,0.99) 100%)",
    statusBg:    "bg-red-950/50",
    statusBorder:"border-red-700/40",
    dot:         "bg-red-400 animate-pulse",
    text:        "text-red-400",
    scoreColor:  "text-red-300",
    icon:        ShieldOff,
    headline:    { es: "Riesgo crítico — actuá ya",       en: "Critical risk — act now"          },
    sub:         { es: "Contactá a tu aerolínea",         en: "Contact your airline now"         },
  },
} as const;

const CONN_LABELS = {
  missed:  { es: "Conexión perdida",  en: "Missed connection"  },
  at_risk: { es: "En riesgo",         en: "At risk"            },
  tight:   { es: "Ajustada",          en: "Tight"              },
} as const;

export function TripSummaryHero({ statusMap, locale, flights }: TripSummaryHeroProps) {
  const tripFlights = useMemo(() => flights.map(toTripFlight), [flights]);

  const risk = useMemo(
    () => calculateTripRiskScore(tripFlights, statusMap, locale),
    [tripFlights, statusMap, locale],
  );
  const connectionMap = useMemo(
    () => analyzeAllConnections(tripFlights, statusMap),
    [tripFlights, statusMap],
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);
  const nextFlight = flights.find(
    (f) => new Date(f.isoDate + "T00:00:00") >= today,
  );
  const totalFlights = flights.length;
  const completedFlights = flights.filter((f) => f.isoDate < todayStr).length;
  const daysUntil = nextFlight ? getDaysUntil(nextFlight.isoDate) : null;

  const worstConn = Array.from(connectionMap.values())
    .filter((c) => c.risk !== "safe")
    .sort((a, b) => {
      const o = { missed: 0, at_risk: 1, tight: 2, safe: 3 };
      return o[a.risk] - o[b.risk];
    })[0] ?? null;

  // Derive alert count from the same risk engine — avoids band/strip contradiction
  const airportAlertCount =
    risk.level === "low"
      ? 0
      : risk.factors.filter((f) => f.type === "airport_status").length;

  const cfg = LEVEL_CONFIG[risk.level];
  const Icon = cfg.icon;

  return (
    <div
      className={`rounded-2xl border ${cfg.outerBorder} overflow-hidden animate-fade-in-up`}
      style={{ background: cfg.gradient }}
    >
      {/* ── PRÓXIMO VUELO — protagonista visual ─────────────────────────────── */}
      <div className="px-4 pt-5 pb-4 sm:px-5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-600 mb-3">
          {nextFlight
            ? (locale === "es" ? "Próximo vuelo" : "Next flight")
            : (locale === "es" ? "Tu viaje" : "Your trip")}
        </p>

        {nextFlight ? (
          <>
            {/* Flight code + route */}
            <div className="flex items-baseline gap-3 flex-wrap mb-2.5">
              <span className="text-2xl font-black text-white tracking-tight leading-none">
                {nextFlight.flightNum}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold text-gray-200">{nextFlight.originCode}</span>
                <ArrowRight className="h-4 w-4 text-gray-600 shrink-0" />
                <span className="text-base font-bold text-gray-200">{nextFlight.destinationCode}</span>
              </div>
            </div>

            {/* Departure time + countdown pill */}
            <div className="flex items-center gap-3 flex-wrap">
              {nextFlight.departureTime && (
                <span className="text-sm text-gray-500">
                  {locale === "es" ? "Sale" : "Departs"}{" "}
                  <span className="text-gray-300 font-semibold tabular">{nextFlight.departureTime}</span>
                </span>
              )}
              {daysUntil !== null && (
                <span className={`text-sm font-black px-3 py-1 rounded-full leading-none ${
                  daysUntil === 0 ? "bg-red-900/70 text-red-300 animate-pulse" :
                  daysUntil === 1 ? "bg-yellow-900/60 text-yellow-300" :
                  daysUntil <= 7  ? "bg-blue-900/50 text-blue-300" :
                                    "bg-white/[0.06] text-gray-400"
                }`}>
                  {daysUntil === 0
                    ? (locale === "es" ? "HOY ✈" : "TODAY ✈")
                    : daysUntil === 1
                    ? (locale === "es" ? "mañana" : "tomorrow")
                    : locale === "es" ? `en ${daysUntil} días` : `in ${daysUntil} days`}
                </span>
              )}
            </div>
          </>
        ) : (
          /* Trip completed */
          <p className="text-base font-semibold text-gray-500">
            {locale === "es" ? "Viaje completado ✓" : "Trip completed ✓"}
          </p>
        )}
      </div>

      {/* ── PROGRESS BAR ─────────────────────────────────────────────────────── */}
      {totalFlights > 0 && (
        <div className="px-4 pb-3 sm:px-5 mt-2 space-y-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>{completedFlights}/{totalFlights} {locale === "es" ? "vuelos" : "flights"}</span>
            <span>{Math.round((completedFlights / totalFlights) * 100)}%</span>
          </div>
          <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all"
              style={{ width: `${(completedFlights / totalFlights) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* ── STATUS BAND — full width ─────────────────────────────────────────── */}
      <div className={`mx-3 sm:mx-4 mb-3 rounded-xl border ${cfg.statusBorder} ${cfg.statusBg} px-4 py-3 flex items-center gap-3`}>
        <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${cfg.dot}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold leading-snug ${cfg.text}`}>
            {cfg.headline[locale]}
          </p>
          <p className={`text-[11px] leading-snug mt-0.5 ${cfg.text} opacity-60`}>
            {cfg.sub[locale]}
          </p>
        </div>
        {/* Risk score — prominent number */}
        <div className="flex flex-col items-center shrink-0 mr-1">
          <span className={`text-2xl font-black tabular leading-none ${cfg.scoreColor}`}>
            {risk.score}
          </span>
          <span className={`text-[9px] font-bold uppercase tracking-wider ${cfg.text} opacity-50 leading-none mt-0.5`}>
            {locale === "es" ? "riesgo" : "risk"}
          </span>
        </div>
        <Icon className={`h-5 w-5 ${cfg.text} opacity-50 shrink-0`} />
      </div>

      {/* ── BOTTOM STRIP: conexiones · tramos · alertas ──────────────────────── */}
      <div className="px-4 pb-4 sm:px-5 flex items-center gap-3 flex-wrap">

        {/* Connection status */}
        {worstConn ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <AlertTriangle className="h-3.5 w-3.5 text-orange-400 shrink-0" />
            <span className="text-xs font-semibold text-orange-300">
              {locale === "es" ? "Conexión:" : "Connection:"}{" "}
              {CONN_LABELS[worstConn.risk as keyof typeof CONN_LABELS][locale]}
              <span className="font-normal text-gray-600 ml-1">
                · {worstConn.connectionAirport}
                {worstConn.delayAddedMinutes > 0 && <> +{worstConn.delayAddedMinutes}m</>}
              </span>
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 shrink-0">
            <CheckCircle className="h-3 w-3 text-emerald-600 shrink-0" />
            <span className="text-xs text-gray-600">
              {locale === "es" ? "Conexiones ok" : "Connections ok"}
            </span>
          </div>
        )}

        <span className="h-3 w-px bg-gray-800 shrink-0" />

        {/* Legs count */}
        <span className="text-xs text-gray-600 shrink-0">
          {flights.length} {locale === "es" ? "tramos" : "legs"}
        </span>

        <span className="h-3 w-px bg-gray-800 shrink-0" />

        {/* Alert count */}
        {airportAlertCount > 0 ? (
          <span className="text-xs font-semibold text-orange-400 shrink-0">
            {airportAlertCount} {locale === "es" ? "con alerta" : "with alert"}
          </span>
        ) : (
          <span className="text-xs text-gray-600 shrink-0">
            {locale === "es" ? "sin alertas" : "no alerts"}
          </span>
        )}

        {/* Trip dates — desktop only, pushed right */}
        {flights.length > 0 && (
          <span className="ml-auto text-xs text-gray-700 hidden sm:block tabular">
            {locale === "en"
              ? `${flights[0].dateEn} – ${flights[flights.length - 1].dateEn}`
              : `${flights[0].date} – ${flights[flights.length - 1].date}`}
          </span>
        )}
      </div>
    </div>
  );
}
