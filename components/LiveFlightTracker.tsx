"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useFlightPosition } from "@/hooks/useFlightPosition";
import { AIRPORTS } from "@/lib/airports";

interface LiveFlightTrackerProps {
  originIata: string;
  destIata: string;
  departureISO: string;
  arrivalISO: string;
  locale: "es" | "en";
}

const LABELS = {
  es: {
    live: "Vuelo en vivo",
    remaining: (m: number) => `${Math.floor(m / 60)}h ${m % 60}m restantes`,
    elapsed: (m: number) => `${Math.floor(m / 60)}h ${m % 60}m transcurridos`,
    altitude: "Alt. estimada",
    progress: "Progreso",
    phaseClimb: "Despegue",
    phaseCruise: "En crucero",
    phaseDescent: "Descenso",
    ft: "ft",
  },
  en: {
    live: "Live Flight",
    remaining: (m: number) => `${Math.floor(m / 60)}h ${m % 60}m remaining`,
    elapsed: (m: number) => `${Math.floor(m / 60)}h ${m % 60}m elapsed`,
    altitude: "Est. altitude",
    progress: "Progress",
    phaseClimb: "Takeoff",
    phaseCruise: "Cruising",
    phaseDescent: "Descending",
    ft: "ft",
  },
} as const;

// Map lat/lng to SVG coordinates within a viewBox of 0 0 300 120.
// We clamp to the bounding box of origin+destination with padding.
function latLngToSvg(
  lat: number,
  lng: number,
  minLat: number,
  maxLat: number,
  minLng: number,
  maxLng: number,
  svgW: number,
  svgH: number,
  padding: number,
): { x: number; y: number } {
  const latRange = maxLat - minLat || 1;
  const lngRange = maxLng - minLng || 1;

  const x = padding + ((lng - minLng) / lngRange) * (svgW - 2 * padding);
  // SVG Y is inverted (top = high lat)
  const y = padding + ((maxLat - lat) / latRange) * (svgH - 2 * padding);
  return { x, y };
}

function flightPhase(progress: number): "climb" | "cruise" | "descent" {
  if (progress < 0.2) return "climb";
  if (progress <= 0.8) return "cruise";
  return "descent";
}

export function LiveFlightTracker({
  originIata,
  destIata,
  departureISO,
  arrivalISO,
  locale,
}: LiveFlightTrackerProps) {
  const L = LABELS[locale];

  const position = useFlightPosition({
    originIata,
    destIata,
    departureISO,
    arrivalISO,
  });

  const origin = AIRPORTS[originIata];
  const dest = AIRPORTS[destIata];

  const svgData = useMemo(() => {
    if (!origin || !dest || !position) return null;

    const SVG_W = 300;
    const SVG_H = 100;
    const PAD = 18;

    const lats = [origin.lat, dest.lat];
    const lngs = [origin.lng, dest.lng];
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const toSvg = (lat: number, lng: number) =>
      latLngToSvg(lat, lng, minLat, maxLat, minLng, maxLng, SVG_W, SVG_H, PAD);

    const originPt = toSvg(origin.lat, origin.lng);
    const destPt = toSvg(dest.lat, dest.lng);

    // Arc control point: midpoint elevated upward
    const midX = (originPt.x + destPt.x) / 2;
    const midY = (originPt.y + destPt.y) / 2 - 28;

    const planePt = toSvg(position.currentLat, position.currentLng);

    // Tangent at current point on the quadratic bezier for rotation
    const t = position.progress;
    const tangentX =
      2 * (1 - t) * (midX - originPt.x) + 2 * t * (destPt.x - midX);
    const tangentY =
      2 * (1 - t) * (midY - originPt.y) + 2 * t * (destPt.y - midY);
    const angleRad = Math.atan2(tangentY, tangentX);
    const angleDeg = (angleRad * 180) / Math.PI;

    const pathD = `M ${originPt.x} ${originPt.y} Q ${midX} ${midY} ${destPt.x} ${destPt.y}`;

    return { originPt, destPt, planePt, angleDeg, pathD };
  }, [origin, dest, position]);

  if (!position || !svgData || !origin || !dest) return null;

  const phase = flightPhase(position.progress);
  const L_phase =
    phase === "climb" ? L.phaseClimb :
    phase === "cruise" ? L.phaseCruise :
    L.phaseDescent;

  const phaseColor =
    phase === "climb"   ? "text-blue-300"   :
    phase === "cruise"  ? "text-emerald-300" :
    "text-amber-300";

  const progressPct = Math.round(position.progress * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mx-4 mb-3 rounded-xl border border-white/[0.08] bg-white/[0.04] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
            {L.live}
          </span>
        </div>
        <span className={`text-[11px] font-semibold ${phaseColor}`}>
          {L_phase}
        </span>
      </div>

      {/* SVG route map */}
      <div className="px-3 pb-1">
        <svg
          viewBox="0 0 300 100"
          className="w-full"
          aria-hidden="true"
          style={{ height: 80 }}
        >
          {/* Dashed route arc */}
          <path
            d={svgData.pathD}
            fill="none"
            stroke="rgba(255,255,255,0.10)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />

          {/* Completed route portion — we can't easily do partial arc in SVG
              without a clip, so we overlay a solid line up to progress */}
          <path
            d={svgData.pathD}
            fill="none"
            stroke="rgba(167,139,250,0.50)"
            strokeWidth={1.5}
            strokeDasharray={`${position.progress * 300} 300`}
          />

          {/* Origin dot */}
          <circle cx={svgData.originPt.x} cy={svgData.originPt.y} r={4} fill="#6d28d9" />
          <text
            x={svgData.originPt.x}
            y={svgData.originPt.y + 14}
            textAnchor="middle"
            fontSize={9}
            fill="rgba(156,163,175,0.9)"
            fontFamily="monospace"
          >
            {originIata}
          </text>

          {/* Destination dot */}
          <circle cx={svgData.destPt.x} cy={svgData.destPt.y} r={4} fill="rgba(109,40,217,0.4)" stroke="#6d28d9" strokeWidth={1} />
          <text
            x={svgData.destPt.x}
            y={svgData.destPt.y + 14}
            textAnchor="middle"
            fontSize={9}
            fill="rgba(156,163,175,0.9)"
            fontFamily="monospace"
          >
            {destIata}
          </text>

          {/* Pulsing ring at plane position */}
          <circle
            cx={svgData.planePt.x}
            cy={svgData.planePt.y}
            r={8}
            fill="rgba(167,139,250,0.12)"
            stroke="rgba(167,139,250,0.30)"
            strokeWidth={1}
          />

          {/* Plane icon — rotated to match flight direction */}
          <g
            transform={`translate(${svgData.planePt.x}, ${svgData.planePt.y}) rotate(${svgData.angleDeg})`}
          >
            {/* Simple plane shape (pointing right, so +90° baseline) */}
            <text
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={12}
              transform="rotate(90)"
            >
              ✈
            </text>
          </g>
        </svg>
      </div>

      {/* Progress bar */}
      <div className="px-3 pb-2">
        <div className="h-1 rounded-full bg-white/[0.08] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-400"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 divide-x divide-white/[0.05] border-t border-white/[0.05]">
        <div className="px-3 py-2 text-center">
          <p className="text-[10px] text-gray-500 mb-0.5">{L.progress}</p>
          <p className="text-xs font-bold text-white tabular-nums">{progressPct}%</p>
        </div>
        <div className="px-3 py-2 text-center">
          <p className="text-[10px] text-gray-500 mb-0.5">{L.altitude}</p>
          <p className="text-xs font-bold text-white tabular-nums">
            {position.estimatedAltitudeFt.toLocaleString()} {L.ft}
          </p>
        </div>
        <div className="px-3 py-2 text-center">
          <p className="text-[10px] text-gray-500 mb-0.5">
            {locale === "es" ? "Restante" : "Remaining"}
          </p>
          <p className="text-xs font-bold text-white tabular-nums">
            {Math.floor(position.remainingMinutes / 60)}h{" "}
            {position.remainingMinutes % 60}m
          </p>
        </div>
      </div>
    </motion.div>
  );
}
