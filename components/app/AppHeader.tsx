"use client";

import { Bell, Gem, HelpCircle, LogOut, Search, Settings } from "lucide-react";
import { Translations } from "@/lib/i18n";
import { Locale } from "@/lib/i18n";

export interface AppHeaderProps {
  mounted: boolean;
  activeTab: string;
  locale: Locale;
  t: Translations;
  userPlan: "free" | "explorer" | "pilot" | null;
  notificationsEnabled: boolean;
  onOpenSearch: () => void;
  onNavigateSettings: () => void;
  onToggleNotifications: () => void;
  onOpenUpgrade: () => void;
  onLogout: () => Promise<void>;
  onToggleHelp: () => void;
}

export function AppHeader({
  mounted,
  activeTab,
  locale,
  t,
  userPlan,
  notificationsEnabled,
  onOpenSearch,
  onNavigateSettings,
  onToggleNotifications,
  onOpenUpgrade,
  onLogout,
  onToggleHelp,
}: AppHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex md:hidden items-center">
          <img src="/tripcopliot-avatar.svg" alt="TripCopilot" className="h-10 w-auto" />
        </div>
        <p className="hidden md:block mt-1 text-sm text-gray-400 font-medium">{t.appSubtitle}</p>
      </div>

      <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
        {/* Global search button */}
        {mounted && (
          <button
            onClick={onOpenSearch}
            title={locale === "es" ? "Buscar (Ctrl+K)" : "Search (Ctrl+K)"}
            aria-label={locale === "es" ? "Buscar" : "Search"}
            className="flex items-center justify-center rounded-md border border-gray-700 bg-gray-900 p-1.5 text-gray-500 hover:text-gray-300 hover:border-gray-600 transition-colors"
          >
            <Search className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Settings gear — opens settings tab */}
        {mounted && (
          <button
            onClick={onNavigateSettings}
            title={locale === "en" ? "Settings" : "Ajustes"}
            aria-label={locale === "es" ? "Ajustes" : "Settings"}
            className={`flex items-center justify-center rounded-md border p-1.5 transition-colors ${
              activeTab === "settings"
                ? "border-[rgba(255,184,0,0.35)] bg-[rgba(255,184,0,0.08)] text-[#FFB800]"
                : "border-gray-700 bg-gray-900 text-gray-500 hover:text-gray-300 hover:border-gray-600"
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Notification bell */}
        {mounted && (
          <button
            onClick={onToggleNotifications}
            title={
              notificationsEnabled
                ? (locale === "en" ? "Notifications ON — tap to disable" : "Alertas activas — tap para desactivar")
                : (locale === "en" ? "Enable notifications" : "Activar alertas")
            }
            aria-label={
              notificationsEnabled
                ? (locale === "es" ? "Notificaciones push activas" : "Push notifications on")
                : (locale === "es" ? "Notificaciones push inactivas" : "Push notifications off")
            }
            aria-pressed={notificationsEnabled}
            className={`flex items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-xs transition-colors ${
              notificationsEnabled
                ? "border-blue-700/60 bg-blue-900/20 text-blue-400"
                : "border-gray-700 bg-gray-900 text-gray-500 hover:text-gray-300"
            }`}
          >
            <Bell className={`h-3.5 w-3.5 ${notificationsEnabled ? "text-blue-400" : ""}`} />
            {notificationsEnabled && <span className="text-xs font-semibold hidden sm:inline">ON</span>}
          </button>
        )}

        {/* Upgrade CTA — free plan only */}
        {userPlan === "free" && (
          <button
            onClick={onOpenUpgrade}
            className="flex items-center justify-center gap-1.5 rounded-md border border-amber-500/50 bg-amber-500/10 px-2.5 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 hover:border-amber-400/70 transition-colors"
            title={locale === "es" ? "Mejorar a Premium" : "Upgrade to Premium"}
          >
            <Gem className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Pro</span>
          </button>
        )}

        {/* Mobile logout */}
        <button
          onClick={onLogout}
          className="flex items-center justify-center rounded-md border border-gray-700 bg-gray-900 p-1.5 text-gray-500 hover:text-red-400 hover:border-red-800/60 transition-colors md:hidden"
          title={locale === "en" ? "Sign out" : "Cerrar sesión"}
          aria-label={locale === "es" ? "Cerrar sesión" : "Sign out"}
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>

        {/* Help — desktop only */}
        <button
          onClick={onToggleHelp}
          title={locale === "en" ? "Help & documentation" : "Ayuda y documentación"}
          className={`hidden md:flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
            activeTab === "help"
              ? "border-blue-700/60 bg-blue-900/20 text-blue-400"
              : "border-gray-700 bg-gray-900 text-gray-500 hover:text-gray-300"
          }`}
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>

        {/* Logout — desktop only */}
        <button
          onClick={onLogout}
          title={locale === "en" ? "Sign out" : "Cerrar sesión"}
          className="hidden md:flex items-center gap-1.5 rounded-md border border-gray-700 bg-gray-900 px-2.5 py-1.5 text-xs text-gray-500 hover:border-red-800/60 hover:text-red-400 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
