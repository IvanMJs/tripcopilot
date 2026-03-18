"use client";

import { useState } from "react";
import {
  ChevronDown,
  Moon,
  Thermometer,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

function TripCopilotLogo({ className }: { className?: string }) {
  return (
    <img
      src="/tripcopliot-avatar.svg"
      alt="TripCopilot"
      className={className ?? "h-6 w-auto"}
    />
  );
}
import { getDestinationProfile, getDestinationConfig } from "@/lib/destinationConfig";
import { useTripAdvice, AdviceStatus } from "@/hooks/useTripAdvice";
import { TripAdviceResult, PackingItem } from "@/lib/types/tripAdvice";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FlightItem {
  isoDate: string;
  originCode: string;
  destinationCode: string;
  destinationName: string;
  destinationNameEn: string;
}

interface StayInfo {
  code: string;
  city: string;
  cityEn: string;
  flag: string;
  nights: number;
  arrivalIso: string;
  departureIso: string;
  month: number;
}

interface TripCopilotProps {
  flights: FlightItem[];
  locale: "es" | "en";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string, locale: "es" | "en"): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString(locale === "es" ? "es-AR" : "en-US", {
    day: "numeric",
    month: "short",
  });
}

function nightsBetween(isoA: string, isoB: string): number {
  return Math.round(
    (new Date(isoB + "T00:00:00").getTime() - new Date(isoA + "T00:00:00").getTime()) /
      (1000 * 60 * 60 * 24),
  );
}

function computeStays(flights: FlightItem[]): StayInfo[] {
  const stays: StayInfo[] = [];
  for (let i = 0; i < flights.length; i++) {
    const dest = flights[i].destinationCode;
    const nextDep = flights.find((f, j) => j > i && f.originCode === dest);
    if (!nextDep) continue;
    const nights = nightsBetween(flights[i].isoDate, nextDep.isoDate);
    if (nights < 2) continue;
    const config = getDestinationConfig(dest);
    stays.push({
      code: dest,
      city: config?.city ?? flights[i].destinationName,
      cityEn: config?.cityEn ?? flights[i].destinationNameEn,
      flag: config?.flag ?? "🌍",
      nights,
      arrivalIso: flights[i].isoDate,
      departureIso: nextDep.isoDate,
      month: new Date(flights[i].isoDate + "T00:00:00").getMonth() + 1,
    });
  }
  return stays;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`rounded bg-white/[0.05] animate-pulse ${className ?? ""}`} />
  );
}

// ── Priority badge ────────────────────────────────────────────────────────────

const PRIORITY_STYLE: Record<PackingItem["priority"], string> = {
  essential:   "bg-red-900/40 text-red-300 border-red-700/30",
  recommended: "bg-blue-900/30 text-blue-300 border-blue-700/20",
  optional:    "bg-gray-800/40 text-gray-500 border-gray-700/20",
};

const PRIORITY_LABEL: Record<PackingItem["priority"], { es: string; en: string }> = {
  essential:   { es: "esencial",    en: "essential"    },
  recommended: { es: "recomendado", en: "recommended"  },
  optional:    { es: "opcional",    en: "optional"     },
};

// ── Summary section ───────────────────────────────────────────────────────────

function SummarySection({
  data,
  status,
  locale,
}: {
  data: TripAdviceResult | null;
  status: AdviceStatus;
  locale: "es" | "en";
}) {
  if (status === "loading") {
    return (
      <div className="px-4 py-3 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    );
  }
  if (!data?.summary) return null;
  return (
    <div className="px-4 py-3">
      <p className="text-xs text-gray-300 leading-relaxed">{data.summary}</p>
    </div>
  );
}

// ── Alerts section — deterministic only (destinationConfig) ──────────────────

function AlertsSection({
  stays,
  locale,
}: {
  stays: StayInfo[];
  locale: "es" | "en";
}) {
  const alerts = stays.flatMap((s) => {
    const p = getDestinationProfile(s.code, s.arrivalIso);
    return (p?.weatherAlerts ?? []).map((a) => ({
      text: locale === "es" ? a.es : a.en,
      city: locale === "es" ? s.city : s.cityEn,
      flag: s.flag,
    }));
  });

  if (!alerts.length) return null;

  return (
    <div className="border-t border-white/[0.04] px-4 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-2">
        ⚠️ {locale === "es" ? "Alertas climáticas" : "Weather alerts"}
      </p>
      <ul className="space-y-1">
        {alerts.map((a, i) => (
          <li key={i} className="text-xs text-yellow-400/80 flex items-start gap-1.5">
            <span className="shrink-0">{a.flag}</span>
            <span>{a.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Packing section ───────────────────────────────────────────────────────────

function PackingSection({
  data,
  status,
  stays,
  locale,
}: {
  data: TripAdviceResult | null;
  status: AdviceStatus;
  stays: StayInfo[];
  locale: "es" | "en";
}) {
  const [open, setOpen] = useState(true);

  // Fallback: collect packing items from destinationConfig (deduplicated by text)
  const staticItems = Array.from(
    new Map(
      stays
        .flatMap((s) => {
          const p = getDestinationProfile(s.code, s.arrivalIso);
          return (p?.packing ?? []).map((pk) => ({
            item: locale === "es" ? pk.es : pk.en,
            reason: "",
            priority: "recommended" as PackingItem["priority"],
          }));
        })
        .map((item) => [item.item, item]),
    ).values(),
  );

  const aiItems = data?.packing;
  const items = aiItems?.length ? aiItems : staticItems;
  const isAI = !!(aiItems?.length);

  if (!items.length && status !== "loading") return null;

  return (
    <div className="border-t border-white/[0.04]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-2 text-left"
      >
        <span className="text-xs">👕</span>
        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex-1">
          {locale === "es" ? "Equipaje" : "Packing"}
        </span>
        {isAI && status === "done" && (
          <TripCopilotLogo className="h-5 w-auto opacity-60" />
        )}
        <ChevronDown
          className={`h-3 w-3 text-gray-600 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="px-4 pb-3">
          {status === "loading" ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-3 flex-1" />
                </div>
              ))}
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((pk, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span
                    className={`shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${
                      PRIORITY_STYLE[pk.priority]
                    }`}
                  >
                    {PRIORITY_LABEL[pk.priority][locale]}
                  </span>
                  <div className="min-w-0">
                    <span className="text-xs text-gray-200">{pk.item}</span>
                    {pk.reason && (
                      <span className="text-[10px] text-gray-500 ml-1.5">{pk.reason}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ── Destination tips section ──────────────────────────────────────────────────

function DestinationCard({
  stay,
  aiTips,
  status,
  locale,
}: {
  stay: StayInfo;
  aiTips: string[] | null;
  status: AdviceStatus;
  locale: "es" | "en";
}) {
  const [open, setOpen] = useState(true);
  const [activitiesOpen, setActivitiesOpen] = useState(true);

  const profile = getDestinationProfile(stay.code, stay.arrivalIso);
  const city = locale === "es" ? stay.city : stay.cityEn;
  const climate = profile
    ? locale === "es"
      ? profile.climateDesc
      : profile.climateDescEn
    : null;

  // Tips: AI if available, else static
  const tips = aiTips?.length ? aiTips : (profile?.tips ?? []).map((t) => (locale === "es" ? t.es : t.en));

  return (
    <div className="border-b border-white/[0.04] last:border-b-0">
      {/* Destination header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <span className="text-xl leading-none shrink-0">{stay.flag}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-white">{city}</span>
            <span className="flex items-center gap-1 text-[10px] text-gray-500">
              <Moon className="h-2.5 w-2.5" />
              {stay.nights} {locale === "es" ? "noches" : "nights"}
            </span>
            <span className="text-[10px] text-gray-600">
              {fmtDate(stay.arrivalIso, locale)} → {fmtDate(stay.departureIso, locale)}
            </span>
          </div>
          {profile && (
            <div className="flex items-center gap-2 mt-0.5">
              <span className="flex items-center gap-1 text-[10px] text-gray-500">
                <Thermometer className="h-2.5 w-2.5" />
                {profile.tempMinC}–{profile.tempMaxC}°C
              </span>
              {climate && (
                <span className="text-[10px] text-gray-600 truncate">{climate}</span>
              )}
            </div>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-gray-500 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="divide-y divide-white/[0.03]">
          {/* Activities (always from static config) */}
          {profile?.activities && profile.activities.length > 0 && (
            <div>
              <button
                onClick={() => setActivitiesOpen((v) => !v)}
                className="w-full flex items-center gap-2 px-4 py-2 text-left"
              >
                <span className="text-xs">🗺️</span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex-1">
                  {locale === "es" ? "Qué hacer" : "Things to do"}
                </span>
                <span className="text-[10px] text-gray-600">{profile.activities.length}</span>
                <ChevronDown
                  className={`h-3 w-3 text-gray-600 transition-transform duration-150 ${activitiesOpen ? "rotate-180" : ""}`}
                />
              </button>
              {activitiesOpen && (
                <ul className="px-4 pb-2 space-y-2">
                  {profile.activities.map((a, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-blue-400 shrink-0 text-xs mt-0.5">→</span>
                      <div>
                        <p className="text-xs font-semibold text-gray-200">
                          {locale === "es" ? a.name : a.nameEn}
                        </p>
                        <p className="text-[11px] text-gray-500 leading-snug">
                          {locale === "es" ? a.desc : a.descEn}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Tips */}
          {(tips.length > 0 || status === "loading") && (
            <div className="px-4 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-2 flex items-center gap-1">
                <span>💡</span> Tips
                {aiTips?.length && status === "done" ? (
                  <TripCopilotLogo className="h-4 w-auto opacity-60 ml-1" />
                ) : null}
              </p>
              {status === "loading" ? (
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-gray-600 shrink-0 mt-1 text-[10px]">•</span>
                      <span className="text-xs text-gray-300 leading-snug">{tip}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── By-leg notes ──────────────────────────────────────────────────────────────

function LegNotes({
  data,
  locale,
}: {
  data: TripAdviceResult | null;
  locale: "es" | "en";
}) {
  if (!data?.by_leg?.length) return null;
  return (
    <div className="border-t border-white/[0.04] px-4 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-2">
        ✈️ {locale === "es" ? "Por tramo" : "Per leg"}
      </p>
      <ul className="space-y-1.5">
        {data.by_leg.map((leg, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-[10px] text-blue-500 font-mono shrink-0 mt-0.5">
              {leg.from}→{leg.to}
            </span>
            <span className="text-xs text-gray-400 leading-snug">{leg.note}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function TripCopilot({ flights, locale }: TripCopilotProps) {
  const [expanded, setExpanded] = useState(false);
  const { data, status, error, refresh } = useTripAdvice(flights, locale);

  const stays = computeStays(flights);
  if (stays.length === 0) return null;

  const totalNights = stays.reduce((s, x) => s + x.nights, 0);

  return (
    <div
      className="rounded-2xl border border-white/[0.07] overflow-hidden"
      style={{
        background:
          "linear-gradient(150deg, rgba(12,12,22,0.97) 0%, rgba(8,8,16,0.99) 100%)",
      }}
    >
      {/* ── Header ── */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-4 py-3.5 flex items-center gap-3 text-left tap-scale"
      >
        {/* TripCopilot logo — brand mark */}
        <TripCopilotLogo className="h-14 w-auto shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-200 leading-snug tracking-wide uppercase">
              {locale === "es" ? "Tu guía de viaje" : "Your travel guide"}
            </p>
            {status === "loading" && (
              <span className="text-[9px] text-gray-600 animate-pulse">
                {locale === "es" ? "analizando…" : "analyzing…"}
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-600 mt-0.5">
            {stays.length} {locale === "es" ? "destinos" : "destinations"} ·{" "}
            {totalNights} {locale === "es" ? "noches" : "nights"}{" "}
            {!expanded && (
              <span className="text-gray-700">
                · {locale === "es" ? "tocá para ver" : "tap to open"}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {stays.map((s) => (
            <span key={s.code} className="text-base">
              {s.flag}
            </span>
          ))}
          {status === "done" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                refresh();
              }}
              className="p-1 rounded text-gray-600 hover:text-gray-400 transition-colors"
              title={locale === "es" ? "Actualizar análisis" : "Refresh analysis"}
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          )}
        </div>

        <ChevronDown
          className={`h-4 w-4 text-gray-500 shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {/* ── Body ── */}
      {expanded && (
        <div className="border-t border-white/[0.05]">
          {/* Error banner */}
          {status === "error" && error && (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-950/30 border-b border-red-900/30">
              <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />
              <p className="text-xs text-red-400 flex-1">{error}</p>
              <button
                onClick={refresh}
                className="text-[11px] text-red-400 hover:text-red-300 underline"
              >
                {locale === "es" ? "Reintentar" : "Retry"}
              </button>
            </div>
          )}

          {/* Summary */}
          <SummarySection data={data} status={status} locale={locale} />

          {/* Alerts — deterministic only */}
          <AlertsSection stays={stays} locale={locale} />

          {/* Packing */}
          <PackingSection data={data} status={status} stays={stays} locale={locale} />

          {/* Per-destination */}
          <div className="border-t border-white/[0.04]">
            {stays.map((stay) => {
              const aiTips =
                data?.destination_tips?.find((d) => d.code === stay.code)?.tips ?? null;
              return (
                <DestinationCard
                  key={`${stay.code}-${stay.arrivalIso}`}
                  stay={stay}
                  aiTips={aiTips}
                  status={status}
                  locale={locale}
                />
              );
            })}
          </div>

          {/* By-leg notes */}
          <LegNotes data={data} locale={locale} />
        </div>
      )}
    </div>
  );
}
