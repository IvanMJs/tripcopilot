"use client";

import { useEffect, useState } from "react";
import {
  X,
  Bell,
  BellOff,
  Plane,
  DoorOpen,
  CalendarCheck,
  CloudRain,
  TrendingDown,
  MailCheck,
  Sunrise,
  BarChart2,
  UserPlus,
} from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/utils/supabase/client";
import {
  NotificationPreferences,
  DEFAULT_PREFS,
  getNotificationPrefs,
  saveNotificationPrefs,
} from "@/lib/notificationPreferences";
import { useTheme } from "@/contexts/ThemeContext";
import type { ThemePreference } from "@/contexts/ThemeContext";

interface Props {
  open: boolean;
  onClose: () => void;
  locale: "es" | "en";
}

interface PrefRow {
  key: keyof Omit<NotificationPreferences, "userId">;
  icon: React.ReactNode;
  labelEs: string;
  labelEn: string;
  descEs: string;
  descEn: string;
}

const PREF_ROWS: PrefRow[] = [
  {
    key: "flightDelays",
    icon: <Plane className="h-4 w-4" />,
    labelEs: "Demoras de vuelo",
    labelEn: "Flight delays",
    descEs: "Alertas de la FAA cuando hay demoras en tus aeropuertos",
    descEn: "FAA alerts when there are delays at your airports",
  },
  {
    key: "gateChanges",
    icon: <DoorOpen className="h-4 w-4" />,
    labelEs: "Cambios de puerta",
    labelEn: "Gate changes",
    descEs: "Notificaciones cuando cambia la puerta de embarque",
    descEn: "Notifications when your boarding gate changes",
  },
  {
    key: "checkInReminders",
    icon: <CalendarCheck className="h-4 w-4" />,
    labelEs: "Recordatorio de check-in",
    labelEn: "Check-in reminders",
    descEs: "Aviso 24 horas antes de cada vuelo",
    descEn: "Reminder 24 hours before each flight",
  },
  {
    key: "weatherAlerts",
    icon: <CloudRain className="h-4 w-4" />,
    labelEs: "Alertas de clima",
    labelEn: "Weather alerts",
    descEs: "Mal tiempo en el destino que puede afectar tu vuelo",
    descEn: "Bad weather at destination that may affect your flight",
  },
  {
    key: "priceDrops",
    icon: <TrendingDown className="h-4 w-4" />,
    labelEs: "Bajas de precio",
    labelEn: "Price drops",
    descEs: "Cuando se activan tus alertas de precio",
    descEn: "When your price alerts are triggered",
  },
  {
    key: "weeklyDigest",
    icon: <MailCheck className="h-4 w-4" />,
    labelEs: "Resumen semanal",
    labelEn: "Weekly digest",
    descEs: "Resumen de tus próximos viajes cada semana",
    descEn: "Summary of your upcoming trips every week",
  },
  {
    key: "morningBriefing",
    icon: <Sunrise className="h-4 w-4" />,
    labelEs: "Resumen matutino",
    labelEn: "Morning Briefing",
    descEs: "Resumen matutino de viajes próximos",
    descEn: "Morning digest for upcoming trips",
  },
  {
    key: "weeklyRecap",
    icon: <BarChart2 className="h-4 w-4" />,
    labelEs: "Recap semanal",
    labelEn: "Weekly Recap",
    descEs: "Resumen semanal de actividad",
    descEn: "Weekly activity summary",
  },
  {
    key: "reEngagement",
    icon: <Bell className="h-4 w-4" />,
    labelEs: "Recordatorios de viaje",
    labelEn: "Re-engagement",
    descEs: "Recordatorio de viajes próximos",
    descEn: "Upcoming trip reminders",
  },
  {
    key: "friendRequests",
    icon: <UserPlus className="h-4 w-4" />,
    labelEs: "Solicitudes de amistad",
    labelEn: "Friend requests",
    descEs: "Push cuando alguien te agrega en TripSocial",
    descEn: "Push when someone adds you on TripSocial",
  },
  {
    key: "newFollower",
    icon: <UserPlus className="h-4 w-4" />,
    labelEs: "Nuevo seguidor",
    labelEn: "New follower",
    descEs: "Push cuando alguien empieza a seguirte",
    descEn: "Push when someone starts following you",
  },
];

export function NotificationSettings({ open, onClose, locale }: Props) {
  const { theme, setTheme } = useTheme();
  const [visible, setVisible] = useState(false);
  const [prefs, setPrefs] = useState<Omit<NotificationPreferences, "userId">>(DEFAULT_PREFS);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    if (typeof window !== "undefined" && "Notification" in window) {
      setPushPermission(Notification.permission);
    } else {
      setPushPermission("unsupported");
    }

    async function loadPrefs() {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);
        const loaded = await getNotificationPrefs(supabase, user.id);
        const { userId: _uid, ...rest } = loaded;
        setPrefs(rest);
      } catch {
        // Keep defaults on error — no console.log left behind
      } finally {
        setLoading(false);
      }
    }

    loadPrefs();
  }, [open]);

  async function handleRequestPermission() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPushPermission(result);
  }

  function toggle(key: keyof Omit<NotificationPreferences, "userId">) {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSave() {
    if (!userId) {
      toast.error(locale === "es" ? "Sesión expirada. Volvé a iniciar sesión." : "Session expired. Please sign in again.");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      await saveNotificationPrefs(supabase, { userId, ...prefs });
      toast.success(locale === "es" ? "Preferencias guardadas" : "Preferences saved");
      onClose();
    } catch {
      toast.error(locale === "es" ? "Error al guardar. Intentá de nuevo." : "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/70 backdrop-blur-sm transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none">
        <div
          className={`w-full max-w-sm pointer-events-auto rounded-2xl border border-white/[0.08] shadow-2xl transition-all duration-200 ease-out ${visible ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
          style={{ background: "linear-gradient(160deg, rgba(18,18,32,0.99) 0%, rgba(10,10,20,1) 100%)" }}
        >
          <div className="px-5 pt-5 pb-6 space-y-5">

            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-violet-900/40 border border-violet-700/40 flex items-center justify-center shrink-0">
                  <Bell className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {locale === "es" ? "Notificaciones" : "Notifications"}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {locale === "es" ? "Elegí qué alertas recibir" : "Choose which alerts to receive"}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 tap-scale">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Theme selector */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {locale === "es" ? "Tema" : "Theme"}
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { value: "dark",   labelEs: "Oscuro",  labelEn: "Dark",   icon: "🌑" },
                    { value: "light",  labelEs: "Claro",   labelEn: "Light",  icon: "☀️" },
                    { value: "system", labelEs: "Sistema", labelEn: "System", icon: "💻" },
                  ] as { value: ThemePreference; labelEs: string; labelEn: string; icon: string }[]
                ).map(({ value, labelEs, labelEn, icon }) => (
                  <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-semibold transition-colors tap-scale ${
                      theme === value
                        ? "bg-violet-600/30 border border-violet-500/50 text-violet-300"
                        : "bg-white/[0.04] border border-white/[0.06] text-gray-400 hover:bg-white/[0.08]"
                    }`}
                  >
                    <span className="text-base leading-none">{icon}</span>
                    <span>{locale === "es" ? labelEs : labelEn}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Push permission status */}
            {pushPermission !== "granted" && pushPermission !== "unsupported" && (
              <div className="rounded-xl border border-yellow-700/40 bg-yellow-950/20 px-4 py-3 flex items-start gap-3">
                <BellOff className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-yellow-200 leading-snug">
                    {locale === "es"
                      ? "Las notificaciones push no están activadas en tu dispositivo."
                      : "Push notifications are not enabled on your device."}
                  </p>
                  <button
                    onClick={handleRequestPermission}
                    className="mt-2 text-xs font-bold text-yellow-300 hover:text-yellow-100 transition-colors"
                  >
                    {locale === "es" ? "Activar notificaciones" : "Enable notifications"} →
                  </button>
                </div>
              </div>
            )}

            {/* Toggles */}
            <div className="space-y-1">
              {loading ? (
                <div className="space-y-3 py-2">
                  {PREF_ROWS.map((row) => (
                    <div key={row.key} className="h-12 rounded-xl bg-white/[0.04] animate-pulse" />
                  ))}
                </div>
              ) : (
                PREF_ROWS.map((row) => (
                  <button
                    key={row.key}
                    onClick={() => toggle(row.key)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors text-left"
                  >
                    <span className={`shrink-0 ${prefs[row.key] ? "text-violet-400" : "text-gray-600"}`}>
                      {row.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold leading-snug ${prefs[row.key] ? "text-white" : "text-gray-500"}`}>
                        {locale === "es" ? row.labelEs : row.labelEn}
                      </p>
                      <p className="text-xs text-gray-500 leading-snug mt-0.5 truncate">
                        {locale === "es" ? row.descEs : row.descEn}
                      </p>
                    </div>
                    {/* Toggle pill */}
                    <div
                      className={`shrink-0 w-9 h-5 rounded-full transition-colors duration-200 relative ${prefs[row.key] ? "bg-violet-600" : "bg-gray-700"}`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${prefs[row.key] ? "translate-x-4" : "translate-x-0.5"}`}
                      />
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-bold text-sm py-3.5 transition-colors tap-scale"
            >
              {saving
                ? (locale === "es" ? "Guardando..." : "Saving...")
                : (locale === "es" ? "Guardar" : "Save")}
            </button>

          </div>
        </div>
      </div>
    </>
  );
}
