"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "tripcopilot-device-tz";

export function useDeviceTimezone() {
  const [deviceTz, setDeviceTz] = useState<string>(() => {
    if (typeof window === "undefined") return "UTC";
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  });
  const [tzChanged, setTzChanged] = useState(false);

  useEffect(() => {
    const current = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored !== current) {
      setTzChanged(true);
    }
    localStorage.setItem(STORAGE_KEY, current);
    setDeviceTz(current);

    function onVisibilityChange() {
      if (document.visibilityState !== "visible") return;
      const newTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const prev = localStorage.getItem(STORAGE_KEY);
      if (newTz !== prev) {
        localStorage.setItem(STORAGE_KEY, newTz);
        setDeviceTz(newTz);
        setTzChanged(true);
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  return {
    deviceTz,
    tzChanged,
    clearTzChanged: () => setTzChanged(false),
  };
}
