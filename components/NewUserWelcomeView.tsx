"use client";

import { motion } from "framer-motion";

interface NewUserWelcomeViewProps {
  statusMap: Record<string, { status: string; lastChecked?: Date }>;
  locale: "es" | "en";
  onAddFlight: () => void;
}

const AIRPORTS = ["EZE", "JFK", "MIA", "GCM"] as const;

function formatLastChecked(date: Date | undefined, locale: "es" | "en"): string {
  if (!date) return locale === "es" ? "actualizando..." : "updating...";
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return locale === "es" ? "actualizado ahora" : "updated just now";
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return locale === "es" ? "actualizado ahora" : "updated just now";
  if (diffMin < 60) return locale === "es" ? `hace ${diffMin} min` : `${diffMin} min ago`;
  const diffH = Math.floor(diffMin / 60);
  return locale === "es" ? `hace ${diffH} h` : `${diffH} h ago`;
}

function getStatusInfo(raw: string | undefined, locale: "es" | "en"): { icon: string; label: string } {
  if (raw === "ok") {
    return { icon: "✅", label: locale === "es" ? "sin demoras" : "no delays" };
  }
  if (raw === "ground_stop") {
    return { icon: "⛔", label: locale === "es" ? "vuelos pausados" : "flights paused" };
  }
  if (raw === "closure") {
    return { icon: "⛔", label: locale === "es" ? "aeropuerto cerrado" : "airport closed" };
  }
  if (raw === "unknown" || raw === undefined) {
    return { icon: "🔘", label: locale === "es" ? "sin señal" : "no signal" };
  }
  // delay_minor | delay_moderate | delay_severe | ground_delay
  return { icon: "⚠️", label: locale === "es" ? "demoras activas" : "active delays" };
}

export function NewUserWelcomeView({ statusMap, locale, onAddFlight }: NewUserWelcomeViewProps) {
  const staggerDelays = [0, 0.06, 0.12, 0.18];

  return (
    <div className="flex flex-col gap-3">
      {/* Headline */}
      <p className="text-xl font-black text-white text-center">
        {locale === "es"
          ? "Si viajás esta semana, mirá esto antes de ir."
          : "Flying this week? Check this before you go."}
      </p>

      {/* Subtitle */}
      <p className="text-sm text-gray-500 text-center mb-4">
        {locale === "es"
          ? "Estado de aeropuertos, en tiempo real"
          : "Airport status, in real time"}
      </p>

      {/* Airport cards */}
      <div className="flex flex-col gap-2">
        {AIRPORTS.map((iata, index) => {
          const { icon, label } = getStatusInfo(statusMap[iata]?.status, locale);
          return (
            <motion.div
              key={iata}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: staggerDelays[index], duration: 0.2 }}
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 flex items-center justify-between"
            >
              <span className="font-bold text-white">{iata}</span>
              <div className="flex flex-col items-end gap-0.5">
                <span className="flex items-center gap-1.5 text-sm text-gray-400">
                  <span>{icon}</span>
                  <span>{label}</span>
                </span>
                <span className="text-[11px] text-gray-600">
                  {formatLastChecked(statusMap[iata]?.lastChecked, locale)}
                </span>
              </div>
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
