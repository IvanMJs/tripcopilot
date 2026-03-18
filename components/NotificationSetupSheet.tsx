"use client";

import { useEffect, useState } from "react";
import { X, Bell, BellOff } from "lucide-react";

interface NotificationSetupSheetProps {
  open: boolean;
  onClose: () => void;
  locale: "es" | "en";
}

function isIOS() {
  if (typeof window === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true)
  );
}

export function NotificationSetupSheet({ open, onClose, locale }: NotificationSetupSheetProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      // Tiny delay so the animation plays
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [open]);

  if (!open) return null;

  const ios    = isIOS();
  const standalone = isStandalone();

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 inset-x-0 z-50 rounded-t-3xl border-t border-white/[0.08] transition-transform duration-300 ease-out
          ${visible ? "translate-y-0" : "translate-y-full"}`}
        style={{
          background: "linear-gradient(180deg, rgba(18,18,32,0.99) 0%, rgba(10,10,20,1) 100%)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        <div className="px-5 pb-6 space-y-5">

          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-blue-900/40 border border-blue-700/40 flex items-center justify-center shrink-0">
                <Bell className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">
                  {locale === "es" ? "Activar alertas" : "Enable alerts"}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {locale === "es"
                    ? "Recibí notificaciones de cambios en tus vuelos"
                    : "Get notified of changes to your flights"}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 tap-scale">
              <X className="h-4 w-4" />
            </button>
          </div>

          {ios && !standalone ? (
            /* iOS browser — needs Add to Home Screen */
            <div className="space-y-4">
              <div className="rounded-2xl border border-yellow-700/40 bg-yellow-950/20 px-4 py-3">
                <p className="text-xs font-bold text-yellow-300 mb-1">
                  {locale === "es" ? "Requisito de Apple" : "Apple requirement"}
                </p>
                <p className="text-xs text-yellow-200/70 leading-relaxed">
                  {locale === "es"
                    ? "En iPhone, las notificaciones web solo funcionan cuando la app está agregada a la pantalla de inicio."
                    : "On iPhone, web notifications only work when the app is added to your Home Screen."}
                </p>
              </div>

              <p className="text-sm font-bold text-white">
                {locale === "es" ? "Cómo hacerlo:" : "How to do it:"}
              </p>

              <div className="space-y-3">
                {[
                  {
                    step: "1",
                    icon: "⬆️",
                    es: "Tocá el botón Compartir en Safari (el ícono de cuadrado con flecha arriba)",
                    en: "Tap the Share button in Safari (the square with arrow icon at the bottom)",
                  },
                  {
                    step: "2",
                    icon: "➕",
                    es: "Deslizá hacia abajo y tocá \"Agregar a pantalla de inicio\"",
                    en: "Scroll down and tap \"Add to Home Screen\"",
                  },
                  {
                    step: "3",
                    icon: "✅",
                    es: "Tocá \"Agregar\" en la esquina superior derecha",
                    en: "Tap \"Add\" in the top right corner",
                  },
                  {
                    step: "4",
                    icon: "🔔",
                    es: "Abrí la app desde el ícono nuevo y activá las alertas",
                    en: "Open the app from the new icon and enable alerts",
                  },
                ].map((s) => (
                  <div key={s.step} className="flex items-start gap-3">
                    <span className="h-6 w-6 rounded-full bg-white/[0.06] border border-white/[0.08] text-[11px] font-black text-gray-400 flex items-center justify-center shrink-0 mt-0.5">
                      {s.step}
                    </span>
                    <div className="flex items-start gap-2">
                      <span className="text-base leading-none mt-0.5">{s.icon}</span>
                      <p className="text-sm text-gray-300 leading-snug">
                        {locale === "es" ? s.es : s.en}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : ios && standalone ? (
            /* iOS standalone — should work, just request permission */
            <div className="space-y-4">
              <p className="text-sm text-gray-300 leading-relaxed">
                {locale === "es"
                  ? "La app está instalada en tu pantalla de inicio. Tocá el botón para activar las alertas."
                  : "The app is installed on your Home Screen. Tap the button to enable alerts."}
              </p>
              <RequestButton locale={locale} onClose={onClose} />
            </div>
          ) : (
            /* Android / desktop */
            <div className="space-y-4">
              <p className="text-sm text-gray-300 leading-relaxed">
                {locale === "es"
                  ? "Activá las notificaciones para recibir alertas de demoras, cambios de estado y recordatorios de check-in."
                  : "Enable notifications to receive alerts for delays, status changes, and check-in reminders."}
              </p>
              <RequestButton locale={locale} onClose={onClose} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function RequestButton({ locale, onClose }: { locale: "es" | "en"; onClose: () => void }) {
  const [state, setState] = useState<"idle" | "loading" | "denied">("idle");

  async function request() {
    setState("loading");
    const result = await Notification.requestPermission();
    if (result === "granted") {
      onClose();
    } else {
      setState("denied");
    }
  }

  if (state === "denied") {
    return (
      <div className="rounded-xl border border-red-700/40 bg-red-950/20 px-4 py-3 flex items-center gap-3">
        <BellOff className="h-4 w-4 text-red-400 shrink-0" />
        <p className="text-xs text-red-300">
          {locale === "es"
            ? "Permiso denegado. Habilitalo en Configuración → Safari → Notificaciones."
            : "Permission denied. Enable it in Settings → Safari → Notifications."}
        </p>
      </div>
    );
  }

  return (
    <button
      onClick={request}
      disabled={state === "loading"}
      className="w-full flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold text-sm py-3.5 transition-colors tap-scale"
    >
      <Bell className="h-4 w-4" />
      {state === "loading"
        ? (locale === "es" ? "Solicitando..." : "Requesting...")
        : (locale === "es" ? "Activar notificaciones" : "Enable notifications")}
    </button>
  );
}
