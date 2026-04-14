"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AIRPORTS } from "@/lib/airports";

// ── Constants ─────────────────────────────────────────────────────────────────

const MAP_W = 800;
const MAP_H = 400;
const AUTO_DISMISS_MS = 3000;
const ARC_DURATION = 2; // seconds

// ── Projection ────────────────────────────────────────────────────────────────

function project(lat: number, lng: number): { x: number; y: number } {
  return {
    x: ((lng + 180) / 360) * MAP_W,
    y: ((90 - lat) / 180) * MAP_H,
  };
}

// ── Great-circle arc path (SVG quadratic approximation) ───────────────────────

function buildArcPath(
  x1: number, y1: number,
  x2: number, y2: number,
): string {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  // Curve height: 20% of chord length, bowing upward
  const bulge = dist * 0.22;
  // Perpendicular direction (rotated 90° counter-clockwise)
  const len = Math.max(dist, 1);
  const cx = mx - (dy / len) * bulge;
  const cy = my + (dx / len) * bulge;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

// ── Simplified world continent outlines (SVG paths, equirectangular) ──────────
// These are very simplified paths for visual decoration only.

const CONTINENT_PATHS = [
  // North America (rough outline)
  "M 160 60 L 155 80 L 140 100 L 145 130 L 165 150 L 170 170 L 160 190 L 145 200 L 150 220 L 170 230 L 180 210 L 190 200 L 200 180 L 210 160 L 220 140 L 215 120 L 205 100 L 195 80 L 185 60 Z",
  // South America (rough outline)
  "M 185 230 L 175 250 L 170 270 L 175 300 L 185 320 L 200 340 L 215 330 L 225 300 L 225 270 L 215 245 L 200 235 Z",
  // Europe (rough outline)
  "M 430 60 L 420 80 L 430 100 L 445 95 L 460 80 L 470 70 L 460 55 Z",
  // Africa (rough outline)
  "M 445 135 L 435 160 L 435 200 L 445 230 L 460 260 L 475 270 L 490 250 L 495 220 L 490 190 L 480 160 L 470 135 Z",
  // Asia (rough outline)
  "M 480 60 L 490 80 L 510 90 L 540 85 L 580 80 L 620 70 L 660 65 L 680 75 L 680 100 L 660 120 L 640 130 L 620 135 L 600 140 L 580 150 L 560 160 L 540 150 L 520 140 L 500 120 L 490 100 Z",
  // Australia (rough outline)
  "M 610 270 L 600 290 L 605 320 L 625 335 L 650 330 L 665 310 L 660 285 L 645 270 Z",
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface FlightArcAnimationProps {
  originIata: string;
  destIata: string;
  onComplete: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function FlightArcAnimation({ originIata, destIata, onComplete }: FlightArcAnimationProps) {
  const origin = AIRPORTS[originIata];
  const dest   = AIRPORTS[destIata];

  const arcPathRef  = useRef<SVGPathElement>(null);
  const planeRef    = useRef<SVGTextElement>(null);

  // Auto-dismiss
  useEffect(() => {
    const id = setTimeout(onComplete, AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [onComplete]);

  // Plane follows arc via requestAnimationFrame
  useEffect(() => {
    if (!arcPathRef.current || !planeRef.current) return;
    const pathEl  = arcPathRef.current;
    const planeEl = planeRef.current;
    const total   = pathEl.getTotalLength();
    const start   = performance.now();
    let rafId: number;

    function step(now: number) {
      const elapsed = (now - start) / 1000; // seconds
      const t = Math.min(elapsed / ARC_DURATION, 1);
      const eased = t < 1 ? 1 - Math.pow(1 - t, 3) : 1; // ease-out cubic
      const pt = pathEl.getPointAtLength(eased * total);
      planeEl.setAttribute("x", String(pt.x - 8));
      planeEl.setAttribute("y", String(pt.y + 6));
      if (t < 1) rafId = requestAnimationFrame(step);
    }

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [originIata, destIata]);

  if (!origin?.lat || !dest?.lat) return null;

  const o = project(origin.lat, origin.lng);
  const d = project(dest.lat,   dest.lng);
  const arcD = buildArcPath(o.x, o.y, d.x, d.y);
  const arcLen = Math.sqrt(Math.pow(d.x - o.x, 2) + Math.pow(d.y - o.y, 2)) * 1.3;

  return (
    <AnimatePresence>
      <motion.div
        key="arc-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: "rgba(7,7,15,0.88)" }}
        onClick={onComplete}
        role="presentation"
        aria-hidden
      >
        {/* Route label */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="absolute top-10 left-1/2 -translate-x-1/2 flex items-center gap-2"
        >
          <span className="text-white font-black text-xl tracking-wider">
            {originIata}
          </span>
          <span className="text-violet-400 font-bold text-lg">→</span>
          <span className="text-white font-black text-xl tracking-wider">
            {destIata}
          </span>
        </motion.div>

        {/* City labels */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
        >
          <p className="text-gray-400 text-xs text-center">
            {origin.city} → {dest.city}
          </p>
        </motion.div>

        {/* SVG map */}
        <svg
          viewBox={`0 0 ${MAP_W} ${MAP_H}`}
          className="w-full max-w-2xl"
          style={{ maxHeight: "60vh" }}
          aria-hidden
        >
          {/* Grid lines */}
          {[-60, -30, 0, 30, 60].map((lat) => {
            const { y } = project(lat, 0);
            return (
              <line
                key={`lat${lat}`}
                x1={0} y1={y} x2={MAP_W} y2={y}
                stroke="rgba(255,255,255,0.03)"
                strokeWidth={1}
              />
            );
          })}
          {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((lng) => {
            const { x } = project(0, lng);
            return (
              <line
                key={`lng${lng}`}
                x1={x} y1={0} x2={x} y2={MAP_H}
                stroke="rgba(255,255,255,0.03)"
                strokeWidth={1}
              />
            );
          })}

          {/* Continent outlines */}
          {CONTINENT_PATHS.map((p, i) => (
            <path
              key={i}
              d={p}
              fill="rgba(139,92,246,0.08)"
              stroke="rgba(139,92,246,0.15)"
              strokeWidth={0.8}
            />
          ))}

          {/* Arc path with dash animation */}
          <path
            ref={arcPathRef}
            d={arcD}
            fill="none"
            stroke="rgba(139,92,246,0.3)"
            strokeWidth={1.5}
            strokeDasharray={arcLen}
            strokeDashoffset={arcLen}
            style={{
              animation: `arcDraw ${ARC_DURATION}s ease-out forwards`,
            }}
          />

          {/* Glowing arc overlay */}
          <path
            d={arcD}
            fill="none"
            stroke="rgba(167,139,250,0.6)"
            strokeWidth={2}
            strokeDasharray={arcLen}
            strokeDashoffset={arcLen}
            style={{
              animation: `arcDraw ${ARC_DURATION}s ease-out forwards`,
              filter: "blur(2px)",
            }}
          />

          {/* Origin dot */}
          <motion.circle
            cx={o.x} cy={o.y} r={5}
            fill="#7c3aed"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
          />
          <motion.circle
            cx={o.x} cy={o.y} r={9}
            fill="none"
            stroke="rgba(139,92,246,0.4)"
            strokeWidth={1.5}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15 }}
          />

          {/* Destination dot */}
          <motion.circle
            cx={d.x} cy={d.y} r={5}
            fill="#3b82f6"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: ARC_DURATION }}
          />
          <motion.circle
            cx={d.x} cy={d.y} r={9}
            fill="none"
            stroke="rgba(59,130,246,0.4)"
            strokeWidth={1.5}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: ARC_DURATION + 0.1 }}
          />

          {/* Plane emoji travelling along the arc */}
          <text
            ref={planeRef}
            fontSize={16}
            x={o.x - 8}
            y={o.y + 6}
            style={{ userSelect: "none" }}
          >
            ✈️
          </text>
        </svg>

        {/* Inline keyframe for arc draw */}
        <style>{`
          @keyframes arcDraw {
            to { stroke-dashoffset: 0; }
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
}
