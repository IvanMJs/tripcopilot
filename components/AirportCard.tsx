"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { AirportStatus } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
import { cn } from "@/lib/utils";
import { X, TrendingUp, TrendingDown, Minus, Wind, Sparkles, Loader2, ChevronDown, Clock, AlertCircle } from "lucide-react";
import { AIRPORTS } from "@/lib/airports";
import { useLanguage } from "@/contexts/LanguageContext";
import { WeatherData } from "@/hooks/useWeather";
import { MetarData, FlightCategory } from "@/hooks/useMetar";
import { getAirportTime, getAirportTzLabel } from "@/lib/airportTimezone";
import { getCachedFaaExplanation, setCachedFaaExplanation } from "@/lib/faaExplainCache";
import { RadarDot } from "./RadarDot";

function formatMinutes(min: number | undefined): string {
  if (min == null) return "?";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

function AirportClock({ iata }: { iata: string }) {
  const [time, setTime] = useState<string | null>(null); // null on SSR — avoids hydration mismatch

  useEffect(() => {
    setTime(getAirportTime(iata));
    const msToNext = 60000 - (Date.now() % 60000);
    const t = setTimeout(() => {
      setTime(getAirportTime(iata));
      const interval = setInterval(() => setTime(getAirportTime(iata)), 60000);
      return () => clearInterval(interval);
    }, msToNext);
    return () => clearTimeout(t);
  }, [iata]);

  if (!time) return null;
  const tzLabel = getAirportTzLabel(iata);

  return (
    <span className="flex items-center gap-1 text-xs text-gray-400 tabular font-medium">
      🕐 {time}
      {tzLabel && <span className="text-gray-600 text-xs">{tzLabel}</span>}
    </span>
  );
}

interface AirportCardProps {
  iata: string;
  status?: AirportStatus;
  onRemove?: () => void;
  weather?: WeatherData;
  metar?: MetarData;
  highlight?: boolean;
  onRefresh?: () => Promise<void> | void;
}

// ── METAR display helpers ─────────────────────────────────────────────────────

const FC_STYLE: Record<FlightCategory, { pill: string; dot: string }> = {
  VFR:  { pill: "bg-emerald-950/70 text-emerald-300 border-emerald-700/30", dot: "bg-emerald-400" },
  MVFR: { pill: "bg-blue-950/70    text-blue-300    border-blue-700/30",    dot: "bg-blue-400"    },
  IFR:  { pill: "bg-orange-950/70  text-orange-300  border-orange-700/30",  dot: "bg-orange-400"  },
  LIFR: { pill: "bg-red-950/70     text-red-300     border-red-700/30",     dot: "bg-red-400 animate-pulse" },
};

function formatWind(dirDeg: number, isVRB: boolean, speedKt: number, gustKt?: number): string {
  if (speedKt === 0) return "CALM";
  const dir  = isVRB ? "VRB" : `${String(dirDeg).padStart(3, "0")}°`;
  const gust = gustKt ? ` G${gustKt}` : "";
  return `${dir}/${speedKt}${gust}kt`;
}

function MetarRow({ metar }: { metar: MetarData }) {
  const fc    = metar.flightCategory;
  const style = FC_STYLE[fc];
  const wind  = formatWind(metar.windDirDeg, metar.isVRB, metar.windSpeedKt, metar.windGustKt);

  const extras: string[] = [];
  if (metar.visibilitySM < 5)
    extras.push(`vis ${metar.visibilitySM < 1 ? `${metar.visibilitySM}` : Math.round(metar.visibilitySM)}SM`);
  if (metar.ceilingFt !== undefined && metar.ceilingFt < 3000)
    extras.push(`ceil ${(metar.ceilingFt / 100).toFixed(0)}00ft`);
  if (metar.weatherString)
    extras.push(metar.weatherString);

  return (
    <div className="mt-2 flex items-center gap-2 flex-wrap text-xs">
      <span className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold border",
        style.pill,
      )}>
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", style.dot)} />
        {fc}
      </span>
      <Wind className="h-3 w-3 text-gray-600 shrink-0" />
      <span className="text-gray-400 font-medium">{wind}</span>
      {extras.map((e, i) => (
        <span key={i} className="text-gray-500">· {e}</span>
      ))}
    </div>
  );
}

// ── Tone system ───────────────────────────────────────────────────────────────

type Tone = "ok" | "warn" | "danger" | "neutral";

function toneFromStatus(raw: string | undefined): Tone {
  if (raw === "ok") return "ok";
  if (raw === "ground_stop" || raw === "closure" || raw === "delay_severe") return "danger";
  if (raw === "delay_moderate" || raw === "delay_minor" || raw === "ground_delay") return "warn";
  return "neutral";
}

function severeReason(entry: AirportStatus | undefined): string | null {
  if (!entry) return null;
  if (entry.status === "ground_stop") return entry.groundStop?.reason ?? null;
  if (entry.status === "closure") return entry.closure?.reason ?? null;
  if (entry.status === "delay_severe" && entry.delays?.reason) return entry.delays.reason;
  if (entry.status === "ground_delay" && entry.groundDelay?.reason) return entry.groundDelay.reason;
  return null;
}

// All translations of "increasing/worsening" and "decreasing/improving" trends
const TREND_UP   = new Set(["Increasing", "Aumentando", "Worsening", "Empeorando"]);
const TREND_DOWN = new Set(["Decreasing", "Disminuyendo", "Improving", "Mejorando"]);

function TrendIcon({ trend }: { trend?: string }) {
  if (!trend) return null;
  if (TREND_UP.has(trend))   return <TrendingUp className="h-3.5 w-3.5 text-red-400 inline" />;
  if (TREND_DOWN.has(trend)) return <TrendingDown className="h-3.5 w-3.5 text-green-400 inline" />;
  return <Minus className="h-3.5 w-3.5 text-yellow-400 inline" />;
}

// ── FAA Explain ────────────────────────────────────────────────────────────────

type ExplainState = "idle" | "loading" | "done" | "error";

function buildRawDetails(status: AirportStatus): string {
  const parts: string[] = [];
  if (status.delays) {
    parts.push(
      `Delay ${status.delays.minMinutes}–${status.delays.maxMinutes} min, reason: ${status.delays.reason}`,
    );
  }
  if (status.groundStop) {
    parts.push(
      `Ground stop until ${status.groundStop.endTime ?? "indefinite"}, reason: ${status.groundStop.reason}`,
    );
  }
  if (status.groundDelay) {
    parts.push(
      `Ground delay program, avg ${status.groundDelay.avgMinutes} min, reason: ${status.groundDelay.reason}`,
    );
  }
  if (status.closure) {
    parts.push(`Airport closure: ${status.closure.reason}`);
  }
  return parts.join(". ") || status.status;
}

function FaaExplainButton({
  iata,
  status,
  locale,
}: {
  iata: string;
  status: AirportStatus;
  locale: "es" | "en";
}) {
  const [explainState, setExplainState] = useState<ExplainState>("idle");
  const [explanation, setExplanation] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const handleExplain = useCallback(async () => {
    if (open && explanation) {
      setOpen(false);
      return;
    }

    const cached = getCachedFaaExplanation(iata, status.status);
    if (cached) {
      setExplanation(cached);
      setExplainState("done");
      setOpen(true);
      return;
    }

    setExplainState("loading");
    setOpen(true);

    try {
      const res = await fetch("/api/faa-explain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          airportCode: iata,
          status: status.status,
          rawDetails: buildRawDetails(status),
          locale,
        }),
      });
      const json = await res.json() as { explanation?: string; error?: string };
      if (!res.ok || json.error) {
        setExplainState("error");
        return;
      }
      const text = json.explanation ?? "";
      setCachedFaaExplanation(iata, status.status, text);
      setExplanation(text);
      setExplainState("done");
    } catch {
      setExplainState("error");
    }
  }, [iata, status, locale, open, explanation]);

  return (
    <div className="mt-2">
      <button
        onClick={handleExplain}
        className="flex items-center gap-1.5 text-xs bg-violet-900/60 hover:bg-violet-800/80 text-violet-300 hover:text-violet-100 border border-violet-700/50 px-2.5 py-1 rounded-full transition-all"
      >
        {explainState === "loading" ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="animate-pulse">{locale === "es" ? "Consultando a la IA..." : "Asking the AI..."}</span>
          </>
        ) : (
          <>
            <Sparkles className="h-3 w-3" />
            {locale === "es" ? "¿Esto me afecta?" : "How does this affect me?"}
            {explanation && (
              <ChevronDown
                className={`h-3 w-3 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
              />
            )}
          </>
        )}
      </button>

      {open && explainState === "done" && explanation && (
        <p className="mt-1.5 text-sm text-gray-300 leading-relaxed bg-violet-950/20 border border-violet-800/20 rounded-lg p-3">
          {explanation}
        </p>
      )}

      {open && explainState === "error" && (
        <p className="mt-1.5 text-[11px] text-gray-500">
          {locale === "es" ? "No se pudo obtener la explicación." : "Could not get explanation."}
        </p>
      )}
    </div>
  );
}

// ── Tone-driven card styling ──────────────────────────────────────────────────

const haloByTone: Record<Tone, string> = {
  ok:      "bg-[radial-gradient(circle,rgba(34,197,94,0.18),transparent_70%)]",
  warn:    "bg-[radial-gradient(circle,rgba(251,146,60,0.20),transparent_70%)]",
  danger:  "bg-[radial-gradient(circle,rgba(239,68,68,0.24),transparent_70%)]",
  neutral: "",
};
const pulseByTone: Record<Tone, string> = {
  ok: "bg-green-400", warn: "bg-orange-400", danger: "bg-red-500", neutral: "bg-gray-500",
};
const borderByTone: Record<Tone, string> = {
  ok:      "border-green-500/20",
  warn:    "border-orange-500/25",
  danger:  "border-red-500/30",
  neutral: "border-white/[0.08]",
};
const shadowByTone: Record<Tone, string> = {
  ok:      "shadow-glow-green",
  warn:    "shadow-glow-orange",
  danger:  "shadow-glow-red",
  neutral: "",
};
const labelByTone: Record<Tone, string> = {
  ok: "text-green-400", warn: "text-orange-300", danger: "text-red-300", neutral: "text-gray-500",
};

export function AirportCard({ iata, status, onRemove, weather, metar, highlight, onRefresh }: AirportCardProps) {
  const { t, locale } = useLanguage();
  const s = status?.status ?? "ok";
  const tone = toneFromStatus(s);
  const reason = severeReason(status);

  const [showTechnical, setShowTechnical] = useState(false);

  // Pull-to-refresh
  const [pullOffset, setPullOffset] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef<number>(0);
  const isPulling = useRef(false);

  function handlePullTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
    isPulling.current = true;
  }

  function handlePullTouchMove(e: React.TouchEvent) {
    if (!isPulling.current || isRefreshing) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) setPullOffset(Math.min(delta, 80));
  }

  async function handlePullTouchEnd() {
    isPulling.current = false;
    if (pullOffset >= 60 && onRefresh) {
      setIsRefreshing(true);
      setPullOffset(0);
      try { await onRefresh(); } finally { setIsRefreshing(false); }
    } else {
      setPullOffset(0);
    }
  }

  const info  = AIRPORTS[iata];
  const name  = status?.name  || info?.name  || iata;
  const city  = status?.city  || info?.city  || "";
  const state = status?.state || info?.state || "";

  const cardTranslateY = Math.min(pullOffset * 0.5, 40);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-white/[0.04] transition-all duration-200 stagger-item",
        "hover:-translate-y-1 hover:shadow-card-hover",
        borderByTone[tone],
        shadowByTone[tone],
        highlight && "animate-highlight-flash",
      )}
      style={{ transform: `translateY(${cardTranslateY}px)`, transition: isPulling.current ? "none" : "transform 0.2s ease" }}
      onTouchStart={handlePullTouchStart}
      onTouchMove={handlePullTouchMove}
      onTouchEnd={handlePullTouchEnd}
    >
      {/* Ambient halo */}
      {tone !== "neutral" && (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute -top-16 -right-12 size-[220px] rounded-full blur-2xl animate-[radarSweep_4.5s_ease-in-out_infinite]",
            haloByTone[tone],
          )}
        />
      )}

      {/* Pull-to-refresh indicator */}
      {(pullOffset > 10 || isRefreshing) && (
        <div className="absolute top-0 inset-x-0 flex justify-center pt-1 z-20 pointer-events-none">
          <Loader2
            className={cn("h-4 w-4 text-blue-400", (isRefreshing || pullOffset >= 60) && "animate-spin")}
            style={{ opacity: isRefreshing ? 1 : pullOffset / 60 }}
          />
        </div>
      )}

      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute right-2 top-2 rounded-full p-1 text-gray-600 hover:bg-white/8 hover:text-gray-300 transition-colors z-10"
          aria-label={locale === "es" ? "Eliminar" : "Delete"}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      <div className="px-4 pt-4 pb-0">
        {/* Radar pulse eyebrow */}
        <div className="relative flex items-center gap-2 mb-3">
          <RadarDot tone={tone} size="md" />
          <span className={cn("text-[10px] font-bold uppercase tracking-[0.12em]", labelByTone[tone])}>
            {tone === "neutral"
              ? (locale === "es" ? "sin señal" : "no signal")
              : (locale === "es" ? "en vivo" : "live")}
          </span>
          <div className="ml-auto">
            <AirportClock iata={iata} />
          </div>
        </div>

        {/* IATA + airport name */}
        <div className="mb-3 pr-6">
          <span className="block text-[40px] font-black tracking-[-0.03em] text-white tabular font-mono leading-none">{iata}</span>
          <span className="text-xs text-gray-500 leading-tight">
            {name}
            {city && state ? ` · ${city}, ${state}` : city ? ` · ${city}` : ""}
          </span>
        </div>

        <StatusBadge status={s} dense className="mb-3" />

        {/* Urgency strip */}
        {reason && (
          <div className="mb-3 flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/25 px-3 py-2">
            <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-px" />
            <span className="text-[11px] font-semibold text-red-200 leading-snug">
              FAA · {locale === "es" ? "motivo" : "reason"}: {reason}
            </span>
          </div>
        )}

        {s === "ok" && (
          <p className="text-xs text-green-400/80 mb-2">{t.noDelaysReported}</p>
        )}

        {weather && (
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-300">
            <span className="text-base leading-none">{weather.icon}</span>
            <span className="font-medium">{weather.temperature}°C</span>
            <span className="text-gray-500">{weather.description}</span>
          </div>
        )}

        {metar && showTechnical && <MetarRow metar={metar} />}

        {status?.delays && (
          <div className="mt-2 space-y-1 text-sm text-gray-300">
            <p>
              <span className="text-gray-500">{t.delay}:</span>{" "}
              <span className="font-medium">
                {formatMinutes(status.delays.minMinutes)}–{formatMinutes(status.delays.maxMinutes)}
              </span>{" "}
              <TrendIcon trend={status.delays.trend} />
            </p>
            <p><span className="text-gray-500">{t.cause}:</span> {status.delays.reason}</p>
            <p>
              <span className="text-gray-500">{t.affects}:</span>{" "}
              {status.delays.type === "departure"
                ? t.departures
                : status.delays.type === "arrival"
                ? t.arrivals
                : (locale === "es" ? "salidas y llegadas" : "departing and arriving flights")}
            </p>
            {status.delays.trend && (
              <p><span className="text-gray-500">{t.trend}:</span> {status.delays.trend}</p>
            )}
          </div>
        )}

        {status?.groundStop && (
          <div className="mt-2 space-y-1 text-sm text-red-300">
            <p>
              <span className="font-bold">🛑 {t.groundStop}</span>{" "}
              {t.until} {status.groundStop.endTime ?? t.indefinite}
            </p>
            <p><span className="text-red-400/70">{t.cause}:</span> {status.groundStop.reason}</p>
          </div>
        )}

        {status?.groundDelay && (
          <div className="mt-2 space-y-1 text-sm text-red-300">
            <p className="font-bold">{t.groundDelayProgram}</p>
            <p>
              {t.average}: <span className="font-medium">{formatMinutes(status.groundDelay.avgMinutes)}</span>
              {" · "}{t.max}: {status.groundDelay.maxTime}
            </p>
            <p><span className="text-red-400/70">{t.cause}:</span> {status.groundDelay.reason}</p>
          </div>
        )}

        {status?.closure && (
          <div className="mt-2 space-y-1 text-sm text-gray-300">
            <p className="font-bold text-gray-200">⛔ {t.airportClosed}</p>
            <p><span className="text-gray-500">{t.cause}:</span> {status.closure.reason}</p>
          </div>
        )}

        {status && s !== "ok" && s !== "unknown" && (
          <FaaExplainButton iata={iata} status={status} locale={locale} />
        )}

        {metar && (
          <button
            onClick={() => setShowTechnical((v) => !v)}
            className="mt-2 text-xs text-gray-500 underline underline-offset-2 hover:text-gray-300 transition-colors"
          >
            {showTechnical
              ? (locale === "es" ? "Ocultar detalles ↑" : "Hide details ↑")
              : (locale === "es" ? "Ver detalles técnicos ↓" : "Show technical details ↓")}
          </button>
        )}

        {status?.lastChecked && (() => {
          const minutesAgo = Math.floor((Date.now() - new Date(status.lastChecked).getTime()) / 60000);
          return (
            <>
              <p className="mt-3 text-xs text-gray-500 tabular">
                {t.updated}:{" "}
                {new Date(status.lastChecked).toLocaleTimeString(locale === "en" ? "en-US" : "es-AR", { hour: "2-digit", minute: "2-digit" })}
              </p>
              {minutesAgo > 10 && (
                <span className="mt-1 text-xs text-amber-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {locale === "es" ? `hace ${minutesAgo} min` : `${minutesAgo} min ago`}
                </span>
              )}
            </>
          );
        })()}
      </div>

      <div className="pb-4" />
    </div>
  );
}
