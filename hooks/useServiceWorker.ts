"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * Registers the service worker and exposes helpers for:
 * - showSwNotification: fire a notification via SW (works on Android PWA lock screen)
 * - subscribeToPush: subscribe to VAPID web push and save to server
 */
export function useServiceWorker() {
  const regRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // Reload to pick up new assets only when an UPDATED service worker takes
    // over a page that was already controlled. On the first visit there is no
    // controller yet; because the SW uses skipWaiting + clientsClaim it claims
    // the page immediately and fires `controllerchange` right away. Reloading on
    // that initial claim restarts the page before it finishes loading, which on
    // mobile (iOS Safari especially) turns into an infinite reload/flicker loop.
    const hadController = Boolean(navigator.serviceWorker.controller);
    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloading || !hadController) return;
      reloading = true;
      window.location.reload();
    });

    navigator.serviceWorker.ready
      .then((reg) => {
        regRef.current = reg;
        // Auto-subscribe if permission already granted (handles reinstalls)
        if ("Notification" in window && Notification.permission === "granted") {
          const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
          if (publicKey) {
            reg.pushManager
              .getSubscription()
              .then((existing) =>
                existing ??
                reg.pushManager.subscribe({
                  userVisibleOnly: true,
                  applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
                }),
              )
              .then((subscription) =>
                fetch("/api/push/subscribe", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(subscription.toJSON()),
                }),
              )
              .catch(() => {});
          }
        }
      })
      .catch(() => {});
  }, []);

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

  /**
   * Subscribe this device to VAPID push and persist the subscription server-side.
   * Call after the user grants notification permission.
   */
  const subscribeToPush = useCallback(async (): Promise<boolean> => {
    // On native platforms, skip web push — useNativePush handles it
    if (typeof window !== 'undefined') {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.isNativePlatform()) return false;
      } catch {}
    }

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey || !regRef.current) return false;

    try {
      // Check if already subscribed
      const existing = await regRef.current.pushManager.getSubscription();
      const subscription =
        existing ??
        (await regRef.current.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
        }));

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      return true;
    } catch {
      return false;
    }
  }, []);

  /**
   * Unsubscribe this device from push notifications and remove from server.
   * Call when the user explicitly disables notifications in-app so the cron
   * stops sending push alerts to this device.
   */
  const unsubscribeFromPush = useCallback(async (): Promise<void> => {
    try {
      if (!regRef.current) return;
      const sub = await regRef.current.pushManager.getSubscription();
      if (!sub) return;
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      });
    } catch {}
  }, []);

  return { showSwNotification, subscribeToPush, unsubscribeFromPush };
}

// Helper: convert VAPID public key from base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from(Array.from(rawData).map((c) => c.charCodeAt(0)));
}
