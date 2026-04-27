"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DISMISS_KEY = "pwa-install-dismissed";
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const ANDROID_SHOW_DELAY_MS = 30_000; // 30 seconds
const IOS_SHOW_DELAY_MS = 5_000;    // 5 seconds

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface UsePwaInstallResult {
  canInstall: boolean;
  install: () => Promise<void>;
  showIosPrompt: boolean;
  isDismissed: boolean;
  dismiss: () => void;
}

function isDismissedWithTTL(): boolean {
  if (typeof localStorage === "undefined") return false;
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const ts = parseInt(raw, 10);
  if (isNaN(ts)) return true;
  return Date.now() - ts < DISMISS_TTL_MS;
}

function detectIosBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
  if (!isIos) return false;
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true;
  return !standalone;
}

export function usePwaInstall(): UsePwaInstallResult {
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [showIosPrompt, setShowIosPrompt] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (isDismissedWithTTL()) {
      setIsDismissed(true);
      return;
    }

    // iOS: show instructions banner after short delay
    if (detectIosBrowser()) {
      timerRef.current = setTimeout(() => {
        if (!isDismissedWithTTL()) setShowIosPrompt(true);
      }, IOS_SHOW_DELAY_MS);
      return () => {
        if (timerRef.current !== null) clearTimeout(timerRef.current);
      };
    }

    // Android/Chrome: wait for beforeinstallprompt
    function handleBeforeInstallPrompt(e: Event): void {
      e.preventDefault();
      promptRef.current = e as BeforeInstallPromptEvent;
      timerRef.current = setTimeout(() => {
        if (!isDismissedWithTTL()) setCanInstall(true);
      }, ANDROID_SHOW_DELAY_MS);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  const install: () => Promise<void> = useCallback(async (): Promise<void> => {
    if (!promptRef.current) return;
    await promptRef.current.prompt();
    const { outcome } = await promptRef.current.userChoice;
    if (outcome === "accepted") setCanInstall(false);
  }, [promptRef]);

  const dismiss: () => void = useCallback((): void => {
    setCanInstall(false);
    setShowIosPrompt(false);
    setIsDismissed(true);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  }, []);

  return { canInstall, install, showIosPrompt, isDismissed, dismiss };
}