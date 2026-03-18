"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AirportStatusMap } from "@/lib/types";
import { parseXML } from "@/lib/faa";
import toast from "react-hot-toast";

const TOAST_MESSAGES = {
  es: { cleared: "Demoras despejadas", changed: "Estado cambió" },
  en: { cleared: "Delays cleared", changed: "Status changed" },
};

export function useAirportStatus(
  refreshIntervalMinutes: number = 5,
  locale: "es" | "en" = "es",
  showSwNotification?: (title: string, options?: NotificationOptions) => void,
) {
  const [statusMap, setStatusMap] = useState<AirportStatusMap>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(
    refreshIntervalMinutes * 60
  );
  const [changedAirports, setChangedAirports] = useState<Set<string>>(new Set());
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const prevStatusRef = useRef<AirportStatusMap>({});
  const lastXmlRef = useRef<string>("");
  const initialLoadDone = useRef(false);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

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

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const faaRes = await fetch("/api/faa-status", { signal: controller.signal });
      clearTimeout(timeout);

      if (!faaRes.ok) throw new Error("Error fetching FAA data");
      const xml = await faaRes.text();
      lastXmlRef.current = xml;
      const newMap = parseXML(xml, locale);

      if (initialLoadDone.current) {
        const prev = prevStatusRef.current;
        const changed = new Set<string>();
        Object.keys(newMap).forEach((iata) => {
          const prevStatus = prev[iata]?.status;
          const newStatus = newMap[iata]?.status;
          if (prevStatus !== undefined && prevStatus !== newStatus) {
            changed.add(iata);
            if (newStatus === "ok") {
              toast.success(`${iata}: ${TOAST_MESSAGES[locale].cleared} ✅`);
            } else {
              toast.error(`${iata}: ${TOAST_MESSAGES[locale].changed} ⚠️`);
            }
            // Push notification — prefer SW-based (works on Android PWA lock screen)
            if (notificationsEnabled && Notification.permission === "granted") {
              const msg = newStatus === "ok"
                ? TOAST_MESSAGES[locale].cleared
                : TOAST_MESSAGES[locale].changed;
              const title = `✈ ${iata}: ${msg}`;
              if (showSwNotification) {
                showSwNotification(title, { tag: iata });
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

      prevStatusRef.current = newMap;
      setStatusMap(newMap);
      setLastUpdated(new Date());
      setSecondsUntilRefresh(refreshIntervalMinutes * 60);
      initialLoadDone.current = true;
      setConsecutiveErrors(0);
    } catch (e) {
      clearTimeout(timeout);
      setConsecutiveErrors((prev) => prev + 1);
      if ((e as Error).name === "AbortError") {
        setError(locale === "en" ? "Timeout — FAA did not respond in 12 seconds" : "Timeout — FAA no respondió en 12 segundos");
      } else {
        setError(String(e));
      }
    } finally {
      setLoading(false);
    }
  }, [refreshIntervalMinutes, locale, notificationsEnabled, showSwNotification]);

  // Re-parse cached XML when locale changes (no re-fetch needed)
  useEffect(() => {
    if (lastXmlRef.current) {
      const reparsed = parseXML(lastXmlRef.current, locale);
      setStatusMap(reparsed);
      prevStatusRef.current = reparsed;
    }
  }, [locale]);

  // Auto-refresh
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, refreshIntervalMinutes * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchStatus, refreshIntervalMinutes]);

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
    loading,
    error,
    lastUpdated,
    secondsUntilRefresh,
    totalSeconds: refreshIntervalMinutes * 60,
    refresh: fetchStatus,
    changedAirports,
    consecutiveErrors,
    isStale,
    notificationsEnabled,
    requestNotifications,
    disableNotifications,
  };
}
