"use client";

import { useCallback, useEffect, useRef } from "react";
import { isNativePlatform, getPlatform } from "@/lib/capacitor";

interface UseNativePushOptions {
  userId: string | null;
  enabled: boolean;
}

export function useNativePush({ userId, enabled }: UseNativePushOptions) {
  const registeredRef = useRef(false);

  const registerNativePush = useCallback(async () => {
    if (!isNativePlatform() || !userId || registeredRef.current) return;

    try {
      const { PushNotifications } = await import("@capacitor/push-notifications");

      const permResult = await PushNotifications.requestPermissions();
      if (permResult.receive !== "granted") return;

      await PushNotifications.register();

      PushNotifications.addListener("registration", async (token) => {
        const platform = getPlatform() as "ios" | "android";
        const res = await fetch("/api/push/subscribe-native", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: token.value, platform }),
        });
        if (res.ok) {
          localStorage.setItem("native_push_token", token.value);
        }
        registeredRef.current = true;
      });

      PushNotifications.addListener("registrationError", (err) => {
        console.error("Native push registration failed:", err);
      });

      PushNotifications.addListener("pushNotificationReceived", (notification) => {
        console.log("Push received in foreground:", notification);
      });

      PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        const url = action.notification.data?.url as string | undefined;
        if (url && typeof window !== "undefined") {
          window.location.href = url;
        }
      });
    } catch (err) {
      console.error("Native push setup error:", err);
    }
  }, [userId]);

  const unregisterNativePush = useCallback(async () => {
    if (!isNativePlatform()) return;
    try {
      const { PushNotifications } = await import("@capacitor/push-notifications");
      const token = localStorage.getItem("native_push_token");
      if (token) {
        await fetch("/api/push/unsubscribe-native", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        localStorage.removeItem("native_push_token");
      }
      await PushNotifications.removeAllListeners();
      registeredRef.current = false;
    } catch {}
  }, []);

  useEffect(() => {
    if (enabled && userId) {
      registerNativePush();
    }
  }, [enabled, userId, registerNativePush]);

  return { registerNativePush, unregisterNativePush };
}
