"use client";

import { useMemo } from "react";
import { ArrowRight, CheckCircle, AlertTriangle, ShieldAlert, ShieldCheck, Shield, ShieldOff } from "lucide-react";
import { AirportStatusMap, TripFlight } from "@/lib/types";
import { calculateTripRiskScore } from "@/lib/tripRiskScore";
import { analyzeAllConnections } from "@/lib/connectionRisk";

interface TripSummaryHeroProps {
  statusMap: AirportStatusMap;
  locale: "es" | "en";
}

const MY_TRIP_FLIGHTS: TripFlight[] = [
  {
    id: "mf1", flightCode: "AA900", airlineCode: "AA",
    airlineName: "American Airlines", airlineIcao: "AAL", flightNumber: "900",
    originCode: "EZE", destinationCode: "MIA",
    isoDate: "2026-03-29", departureTime: "20:30", arrivalBuffer: 3,
  },
  {
    id: "mf2", flightCode: "AA956", airlineCode: "AA",
    airlineName: "American Airlines", airlineIcao: "AAL", flightNumber: "956",
    originCode: "MIA", destinationCode: "GCM",
    isoDate: "2026-03-31", departureTime: "12:55", arrivalBuffer: 2,
  },
  {
    id: "mf3", flightCode: "B6766", airlineCode: "B6",
    airlineName: "JetBlue Airways", airlineIcao: "JBU", flightNumber: "766",
    originCode: "GCM", destinationCode: "JFK",
    isoDate: "2026-04-05", departureTime: "15:40", arrivalBuffer: 2.5,
  },
  {
    id: "mf4", flightCode: "DL1514", airlineCode: "DL",
    airlineName: "Delta Air Lines", airlineIcao: "DAL", flightNumber: "1514",
    originCode: "JFK", destinationCode: "MIA",
    isoDate: "2026-04-11", departureTime: "11:10", arrivalBuffer: 2,
  },
  {
    id: "mf5", flightCode: "AA931", airlineCode: "AA",
    airlineName: "American Airlines", airlineIcao: "AAL", flightNumber: "931",
    originCode: "MIA", destinationCode: "EZE",
    isoDate: "2026-04-11", departureTime: "21:15", arrivalBuffer: 3,
  },
];

const TRIP_AIRPORTS = ["EZE", "MIA", "GCM", "JFK"] as const;

function getDaysUntil(isoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(isoDate + "T00:00:00").getTime() - today.getTime()) / 86400000);
}

const LEVEL_CONFIG = {
  low: {
    outerBorder: "border-emerald-800/30",
    statusBg:    "bg-emerald-950/50",
    statusBorder:"border-emerald-800/40",
    dot:         "bg-emerald-400",
    text:        "text-emerald-400",
    icon:        ShieldCheck,
    headline:    { es: "Todo en orden",            en: "All clear"                     },
    sub:         { es: "Sin alertas en tu viaje",  en: "No active alerts on your trip" },
  },
  medium: {
    outerBorder: "border-yellow-800/40",
    statusBg:    "bg-yellow-950/50",
    statusBorder:"border-yellow-700/40",
    dot:         "bg-yellow-400 animate-pulse",
    text:        "text-yellow-400",
    icon:        Shield,
    headline:    { es: "Hay algo que revisar",     en: "Worth a look"                  },
    sub:         { es: "Revisá los detalles",       en: "Check the details below"       },
  },
  high: {
    outerBorder: "border-orange-700/50",
    statusBg:    "bg-orange-950/50",
    statusBorder:"border-orange-700/40",
    dot:         "bg-orange-400 animate-pulse",
    text:        "text-orange-400",
    icon:        ShieldAlert,
    headline:    { es: "Atención — riesgo en tu viaje", en: "Attention — trip risk"    },
    sub:         { es: "Revisá cada tramo",         en: "Check each leg for details"   },
  },
  critical: {
    outerBorder: "border-red-700/50",
    statusBg:    "bg-red-950/50",
    statusBorder:"border-red-700/40",
    dot:         "bg-red-400 animate-pulse",
    text:        "text-red-400",
    icon:        ShieldOff,
    headline:    { es: "Riesgo crítico",            en: "Critical risk"                },
    sub:         { es: "Contactá a tu aerolínea",   en: "Contact your airline now"     },
  },
} as const;

const CONN_LABELS = {
  missed:  { es: "Conexión perdida",  en: "Missed"  },
  at_risk: { es: "En riesgo",         en: "At risk" },
  tight:   { es: "Ajustada",          en: "Tight"   },
} as const;

export function TripSummaryHero({ statusMap, locale }: TripSummaryHeroProps) {
  const risk = useMemo(
    () => calculateTripRiskScore(MY_TRIP_FLIGHTS, statusMap, locale),
    [statusMap, locale],
  );
  const connectionMap = useMemo(
    () => analyzeAllConnections(MY_TRIP_FLIGHTS, statusMap),
    [statusMap],
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextFlight = MY_TRIP_FLIGHTS.find(
    (f) => new Date(f.isoDate + "T00:00:00") >= today,
  );
  const daysUntil = nextFlight ? getDaysUntil(nextFlight.isoDate) : null;

  const worstConn = Array.from(connectionMap.values())
    .filter((c) => c.risk !== "safe")
    .sort((a, b) => {
      const o = { missed: 0, at_risk: 1, tight: 2, safe: 3 };
      return o[a.risk] - o[b.risk];
    })[0] ?? null;

  const cfg = LEVEL_CONFIG[risk.level];
  const Icon = cfg.icon;

  return (
    <div
      className={`rounded-2xl border ${cfg.outerBorder} overflow-hidden animate-fade-in-up`}
      style={{ background: "linear-gradient(150deg, rgba(12,12,22,0.97) 0%, rgba(8,8,16,0.99) 100%)" }}
    >
      {/* ── Route header ─────────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3 sm:px-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-2">
          {locale === "es" ? "Tu viaje" : "Your trip"}
        </p>
        {/* Route with colored codes if airport has issue */}
        <div className="flex items-center gap-1 flex-wrap">
          {(["EZE", "MIA", "GCM", "JFK", "MIA", "EZE"] as const).map((code, i, arr) => {
            const hasIssue = statusMap[code]?.status && statusMap[code].status !== "ok";
            return (
              <span key={i} className="flex items-center gap-1">
                <span className={`text-sm font-black tracking-tight ${hasIssue ? "text-orange-300" : "text-white"}`}>
                  {code}
                </span>
                {i < arr.length - 1 && (
                  <ArrowRight className="h-3 w-3 text-gray-700 shrink-0" />
                )}
              </span>
            );
          })}
        </div>
        <p className="text-[11px] text-gray-500 mt-1">
          29 Mar – 12 Abr 2026 · 5 {locale === "es" ? "tramos" : "legs"}
        </p>
      </div>

      {/* ── Status band — full-width, prominent on mobile ────────────────────── */}
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
        <Icon className={`h-5 w-5 ${cfg.text} opacity-50 shrink-0`} />
      </div>

      {/* ── Stats grid: 2-col on mobile, 3-col on sm+ ───────────────────────── */}
      <div className="px-3 pb-3 sm:px-4 sm:pb-4 grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">

        {/* Next flight */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
          <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-1.5">
            {locale === "es" ? "Próximo vuelo" : "Next flight"}
          </p>
          {nextFlight ? (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-black text-white">{nextFlight.flightCode}</span>
                <span className="text-[10px] text-gray-500">
                  {nextFlight.originCode}→{nextFlight.destinationCode}
                </span>
              </div>
              {daysUntil !== null && (
                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  daysUntil === 0 ? "bg-red-900/70 text-red-300 animate-pulse" :
                  daysUntil === 1 ? "bg-yellow-900/60 text-yellow-300" :
                  daysUntil <= 7  ? "bg-blue-900/50 text-blue-300" :
                                    "bg-white/[0.06] text-gray-400"
                }`}>
                  {daysUntil === 0 ? (locale === "es" ? "HOY" : "TODAY") :
                   daysUntil === 1 ? (locale === "es" ? "mañana" : "tomorrow") :
                   `${locale === "es" ? "en" : "in"} ${daysUntil}d`}
                </span>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-gray-500">
              {locale === "es" ? "Completado" : "Complete"}
            </p>
          )}
        </div>

        {/* Connection risk */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
          <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-1.5">
            {locale === "es" ? "Conexión" : "Connection"}
          </p>
          {worstConn ? (
            <div>
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                <span className="text-xs font-bold text-orange-300">
                  {CONN_LABELS[worstConn.risk as keyof typeof CONN_LABELS][locale]}
                </span>
              </div>
              <p className="text-[10px] text-gray-500 mt-0.5">
                {worstConn.connectionAirport}
                {worstConn.delayAddedMinutes > 0 && <> · +{worstConn.delayAddedMinutes}m</>}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span className="text-xs font-bold text-emerald-400">ok</span>
            </div>
          )}
        </div>

        {/* Airport status dots — spans full width on mobile */}
        <div className="col-span-2 sm:col-span-1 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
          <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-1.5">
            {locale === "es" ? "Aeropuertos del viaje" : "Trip airports"}
          </p>
          <div className="flex items-center gap-3 sm:gap-2 flex-wrap">
            {TRIP_AIRPORTS.map((code) => {
              const hasIssue = statusMap[code]?.status && statusMap[code].status !== "ok";
              return (
                <div key={code} className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${hasIssue ? "bg-orange-400 animate-pulse" : "bg-emerald-500"}`} />
                  <span className={`text-xs font-bold ${hasIssue ? "text-orange-300" : "text-gray-300"}`}>
                    {code}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
