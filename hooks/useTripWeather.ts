"use client";

import { useState, useEffect, useRef } from "react";
import { AIRPORTS } from "@/lib/airports";
import { WeatherForecast } from "@/hooks/useDestinationWeather";

export interface TripDestinationWeather {
  iata: string;
  city: string;
  isoDate: string;
  forecast: WeatherForecast | null;
  loading: boolean;
}

interface OpenMeteoDaily {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_sum: number[];
  windspeed_10m_max: number[];
  weathercode: number[];
}

interface OpenMeteoResponse {
  daily?: OpenMeteoDaily;
}

const WMO_DAILY: Record<number, { es: string; en: string; emoji: string }> = {
  0:  { es: "Soleado",              en: "Sunny",              emoji: "☀️" },
  1:  { es: "Mayormente despejado", en: "Mainly clear",       emoji: "🌤️" },
  2:  { es: "Parcialmente nublado", en: "Partly cloudy",      emoji: "⛅" },
  3:  { es: "Nublado",              en: "Overcast",           emoji: "☁️" },
  45: { es: "Niebla",               en: "Fog",                emoji: "🌫️" },
  48: { es: "Niebla con escarcha",  en: "Rime fog",           emoji: "🌫️" },
  51: { es: "Llovizna leve",        en: "Light drizzle",      emoji: "🌦️" },
  53: { es: "Llovizna moderada",    en: "Drizzle",            emoji: "🌦️" },
  55: { es: "Llovizna intensa",     en: "Dense drizzle",      emoji: "🌦️" },
  61: { es: "Lluvia leve",          en: "Light rain",         emoji: "🌧️" },
  63: { es: "Lluvia moderada",      en: "Rain",               emoji: "🌧️" },
  65: { es: "Lluvia intensa",       en: "Heavy rain",         emoji: "🌧️" },
  71: { es: "Nevada leve",          en: "Light snow",         emoji: "🌨️" },
  73: { es: "Nevada moderada",      en: "Snow",               emoji: "🌨️" },
  75: { es: "Nevada intensa",       en: "Heavy snow",         emoji: "❄️" },
  80: { es: "Chubascos leves",      en: "Light showers",      emoji: "🌦️" },
  81: { es: "Chubascos moderados",  en: "Showers",            emoji: "🌧️" },
  82: { es: "Chubascos fuertes",    en: "Heavy showers",      emoji: "⛈️" },
  95: { es: "Tormenta",             en: "Thunderstorm",       emoji: "⛈️" },
  96: { es: "Tormenta con granizo", en: "Thunderstorm/hail",  emoji: "⛈️" },
  99: { es: "Tormenta fuerte",      en: "Severe thunderstorm",emoji: "⛈️" },
};

function getConditionInfo(code: number, locale: "es" | "en"): { label: string; emoji: string } {
  const entry = WMO_DAILY[code] ?? WMO_DAILY[0]!;
  return { label: entry[locale], emoji: entry.emoji };
}

const CACHE_TTL_MS = 60 * 60 * 1000;

interface CacheEntry {
  forecast: WeatherForecast;
  timestamp: number;
}

const forecastCache: Record<string, CacheEntry> = {};

export interface TripDestination {
  iata: string;
  isoDate: string;
}

/**
 * Fetches weather for multiple destinations in a trip.
 * Deduplicates by IATA code (takes the earliest date if duplicated).
 */
export function useTripWeather(
  destinations: TripDestination[],
  locale: "es" | "en",
): TripDestinationWeather[] {
  // Deduplicate: keep earliest date per IATA
  const dedupedMap = new Map<string, string>();
  for (const d of destinations) {
    const existing = dedupedMap.get(d.iata);
    if (!existing || d.isoDate < existing) {
      dedupedMap.set(d.iata, d.isoDate);
    }
  }
  const deduped = Array.from(dedupedMap.entries()).map(([iata, isoDate]) => ({ iata, isoDate }));

  const [results, setResults] = useState<TripDestinationWeather[]>(() =>
    deduped.map(({ iata, isoDate }) => ({
      iata,
      city: AIRPORTS[iata]?.city ?? iata,
      isoDate,
      forecast: null,
      loading: true,
    })),
  );

  const localeRef = useRef(locale);
  localeRef.current = locale;

  useEffect(() => {
    if (deduped.length === 0) return;

    const controllers: AbortController[] = [];

    const fetches = deduped.map(async ({ iata, isoDate }, idx) => {
      const airport = AIRPORTS[iata];
      if (!airport) {
        setResults((prev) => {
          const next = [...prev];
          if (next[idx]) next[idx] = { ...next[idx]!, loading: false };
          return next;
        });
        return;
      }

      // Only fetch for flights within 16 days (Open-Meteo free tier limit)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const flightDate = new Date(`${isoDate}T00:00:00`);
      const diffDays = (flightDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays < 0 || diffDays > 16) {
        setResults((prev) => {
          const next = [...prev];
          if (next[idx]) next[idx] = { ...next[idx]!, loading: false };
          return next;
        });
        return;
      }

      const cacheKey = `${iata}:${isoDate}`;
      const cached = forecastCache[cacheKey];
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        const { label, emoji } = getConditionInfo(cached.forecast.conditionCode, localeRef.current);
        setResults((prev) => {
          const next = [...prev];
          if (next[idx]) {
            next[idx] = {
              ...next[idx]!,
              forecast: { ...cached.forecast, conditionLabel: label, conditionEmoji: emoji },
              loading: false,
            };
          }
          return next;
        });
        return;
      }

      const controller = new AbortController();
      controllers.push(controller);

      const { lat, lng } = airport;
      const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${lat}&longitude=${lng}` +
        `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,weathercode` +
        `&timezone=auto` +
        `&start_date=${isoDate}&end_date=${isoDate}`;

      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
        const json = await res.json() as OpenMeteoResponse;
        const daily = json.daily;
        if (!daily || daily.time.length === 0) throw new Error("No data");

        const code = daily.weathercode[0] ?? 0;
        const { label, emoji } = getConditionInfo(code, localeRef.current);
        const forecast: WeatherForecast = {
          date: isoDate,
          tempMaxC: Math.round(daily.temperature_2m_max[0] ?? 0),
          tempMinC: Math.round(daily.temperature_2m_min[0] ?? 0),
          precipitationMm: Math.round((daily.precipitation_sum[0] ?? 0) * 10) / 10,
          windKph: Math.round(daily.windspeed_10m_max[0] ?? 0),
          conditionCode: code,
          conditionLabel: label,
          conditionEmoji: emoji,
        };
        forecastCache[cacheKey] = { forecast, timestamp: Date.now() };
        setResults((prev) => {
          const next = [...prev];
          if (next[idx]) next[idx] = { ...next[idx]!, forecast, loading: false };
          return next;
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setResults((prev) => {
          const next = [...prev];
          if (next[idx]) next[idx] = { ...next[idx]!, loading: false };
          return next;
        });
      }
    });

    void Promise.allSettled(fetches);

    return () => {
      controllers.forEach((c) => c.abort());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(deduped)]);

  return results;
}
