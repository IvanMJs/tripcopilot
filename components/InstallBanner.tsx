"use client";

import { usePwaInstall } from "@/hooks/usePwaInstall";

interface InstallBannerProps {
  locale: "es" | "en";
}

const LABELS = {
  es: {
    title:    "Instalá TripCopilot",
    subtitle: "Accedé sin internet y recibí notificaciones push",
    install:  "Instalar",
    dismiss:  "Cerrar banner de instalación",
    iosTitle:    "Agregá TripCopilot a tu pantalla de inicio",
    iosSubtitle: "Necesitás instalarlo para recibir notificaciones de tus vuelos",
    iosSteps: [
      { icon: "⬆️", text: 'Tocá el ícono Compartir en Safari (cuadrado con flecha)' },
      { icon: "➕", text: 'Deslizá y tocá "Agregar a pantalla de inicio"' },
      { icon: "✅", text: 'Tocá "Agregar" en la esquina superior derecha' },
      { icon: "🔔", text: "Abrí la app desde el ícono nuevo y activá las alertas" },
    ],
  },
  en: {
    title:    "Install TripCopilot",
    subtitle: "Access offline and receive push notifications",
    install:  "Install",
    dismiss:  "Close install banner",
    iosTitle:    "Add TripCopilot to your Home Screen",
    iosSubtitle: "You need to install it to receive flight notifications",
    iosSteps: [
      { icon: "⬆️", text: "Tap the Share button in Safari (square with arrow icon)" },
      { icon: "➕", text: 'Scroll down and tap "Add to Home Screen"' },
      { icon: "✅", text: 'Tap "Add" in the top right corner' },
      { icon: "🔔", text: "Open the app from the new icon and enable alerts" },
    ],
  },
} as const;

export function InstallBanner({ locale }: InstallBannerProps) {
  const { canInstall, install, showIosPrompt, isDismissed, dismiss } = usePwaInstall();
  const L = LABELS[locale];

  if (isDismissed || (!canInstall && !showIosPrompt)) return null;

  return (
    <div
      className="fixed bottom-20 left-0 right-0 z-40 flex items-end justify-center px-4 pb-2 pointer-events-none"
      style={{ animation: "slideUp 0.3s ease-out forwards" }}
    >
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      <div className="pointer-events-auto w-full max-w-lg rounded-2xl border border-white/10 bg-gray-950/90 backdrop-blur-md shadow-xl shadow-black/60 px-4 py-3">

        {/* ── iOS: step-by-step instructions ── */}
        {showIosPrompt && (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src="/tripcopliot-avatar.svg"
                  alt="TripCopilot"
                  width={32}
                  height={32}
                  className="shrink-0 rounded-lg"
                />
                <div>
                  <p className="text-sm font-bold text-white leading-tight">{L.iosTitle}</p>
                  <p className="text-xs text-gray-400 leading-snug mt-0.5">{L.iosSubtitle}</p>
                </div>
              </div>
              <button
                onClick={dismiss}
                aria-label={L.dismiss}
                className="shrink-0 flex items-center justify-center rounded-lg p-1.5 text-gray-500 hover:text-gray-300 hover:bg-white/[0.06] transition-colors"
              >
                <span className="text-base leading-none" aria-hidden>×</span>
              </button>
            </div>

            <div className="space-y-2 pl-1">
              {L.iosSteps.map((s, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="h-5 w-5 rounded-full bg-white/[0.06] border border-white/[0.08] text-[10px] font-black text-gray-400 flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-base leading-none mt-0.5 shrink-0">{s.icon}</span>
                  <p className="text-xs text-gray-300 leading-snug">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Android/Chrome: native install prompt ── */}
        {canInstall && (
          <div className="flex items-center gap-3">
            <img
              src="/tripcopliot-avatar.svg"
              alt="TripCopilot"
              width={32}
              height={32}
              className="shrink-0 rounded-lg"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white leading-tight">{L.title}</p>
              <p className="text-xs text-gray-400 leading-snug mt-0.5">{L.subtitle}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={install}
                className="rounded-lg bg-[#FFB800] hover:bg-[#FFC933] active:scale-95 text-[#07070d] text-xs font-semibold px-3 py-1.5 transition-all"
              >
                {L.install}
              </button>
              <button
                onClick={dismiss}
                aria-label={L.dismiss}
                className="flex items-center justify-center rounded-lg p-1.5 text-gray-500 hover:text-gray-300 hover:bg-white/[0.06] transition-colors"
              >
                <span className="text-base leading-none" aria-hidden>×</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
