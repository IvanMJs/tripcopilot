"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { AirportStatus } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
import { cn } from "@/lib/utils";
import { X, TrendingUp, TrendingDown, Minus, Wind, Sparkles, Loader2, ChevronDown, Clock } from "lucide-react";
import { AIRPORTS } from "@/lib/airports";
import { useLanguage } from "@/contexts/LanguageContext";
import { WeatherData } from "@/hooks/useWeather";
import { MetarData, FlightCategory } from "@/hooks/useMetar";
import { getAirportTime, getAirportTzLabel } from "@/lib/airportTimezone";
import { getCachedFaaExplanation, setCachedFaaExplanation } from "@/lib/faaExplainCache";

function formatMinutes(min: number | undefined): string {
  if (min == null) return "?";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

function AirportClock({ iata }: { iata: string }) {
  const [time, setTime] = useState(() => getAirportTime(iata));

  useEffect(() => {
    setTime(getAirportTime(iata));
    // Sync to next minute boundary
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

// ── 2025 design pattern: subtle full border + colored left-accent (4px) ────────
// Research source: Carbon Design System / Stripe / Linear inline alert pattern.
// Critical cards use ambient glow (box-shadow) for added visual weight.
const CARD_STYLE: Record<string, { border: string; bg: string; leftBar: string; glow: string }> = {
  ok: {
    border:  "border-emerald-500/20",
    bg:      "bg-[rgba(16,185,129,0.04)]",
    leftBar: "bg-emerald-500/60",
    glow:    "",
  },
  delay_minor: {
    border:  "border-yellow-500/25",
    bg:      "bg-[rgba(234,179,8,0.05)]",
    leftBar: "bg-yellow-400/70",
    glow:    "",
  },
  delay_moderate: {
    border:  "border-orange-500/30",
    bg:      "bg-[rgba(249,115,22,0.07)]",
    leftBar: "bg-orange-400/80",
    glow:    "shadow-[0_0_0_1px_rgba(249,115,22,0.15),0_0_20px_rgba(249,115,22,0.06)]",
  },
  delay_severe: {
    border:  "border-red-500/35",
    bg:      "bg-[rgba(239,68,68,0.09)]",
    leftBar: "bg-red-400",
    glow:    "shadow-[0_0_0_1px_rgba(239,68,68,0.2),0_0_24px_rgba(239,68,68,0.08)]",
  },
  ground_delay: {
    border:  "border-red-500/40",
    bg:      "bg-[rgba(239,68,68,0.12)]",
    leftBar: "bg-red-500 animate-pulse",
    glow:    "shadow-[0_0_0_1px_rgba(239,68,68,0.25),0_0_28px_rgba(239,68,68,0.1)]",
  },
  ground_stop: {
    border:  "border-red-600/50",
    bg:      "bg-[rgba(239,68,68,0.16)]",
    leftBar: "bg-red-500 animate-pulse",
    glow:    "shadow-[0_0_0_1px_rgba(239,68,68,0.3),0_0_32px_rgba(239,68,68,0.12)]",
  },
  closure: {
    border:  "border-zinc-600/40",
    bg:      "bg-zinc-900/40",
    leftBar: "bg-zinc-500",
    glow:    "",
  },
  unknown: {
    border:  "border-zinc-700/30",
    bg:      "bg-zinc-900/20",
    leftBar: "bg-zinc-700",
    glow:    "",
  },
};

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

    // Check cache first
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

export function AirportCard({ iata, status, onRemove, weather, metar, highlight, onRefresh }: AirportCardProps) {
  const { t, locale } = useLanguage();
  const s = status?.status ?? "ok";

  // Technical details toggle
  const [showTechnical, setShowTechnical] = useState(false);

  // Pull-to-refresh state
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
    if (delta > 0) {
      setPullOffset(Math.min(delta, 80));
    }
  }

  async function handlePullTouchEnd() {
    isPulling.current = false;
    if (pullOffset >= 60 && onRefresh) {
      setIsRefreshing(true);
      setPullOffset(0);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    } else {
      setPullOffset(0);
    }
  }
  const info = AIRPORTS[iata];
  const name  = status?.name  || info?.name  || iata;
  const city  = status?.city  || info?.city  || "";
  const state = status?.state || info?.state || "";

  const cs = CARD_STYLE[s] ?? CARD_STYLE.unknown;

  const cardTranslateY = Math.min(pullOffset * 0.5, 40);

  // P7: gradient top border based on status severity
  const borderTopClass =
    s === "ok"             ? "border-top-success" :
    s === "delay_minor"    ? "border-top-warning" :
    s === "delay_moderate" ? "border-top-warning" :
    s === "delay_severe"   ? "border-top-danger"  :
    s === "ground_delay"   ? "border-top-danger"  :
    s === "ground_stop"    ? "border-top-danger"  :
    "";

  return (
    <div
      className={cn(
        // Outer wrapper: border + bg + glow + hover lift
        // C4: breathing animation since data updates live
        "animate-breathing relative rounded-xl border overflow-hidden transition-all duration-200 stagger-item",
        "hover:-translate-y-1 hover:shadow-card-hover",
        cs.border, cs.bg, cs.glow,
        borderTopClass,
        highlight && "animate-highlight-flash"
      )}
      style={{ transform: `translateY(${cardTranslateY}px)`, transition: isPulling.current ? "none" : "transform 0.2s ease" }}
      onTouchStart={handlePullTouchStart}
      onTouchMove={handlePullTouchMove}
      onTouchEnd={handlePullTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {(pullOffset > 10 || isRefreshing) && (
        <div className="absolute top-0 inset-x-0 flex justify-center pt-1 z-20 pointer-events-none">
          <Loader2
            className={cn("h-4 w-4 text-blue-400", (isRefreshing || pullOffset >= 60) && "animate-spin")}
            style={{ opacity: isRefreshing ? 1 : pullOffset / 60 }}
          />
        </div>
      )}
      {/* Left-accent bar — 2025 Carbon/Stripe inline alert pattern */}
      <div className={cn("absolute left-0 inset-y-0 w-[3px] rounded-l-xl", cs.leftBar)} />

      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute right-2 top-2 rounded-full p-1 text-gray-600 hover:bg-white/8 hover:text-gray-300 transition-colors z-10"
          aria-label={locale === "es" ? "Eliminar" : "Delete"}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      <div className="pl-5 pr-4 pt-4 pb-0">
        <div className="mb-3 pr-6">
          <span className="block text-4xl font-black tracking-tight text-white tabular font-mono">{iata}</span>
          <span className="text-xs text-gray-500 leading-tight">
            {name}
            {city && state ? ` · ${city}, ${state}` : city ? ` · ${city}` : ""}
          </span>
        </div>

        <StatusBadge status={s} className="mb-3" />

      {s === "ok" && (
        <p className="text-xs text-green-400/80">{t.noDelaysReported}</p>
      )}

      <div className="mt-2 flex items-center gap-3 flex-wrap">
        {weather && (
          <div className="flex items-center gap-2 text-xs text-gray-300">
            <span className="text-base leading-none">{weather.icon}</span>
            <span className="font-medium">{weather.temperature}°C</span>
            <span className="text-gray-500">{weather.description}</span>
          </div>
        )}
        <AirportClock iata={iata} />
      </div>

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

      {/* FAA explain — only shown when there's an active incident */}
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

      {/* Bottom padding spacer */}
      <div className="pb-4" />
    </div>
  );
}
