"use client";

import { useState, useEffect } from "react";

export interface GeoPosition {
  lat: number;
  lng: number;
}

const STORAGE_KEY = "tripcopilot-geolocation";
const MAX_AGE_MS  = 10 * 60 * 1000; // re-fetch if cached position is > 10 min old

interface CachedPosition {
  lat: number;
  lng: number;
  timestamp: number;
}

function readCache(): GeoPosition | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const cached: CachedPosition = JSON.parse(raw);
    if (Date.now() - cached.timestamp > MAX_AGE_MS) return null;
    return { lat: cached.lat, lng: cached.lng };
  } catch {
    return null;
  }
}

function writeCache(pos: GeoPosition): void {
  try {
    const entry: CachedPosition = { ...pos, timestamp: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // storage quota exceeded — ignore
  }
}

/**
 * Returns the device's current geolocation, cached in localStorage for 10 min.
 * Silently returns null if permission is denied or unavailable.
 * Never triggers the browser prompt on its own — only fetches when `enabled` is true.
 */
export function useGeolocation(enabled = true): GeoPosition | null {
  const [position, setPosition] = useState<GeoPosition | null>(() => readCache());

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    if (!("geolocation" in navigator)) return;

    // If we have a fresh cached value, use it and skip the API call
    const cached = readCache();
    if (cached) {
      setPosition(cached);
      return;
    }

    let cancelled = false;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        const result: GeoPosition = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        writeCache(result);
        setPosition(result);
      },
      () => {
        // Permission denied or unavailable — fail silently
      },
      { timeout: 8000, maximumAge: MAX_AGE_MS },
    );

    return () => { cancelled = true; };
  }, [enabled]);

  return position;
}
