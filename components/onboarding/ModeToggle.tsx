"use client";

import { motion, AnimatePresence } from "framer-motion";

interface ModeToggleProps {
  value: "relax" | "pilot";
  onChange: (mode: "relax" | "pilot") => void;
}

const DESCRIPTIONS: Record<"relax" | "pilot", string> = {
  relax: "Solo lo esencial. Alertas inteligentes cuando importa.",
  pilot: "Dashboard completo. METAR, conexiones, datos en tiempo real.",
};

export function ModeToggle({ value, onChange }: ModeToggleProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Segmented control */}
      <div className="relative flex bg-white/[0.04] border border-white/[0.08] rounded-xl p-[3px]">
        {/* Animated pill */}
        <motion.div
          className="absolute inset-[3px] rounded-[9px]"
          animate={{ x: value === "pilot" ? "50%" : "0%" }}
          transition={{ type: "spring", stiffness: 480, damping: 36 }}
          style={{
            width: "calc(50% - 0px)",
            backgroundColor: "#FFB800",
            boxShadow: "0 2px 10px rgba(255,184,0,0.32)",
          }}
        />

        {/* Relax button */}
        <button
          onClick={() => onChange("relax")}
          className={[
            "relative z-10 flex-1 min-h-[48px] rounded-[9px] text-sm font-bold transition-colors duration-150",
            value === "relax" ? "text-[#080810]" : "text-white/[0.42]",
          ].join(" ")}
          aria-pressed={value === "relax"}
        >
          😌 Relax
        </button>

        {/* Pilot button */}
        <button
          onClick={() => onChange("pilot")}
          className={[
            "relative z-10 flex-1 min-h-[48px] rounded-[9px] text-sm font-bold transition-colors duration-150",
            value === "pilot" ? "text-[#080810]" : "text-white/[0.42]",
          ].join(" ")}
          aria-pressed={value === "pilot"}
        >
          🧑‍✈️ Pilot
        </button>
      </div>

      {/* Description */}
      <AnimatePresence mode="wait">
        <motion.p
          key={value}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="text-xs text-white/40 text-center"
        >
          {DESCRIPTIONS[value]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
