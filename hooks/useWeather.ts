"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { AIRPORTS } from "@/lib/airports";

export interface WeatherData {
  temperature: number;
  weatherCode: number;
  description: string;
  icon: string;
}

const WMO_CODES: Record<number, { es: string; en: string; icon: string }> = {
  0:  { es: "Despejado",             en: "Clear sky",            icon: "☀️" },
  1:  { es: "Mayormente despejado",  en: "Mainly clear",         icon: "🌤️" },
  2:  { es: "Parcialmente nublado",  en: "Partly cloudy",        icon: "⛅" },
  3:  { es: "Nublado",               en: "Overcast",             icon: "☁️" },
  45: { es: "Niebla",                en: "Fog",                  icon: "🌫️" },
  48: { es: "Niebla con escarcha",   en: "Depositing rime fog",  icon: "🌫️" },
  51: { es: "Llovizna leve",         en: "Light drizzle",        icon: "🌦️" },
  53: { es: "Llovizna moderada",     en: "Moderate drizzle",     icon: "🌦️" },
  55: { es: "Llovizna intensa",      en: "Dense drizzle",        icon: "🌧️" },
  61: { es: "Lluvia leve",           en: "Slight rain",          icon: "🌧️" },
  63: { es: "Lluvia moderada",       en: "Moderate rain",        icon: "🌧️" },
  65: { es: "Lluvia intensa",        en: "Heavy rain",           icon: "🌧️" },
  71: { es: "Nevada leve",           en: "Slight snow",          icon: "🌨️" },
  73: { es: "Nevada moderada",       en: "Moderate snow",        icon: "🌨️" },
  75: { es: "Nevada intensa",        en: "Heavy snow",           icon: "❄️" },
  77: { es: "Granizo fino",          en: "Snow grains",          icon: "🌨️" },
  80: { es: "Chubascos leves",       en: "Slight showers",       icon: "🌦️" },
  81: { es: "Chubascos moderados",   en: "Moderate showers",     icon: "🌧️" },
  82: { es: "Chubascos violentos",   en: "Violent showers",      icon: "⛈️" },
  85: { es: "Chubascos de nieve",    en: "Snow showers",         icon: "🌨️" },
  86: { es: "Chubascos de nieve fuerte", en: "Heavy snow showers", icon: "❄️" },
  95: { es: "Tormenta eléctrica",    en: "Thunderstorm",         icon: "⛈️" },
  96: { es: "Tormenta con granizo leve", en: "Thunderstorm with slight hail", icon: "⛈️" },
  99: { es: "Tormenta con granizo fuerte", en: "Thunderstorm with heavy hail", icon: "⛈️" },
};

function getWeatherInfo(code: number, locale: "es" | "en") {
  const entry = WMO_CODES[code] ?? WMO_CODES[0]!;
  return { description: entry[locale], icon: entry.icon };
}

const CACHE_TTL_MS = 10 * 60 * 1000;

interface RawCacheEntry {
  temperature: number;
  weatherCode: number;
  timestamp: number;
}

export function useWeather(airportCodes: string[], locale: "es" | "en") {
  const [rawMap, setRawMap] = useState<Record<string, { temperature: number; weatherCode: number }>>({});
  const cacheRef = useRef<Record<string, RawCacheEntry>>({});

  const airportCodesKey = airportCodes.join(",");

  useEffect(() => {
    if (airportCodes.length === 0) return;

    let cancelled = false;

    async function fetchWeather() {
      const now = Date.now();
      const toFetch = airportCodes.filter((code) => {
        const airport = AIRPORTS[code];
        if (!airport?.lat) return false;
        const cached = cacheRef.current[code];
        return !cached || now - cached.timestamp > CACHE_TTL_MS;
      });

      if (toFetch.length === 0) {
        const result: Record<string, { temperature: number; weatherCode: number }> = {};
        for (const code of airportCodes) {
          const cached = cacheRef.current[code];
          if (cached) result[code] = { temperature: cached.temperature, weatherCode: cached.weatherCode };
        }
        setRawMap(result);
        return;
      }

      const lats = toFetch.map((c) => AIRPORTS[c]!.lat).join(",");
      const lngs = toFetch.map((c) => AIRPORTS[c]!.lng).join(",");

      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}&current=temperature_2m,weather_code&temperature_unit=celsius`
        );
        if (!res.ok) return;
        const json = await res.json();

        if (cancelled) return;

        const results = Array.isArray(json) ? json : [json];

        const newCache = { ...cacheRef.current };
        results.forEach((item: { current?: { temperature_2m: number; weather_code: number } }, i: number) => {
          const code = toFetch[i];
          if (!code || !item.current) return;
          newCache[code] = {
            temperature: Math.round(item.current.temperature_2m),
            weatherCode: item.current.weather_code,
            timestamp: Date.now(),
          };
        });
        cacheRef.current = newCache;

        const result: Record<string, { temperature: number; weatherCode: number }> = {};
        for (const code of airportCodes) {
          const cached = cacheRef.current[code];
          if (cached) result[code] = { temperature: cached.temperature, weatherCode: cached.weatherCode };
        }
        if (!cancelled) setRawMap(result);
      } catch {
        // silently fail — weather is supplementary
      }
    }

    fetchWeather();

    return () => { cancelled = true; };
  }, [airportCodesKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const weatherMap = useMemo(() => {
    const map: Record<string, WeatherData> = {};
    for (const [code, raw] of Object.entries(rawMap)) {
      const { description, icon } = getWeatherInfo(raw.weatherCode, locale);
      map[code] = {
        temperature: raw.temperature,
        weatherCode: raw.weatherCode,
        description,
        icon,
      };
    }
    return map;
  }, [rawMap, locale]);

  return weatherMap;
}
