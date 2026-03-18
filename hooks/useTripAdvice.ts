"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { TripAdviceResult } from "@/lib/types/tripAdvice";
import {
  computeTripSignature,
  getCachedTripAdvice,
  setCachedTripAdvice,
  clearTripAdviceCache,
  FlightSignatureItem,
} from "@/lib/tripAdviceCache";
import { getDestinationProfile } from "@/lib/destinationConfig";

export type AdviceStatus = "idle" | "loading" | "done" | "error";

interface StayPayload {
  isoDate: string;
  originCode: string;
  destinationCode: string;
  destinationName: string;
  destinationNameEn: string;
}

function nightsBetween(isoA: string, isoB: string): number {
  const a = new Date(isoA + "T00:00:00").getTime();
  const b = new Date(isoB + "T00:00:00").getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

function buildStaysPayload(flights: StayPayload[], locale: "es" | "en") {
  const stays = [];
  for (let i = 0; i < flights.length; i++) {
    const dest = flights[i].destinationCode;
    const nextDep = flights.find((f, j) => j > i && f.originCode === dest);
    if (!nextDep) continue;
    const nights = nightsBetween(flights[i].isoDate, nextDep.isoDate);
    if (nights < 2) continue;

    const profile = getDestinationProfile(dest, flights[i].isoDate);
    stays.push({
      code: dest,
      city: locale === "es" ? flights[i].destinationName : flights[i].destinationNameEn,
      nights,
      arrivalDate: flights[i].isoDate,
      departureDate: nextDep.isoDate,
      tempMin: profile?.tempMinC ?? 20,
      tempMax: profile?.tempMaxC ?? 28,
      climate: locale === "es" ? (profile?.climateDesc ?? "") : (profile?.climateDescEn ?? ""),
    });
  }
  return stays;
}

export function useTripAdvice(
  flights: StayPayload[],
  locale: "es" | "en",
) {
  const [status, setStatus] = useState<AdviceStatus>("idle");
  const [data, setData] = useState<TripAdviceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const signature = computeTripSignature(flights as FlightSignatureItem[]);

  const fetch_ = useCallback(
    async (force = false) => {
      if (!force) {
        const cached = getCachedTripAdvice(signature);
        if (cached) {
          setData(cached);
          setStatus("done");
          return;
        }
      } else {
        clearTripAdviceCache();
      }

      setStatus("loading");
      setError(null);

      const stays = buildStaysPayload(flights, locale);
      if (stays.length === 0) {
        setStatus("idle");
        return;
      }

      try {
        const res = await globalThis.fetch("/api/trip-advice", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ stays, locale }),
        });

        const json = await res.json() as { data?: TripAdviceResult; error?: string };

        if (!res.ok || json.error) {
          setError(json.error ?? "Error");
          setStatus("error");
          return;
        }

        if (json.data) {
          setCachedTripAdvice(signature, json.data);
          setData(json.data);
          setStatus("done");
        }
      } catch {
        setError(locale === "es" ? "Sin conexión" : "No connection");
        setStatus("error");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signature, locale],
  );

  // Load once on mount (background — non-blocking)
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetch_(false);
  }, [fetch_]);

  const refresh = useCallback(() => fetch_(true), [fetch_]);

  return { data, status, error, refresh };
}
