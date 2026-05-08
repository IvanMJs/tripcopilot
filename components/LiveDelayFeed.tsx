"use client";

import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ModeGate } from "@/components/ModeGate";
import { AirportStatusMap, AirportStatus, DelayStatus } from "@/lib/types";
import { ChevronDown, ChevronUp } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

export interface LiveDelayFeedProps {
  airports: string[];
  statusMap: Record<string, string>;
  faaStatusMap?: AirportStatusMap;
}

// ── Constants ──────────────────────────────────────────────────────────────

const REFRESH_INTERVAL_SECONDS = 5 * 60; // 5 minutes

// ── Helpers ────────────────────────────────────────────────────────────────

const NON_NORMAL_STATUSES: DelayStatus[] = [
  "delay_minor",
  "delay_moderate",
  "delay_severe",
  "ground_stop",
  "ground_delay",
  "closure",
  "unknown",
];

function isNonNormal(status: string): boolean {
  return NON_NORMAL_STATUSES.includes(status as DelayStatus);
}

interface StatusBadgeConfig {
  label: { es: string; en: string };
  className: string;
}

const STATUS_BADGE: Record<string, StatusBadgeConfig> = {
  ok: {
    label: { es: "Normal", en: "Normal" },
    className: "bg-green-500/20 text-green-400 border border-green-500/30",
  },
  delay_minor: {
    label: { es: "Demora leve", en: "Minor delay" },
    className: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  },
  delay_moderate: {
    label: { es: "Demora moderada", en: "Moderate delay" },
    className: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
  },
  delay_severe: {
    label: { es: "Demora severa", en: "Severe delay" },
    className: "bg-red-500/20 text-red-400 border border-red-500/30",
  },
  ground_stop: {
    label: { es: "Parada en Tierra", en: "Ground Stop" },
    className: "bg-red-600/20 text-red-300 border border-red-600/40",
  },
  ground_delay: {
    label: { es: "Demora en Tierra", en: "Ground Delay" },
    className: "bg-orange-600/20 text-orange-300 border border-orange-600/40",
  },
  closure: {
    label: { es: "CERRADO", en: "CLOSED" },
    className: "bg-red-900/30 text-red-200 border border-red-700/50 font-bold",
  },
  unknown: {
    label: { es: "Desconocido", en: "Unknown" },
    className: "bg-gray-500/20 text-gray-400 border border-gray-500/30",
  },
};

function formatTime(date: Date, locale: "es" | "en"): string {
  return date.toLocaleTimeString(locale === "en" ? "en-US" : "es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Airport Delay Card ─────────────────────────────────────────────────────

interface DelayCardProps {
  entry: AirportStatus;
  locale: "es" | "en";
}

function DelayCard({ entry, locale }: DelayCardProps) {
  const badge = STATUS_BADGE[entry.status] ?? STATUS_BADGE.unknown;
  const badgeLabel = badge.label[locale];

  return (
    <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 space-y-2">
      {/* Airport name + badge */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-sm font-semibold text-white">{entry.iata}</span>
          <span className="ml-2 text-xs text-gray-400">{entry.name}</span>
          {entry.city ? (
            <span className="ml-1 text-xs text-gray-500">{entry.city}</span>
          ) : null}
        </div>
        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${badge.className}`}>
          {badgeLabel}
        </span>
      </div>

      {/* Delay details */}
      {entry.delays ? (
        <div className="space-y-0.5 text-xs text-gray-400">
          <p>
            <span className="text-gray-500">{locale === "en" ? "Reason:" : "Causa:"}</span>{" "}
            <span className="text-gray-300">{entry.delays.reason}</span>
          </p>
          {entry.delays.minMinutes !== undefined && entry.delays.maxMinutes !== undefined ? (
            <p>
              <span className="text-gray-500">{locale === "en" ? "Range:" : "Rango:"}</span>{" "}
              <span className="text-gray-300">
                {entry.delays.minMinutes}–{entry.delays.maxMinutes} min
              </span>
            </p>
          ) : null}
          {entry.delays.trend ? (
            <p>
              <span className="text-gray-500">{locale === "en" ? "Trend:" : "Tendencia:"}</span>{" "}
              <span className="text-gray-300">{entry.delays.trend}</span>
            </p>
          ) : null}
        </div>
      ) : null}

      {entry.groundStop ? (
        <div className="space-y-0.5 text-xs text-gray-400">
          <p>
            <span className="text-gray-500">{locale === "en" ? "Reason:" : "Causa:"}</span>{" "}
            <span className="text-gray-300">{entry.groundStop.reason}</span>
          </p>
          {entry.groundStop.endTime ? (
            <p>
              <span className="text-gray-500">{locale === "en" ? "Until:" : "Hasta:"}</span>{" "}
              <span className="text-gray-300">{entry.groundStop.endTime}</span>
            </p>
          ) : null}
        </div>
      ) : null}

      {entry.groundDelay ? (
        <div className="space-y-0.5 text-xs text-gray-400">
          <p>
            <span className="text-gray-500">{locale === "en" ? "Reason:" : "Causa:"}</span>{" "}
            <span className="text-gray-300">{entry.groundDelay.reason}</span>
          </p>
          <p>
            <span className="text-gray-500">{locale === "en" ? "Avg delay:" : "Demora prom:"}</span>{" "}
            <span className="text-gray-300">
              {entry.groundDelay.avgMinutes} min
              {entry.groundDelay.maxTime ? ` (max ${entry.groundDelay.maxTime})` : ""}
            </span>
          </p>
        </div>
      ) : null}

      {entry.closure ? (
        <div className="text-xs text-gray-400">
          <span className="text-gray-500">{locale === "en" ? "Reason:" : "Causa:"}</span>{" "}
          <span className="text-gray-300">{entry.closure.reason}</span>
        </div>
      ) : null}

      {/* Timestamp */}
      <p className="text-xs text-gray-600">
        {locale === "en" ? "Updated" : "Actualizado"} {formatTime(entry.lastChecked, locale)}
      </p>
    </div>
  );
}

// ── Countdown Bar ──────────────────────────────────────────────────────────

interface CountdownBarProps {
  seconds: number;
  totalSeconds: number;
  locale: "es" | "en";
}

function CountdownBar({ seconds, totalSeconds, locale }: CountdownBarProps) {
  const progress = totalSeconds > 0 ? ((totalSeconds - seconds) / totalSeconds) * 100 : 0;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          {locale === "en" ? "Next refresh in" : "Próxima actualización en"}{" "}
          <span className="text-gray-400 tabular-nums">
            {mins}:{String(secs).padStart(2, "0")}
          </span>
        </span>
      </div>
      <div className="h-0.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full bg-green-500/60 transition-all duration-1000"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// ── Main Component (inner) ─────────────────────────────────────────────────

function LiveDelayFeedInner({ airports, faaStatusMap }: LiveDelayFeedProps) {
  const { locale } = useLanguage();
  const [isOpen, setIsOpen] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_INTERVAL_SECONDS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown timer — resets every REFRESH_INTERVAL_SECONDS
  useEffect(() => {
    setSecondsLeft(REFRESH_INTERVAL_SECONDS);
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) return REFRESH_INTERVAL_SECONDS;
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
  }, []);

  // Collect airports with active issues
  const delayedEntries: AirportStatus[] = airports
    .filter((iata) => {
      const entry = faaStatusMap?.[iata];
      return entry !== undefined && isNonNormal(entry.status);
    })
    .map((iata) => faaStatusMap![iata]);

  const allClear = delayedEntries.length === 0;

  return (
    <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span className="text-sm font-semibold text-white">
            {locale === "en" ? "Live Delays" : "Demoras en vivo"}
          </span>
          {!allClear ? (
            <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 rounded-full px-1.5 py-0.5">
              {delayedEntries.length}
            </span>
          ) : null}
        </div>
        <span className="text-gray-500">
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {/* Body */}
      {isOpen ? (
        <div className="px-4 pb-4 space-y-3">
          {/* Countdown */}
          <CountdownBar
            seconds={secondsLeft}
            totalSeconds={REFRESH_INTERVAL_SECONDS}
            locale={locale}
          />

          {/* Content */}
          {allClear ? (
            <div className="flex items-center gap-2 py-3 text-sm text-green-400">
              <span>✅</span>
              <span>{locale === "en" ? "All clear" : "Todo normal"}</span>
            </div>
          ) : (
            <div className="space-y-2">
              {delayedEntries.map((entry) => (
                <DelayCard key={entry.iata} entry={entry} locale={locale} />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ── Public Export (ModeGate wrapper) ──────────────────────────────────────

export function LiveDelayFeed(props: LiveDelayFeedProps) {
  return (
    <ModeGate mode="pilot">
      <LiveDelayFeedInner {...props} />
    </ModeGate>
  );
}
