"use client";

import { useState, useRef } from "react";
import { Plane, ArrowDown, AlertTriangle, Clock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { AirportStatusMap } from "@/lib/types";
import { AIRPORTS } from "@/lib/airports";
import { ConnectionAnalysis } from "@/lib/connectionRisk";

/** Minimal flight shape needed by TripTimeline — subset of TripFlight */
export interface TimelineFlight {
  id?: string;
  originCode: string;
  destinationCode: string;
  isoDate: string;
  flightCode: string;
  departureTime?: string;
}

interface TripTimelineProps {
  flights: TimelineFlight[];
  statusMap: AirportStatusMap;
  /** Map from "flightA.id→flightB.id" to ConnectionAnalysis */
  connectionMap?: Map<string, ConnectionAnalysis>;
}

interface TooltipState {
  idx: number;
  x: number;
  y: number;
}

function getDaysUntil(isoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(isoDate + "T00:00:00");
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(isoDate: string, locale: "es" | "en"): string {
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString(locale === "en" ? "en-US" : "es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

const CONN_COLORS = {
  safe:    { line: "bg-emerald-800/60", icon: "text-emerald-500" },
  tight:   { line: "bg-yellow-700/60",  icon: "text-yellow-400" },
  at_risk: { line: "bg-orange-600/70",  icon: "text-orange-400" },
  missed:  { line: "bg-red-600/80",     icon: "text-red-400"    },
};

/** Small pill showing connection risk level */
function ConnectionPill({
  analysis,
  locale,
}: {
  analysis: ConnectionAnalysis;
  locale: "es" | "en";
}) {
  const riskLabels = {
    safe:    { es: "OK",         en: "OK"       },
    tight:   { es: "Ajustada",   en: "Tight"    },
    at_risk: { es: "En riesgo",  en: "At risk"  },
    missed:  { es: "Perdida",    en: "Missed"   },
  };
  const colors = {
    safe:    "bg-emerald-900/50 text-emerald-400 border-emerald-700/40",
    tight:   "bg-yellow-900/50 text-yellow-400 border-yellow-700/40",
    at_risk: "bg-orange-900/60 text-orange-400 border-orange-700/50",
    missed:  "bg-red-900/60 text-red-400 border-red-700/50",
  };

  if (analysis.risk === "safe" && analysis.delayAddedMinutes === 0) return null;

  return (
    <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full border ${colors[analysis.risk]}`}>
      {riskLabels[analysis.risk][locale]}
      {analysis.delayAddedMinutes > 0 && ` +${analysis.delayAddedMinutes}m`}
    </span>
  );
}

export function TripTimeline({
  flights,
  statusMap,
  connectionMap,
}: TripTimelineProps) {
  const { locale } = useLanguage();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();

  if (flights.length === 0) return null;

  const sorted = [...flights].sort((a, b) => {
    const d = a.isoDate.localeCompare(b.isoDate);
    return d !== 0 ? d : (a.departureTime ?? "").localeCompare(b.departureTime ?? "");
  });

  type Node = {
    code: string;
    isOrigin: boolean;
    flightCode: string;
    isoDate: string;
    departureTime?: string;
    flightId?: string;
    nextFlightId?: string;
  };

  const nodes: Node[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const f = sorted[i];
    nodes.push({
      code: f.originCode,
      isOrigin: true,
      flightCode: f.flightCode,
      isoDate: f.isoDate,
      departureTime: f.departureTime ?? undefined,
      flightId: f.id,
      nextFlightId: sorted[i + 1]?.id,
    });
  }
  const last = sorted[sorted.length - 1];
  nodes.push({
    code: last.destinationCode,
    isOrigin: false,
    flightCode: "",
    isoDate: last.isoDate,
  });

  const totalNodes = nodes.length;

  function openTooltip(el: HTMLElement, idx: number) {
    clearTimeout(closeTimer.current);
    const rect = el.getBoundingClientRect();
    setTooltip({ idx, x: rect.left + rect.width / 2, y: rect.top - 10 });
  }
  function scheduleClose() {
    closeTimer.current = setTimeout(() => setTooltip(null), 120);
  }
  function cancelClose() { clearTimeout(closeTimer.current); }

  function handleGoToCard(nodeIdx: number, isOrigin: boolean) {
    const cardIdx = isOrigin ? nodeIdx : nodeIdx - 1;
    document.getElementById(`flight-card-${cardIdx}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTooltip(null);
  }

  const activeNode = tooltip ? nodes[tooltip.idx] : null;

  return (
    <>
      {/* Tooltip */}
      {tooltip && activeNode && (
        <div
          className="fixed z-50"
          style={{ left: tooltip.x, top: tooltip.y, transform: "translateX(-50%) translateY(-100%)" }}
          onPointerEnter={cancelClose}
          onPointerLeave={scheduleClose}
        >
          <div className="rounded-xl border border-white/10 bg-[#0f0f17] shadow-2xl px-3.5 py-2.5 whitespace-nowrap text-left"
            style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
            <p className="text-xs font-bold text-white mb-1">
              {activeNode.code} · {AIRPORTS[activeNode.code]?.city ?? activeNode.code}
            </p>
            {activeNode.isOrigin ? (
              <>
                <p className="text-[11px] text-gray-300">{formatDate(activeNode.isoDate, locale)}</p>
                {activeNode.departureTime ? (
                  <p className="text-[11px] text-blue-300 font-medium mt-0.5">
                    <Clock className="h-2.5 w-2.5 inline mr-1" />
                    {locale === "en" ? "Dep." : "Sale"} {activeNode.departureTime}
                  </p>
                ) : (
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {locale === "en" ? "Time TBD" : "Hora por confirmar"}
                  </p>
                )}
                {activeNode.flightCode && (
                  <p className="text-[11px] text-gray-500 mt-0.5">{activeNode.flightCode}</p>
                )}
                {statusMap[activeNode.code]?.status && statusMap[activeNode.code]?.status !== "ok" && (
                  <p className="text-[11px] text-orange-400 font-semibold mt-1">
                    <AlertTriangle className="h-2.5 w-2.5 inline mr-1" />
                    {locale === "en" ? "Active delays" : "Demoras activas"}
                  </p>
                )}
              </>
            ) : (
              <p className="text-[11px] text-gray-400">
                {locale === "en" ? "Final destination" : "Destino final"}
              </p>
            )}
            <button
              onClick={() => handleGoToCard(tooltip.idx, activeNode.isOrigin)}
              className="mt-2 w-full flex items-center justify-center gap-1 rounded-md bg-blue-600 hover:bg-blue-500 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors"
            >
              <ArrowDown className="h-2.5 w-2.5" />
              {locale === "en" ? "Go to flight" : "Ir al vuelo"}
            </button>
          </div>
          <div className="flex justify-center">
            <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-white/10" />
          </div>
        </div>
      )}

      {/* Card */}
      <div
        className="rounded-xl border border-white/6 p-4 overflow-x-auto animate-fade-in-up"
        style={{ background: "linear-gradient(135deg, rgba(15,15,23,0.9) 0%, rgba(10,10,18,0.95) 100%)" }}
        onClick={() => setTooltip(null)}
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
          {locale === "en" ? "Trip timeline" : "Cronograma del viaje"}
        </p>

        <div className="flex items-start min-w-max gap-0 py-1">
          {nodes.map((node, idx) => {
            const isLast  = idx === totalNodes - 1;
            const isFirst = idx === 0;
            const daysUntil = node.isOrigin ? getDaysUntil(node.isoDate) : null;
            const status    = statusMap[node.code]?.status ?? "ok";
            const hasIssue  = status !== "ok";
            const isActive  = tooltip?.idx === idx;

            // Connection from this node to the next
            const connKey = node.flightId && node.nextFlightId
              ? `${node.flightId}→${node.nextFlightId}`
              : null;
            const nextConn = connKey && connectionMap ? connectionMap.get(connKey) : null;

            const dotColor = hasIssue
              ? "bg-orange-500 ring-orange-500/30"
              : daysUntil !== null && daysUntil <= 0
              ? "bg-red-400 ring-red-400/30"
              : daysUntil !== null && daysUntil <= 7
              ? "bg-yellow-400 ring-yellow-400/30"
              : "bg-blue-400 ring-blue-400/30";

            return (
              <div key={idx} className="flex items-start">
                {/* Node */}
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      tooltip?.idx === idx ? setTooltip(null) : openTooltip(e.currentTarget, idx);
                    }}
                    onPointerEnter={(e) => { if (e.pointerType === "mouse") { cancelClose(); openTooltip(e.currentTarget, idx); } }}
                    onPointerLeave={(e) => { if (e.pointerType === "mouse") scheduleClose(); }}
                    className={`h-4 w-4 rounded-full ring-4 ring-offset-1 transition-transform focus:outline-none cursor-pointer ${dotColor} ${isActive ? "scale-125" : "hover:scale-125"}`}
                    style={{ "--tw-ring-offset-color": "#0a0a0f" } as React.CSSProperties}
                    aria-label={`${node.code}${node.isOrigin ? ": " + formatDate(node.isoDate, locale) : ""}`}
                  />
                  <span className="text-xs font-bold text-white">{node.code}</span>
                  {(isFirst || isLast) && (
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm ${
                      isFirst ? "bg-emerald-900/50 text-emerald-400" : "bg-blue-900/50 text-blue-400"
                    }`}>
                      {isFirst
                        ? (locale === "en" ? "Start" : "Inicio")
                        : (locale === "en" ? "End"   : "Fin")}
                    </span>
                  )}
                  {node.isOrigin && node.flightCode && (
                    <span className="text-[10px] text-gray-600 max-w-[60px] text-center leading-tight">
                      {node.flightCode}
                    </span>
                  )}
                  {node.isOrigin && daysUntil !== null && (
                    <span className={`text-[10px] font-semibold ${
                      daysUntil < 0   ? "text-gray-600"   :
                      daysUntil === 0 ? "text-red-400 animate-pulse" :
                      daysUntil <= 7  ? "text-yellow-400" :
                      "text-emerald-400"
                    }`}>
                      {daysUntil < 0  ? (locale === "en" ? "Done"  : "Listo") :
                       daysUntil === 0 ? (locale === "en" ? "TODAY" : "HOY")   :
                       `${daysUntil}d`}
                    </span>
                  )}
                  {/* Connection pill below origin dot when there's a layover at this airport */}
                  {!node.isOrigin && idx > 0 && (() => {
                    const prevNode = nodes[idx - 1];
                    const ck = prevNode.flightId && node.flightId ? `${prevNode.flightId}→${node.flightId}` : null;
                    const ca = ck && connectionMap ? connectionMap.get(ck) : null;
                    if (!ca || ca.risk === "safe") return null;
                    return <ConnectionPill analysis={ca} locale={locale} />;
                  })()}
                </div>

                {/* Connecting line */}
                {!isLast && (
                  <div className="flex flex-col items-center mx-1" style={{ marginTop: 2 }}>
                    <div className="flex items-center">
                      <div className={`h-px w-8 sm:w-10 transition-colors ${
                        nextConn && nextConn.risk !== "safe"
                          ? CONN_COLORS[nextConn.risk].line
                          : "bg-gray-800"
                      }`} />
                      <Plane className={`h-3 w-3 -mx-0.5 transition-colors ${
                        nextConn && nextConn.risk !== "safe"
                          ? CONN_COLORS[nextConn.risk].icon
                          : "text-gray-700"
                      }`} />
                      <div className={`h-px w-8 sm:w-10 transition-colors ${
                        nextConn && nextConn.risk !== "safe"
                          ? CONN_COLORS[nextConn.risk].line
                          : "bg-gray-800"
                      }`} />
                    </div>
                    {/* Connection risk label on the line */}
                    {nextConn && nextConn.risk !== "safe" && (
                      <span className={`text-[8px] font-bold uppercase tracking-wide mt-0.5 ${CONN_COLORS[nextConn.risk].icon}`}>
                        {nextConn.risk === "missed"  ? (locale === "en" ? "MISSED"   : "PERDIDA")   :
                         nextConn.risk === "at_risk" ? (locale === "en" ? "AT RISK"  : "EN RIESGO") :
                                                       (locale === "en" ? "TIGHT"    : "AJUSTADA")}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-[10px] text-gray-700 mt-3">
          {locale === "en" ? "Hover or tap a dot for details" : "Hover o tocá un punto para ver detalles"}
        </p>
      </div>
    </>
  );
}
