"use client";

import { useState } from "react";
import { Share2, Download, Loader2 } from "lucide-react";
import { generateCountdownImage } from "@/lib/countdownImage";

// ── i18n ──────────────────────────────────────────────────────────────────────

const LABELS = {
  es: {
    daysToGo: (n: number) => (n === 1 ? "día para el viaje" : "días para el viaje"),
    today: "¡Hoy es el día!",
    tomorrow: "¡Mañana es el día!",
    departure: "Salida",
    share: "Compartir",
    download: "Descargar",
    generating: "Generando...",
  },
  en: {
    daysToGo: (n: number) => (n === 1 ? "day to go" : "days to go"),
    today: "Today is the day!",
    tomorrow: "Tomorrow is the day!",
    departure: "Departure",
    share: "Share",
    download: "Download",
    generating: "Generating...",
  },
} as const;

// ── Props ─────────────────────────────────────────────────────────────────────

interface TripCountdownWidgetProps {
  destination: string;
  daysLeft: number;
  departureDate: string;
  route: string;
  locale: "es" | "en";
}

// ── TripCountdownWidget ───────────────────────────────────────────────────────

export function TripCountdownWidget({
  destination,
  daysLeft,
  departureDate,
  route,
  locale,
}: TripCountdownWidgetProps) {
  const L = LABELS[locale];
  const [sharing, setSharing] = useState(false);

  async function handleShare() {
    setSharing(true);
    try {
      const blob = await generateCountdownImage(
        destination,
        daysLeft,
        departureDate,
        route,
      );
      const file = new File([blob], "countdown.png", { type: "image/png" });

      if (
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          title: `TripCopilot — ${destination}`,
        });
      } else {
        // Fallback: trigger download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `countdown-${destination.toLowerCase().replace(/\s+/g, "-")}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // User cancelled or API unavailable — silently ignore
    } finally {
      setSharing(false);
    }
  }

  function countdownLabel(): string {
    if (daysLeft === 0) return L.today;
    if (daysLeft === 1) return L.tomorrow;
    return `${daysLeft} ${L.daysToGo(daysLeft)}`;
  }

  return (
    <div className="rounded-2xl border border-[rgba(255,184,0,0.25)] bg-gradient-to-br from-[#FFB800]/50 to-[#07070f] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#FFB800]/70 mb-0.5">
            {L.departure} · {route}
          </p>
          <p className="text-2xl font-black text-white leading-tight tabular-nums">
            {countdownLabel()}
          </p>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{departureDate}</p>
        </div>

        <button
          onClick={handleShare}
          disabled={sharing}
          aria-label={sharing ? L.generating : L.share}
          className="shrink-0 flex items-center gap-1.5 rounded-xl border border-[rgba(255,184,0,0.25)] bg-[rgba(255,184,0,0.08)] hover:bg-[rgba(255,184,0,0.08)] active:scale-95 px-3 py-2 text-xs font-bold text-[#FFB800] transition-all disabled:opacity-50 disabled:pointer-events-none"
        >
          {sharing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {L.generating}
            </>
          ) : typeof navigator !== "undefined" &&
            typeof navigator.share === "function" ? (
            <>
              <Share2 className="h-3.5 w-3.5" />
              {L.share}
            </>
          ) : (
            <>
              <Download className="h-3.5 w-3.5" />
              {L.download}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
