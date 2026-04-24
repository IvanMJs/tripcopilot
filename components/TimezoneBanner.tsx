"use client";

import { MapPin, X } from "lucide-react";
import { cityFromTimezone, formatTzOffset } from "@/lib/airportTimezone";

interface TimezoneBannerProps {
  deviceTz: string;
  locale: "es" | "en";
  onAccept: () => void;
  onDismiss: () => void;
}

export function TimezoneBanner({ deviceTz, locale, onAccept, onDismiss }: TimezoneBannerProps) {
  const city = cityFromTimezone(deviceTz);
  const offset = formatTzOffset(deviceTz, new Date());
  const es = locale === "es";

  return (
    <div className="mx-3 mb-2 rounded-xl border border-blue-700/30 bg-blue-950/30 px-4 py-3 flex items-start gap-3 animate-fade-in-up">
      <MapPin className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-blue-300 font-medium leading-snug">
          {es
            ? `Estás en ${city} (${offset}). ¿Mostrar los horarios en tu hora local?`
            : `You're in ${city} (${offset}). Show flight times in your local time?`}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={onAccept}
            className="text-[11px] font-bold bg-[#FFB800] hover:bg-[#FFC933] text-[#07070d] px-3 py-1 rounded-lg transition-colors"
          >
            {es ? "Sí, mi hora" : "Yes, my time"}
          </button>
          <button
            onClick={onDismiss}
            className="text-[11px] text-gray-400 hover:text-gray-200 px-2 py-1 transition-colors"
          >
            {es ? "No gracias" : "No thanks"}
          </button>
        </div>
      </div>
      <button
        onClick={onDismiss}
        className="shrink-0 flex items-center justify-center text-gray-600 hover:text-gray-400 transition-colors p-0.5"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
