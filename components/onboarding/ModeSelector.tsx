"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ModeSelectorProps {
  onSelect: (mode: "relax" | "pilot") => void;
}

const CARDS = [
  {
    mode: "relax" as const,
    emoji: "😌",
    label: "Relax",
    tagline: "Avisame lo justo y necesario. Yo viajo, vos te encargás.",
    bullets: ["Alertas inteligentes", "Scanner de reservas", "Interfaz limpia"],
  },
  {
    mode: "pilot" as const,
    emoji: "🧑‍✈️",
    label: "Pilot",
    tagline: "Quiero ver TODO. METAR, conexiones, datos en tiempo real.",
    bullets: ["Dashboard completo", "Datos de aviación", "Control total"],
  },
];

export function ModeSelector({ onSelect }: ModeSelectorProps) {
  const [selected, setSelected] = useState<"relax" | "pilot" | null>(null);

  function handleSelect(mode: "relax" | "pilot") {
    setSelected(mode);
    setTimeout(() => onSelect(mode), 420);
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {/* Header */}
      <div className="text-center space-y-2">
        <p className="text-xs font-semibold tracking-widest uppercase text-[#FFB800]/70">
          ¿Cómo querés viajar?
        </p>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Elegí tu estilo de viaje
        </h1>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-3 w-full max-w-md">
        {CARDS.map((card, idx) => {
          const isSelected = selected === card.mode;
          const isDimmed = selected !== null && !isSelected;

          return (
            <motion.button
              key={card.mode}
              initial={{ opacity: 0, y: 14 }}
              animate={{
                opacity: isDimmed ? 0.4 : 1,
                y: 0,
                scale: isSelected ? 1.015 : 1,
              }}
              transition={{
                opacity: { delay: idx * 0.08, duration: 0.3 },
                y: { delay: idx * 0.08, duration: 0.3 },
                scale: { type: "spring", stiffness: 400, damping: 30 },
              }}
              onClick={() => handleSelect(card.mode)}
              className={[
                "relative flex-1 text-left rounded-2xl p-5 transition-colors duration-200",
                isSelected
                  ? "bg-amber-500/[0.07] border-[1.5px] border-[#FFB800]"
                  : "bg-white/[0.03] border border-white/[0.08]",
              ].join(" ")}
              style={
                isSelected
                  ? { boxShadow: "0 0 24px rgba(255,184,0,0.18)" }
                  : undefined
              }
              aria-pressed={isSelected}
            >
              {/* Checkmark badge */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 28 }}
                    className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[#FFB800] flex items-center justify-center"
                  >
                    <svg
                      width="12"
                      height="9"
                      viewBox="0 0 12 9"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M1 4L4.5 7.5L11 1"
                        stroke="#080810"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Emoji icon */}
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[13px] bg-white/[0.06] text-2xl">
                {card.emoji}
              </div>

              {/* Label + tagline */}
              <p className="text-base font-black text-white">{card.label}</p>
              <p className="mt-1 text-xs text-white/50 leading-relaxed">
                {card.tagline}
              </p>

              {/* Bullets */}
              <ul className="mt-3 space-y-1.5">
                {card.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-center gap-2 text-xs text-white/60">
                    <span className="flex h-[5px] w-[5px] shrink-0 rounded-full bg-[#FFB800]/60" />
                    {bullet}
                  </li>
                ))}
              </ul>
            </motion.button>
          );
        })}
      </div>

      {/* Footer text */}
      <p className="text-xs text-white/30 text-center">
        Podés cambiarlo cuando quieras en Configuración
      </p>
    </div>
  );
}
