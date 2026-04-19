"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { AirportStatusMap } from "@/lib/types";
import { parseXML } from "@/lib/faa";
import { offlineCache } from "@/lib/offlineCache";
import toast from "react-hot-toast";

const CACHE_KEY = "apt-status-cache";
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

interface AirportStatusCache {
  data: AirportStatusMap;
  ts: number;
}

function readCache(): AirportStatusCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AirportStatusCache;
    if (typeof parsed.ts !== "number" || !parsed.data) return null;
    // JSON.parse turns Date objects into strings — revive them
    for (const iata of Object.keys(parsed.data)) {
      const entry = parsed.data[iata];
      if (entry && typeof (entry.lastChecked as unknown) === "string") {
        entry.lastChecked = new Date(entry.lastChecked as unknown as string);
      }
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(data: AirportStatusMap): void {
  if (typeof window === "undefined") return;
  try {
    const entry: AirportStatusCache = { data, ts: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // localStorage may be unavailable (private mode, quota exceeded) — fail silently.
  }
}

const TOAST_MESSAGES = {
  es: { cleared: "Demoras despejadas", changed: "Estado cambió" },
  en: { cleared: "Delays cleared", changed: "Status changed" },
};

export function useAirportStatus(
  refreshIntervalMinutes: number = 5,
  locale: "es" | "en" = "es",
  showSwNotification?: (title: string, options?: NotificationOptions) => void,
) {
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(
    refreshIntervalMinutes * 60,
  );
  const [changedAirports, setChangedAirports] = useState<Set<string>>(new Set());
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Seed prevStatusRef and initialLoadDone from cache so the first live fetch
  // compares against cached data rather than an empty object, preventing false
  // change-detection toasts on cache hits.
  const prevStatusRef = useRef<AirportStatusMap>((() => {
    const cached = readCache();
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data;
    return {};
  })());
  const lastXmlRef = useRef<string>("");
  const initialLoadDone = useRef((() => {
    const cached = readCache();
    return cached !== null && Date.now() - cached.ts < CACHE_TTL_MS;
  })());
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Stable refs so queryFn closure captures current values without re-creating the query key
  const localeRef = useRef(locale);
  const notificationsEnabledRef = useRef(notificationsEnabled);
  const showSwNotificationRef = useRef(showSwNotification);
  useEffect(() => { localeRef.current = locale; }, [locale]);
  useEffect(() => { notificationsEnabledRef.current = notificationsEnabled; }, [notificationsEnabled]);
  useEffect(() => { showSwNotificationRef.current = showSwNotification; }, [showSwNotification]);

  // On mount, check if notifications are already granted
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted");
    }
  }, []);

  const requestNotifications = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return false;
    const permission = await Notification.requestPermission();
    const granted = permission === "granted";
    setNotificationsEnabled(granted);
    return granted;
  }, []);

  // App-level toggle off (browser permission stays granted, we just stop firing)
  const disableNotifications = useCallback(() => {
    setNotificationsEnabled(false);
  }, []);

  const cachedData = readCache();
  const validCachedData: AirportStatusMap | undefined =
    (cachedData && Date.now() - cachedData.ts < CACHE_TTL_MS)
      ? cachedData.data
      // Fall back to the longer-lived offline cache when the short-TTL cache is stale
      : (offlineCache.loadAirportStatus() ?? undefined);

  const {
    data: statusMap = {},
    isPending,
    error: queryError,
    refetch,
  } = useQuery<AirportStatusMap, Error>({
    queryKey: ["airport-status", refreshIntervalMinutes],
    queryFn: async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      try {
        const faaRes = await fetch("/api/faa-status", { signal: controller.signal });
        clearTimeout(timeout);

        if (!faaRes.ok) throw new Error("Error fetching FAA data");
        const xml = await faaRes.text();
        lastXmlRef.current = xml;
        const newMap = parseXML(xml, localeRef.current);
        writeCache(newMap);
        // Also persist to the offline cache (longer TTL — used when app is fully offline)
        offlineCache.saveAirportStatus(newMap);
        return newMap;
      } catch (e) {
        clearTimeout(timeout);
        throw e;
      }
    },
    initialData: validCachedData,
    refetchInterval: refreshIntervalMinutes * 60 * 1000,
    staleTime: CACHE_TTL_MS,
  });

  // Derive error string from query error
  const error = queryError
    ? queryError.name === "AbortError"
      ? locale === "en"
        ? "Timeout — FAA did not respond in 12 seconds"
        : "Timeout — FAA no respondió en 12 segundos"
      : String(queryError)
    : null;

  // Track consecutive errors
  useEffect(() => {
    if (queryError) {
      setConsecutiveErrors((prev) => prev + 1);
    }
  }, [queryError]);

  // Track last updated time and reset countdown on new data
  const [lastUpdated, setLastUpdated] = useState<Date | null>(() => {
    const cached = readCache();
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return new Date(cached.ts);
    return null;
  });

  // Change detection, toasts, push notifications, and state reset on new data
  useEffect(() => {
    if (!statusMap || Object.keys(statusMap).length === 0) return;

    if (initialLoadDone.current) {
      const prev = prevStatusRef.current;
      const changed = new Set<string>();
      const currentLocale = localeRef.current;

      Object.keys(statusMap).forEach((iata) => {
        const prevStatus = prev[iata]?.status;
        const newStatus = statusMap[iata]?.status;
        if (prevStatus !== undefined && prevStatus !== newStatus) {
          changed.add(iata);
          if (newStatus === "ok") {
            toast.success(`${iata}: ${TOAST_MESSAGES[currentLocale].cleared} ✅`);
          } else {
            toast.error(`${iata}: ${TOAST_MESSAGES[currentLocale].changed} ⚠️`);
          }
          // Push notification — prefer SW-based (works on Android PWA lock screen)
          if (notificationsEnabledRef.current && Notification.permission === "granted") {
            const msg =
              newStatus === "ok"
                ? TOAST_MESSAGES[currentLocale].cleared
                : TOAST_MESSAGES[currentLocale].changed;
            const title = `✈ ${iata}: ${msg}`;
            if (showSwNotificationRef.current) {
              showSwNotificationRef.current(title, { tag: iata });
            } else {
              new Notification(title, { icon: "/icon.svg", tag: iata });
            }
          }
        }
      });

      if (changed.size > 0) {
        setChangedAirports(changed);
        if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
        flashTimeoutRef.current = setTimeout(() => setChangedAirports(new Set()), 4000);
      }
    }

    prevStatusRef.current = statusMap;
    setLastUpdated(new Date());
    setSecondsUntilRefresh(refreshIntervalMinutes * 60);
    setConsecutiveErrors(0);
    initialLoadDone.current = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusMap]);

  // Re-parse cached XML when locale changes (no re-fetch needed)
  useEffect(() => {
    if (lastXmlRef.current) {
      const reparsed = parseXML(lastXmlRef.current, locale);
      prevStatusRef.current = reparsed;
    }
  }, [locale]);

  // Countdown ticker
  useEffect(() => {
    setSecondsUntilRefresh(refreshIntervalMinutes * 60);
    const tick = setInterval(() => {
      setSecondsUntilRefresh((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(tick);
  }, [refreshIntervalMinutes, lastUpdated]);

  const isStale = consecutiveErrors >= 2;

  return {
    statusMap,
    loading: isPending,
    error,
    lastUpdated,
    secondsUntilRefresh,
    totalSeconds: refreshIntervalMinutes * 60,
    refresh: refetch,
    changedAirports,
    consecutiveErrors,
    isStale,
    notificationsEnabled,
    requestNotifications,
    disableNotifications,
  };
}
