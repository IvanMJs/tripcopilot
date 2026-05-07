"use client";

import { motion } from "framer-motion";

interface TripData {
  destination: string;
  flag: string;
  daysUntil: number;
  originIata: string;
  destIata: string;
  originCity: string;
  destCity: string;
  flightNumber: string;
  date: string;
  time: string;
  terminal?: string;
  duration?: string;
}

interface SetupCompleteProps {
  onActivate: () => void;
  onEnter: () => void;
  trip?: TripData;
}

const ALERT_ITEMS = [
  "Apertura del check-in online",
  "Demoras o cambios en tu vuelo",
  "Asignación de puerta (gate)",
  "Cuándo salir de casa",
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.3 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
};

export function SetupComplete({ onActivate, onEnter, trip }: SetupCompleteProps) {
  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm">
      {/* Hero emoji */}
      <motion.div
        initial={{ scale: 0.3, rotate: -12, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 20, delay: 0.05 }}
        className="text-5xl"
        aria-hidden="true"
      >
        🎉
      </motion.div>

      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.3 }}
        className="text-2xl font-black text-white tracking-tight text-center"
      >
        ¡Listo! Tu viaje está armado
      </motion.h2>

      {/* Trip card */}
      {trip && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.35 }}
          className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3"
        >
          {/* Destination header */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">{trip.flag}</span>
              <div>
                <p className="text-sm font-bold text-white">{trip.destination}</p>
                <p className="text-xs text-white/40">
                  en {trip.daysUntil} {trip.daysUntil === 1 ? "día" : "días"}
                </p>
              </div>
            </div>
            <span className="rounded-full bg-green-500/15 border border-green-500/25 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-green-400 uppercase">
              Confirmado
            </span>
          </div>

          {/* Route */}
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
            <div className="flex items-center justify-between gap-2">
              {/* Origin */}
              <div className="text-center flex-1">
                <p
                  className="font-black text-white"
                  style={{ fontSize: "clamp(24px, 6.5vw, 30px)", letterSpacing: "-0.03em" }}
                >
                  {trip.originIata}
                </p>
                <p className="text-[11px] text-white/40 mt-0.5 truncate">{trip.originCity}</p>
              </div>

              {/* Dashed line */}
              <div className="flex-1 flex items-center gap-1 px-2">
                <div className="flex-1 border-t border-dashed border-[#FFB800]/30" />
                <span className="text-[#FFB800]/50 text-xs">✈</span>
                <div className="flex-1 border-t border-dashed border-[#FFB800]/30" />
              </div>

              {/* Destination */}
              <div className="text-center flex-1">
                <p
                  className="font-black text-white"
                  style={{ fontSize: "clamp(24px, 6.5vw, 30px)", letterSpacing: "-0.03em" }}
                >
                  {trip.destIata}
                </p>
                <p className="text-[11px] text-white/40 mt-0.5 truncate">{trip.destCity}</p>
              </div>
            </div>

            {/* Meta info */}
            <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2 text-xs text-white/40">
              <span>{trip.flightNumber}</span>
              <span>{trip.date}</span>
              <span>{trip.time}</span>
              {trip.terminal && <span>T{trip.terminal}</span>}
              {trip.duration && <span>{trip.duration}</span>}
            </div>
          </div>
        </motion.div>
      )}

      {/* Alert list */}
      <motion.ul
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full space-y-2"
      >
        {ALERT_ITEMS.map((item) => (
          <motion.li
            key={item}
            variants={itemVariants}
            className="flex items-center gap-3 text-sm text-white/65"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500/15 border border-green-500/25">
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
                <path
                  d="M1 4L3.8 6.5L9 1"
                  stroke="#22c55e"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            {item}
          </motion.li>
        ))}
      </motion.ul>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.3 }}
        className="w-full flex flex-col gap-3"
      >
        <button
          onClick={onActivate}
          className="w-full min-h-[52px] rounded-2xl bg-[#FFB800] hover:bg-[#FFC933] active:scale-[0.98] text-[#080810] font-bold text-sm transition-all duration-150 flex items-center justify-center gap-2"
        >
          🔔 Activar notificaciones
        </button>
        <button
          onClick={onEnter}
          className="w-full min-h-[44px] rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.07] active:scale-[0.98] text-sm text-white/60 font-medium transition-all duration-150"
        >
          Entrar a la app →
        </button>
      </motion.div>
    </div>
  );
}
