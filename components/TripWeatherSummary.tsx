"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { TripFlight } from "@/lib/types";
import { useTripWeather } from "@/hooks/useTripWeather";
import { AIRPORTS } from "@/lib/airports";

interface TripWeatherSummaryProps {
  flights: TripFlight[];
  locale: "es" | "en";
}

function getTempGradient(tempMax: number): string {
  if (tempMax <= 10) return "from-blue-900/60 to-blue-800/40 border-blue-700/30";
  if (tempMax <= 20) return "from-teal-900/60 to-teal-800/40 border-teal-700/30";
  if (tempMax <= 30) return "from-orange-900/60 to-orange-800/40 border-orange-700/30";
  return "from-red-900/60 to-red-800/40 border-red-700/30";
}

function getPackingTip(
  forecasts: { tempMax: number; tempMin: number; hasRain: boolean }[],
  locale: "es" | "en",
): string | null {
  if (forecasts.length === 0) return null;

  const allMaxTemps = forecasts.map((f) => f.tempMax);
  const allMinTemps = forecasts.map((f) => f.tempMin);
  const hasAnyRain = forecasts.some((f) => f.hasRain);
  const globalMax = Math.max(...allMaxTemps);
  const globalMin = Math.min(...allMinTemps);
  const tempRange = globalMax - globalMin;

  if (tempRange > 20) {
    return locale === "es"
      ? `Preparate para clima variado — ${globalMin}°C a ${globalMax}°C`
      : `Pack for varied weather — ${globalMin}°C to ${globalMax}°C`;
  }
  if (globalMin < 10) {
    return locale === "es" ? "Llevá abrigo" : "Pack warm layers";
  }
  if (globalMax > 30) {
    return locale === "es" ? "Llevá protector solar y ropa liviana" : "Pack sunscreen and light clothing";
  }
  if (hasAnyRain) {
    return locale === "es" ? "Llevá paraguas" : "Pack an umbrella";
  }
  return null;
}

export function TripWeatherSummary({ flights, locale }: TripWeatherSummaryProps) {
  // Build unique destination list from flights
  const destinations = useMemo(() => {
    return flights.map((f) => ({
      iata: f.destinationCode,
      isoDate: f.isoDate,
    }));
  }, [flights]);

  const weatherResults = useTripWeather(destinations, locale);

  const packingTipData = useMemo(() => {
    return weatherResults
      .filter((r) => r.forecast !== null)
      .map((r) => ({
        tempMax: r.forecast!.tempMaxC,
        tempMin: r.forecast!.tempMinC,
        hasRain: r.forecast!.precipitationMm > 0,
      }));
  }, [weatherResults]);

  const packingTip = getPackingTip(packingTipData, locale);

  // Only show items that have a city from AIRPORTS or IATA fallback
  const hasAnyData = weatherResults.some((r) => r.forecast !== null || r.loading);
  if (!hasAnyData) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-2"
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 px-0.5">
        {locale === "es" ? "Clima en destinos" : "Weather at destinations"}
      </p>

      {/* Horizontal scrollable weather cards */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {weatherResults.map((result) => {
          const airport = AIRPORTS[result.iata];
          const cityName = airport?.city ?? result.iata;

          // Format date
          const dateFormatted = new Date(`${result.isoDate}T00:00:00`).toLocaleDateString(
            locale === "es" ? "es-AR" : "en-US",
            { month: "short", day: "numeric" },
          );

          if (result.loading) {
            return (
              <div
                key={result.iata}
                className="shrink-0 w-32 h-24 rounded-xl border border-white/[0.07] bg-white/[0.03] animate-pulse"
              />
            );
          }

          if (!result.forecast) return null;

          const gradientClass = getTempGradient(result.forecast.tempMaxC);

          return (
            <div
              key={result.iata}
              className={`shrink-0 w-32 rounded-xl border bg-gradient-to-br ${gradientClass} p-3 space-y-1`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white truncate max-w-[72px]">{cityName}</span>
                <span className="text-xs font-mono text-white/60">{result.iata}</span>
              </div>
              <p className="text-[10px] text-white/50">{dateFormatted}</p>
              <div className="flex items-center gap-1.5">
                <span className="text-xl leading-none">{result.forecast.conditionEmoji}</span>
                <div>
                  <p className="text-xs font-semibold text-white tabular-nums">
                    {result.forecast.tempMaxC}° / {result.forecast.tempMinC}°
                  </p>
                  <p className="text-[10px] text-white/60 leading-tight truncate max-w-[68px]">
                    {result.forecast.conditionLabel}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Packing tip */}
      {packingTip && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06]">
          <span className="text-sm shrink-0">🎒</span>
          <p className="text-xs text-gray-400">{packingTip}</p>
        </div>
      )}
    </motion.div>
  );
}
