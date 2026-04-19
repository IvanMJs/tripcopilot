"use client";

import { motion } from "framer-motion";

interface NewUserWelcomeViewProps {
  statusMap: Record<string, string>; // DelayStatus values
  locale: "es" | "en";
  onAddFlight: () => void;
}

const AIRPORTS = ["EZE", "JFK", "MIA", "GCM"] as const;

function getStatusInfo(raw: string | undefined, locale: "es" | "en"): { icon: string; label: string } {
  if (raw === "ok") {
    return {
      icon: "✅",
      label: locale === "es" ? "operando con normalidad" : "operating normally",
    };
  }
  if (raw === "unknown" || raw === undefined) {
    return {
      icon: "🔘",
      label: locale === "es" ? "sin datos disponibles" : "no data available",
    };
  }
  // closure | ground_stop | ground_delay | delay_severe | delay_moderate | delay_minor
  return {
    icon: "⚠️",
    label: locale === "es" ? "demoras activas" : "active delays",
  };
}

export function NewUserWelcomeView({ statusMap, locale, onAddFlight }: NewUserWelcomeViewProps) {
  const staggerDelays = [0, 0.06, 0.12, 0.18];

  return (
    <div className="flex flex-col gap-3">
      {/* Headline */}
      <p className="text-xl font-black text-white text-center">
        {locale === "es"
          ? "Tu copiloto de vuelos, en tiempo real"
          : "Your flight copilot, in real time"}
      </p>

      {/* Subtitle */}
      <p className="text-sm text-gray-500 text-center mb-4">
        {locale === "es"
          ? "Así está el mundo ahora mismo"
          : "Here's what's happening right now"}
      </p>

      {/* Airport cards */}
      <div className="flex flex-col gap-2">
        {AIRPORTS.map((iata, index) => {
          const { icon, label } = getStatusInfo(statusMap[iata], locale);
          return (
            <motion.div
              key={iata}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: staggerDelays[index], duration: 0.2 }}
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 flex items-center justify-between"
            >
              <span className="font-bold text-white">{iata}</span>
              <span className="flex items-center gap-1.5 text-sm text-gray-400">
                <span>{icon}</span>
                <span>{label}</span>
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* CTA */}
      <div className="mt-2 flex flex-col items-center gap-0">
        <button
          onClick={onAddFlight}
          className="rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm py-3.5 w-full transition-colors tap-scale"
        >
          {locale === "es" ? "Agregar mi vuelo ✈️" : "Add my flight ✈️"}
        </button>
        <p className="text-xs text-gray-600 text-center mt-2">
          {locale === "es"
            ? "Recibí alertas personalizadas para tus vuelos"
            : "Get personalized alerts for your flights"}
        </p>
      </div>
    </div>
  );
}
