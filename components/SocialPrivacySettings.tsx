"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface SocialSettings {
  profileVisible: "friends" | "nobody";
  showMap: boolean;
  showStats: boolean;
  showTrips: boolean;
  showPersona: boolean;
  showCurrentLocation: boolean;
  acceptRequests: boolean;
}

const DEFAULTS: SocialSettings = {
  profileVisible: "friends",
  showMap: true,
  showStats: true,
  showTrips: true,
  showPersona: false,
  showCurrentLocation: true,
  acceptRequests: true,
};

const LABELS = {
  es: {
    title: "Privacidad social",
    profileVisible: "¿Quién puede ver tu perfil?",
    profileVisibleFriends: "Solo amigos",
    profileVisibleNobody: "Nadie (privado)",
    showMap: "Mostrar mapa de países",
    showStats: "Mostrar estadísticas",
    showTrips: "Mostrar viajes",
    showPersona: "Mostrar personalidad viajera",
    showCurrentLocation: "Aparecer como 'viajando ahora'",
    acceptRequests: "Aceptar solicitudes de amistad",
  },
  en: {
    title: "Social privacy",
    profileVisible: "Who can see your profile?",
    profileVisibleFriends: "Friends only",
    profileVisibleNobody: "Nobody (private)",
    showMap: "Show country map",
    showStats: "Show statistics",
    showTrips: "Show trips",
    showPersona: "Show travel persona",
    showCurrentLocation: "Appear as 'traveling now'",
    acceptRequests: "Accept friend requests",
  },
} as const;

export function SocialPrivacySettings({ locale }: { locale: "es" | "en" }) {
  const L = LABELS[locale];
  const [settings, setSettings] = useState<SocialSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/social/settings")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.settings) setSettings(d.settings as SocialSettings); })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  async function update(key: keyof SocialSettings, value: boolean | string) {
    const prev = settings;
    setSettings(s => ({ ...s, [key]: value }));
    const res = await fetch("/api/social/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    }).catch(() => null);
    if (!res?.ok) setSettings(prev);
  }

  if (loading) return <div className="h-8 animate-pulse rounded-xl bg-white/[0.03]" />;

  const toggleClass = (on: boolean) =>
    `relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${on ? "bg-[#FFB800]" : "bg-white/10"}`;

  const Toggle = ({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) => (
    <button role="switch" aria-checked={on} onClick={() => onChange(!on)} className={toggleClass(on)}>
      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${on ? "translate-x-4" : "translate-x-0"}`} />
    </button>
  );

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-xs text-gray-300">{label}</span>
      {children}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4"
    >
      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">{L.title}</h3>

      {/* profileVisible selector */}
      <div className="mb-3">
        <p className="text-xs text-gray-300 mb-2">{L.profileVisible}</p>
        <div className="flex gap-2">
          {(["friends", "nobody"] as const).map(v => (
            <button
              key={v}
              onClick={() => update("profileVisible", v)}
              className={`flex-1 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${settings.profileVisible === v ? "border-[rgba(255,184,0,0.25)] bg-[#FFB800]/20 text-[#FFB800]" : "border-white/[0.07] bg-white/[0.02] text-gray-500 hover:text-gray-300"}`}
            >
              {v === "friends" ? L.profileVisibleFriends : L.profileVisibleNobody}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-white/[0.04]">
        <Row label={L.showMap}><Toggle on={settings.showMap} onChange={v => update("showMap", v)} /></Row>
        <Row label={L.showStats}><Toggle on={settings.showStats} onChange={v => update("showStats", v)} /></Row>
        <Row label={L.showTrips}><Toggle on={settings.showTrips} onChange={v => update("showTrips", v)} /></Row>
        <Row label={L.showPersona}><Toggle on={settings.showPersona} onChange={v => update("showPersona", v)} /></Row>
        <Row label={L.showCurrentLocation}><Toggle on={settings.showCurrentLocation} onChange={v => update("showCurrentLocation", v)} /></Row>
        <Row label={L.acceptRequests}><Toggle on={settings.acceptRequests} onChange={v => update("acceptRequests", v)} /></Row>
      </div>
    </motion.div>
  );
}
