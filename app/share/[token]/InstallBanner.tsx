"use client";

import { usePwaInstall } from "@/hooks/usePwaInstall";

interface InstallBannerProps {
  locale: "es" | "en";
}

const LABELS = {
  es: {
    cta:     "Descargá TripCopilot",
    sub:     "Monitoreo de vuelos en tiempo real · Gratis",
    install: "Instalar",
    open:    "Abrir",
    dismiss: "Ahora no",
  },
  en: {
    cta:     "Get TripCopilot",
    sub:     "Real-time flight monitoring · Free",
    install: "Install",
    open:    "Open",
    dismiss: "Not now",
  },
} as const;

export function InstallBanner({ locale }: InstallBannerProps) {
  const L = LABELS[locale];
  const { canInstall, install, isDismissed, dismiss } = usePwaInstall();

  // Only render when the browser supports PWA install and it hasn't been dismissed
  if (!canInstall || isDismissed) return null;

  return (
    <div className="rounded-2xl border border-violet-700/30 bg-gradient-to-br from-violet-950/50 to-transparent px-4 py-4 flex items-center gap-3">
      {/* App icon placeholder */}
      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-violet-900/40">
        <span className="text-2xl" aria-hidden="true">✈</span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white leading-tight">{L.cta}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">{L.sub}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={dismiss}
          className="text-[11px] text-gray-500 hover:text-gray-400 transition-colors"
        >
          {L.dismiss}
        </button>
        <button
          onClick={install}
          className="rounded-lg bg-violet-600 hover:bg-violet-500 active:bg-violet-700 transition-colors px-3 py-1.5 text-xs font-bold text-white"
        >
          {L.install}
        </button>
      </div>
    </div>
  );
}
