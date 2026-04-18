"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { AIRPORTS } from "@/lib/airports";
import {
  predictDelay,
  type DelayPrediction,
  type FlightSignals,
  type WeatherSignals,
} from "@/lib/delayPrediction";
import { type AirportStatusMap } from "@/lib/types";

// ── Weather fetch helper ──────────────────────────────────────────────────────

interface RawOpenMeteoResponse {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
    wind_speed_10m?: number;
    visibility?: number;
  };
}

async function fetchWeatherSignals(
  airportCode: string,
): Promise<WeatherSignals | null> {
  const airport = AIRPORTS[airportCode];
  if (!airport?.lat) return null;

  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${airport.lat}&longitude=${airport.lng}` +
        `&current=weather_code,wind_speed_10m,visibility` +
        `&wind_speed_unit=kn`,
    );
    if (!res.ok) return null;

    const json = (await res.json()) as RawOpenMeteoResponse;
    const current = json.current;
    if (!current) return null;

    // Open-Meteo returns visibility in metres; convert to miles
    const visibilityMiles =
      current.visibility !== undefined
        ? current.visibility / 1609.344
        : undefined;

    return {
      visibilityMiles,
      windSpeedKnots: current.wind_speed_10m,
      weatherCode: current.weather_code,
    };
  } catch {
    return null;
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface UseDelayPredictionOptions {
  flight: FlightSignals;
  airportStatus?: AirportStatusMap;
  locale?: "es" | "en";
}

/**
 * Returns a delay prediction for a single flight.
 *
 * - Weather for origin and destination is fetched from Open-Meteo.
 * - FAA status is read from the optional `airportStatus` map (already fetched
 *   by useAirportStatus — no extra request).
 * - Results are cached for 5 minutes via React Query.
 */
export function useDelayPrediction({
  flight,
  airportStatus,
  locale = "es",
}: UseDelayPredictionOptions) {
  const { originCode, destinationCode, isoDate } = flight;

  const enabled = !!originCode && !!destinationCode;

  // Fetch origin weather
  const originWeatherQuery = useQuery<WeatherSignals | null>({
    queryKey: ["delay-weather", originCode],
    queryFn: () => fetchWeatherSignals(originCode),
    staleTime: 5 * 60 * 1000,
    enabled,
  });

  // Fetch destination weather — only when different from origin
  const destWeatherQuery = useQuery<WeatherSignals | null>({
    queryKey: ["delay-weather", destinationCode],
    queryFn: () => fetchWeatherSignals(destinationCode),
    staleTime: 5 * 60 * 1000,
    enabled: enabled && destinationCode !== originCode,
  });

  // Build prediction when inputs are ready
  const prediction = useMemo<DelayPrediction | null>(() => {
    if (!enabled) return null;

    return predictDelay({
      flight,
      airportStatus,
      originWeather: originWeatherQuery.data ?? undefined,
      destinationWeather:
        destinationCode !== originCode
          ? (destWeatherQuery.data ?? undefined)
          : (originWeatherQuery.data ?? undefined),
      locale,
    });
  }, [
    enabled,
    flight,
    airportStatus,
    originWeatherQuery.data,
    destWeatherQuery.data,
    destinationCode,
    originCode,
    locale,
  ]);

  const isLoading =
    originWeatherQuery.isPending || destWeatherQuery.isPending;

  const error =
    originWeatherQuery.error?.message ??
    destWeatherQuery.error?.message ??
    null;

  return {
    prediction,
    isLoading,
    error,
  };
}
