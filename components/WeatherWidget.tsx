"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useDestinationWeather } from "@/hooks/useDestinationWeather";

interface WeatherWidgetProps {
  airportIata: string;
  isoDate: string;
  locale: "es" | "en";
  defaultExpanded?: boolean;
}

export function WeatherWidget({ airportIata, isoDate, locale, defaultExpanded }: WeatherWidgetProps) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);
  const { forecast, loading } = useDestinationWeather(airportIata, isoDate, locale);

  // Don't render while loading or when no data (fail silently)
  if (loading || !forecast) return null;

  const showPrecip = forecast.precipitationMm > 0;
  const showWind = forecast.windKph > 30;

  // Compact one-line summary
  const parts: string[] = [
    `${forecast.conditionEmoji} ${forecast.conditionLabel}`,
    `${forecast.tempMaxC}°/${forecast.tempMinC}°`,
  ];
  if (showPrecip) parts.push(`🌧 ${forecast.precipitationMm}mm`);
  if (showWind) parts.push(`💨 ${forecast.windKph}km/h`);

  const summary = parts.join(" · ");

  return (
    <div className="mt-1.5">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-300 transition-colors w-full text-left"
        aria-label={locale === "es" ? "Ver pronóstico del tiempo" : "View weather forecast"}
      >
        <span className="flex-1">{summary}</span>
        {expanded
          ? <ChevronUp className="h-3 w-3 shrink-0 text-gray-600" />
          : <ChevronDown className="h-3 w-3 shrink-0 text-gray-600" />}
      </button>

      {expanded && (
        <div className="mt-1.5 rounded-lg bg-white/[0.03] border border-white/[0.07] px-3 py-2 space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-gray-400">
              {locale === "es" ? "Máx / Mín" : "High / Low"}
            </span>
            <span className="font-semibold text-gray-300 tabular-nums">
              {forecast.tempMaxC}°C / {forecast.tempMinC}°C
            </span>
          </div>

          {showPrecip && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-400">
                {locale === "es" ? "Precipitación" : "Precipitation"}
              </span>
              <span className="font-semibold text-blue-400 tabular-nums">
                {forecast.precipitationMm} mm
              </span>
            </div>
          )}

          {showWind && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-400">
                {locale === "es" ? "Viento máx" : "Max wind"}
              </span>
              <span className="font-semibold text-gray-300 tabular-nums">
                {forecast.windKph} km/h
              </span>
            </div>
          )}

          <p className="text-[10px] text-gray-600 pt-0.5">
            {locale === "es"
              ? `Pronóstico para ${airportIata} · Open-Meteo`
              : `Forecast for ${airportIata} · Open-Meteo`}
          </p>
        </div>
      )}
    </div>
  );
}
