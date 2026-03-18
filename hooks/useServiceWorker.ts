"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * Registers the service worker (if supported) and exposes a helper to fire
 * notifications via the SW registration — this works on Android Chrome PWA
 * and desktop; iOS Safari requires "Add to Home Screen" for push.
 */
export function useServiceWorker() {
  const regRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // next-pwa already registers /sw.js — just grab the ready registration
    navigator.serviceWorker.ready
      .then((reg) => {
        regRef.current = reg;
      })
      .catch(() => {
        // SW not available — silent fail
      });
  }, []);

  /**
   * Show a notification via the SW registration (works in background / locked
   * screen on Android PWA). Falls back to new Notification() on desktop.
   */
  const showSwNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (regRef.current) {
        regRef.current.showNotification(title, {
          icon: "/icon.svg",
          badge: "/icon.svg",
          ...options,
        }).catch(() => {});
      } else if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        new Notification(title, { icon: "/icon.svg", ...options });
      }
    },
    [],
  );

  return { showSwNotification };
}
