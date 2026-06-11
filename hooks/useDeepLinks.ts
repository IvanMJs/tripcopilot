"use client";

import { useEffect } from "react";
import { isNativePlatform } from "@/lib/capacitor";

export function useDeepLinks() {
  useEffect(() => {
    if (!isNativePlatform()) return;

    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        const { App } = await import("@capacitor/app");

        const listener = await App.addListener("appUrlOpen", (event) => {
          const url = new URL(event.url);
          const path = url.pathname + url.search;

          if (path && typeof window !== "undefined") {
            window.location.href = path;
          }
        });

        cleanup = () => {
          listener.remove();
        };
      } catch {
        // silent — deep links are an enhancement, not critical
      }
    })();

    return () => {
      cleanup?.();
    };
  }, []);
}
