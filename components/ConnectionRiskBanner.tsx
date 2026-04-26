"use client";

import { AlertTriangle } from "lucide-react";
import { ConnectionAnalysis } from "@/lib/connectionRisk";
import { LinkButton } from "./LinkButton";

// Subset of LABELS used by this component
type ConnectionRiskLabels = {
  connectionRisk: {
    at_risk: (airport: string, mins: number) => string;
    tight:   (airport: string, mins: number) => string;
    missed:  (airport: string, mins: number) => string;
  };
};

export function ConnectionRiskBanner({
  analysis,
  locale,
  nextDestination,
  nextDate,
  L,
}: {
  analysis:         ConnectionAnalysis;
  locale:           "es" | "en";
  nextDestination?: string;
  nextDate?:        string;
  L:                ConnectionRiskLabels;
}) {
  if (analysis.risk === "safe") return null;

  const styles = {
    at_risk: {
      bg:     "bg-orange-950/50 border-orange-700/50",
      text:   "text-orange-300",
      icon:   "text-orange-400",
      iconBg: "bg-orange-900/40",
    },
    tight: {
      bg:     "bg-yellow-950/40 border-yellow-700/40",
      text:   "text-yellow-300",
      icon:   "text-yellow-400",
      iconBg: "bg-yellow-900/40",
    },
    missed: {
      bg:     "bg-red-950/60 border-red-700/60",
      text:   "text-red-300",
      icon:   "text-red-400",
      iconBg: "bg-red-900/40",
    },
  };

  const s = styles[analysis.risk];
  const label = L.connectionRisk[analysis.risk](
    analysis.connectionAirport,
    analysis.delayAddedMinutes,
  );

  const details =
    locale === "en"
      ? `Buffer: ${Math.round(analysis.effectiveBufferMinutes)}min · MCT: ${analysis.mctMinutes}min`
      : `Margen: ${Math.round(analysis.effectiveBufferMinutes)}min · MCT: ${analysis.mctMinutes}min`;

  // Re-routing links — only when connection is at_risk or missed
  const showReroute =
    (analysis.risk === "at_risk" || analysis.risk === "missed") &&
    !!nextDestination;

  const origin = analysis.connectionAirport;
  const dest   = nextDestination ?? "";
  const googleUrl = showReroute
    ? `https://www.google.com/travel/flights?q=Flights+from+${origin}+to+${dest}`
    : "";
  const kayakUrl = showReroute && nextDate
    ? `https://www.kayak.com/flights/${origin}-${dest}/${nextDate}`
    : "";

  return (
    <div className={`mt-2 rounded-xl border px-4 py-3 ${s.bg}`}>
      <div className="flex items-start gap-3">
        <div className={`p-1.5 rounded-lg ${s.iconBg} shrink-0 mt-0.5`}>
          <AlertTriangle className={`h-3.5 w-3.5 ${s.icon}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold ${s.text}`}>{label}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">{details}</p>
          {showReroute && (
            <div className="flex gap-2 mt-2.5 flex-wrap">
              <LinkButton href={googleUrl} variant="orange" aria-label="Find alternatives">
                {locale === "en" ? "Find alternatives" : "Buscar alternativas"}
              </LinkButton>
              {kayakUrl && (
                <LinkButton href={kayakUrl} variant="default" aria-label="View on Kayak">
                  Kayak
                </LinkButton>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}