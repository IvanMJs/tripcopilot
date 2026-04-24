"use client";

import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AIRPORTS } from "@/lib/airports";

// ── Constants ─────────────────────────────────────────────────────────────────

const AUTO_DISMISS_MS = 2500;
const ARC_DURATION = 1.8; // seconds

// ── Props ─────────────────────────────────────────────────────────────────────

interface FlightArcAnimationProps {
  originIata: string;
  destIata: string;
  onComplete: () => void;
}

// ── ChipLoading ───────────────────────────────────────────────────────────────

function ChipLoading({ label, delay }: { label: string; delay: number }) {
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setDone(true), delay * 1000);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: delay * 0.4, duration: 0.3 }}
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold transition-all duration-500 ${
        done
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          : "border-white/[0.06] bg-white/[0.02] text-gray-600"
      }`}
    >
      {done ? (
        <span>✓</span>
      ) : (
        <svg className="animate-spin h-2.5 w-2.5" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
          <path d="M 12 2 A 10 10 0 0 1 22 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
      {label}
    </motion.div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function FlightArcAnimation({ originIata, destIata, onComplete }: FlightArcAnimationProps) {
  const origin = AIRPORTS[originIata];
  const dest   = AIRPORTS[destIata];

  const arcPathRef = useRef<SVGPathElement>(null);
  const planeRef   = useRef<SVGTextElement>(null);

  // No auto dismiss mientras carga el viaje - el padre decide cuando cerrarlo

  if (!origin?.lat || !dest?.lat) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="arc-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6"
        style={{ background: "rgba(7,7,15,0.92)", backdropFilter: "blur(4px)" }}
        onClick={onComplete}
        role="presentation"
        aria-hidden
      >
        {/* Route header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="flex items-center gap-3 mb-8"
        >
          <span className="font-mono text-3xl font-black text-white tracking-wider">
            {originIata}
          </span>
          <span className="text-[#FFB800] font-bold text-2xl">→</span>
          <span className="font-mono text-3xl font-black text-white tracking-wider">
            {destIata}
          </span>
        </motion.div>

        {/* Arc SVG */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="w-full max-w-sm mb-6 relative"
          style={{ height: 160 }}
        >
          <svg
            viewBox="0 0 320 160"
            fill="none"
            className="absolute inset-0 w-full h-full"
            aria-hidden
          >
            <defs>
              <linearGradient id="arcLoadGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#8b5cf6" stopOpacity="0.3" />
                <stop offset="0.5" stopColor="#a78bfa" stopOpacity="1" />
                <stop offset="1" stopColor="#8b5cf6" stopOpacity="0.3" />
              </linearGradient>
              <filter id="arcGlow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Glow track */}
            <path
              d="M 20 130 Q 160 10 300 130"
              stroke="rgba(139,92,246,0.15)"
              strokeWidth="12"
              fill="none"
            />

            {/* Invisible reference path — used only by getPointAtLength (no dash animation) */}
            <path
              ref={arcPathRef}
              d="M 20 130 Q 160 10 300 130"
              fill="none"
              stroke="none"
              strokeWidth={0}
              visibility="hidden"
            />

            {/* Visual animated arc — pathLength=1 trick avoids getTotalLength issues */}
            <path
              d="M 20 130 Q 160 10 300 130"
              stroke="url(#arcLoadGrad)"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1}
              filter="url(#arcGlow)"
              style={{ animation: `arcDrawNorm ${ARC_DURATION}s ease-out infinite` }}
            />

            {/* Origin pulse dot */}
            <circle cx="20" cy="130" r="4" fill="#8b5cf6" />
            <circle cx="20" cy="130" r="4" fill="#8b5cf6" opacity="0.5">
              <animate attributeName="r" from="4" to="14" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite" />
            </circle>

            {/* Dest pulse dot */}
            <circle cx="300" cy="130" r="4" fill="#8b5cf6" />
            <circle cx="300" cy="130" r="4" fill="#8b5cf6" opacity="0.5">
              <animate attributeName="r" from="4" to="14" dur="2s" begin="0.3s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.5" to="0" dur="2s" begin="0.3s" repeatCount="indefinite" />
            </circle>

            {/* Plane floating at top blinking */}
            <g style={{ 
              animation: "planeBlink 2.8s ease-in-out infinite",
              transform: "translate(175px, 45px)"
            }}>
              <text
                fontSize="42"
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
              >✈️</text>
            </g>
          </svg>

          {/* City labels */}
          <div className="absolute bottom-0 left-4">
            <p className="font-mono text-sm font-black text-white leading-none">{originIata}</p>
            <p className="text-[9px] text-gray-500 mt-0.5">{origin.city}</p>
          </div>
          <div className="absolute bottom-0 right-4 text-right">
            <p className="font-mono text-sm font-black text-white leading-none">{destIata}</p>
            <p className="text-[9px] text-gray-500 mt-0.5">{dest.city}</p>
          </div>
        </motion.div>

        {/* Loading message */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-sm font-bold text-white mb-5 text-center"
        >
          {/* Bilingual handled by locale — fallback to Spanish */}
          Calculando tu ruta
        </motion.p>

        {/* Data chips */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="flex gap-2 flex-wrap justify-center"
        >
          {([
            { label: "Estado vuelo",    delay: 0.3  },
            { label: "Clima",           delay: 0.6  },
            { label: "Riesgo conexión", delay: 1.0  },
            { label: "Datos FAA",       delay: 1.4  },
          ] as const).map(({ label, delay }) => (
            <ChipLoading key={label} label={label} delay={delay} />
          ))}
        </motion.div>

        {/* Tap to skip */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 1.2 }}
          className="text-[10px] text-gray-600 mt-8"
        >
          Tap para continuar
        </motion.p>
      </motion.div>
    </AnimatePresence>
  );
}
