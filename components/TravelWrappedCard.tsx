"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plane,
  Globe,
  TrendingUp,
  MapPin,
  Clock,
  Zap,
  Share2,
  Download,
  Check,
  Lock,
} from "lucide-react";
import { generateWrappedImage, WrappedData } from "@/lib/wrappedImage";

// ── Labels ─────────────────────────────────────────────────────────────────

const LABELS = {
  es: {
    sectionTitle: "Travel Wrapped",
    year: (y: number) => `Tu año ${y} en vuelos`,
    totalFlights: "Vuelos",
    totalKm: "Kilómetros",
    countries: "Países",
    airports: "Aeropuertos",
    favoriteAirline: "Aerolínea favorita",
    timezones: "Zonas horarias",
    shareImage: "Compartir imagen",
    shareText: "Compartir stats",
    generating: "Generando...",
    copied: "¡Copiado!",
    unlockCta: "Desbloquear con Explorer →",
    tagline: (f: number, km: number, c: number) =>
      `${f} vuelo${f !== 1 ? "s" : ""} · ${km.toLocaleString()} km · ${c} país${c !== 1 ? "es" : ""} · TripCopilot`,
    blurredHint: "Upgrade para ver todos tus stats",
  },
  en: {
    sectionTitle: "Travel Wrapped",
    year: (y: number) => `Your ${y} in flights`,
    totalFlights: "Flights",
    totalKm: "Kilometres",
    countries: "Countries",
    airports: "Airports",
    favoriteAirline: "Favourite airline",
    timezones: "Time zones",
    shareImage: "Share as image",
    shareText: "Share stats",
    generating: "Generating...",
    copied: "Copied!",
    unlockCta: "Unlock with Explorer →",
    tagline: (f: number, km: number, c: number) =>
      `${f} flight${f !== 1 ? "s" : ""} · ${km.toLocaleString()} km · ${c} countr${c !== 1 ? "ies" : "y"} · TripCopilot`,
    blurredHint: "Upgrade to see all your stats",
  },
} as const;

// ── Stat card types ────────────────────────────────────────────────────────

interface StatDef {
  icon: React.ReactNode;
  value: string;
  label: string;
  color: string;
}

// ── Props ──────────────────────────────────────────────────────────────────

interface TravelWrappedCardProps {
  totalFlights: number;
  totalKm: number;
  countries: number;
  airports: number;
  airborneHours: number;
  favoriteAirline: string | null;
  favoriteRoute: string | null;
  timezonesCount: number;
  year: number;
  locale: "es" | "en";
  userPlan: "free" | "explorer" | "pilot" | null;
  onUpgrade: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────

export function TravelWrappedCard({
  totalFlights,
  totalKm,
  countries,
  airports,
  airborneHours,
  favoriteAirline,
  favoriteRoute,
  timezonesCount,
  year,
  locale,
  userPlan,
  onUpgrade,
}: TravelWrappedCardProps) {
  const L = LABELS[locale];
  const isPremium = userPlan === "explorer" || userPlan === "pilot";

  const [copied, setCopied] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  const wrappedData: WrappedData = {
    totalFlights,
    totalKm,
    countries,
    destinations: airports,
    airborneHours,
    favoriteRoute: favoriteRoute ?? undefined,
    favoriteAirline: favoriteAirline ?? undefined,
    timezonesCount,
    year,
  };

  const allStats: StatDef[] = [
    {
      icon: <Plane className="h-4 w-4 text-violet-400" />,
      value: totalFlights.toString(),
      label: L.totalFlights,
      color: "bg-violet-500/15",
    },
    {
      icon: <TrendingUp className="h-4 w-4 text-emerald-400" />,
      value:
        totalKm >= 1000
          ? `${Math.round(totalKm / 1000)}k`
          : totalKm.toLocaleString(),
      label: L.totalKm,
      color: "bg-emerald-500/15",
    },
    {
      icon: <Globe className="h-4 w-4 text-blue-400" />,
      value: countries.toString(),
      label: L.countries,
      color: "bg-blue-500/15",
    },
    {
      icon: <MapPin className="h-4 w-4 text-amber-400" />,
      value: airports.toString(),
      label: L.airports,
      color: "bg-amber-500/15",
    },
    {
      icon: <Clock className="h-4 w-4 text-pink-400" />,
      value: `${Math.round(airborneHours)}h`,
      label: locale === "es" ? "En vuelo" : "Airborne",
      color: "bg-pink-500/15",
    },
    {
      icon: <Zap className="h-4 w-4 text-cyan-400" />,
      value: timezonesCount.toString(),
      label: L.timezones,
      color: "bg-cyan-500/15",
    },
  ];

  // Free users see 1 visible stat + 3 blurred
  const visibleStats = isPremium ? allStats : allStats.slice(0, 1);
  const blurredStats = isPremium ? [] : allStats.slice(1, 4);

  async function handleShareImage() {
    setImageLoading(true);
    try {
      const blob = await generateWrappedImage(
        wrappedData,
        isPremium ? "full" : "teaser",
      );
      const file = new File([blob], "travel-wrapped.png", {
        type: "image/png",
      });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "TripCopilot Travel Wrapped",
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "travel-wrapped.png";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // cancelled or unavailable
    } finally {
      setImageLoading(false);
    }
  }

  async function handleShareText() {
    const text = L.tagline(totalFlights, totalKm, countries);
    try {
      if (navigator.share) {
        await navigator.share({ text, title: "TripCopilot" });
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // cancelled or unavailable
    }
  }

  return (
    <div className="px-4 pb-4">
      <div className="rounded-2xl overflow-hidden border border-violet-700/30 bg-gradient-to-br from-violet-900/50 via-blue-900/30 to-indigo-950/60 p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-300/60 mb-1">
              {L.sectionTitle}
            </p>
            <p className="text-lg font-black text-white leading-tight">
              {L.year(year)}
            </p>
            {favoriteAirline && isPremium && (
              <p className="text-xs text-violet-300/70 mt-1 font-medium">
                {L.favoriteAirline}: {favoriteAirline}
              </p>
            )}
          </div>
          <span className="text-4xl" aria-hidden>
            ✈️
          </span>
        </div>

        {/* Stats grid */}
        <div className="relative">
          <div className="grid grid-cols-3 gap-2 mb-3">
            {/* Visible stats */}
            {visibleStats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.07 }}
                className="rounded-xl bg-white/[0.06] border border-white/[0.08] p-2.5 flex flex-col items-center text-center gap-1"
              >
                <div className={`rounded-lg p-1 ${stat.color}`}>
                  {stat.icon}
                </div>
                <p className="text-lg font-black text-white leading-none tabular-nums">
                  {stat.value}
                </p>
                <p className="text-[10px] text-gray-500 font-medium leading-tight">
                  {stat.label}
                </p>
              </motion.div>
            ))}

            {/* Blurred stats for free users */}
            {blurredStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl bg-white/[0.06] border border-white/[0.08] p-2.5 flex flex-col items-center text-center gap-1 relative overflow-hidden"
              >
                <div className="blur-sm select-none pointer-events-none">
                  <div className={`rounded-lg p-1 ${stat.color}`}>
                    {stat.icon}
                  </div>
                  <p className="text-lg font-black text-white leading-none">
                    {stat.value}
                  </p>
                  <p className="text-[10px] text-gray-500 font-medium leading-tight">
                    {stat.label}
                  </p>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Lock className="h-4 w-4 text-violet-400/70" />
                </div>
              </div>
            ))}
          </div>

          {/* Upgrade CTA overlay for free users */}
          {!isPremium && (
            <button
              onClick={onUpgrade}
              className="w-full rounded-xl bg-gradient-to-r from-violet-600/80 to-blue-600/80 hover:from-violet-500/90 hover:to-blue-500/90 active:scale-95 border border-violet-500/30 text-white text-xs font-bold py-2.5 mb-3 transition-all"
            >
              {L.unlockCta}
            </button>
          )}
        </div>

        {/* Favorite route (premium only) */}
        {isPremium && favoriteRoute && (
          <div className="flex items-center gap-2 mb-3 px-1">
            <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <p className="text-sm font-mono font-black text-white/80">
              {favoriteRoute}
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleShareText}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/[0.15] active:scale-95 border border-white/[0.12] text-white text-sm font-bold py-2.5 transition-all"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-400" />
                {L.copied}
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" />
                {L.shareText}
              </>
            )}
          </button>

          <button
            onClick={handleShareImage}
            disabled={imageLoading}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-violet-600/30 hover:bg-violet-600/50 active:scale-95 border border-violet-500/30 text-violet-200 text-sm font-bold py-2.5 transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {imageLoading ? (
              <>
                <Download className="h-4 w-4 animate-bounce" />
                {L.generating}
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                {L.shareImage}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
