"use client";

import { useEffect, useState } from "react";
import {
  Settings,
  User,
  Bell,
  Globe,
  Palette,
  Thermometer,
  Clock,
  Trash2,
  LogOut,
  ExternalLink,
  ChevronRight,
  Shield,
  Info,
  Gem,
  Download,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getNotificationPrefs, DEFAULT_PREFS } from "@/lib/notificationPreferences";
import type { ThemePreference } from "@/contexts/ThemeContext";
import type { Locale } from "@/lib/i18n";

const APP_VERSION = "2.0.0";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SettingsViewProps {
  locale: "es" | "en";
  userPlan: "free" | "explorer" | "pilot" | null;
  onOpenNotifSettings: () => void;
  onSignOut: () => void;
  onUpgrade: () => void;
  onExportAllData?: () => void;
}

type TempUnit = "C" | "F";
type DistanceUnit = "km" | "mi";
type TimeFormat = "24h" | "12h";

// ── Labels ────────────────────────────────────────────────────────────────────

const LABELS = {
  es: {
    title: "Ajustes",
    // Profile
    sectionProfile: "Perfil",
    loading: "Cargando…",
    signOut: "Cerrar sesión",
    planFree: "Plan Gratuito",
    planExplorer: "Plan Explorer ⭐",
    planPilot: "Plan Pilot ✈️",
    upgradeCta: "Mejorar a Explorer →",
    upgradeCtaExplorer: "Mejorar a Pilot →",
    // Appearance
    sectionAppearance: "Apariencia",
    theme: "Tema",
    themeDark: "Oscuro",
    themeLight: "Claro",
    themeSystem: "Sistema",
    language: "Idioma",
    // Units
    sectionUnits: "Unidades y formato",
    temperature: "Temperatura",
    distance: "Distancia",
    timeFormat: "Formato de hora",
    // Notifications
    sectionNotifications: "Notificaciones",
    notifSummary: (enabled: number, total: number) => `${enabled} de ${total} alertas activadas`,
    notifManage: "Administrar alertas",
    pushGranted: "Notificaciones permitidas",
    pushDenied: "Notificaciones bloqueadas",
    pushDefault: "Notificaciones no configuradas",
    pushUnsupported: "No soportadas en este dispositivo",
    // Data
    sectionData: "Datos y privacidad",
    clearCache: "Limpiar caché",
    clearCacheDesc: "Borra datos locales almacenados offline",
    clearCacheDone: "Caché limpiado",
    exportData: "Exportar mis datos",
    exportComingSoon: "Próximamente",
    appVersion: "Versión de la app",
    // About
    sectionAbout: "Acerca de",
    privacy: "Política de privacidad",
    terms: "Términos de servicio",
    madeWith: "Hecho con ✈️ en Argentina",
  },
  en: {
    title: "Settings",
    // Profile
    sectionProfile: "Profile",
    loading: "Loading…",
    signOut: "Sign out",
    planFree: "Free Plan",
    planExplorer: "Explorer Plan ⭐",
    planPilot: "Pilot Plan ✈️",
    upgradeCta: "Upgrade to Explorer →",
    upgradeCtaExplorer: "Upgrade to Pilot →",
    // Appearance
    sectionAppearance: "Appearance",
    theme: "Theme",
    themeDark: "Dark",
    themeLight: "Light",
    themeSystem: "System",
    language: "Language",
    // Units
    sectionUnits: "Units & format",
    temperature: "Temperature",
    distance: "Distance",
    timeFormat: "Time format",
    // Notifications
    sectionNotifications: "Notifications",
    notifSummary: (enabled: number, total: number) => `${enabled} of ${total} alerts enabled`,
    notifManage: "Manage alerts",
    pushGranted: "Notifications allowed",
    pushDenied: "Notifications blocked",
    pushDefault: "Notifications not configured",
    pushUnsupported: "Not supported on this device",
    // Data
    sectionData: "Data & privacy",
    clearCache: "Clear cached data",
    clearCacheDesc: "Removes locally stored offline data",
    clearCacheDone: "Cache cleared",
    exportData: "Export my data",
    exportComingSoon: "Coming soon",
    appVersion: "App version",
    // About
    sectionAbout: "About",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    madeWith: "Made with ✈️ in Argentina",
  },
} as const;

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 px-1 mb-2 mt-6 first:mt-0">
      {label}
    </p>
  );
}

function SettingsCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden divide-y divide-white/[0.06]">
      {children}
    </div>
  );
}

function SettingsRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 min-h-[52px]">
      {children}
    </div>
  );
}

function SegmentControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-lg border border-white/[0.08] overflow-hidden text-xs font-semibold shrink-0">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 transition-colors ${
            value === opt.value
              ? "bg-violet-600 text-white"
              : "bg-white/[0.04] text-gray-400 hover:text-gray-200"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function SettingsView({
  locale,
  userPlan,
  onOpenNotifSettings,
  onSignOut,
  onUpgrade,
  onExportAllData,
}: SettingsViewProps) {
  const L = LABELS[locale];
  const { theme, setTheme } = useTheme();
  const { setLocale } = useLanguage();

  // Auth state
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Notification prefs summary
  const [enabledNotifCount, setEnabledNotifCount] = useState<number | null>(null);
  const totalNotifCount = 6; // matches PREF_ROWS in NotificationSettings

  // Push permission
  const [pushPermission, setPushPermission] = useState<NotificationPermission | "unsupported">("default");

  // Unit preferences
  const [tempUnit, setTempUnit] = useState<TempUnit>("C");
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>("km");
  const [timeFormat, setTimeFormat] = useState<TimeFormat>("24h");

  // Clear cache feedback
  const [cacheCleared, setCacheCleared] = useState(false);

  // Load auth user
  useEffect(() => {
    async function load() {
      setAuthLoading(true);
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserEmail(user.email ?? null);
          const meta = user.user_metadata as { full_name?: string; name?: string; avatar_url?: string } | undefined;
          setUserDisplayName(meta?.full_name ?? meta?.name ?? null);
          setUserAvatar(meta?.avatar_url ?? null);

          // Load notification pref summary
          const prefs = await getNotificationPrefs(supabase, user.id);
          const { userId: _uid, ...rest } = prefs;
          const count = Object.values(rest).filter(Boolean).length;
          setEnabledNotifCount(count);
        }
      } catch {
        // keep defaults on error
      } finally {
        setAuthLoading(false);
      }
    }
    load();
  }, []);

  // Load push permission
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) {
      setPushPermission("unsupported");
    } else {
      setPushPermission(Notification.permission);
    }
  }, []);

  // Load unit prefs from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedTemp = localStorage.getItem("tripcopilot-temp-unit");
    const storedDist = localStorage.getItem("tripcopilot-distance-unit");
    const storedTime = localStorage.getItem("tripcopilot-time-format");
    if (storedTemp === "C" || storedTemp === "F") setTempUnit(storedTemp);
    if (storedDist === "km" || storedDist === "mi") setDistanceUnit(storedDist);
    if (storedTime === "24h" || storedTime === "12h") setTimeFormat(storedTime);
  }, []);

  function handleTempUnit(v: TempUnit) {
    setTempUnit(v);
    localStorage.setItem("tripcopilot-temp-unit", v);
  }

  function handleDistanceUnit(v: DistanceUnit) {
    setDistanceUnit(v);
    localStorage.setItem("tripcopilot-distance-unit", v);
  }

  function handleTimeFormat(v: TimeFormat) {
    setTimeFormat(v);
    localStorage.setItem("tripcopilot-time-format", v);
  }

  function handleClearCache() {
    if (typeof window === "undefined") return;
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("tripcopilot-offline-") || key.startsWith("tc_offline_"))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));

    // Also clear service worker caches if available
    if ("caches" in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }

    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 2500);
  }

  // Push permission label
  function pushPermissionLabel(): string {
    if (pushPermission === "unsupported") return L.pushUnsupported;
    if (pushPermission === "granted") return L.pushGranted;
    if (pushPermission === "denied") return L.pushDenied;
    return L.pushDefault;
  }

  function pushPermissionColor(): string {
    if (pushPermission === "granted") return "text-emerald-400";
    if (pushPermission === "denied") return "text-red-400";
    return "text-yellow-400";
  }

  // Initials fallback for avatar
  const initials = userDisplayName
    ? userDisplayName.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
    : userEmail
    ? userEmail[0].toUpperCase()
    : "?";

  const themeOptions: { value: ThemePreference; labelEs: string; labelEn: string; icon: string }[] = [
    { value: "dark",   labelEs: "Oscuro",  labelEn: "Dark",   icon: "🌑" },
    { value: "light",  labelEs: "Claro",   labelEn: "Light",  icon: "☀️" },
    { value: "system", labelEs: "Sistema", labelEn: "System", icon: "💻" },
  ];

  return (
    <div className="min-h-screen pb-24 bg-[#07070f]">
      <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">

        {/* Page title */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-9 w-9 rounded-2xl bg-violet-900/40 border border-violet-700/40 flex items-center justify-center shrink-0">
            <Settings className="h-5 w-5 text-violet-400" />
          </div>
          <h1 className="text-xl font-black text-white">{L.title}</h1>
        </div>

        {/* ── Section: Profile ─────────────────────────────────────────────── */}
        <SectionHeader label={L.sectionProfile} />
        <SettingsCard>
          {/* User identity row */}
          <SettingsRow>
            {/* Avatar */}
            <div className="shrink-0">
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={userDisplayName ?? userEmail ?? ""}
                  className="h-10 w-10 rounded-full object-cover border border-white/[0.12]"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-violet-900/60 border border-violet-700/40 flex items-center justify-center">
                  <span className="text-sm font-bold text-violet-300">{initials}</span>
                </div>
              )}
            </div>
            {/* Name + email */}
            <div className="flex-1 min-w-0">
              {authLoading ? (
                <div className="space-y-1.5">
                  <div className="h-3.5 w-32 rounded bg-white/[0.06] animate-pulse" />
                  <div className="h-3 w-44 rounded bg-white/[0.04] animate-pulse" />
                </div>
              ) : (
                <>
                  {userDisplayName && (
                    <p className="text-sm font-semibold text-white truncate">{userDisplayName}</p>
                  )}
                  <p className="text-xs text-gray-400 truncate">{userEmail ?? L.loading}</p>
                </>
              )}
            </div>
            {/* Plan badge */}
            {!authLoading && (
              <span
                className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${
                  userPlan === "pilot"
                    ? "bg-amber-950/50 border-amber-600/40 text-amber-400"
                    : userPlan === "explorer"
                    ? "bg-sky-950/50 border-sky-600/40 text-sky-400"
                    : "bg-gray-900 border-gray-700 text-gray-500"
                }`}
              >
                {userPlan === "pilot"
                  ? L.planPilot
                  : userPlan === "explorer"
                  ? L.planExplorer
                  : L.planFree}
              </span>
            )}
          </SettingsRow>

          {/* Upgrade CTA for non-pilot users */}
          {(userPlan === "free" || userPlan === "explorer") && (
            <SettingsRow>
              <div className="h-8 w-8 rounded-xl bg-amber-950/40 border border-amber-700/30 flex items-center justify-center shrink-0">
                <Gem className="h-4 w-4 text-amber-400" />
              </div>
              <span className="flex-1 text-sm text-gray-300">
                {userPlan === "explorer" ? L.upgradeCtaExplorer : L.upgradeCta}
              </span>
              <button
                onClick={onUpgrade}
                className="shrink-0 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 active:scale-95 text-white text-xs font-bold px-3 py-1.5 transition-all"
              >
                {locale === "es" ? "Mejorar" : "Upgrade"}
              </button>
            </SettingsRow>
          )}

          {/* Sign out */}
          <SettingsRow>
            <div className="h-8 w-8 rounded-xl bg-red-950/30 border border-red-800/30 flex items-center justify-center shrink-0">
              <LogOut className="h-4 w-4 text-red-400" />
            </div>
            <button
              onClick={onSignOut}
              className="flex-1 text-left text-sm font-semibold text-red-400 hover:text-red-300 transition-colors"
            >
              {L.signOut}
            </button>
          </SettingsRow>
        </SettingsCard>

        {/* ── Section: Appearance ──────────────────────────────────────────── */}
        <SectionHeader label={L.sectionAppearance} />
        <SettingsCard>
          {/* Theme */}
          <SettingsRow>
            <div className="h-8 w-8 rounded-xl bg-violet-950/40 border border-violet-700/30 flex items-center justify-center shrink-0">
              <Palette className="h-4 w-4 text-violet-400" />
            </div>
            <span className="flex-1 text-sm text-gray-300">{L.theme}</span>
            <div className="flex rounded-lg border border-white/[0.08] overflow-hidden text-xs font-semibold shrink-0">
              {themeOptions.map(({ value, labelEs, labelEn, icon }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 transition-colors ${
                    theme === value
                      ? "bg-violet-600 text-white"
                      : "bg-white/[0.04] text-gray-400 hover:text-gray-200"
                  }`}
                  title={locale === "es" ? labelEs : labelEn}
                >
                  <span className="text-xs leading-none">{icon}</span>
                  <span className="hidden sm:inline">{locale === "es" ? labelEs : labelEn}</span>
                </button>
              ))}
            </div>
          </SettingsRow>

          {/* Language */}
          <SettingsRow>
            <div className="h-8 w-8 rounded-xl bg-blue-950/40 border border-blue-700/30 flex items-center justify-center shrink-0">
              <Globe className="h-4 w-4 text-blue-400" />
            </div>
            <span className="flex-1 text-sm text-gray-300">{L.language}</span>
            <SegmentControl<Locale>
              value={locale}
              options={[
                { value: "es", label: "ES" },
                { value: "en", label: "EN" },
              ]}
              onChange={(l) => setLocale(l)}
            />
          </SettingsRow>
        </SettingsCard>

        {/* ── Section: Units & Format ──────────────────────────────────────── */}
        <SectionHeader label={L.sectionUnits} />
        <SettingsCard>
          {/* Temperature */}
          <SettingsRow>
            <div className="h-8 w-8 rounded-xl bg-orange-950/40 border border-orange-700/30 flex items-center justify-center shrink-0">
              <Thermometer className="h-4 w-4 text-orange-400" />
            </div>
            <span className="flex-1 text-sm text-gray-300">{L.temperature}</span>
            <SegmentControl<TempUnit>
              value={tempUnit}
              options={[
                { value: "C", label: "°C" },
                { value: "F", label: "°F" },
              ]}
              onChange={handleTempUnit}
            />
          </SettingsRow>

          {/* Distance */}
          <SettingsRow>
            <div className="h-8 w-8 rounded-xl bg-emerald-950/40 border border-emerald-700/30 flex items-center justify-center shrink-0">
              <Globe className="h-4 w-4 text-emerald-400" />
            </div>
            <span className="flex-1 text-sm text-gray-300">{L.distance}</span>
            <SegmentControl<DistanceUnit>
              value={distanceUnit}
              options={[
                { value: "km", label: "km" },
                { value: "mi", label: "mi" },
              ]}
              onChange={handleDistanceUnit}
            />
          </SettingsRow>

          {/* Time format */}
          <SettingsRow>
            <div className="h-8 w-8 rounded-xl bg-cyan-950/40 border border-cyan-700/30 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4 text-cyan-400" />
            </div>
            <span className="flex-1 text-sm text-gray-300">{L.timeFormat}</span>
            <SegmentControl<TimeFormat>
              value={timeFormat}
              options={[
                { value: "24h", label: "24h" },
                { value: "12h", label: "12h" },
              ]}
              onChange={handleTimeFormat}
            />
          </SettingsRow>
        </SettingsCard>

        {/* ── Section: Notifications ───────────────────────────────────────── */}
        <SectionHeader label={L.sectionNotifications} />
        <SettingsCard>
          {/* Summary + manage */}
          <SettingsRow>
            <div className="h-8 w-8 rounded-xl bg-violet-950/40 border border-violet-700/30 flex items-center justify-center shrink-0">
              <Bell className="h-4 w-4 text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-300">{L.notifManage}</p>
              {enabledNotifCount !== null && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {L.notifSummary(enabledNotifCount, totalNotifCount)}
                </p>
              )}
            </div>
            <button
              onClick={onOpenNotifSettings}
              className="shrink-0 flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 text-xs font-semibold text-gray-300 transition-colors"
            >
              {locale === "es" ? "Configurar" : "Configure"}
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </SettingsRow>

          {/* Push permission status */}
          <SettingsRow>
            <div className="h-8 w-8 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
              <Shield className="h-4 w-4 text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-400">
                {locale === "es" ? "Permiso del sistema" : "System permission"}
              </p>
              <p className={`text-xs mt-0.5 font-medium ${pushPermissionColor()}`}>
                {pushPermissionLabel()}
              </p>
            </div>
          </SettingsRow>
        </SettingsCard>

        {/* ── Section: Data & Privacy ──────────────────────────────────────── */}
        <SectionHeader label={L.sectionData} />
        <SettingsCard>
          {/* Clear cache */}
          <SettingsRow>
            <div className="h-8 w-8 rounded-xl bg-red-950/30 border border-red-800/30 flex items-center justify-center shrink-0">
              <Trash2 className="h-4 w-4 text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-300">{L.clearCache}</p>
              <p className="text-xs text-gray-500 mt-0.5">{L.clearCacheDesc}</p>
            </div>
            <button
              onClick={handleClearCache}
              className={`shrink-0 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                cacheCleared
                  ? "border-emerald-700/50 bg-emerald-950/30 text-emerald-400"
                  : "border-white/[0.08] bg-white/[0.04] hover:bg-red-950/30 hover:border-red-800/40 hover:text-red-400 text-gray-300"
              }`}
            >
              {cacheCleared ? (locale === "es" ? "✓ Limpiado" : "✓ Cleared") : (locale === "es" ? "Limpiar" : "Clear")}
            </button>
          </SettingsRow>

          {/* Export data */}
          <SettingsRow>
            <div className="h-8 w-8 rounded-xl bg-blue-950/30 border border-blue-800/30 flex items-center justify-center shrink-0">
              <Download className="h-4 w-4 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-300">{L.exportData}</p>
            </div>
            {onExportAllData ? (
              <button
                onClick={onExportAllData}
                className="shrink-0 rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-blue-950/30 hover:border-blue-800/40 hover:text-blue-400 px-3 py-1.5 text-xs font-semibold text-gray-300 transition-colors"
              >
                {locale === "es" ? "Exportar" : "Export"}
              </button>
            ) : (
              <span className="shrink-0 rounded-full border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                {L.exportComingSoon}
              </span>
            )}
          </SettingsRow>

          {/* App version */}
          <SettingsRow>
            <div className="h-8 w-8 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center shrink-0">
              <Info className="h-4 w-4 text-gray-600" />
            </div>
            <span className="flex-1 text-sm text-gray-500">{L.appVersion}</span>
            <span className="shrink-0 text-xs font-mono text-gray-600">v{APP_VERSION}</span>
          </SettingsRow>
        </SettingsCard>

        {/* ── Section: About ───────────────────────────────────────────────── */}
        <SectionHeader label={L.sectionAbout} />
        <SettingsCard>
          {/* Privacy policy */}
          <SettingsRow>
            <div className="h-8 w-8 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center shrink-0">
              <Shield className="h-4 w-4 text-gray-500" />
            </div>
            <a
              href="#"
              className="flex-1 flex items-center justify-between text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              <span>{L.privacy}</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            </a>
          </SettingsRow>

          {/* Terms */}
          <SettingsRow>
            <div className="h-8 w-8 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center shrink-0">
              <Info className="h-4 w-4 text-gray-500" />
            </div>
            <a
              href="#"
              className="flex-1 flex items-center justify-between text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              <span>{L.terms}</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            </a>
          </SettingsRow>

          {/* TripCopilot info */}
          <SettingsRow>
            <div className="h-8 w-8 rounded-xl bg-violet-950/30 border border-violet-800/30 flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-violet-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-300">TripCopilot v{APP_VERSION}</p>
              <p className="text-xs text-gray-600 mt-0.5">{L.madeWith}</p>
            </div>
          </SettingsRow>
        </SettingsCard>

        {/* Bottom spacer */}
        <div className="h-8" />
      </div>
    </div>
  );
}
