"use client";

import { useEffect, useRef, useState } from "react";

const DISMISS_KEY = "pwa-install-dismissed";

interface PwaInstallBannerProps {
  hasTrip: boolean;
}

export function PwaInstallBanner({ hasTrip }: PwaInstallBannerProps) {
  const promptRef = useRef<Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> } | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Never show if already dismissed
    if (typeof localStorage !== "undefined" && localStorage.getItem(DISMISS_KEY)) return;

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      promptRef.current = e as typeof promptRef.current;
      if (hasTrip) {
        setVisible(true);
      }
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, [hasTrip]);

  // When hasTrip flips to true after the prompt was already stored, show the banner
  useEffect(() => {
    if (hasTrip && promptRef.current && !localStorage.getItem(DISMISS_KEY)) {
      setVisible(true);
    }
  }, [hasTrip]);

  function handleInstall() {
    if (!promptRef.current) return;
    promptRef.current.prompt();
    promptRef.current.userChoice.then((choice) => {
      if (choice.outcome === "accepted") {
        setVisible(false);
      }
    });
  }

  function handleDismiss() {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, "1");
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-50 px-4 pb-2 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-lg flex items-center justify-between gap-3 rounded-2xl border border-violet-700/40 bg-surface-elevated px-4 py-3 shadow-lg shadow-black/60">
        <span className="text-sm text-gray-300 font-medium leading-snug">
          📲 Instalá la app para acceso rápido
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleInstall}
            className="rounded-lg bg-violet-600 hover:bg-violet-500 active:scale-95 text-white text-xs font-semibold px-3 py-1.5 transition-all"
          >
            Instalar
          </button>
          <button
            onClick={handleDismiss}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-gray-500 hover:text-gray-300 hover:bg-white/[0.06] transition-colors"
          >
            <span className="text-sm leading-none">×</span>
          </button>
        </div>
      </div>
    </div>
  );
}
