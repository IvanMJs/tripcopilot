"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, MapPin, Moon, Thermometer, Copy, Check } from "lucide-react";
import { getDestinationProfile, getDestinationConfig } from "@/lib/destinationConfig";
import { TripAdviceResult } from "@/lib/types/tripAdvice";

// ── TripCopilot avatar icon ───────────────────────────────────────────────────

function TripCopilotIcon({ spinning, size = 16 }: { spinning?: boolean; size?: number }) {
  return (
    <img
      src="/tripcopliot-avatar.svg"
      alt="TripCopilot"
      width={size}
      height={size}
      className={`shrink-0 rounded-full ${spinning ? "animate-spin" : ""}`}
      style={spinning ? { animationDuration: "2s" } : undefined}
    />
  );
}

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
  tempMin: number;
  tempMax: number;
  climate: string;
  climateEn: string;
}

interface TripAdvisorProps {
  flights: FlightItem[];
  locale: "es" | "en";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateShort(iso: string, locale: "es" | "en"): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString(locale === "es" ? "es-AR" : "en-US", {
    day: "numeric",
    month: "short",
  });
}

function nightsBetween(isoA: string, isoB: string): number {
  const a = new Date(isoA + "T00:00:00").getTime();
  const b = new Date(isoB + "T00:00:00").getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
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
    const profile = getDestinationProfile(dest, flights[i].isoDate);
    stays.push({
      code: dest,
      city: config?.city ?? flights[i].destinationName,
      cityEn: config?.cityEn ?? flights[i].destinationNameEn,
      flag: config?.flag ?? "🌍",
      nights,
      arrivalIso: flights[i].isoDate,
      departureIso: nextDep.isoDate,
      month: new Date(flights[i].isoDate + "T00:00:00").getMonth() + 1,
      tempMin: profile?.tempMinC ?? 20,
      tempMax: profile?.tempMaxC ?? 30,
      climate: profile?.climateDesc ?? "",
      climateEn: profile?.climateDescEn ?? "",
    });
  }
  return stays;
}

function staysKey(stays: StayInfo[]): string {
  return stays.map((s) => `${s.code}:${s.arrivalIso}:${s.departureIso}`).join("|");
}

// ── Sub-components ────────────────────────────────────────────────────────────

// SectionHeader is used only by the static (non-AI) packing fallback in PackingSection
function SectionHeader({
  emoji,
  label,
  count,
  open,
  onToggle,
}: {
  emoji: string;
  label: string;
  count?: number;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2 px-4 py-2 text-left tap-scale"
    >
      <span className="text-xs leading-none">{emoji}</span>
      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex-1">
        {label}
      </span>
      {count !== undefined && (
        <span className="text-xs text-gray-600">{count}</span>
      )}
      <ChevronDown
        className={`h-3 w-3 text-gray-600 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
      />
    </button>
  );
}

function DestinationCard({
  stay,
  locale,
  aiTips,
}: {
  stay: StayInfo;
  locale: "es" | "en";
  aiTips?: string[];
}) {
  const [open, setOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"packing" | "activities" | "tips">("packing");

  const profile = getDestinationProfile(stay.code, stay.arrivalIso);
  const city = locale === "es" ? stay.city : stay.cityEn;
  const climate = locale === "es" ? stay.climate : stay.climateEn;

  // Use AI tips if available, otherwise fall back to static profile tips
  const tips = aiTips
    ? aiTips.map((t) => ({ es: t, en: t }))
    : profile?.tips ?? [];

  function getClimateBorderClass(): string {
    const c = stay.climateEn.toLowerCase();
    if (c.includes("tropical") || c.includes("humid")) return "border-l-2 border-l-blue-500/50";
    if (c.includes("dry") || c.includes("arid")) return "border-l-2 border-l-amber-500/50";
    if (c.includes("temperate")) return "border-l-2 border-l-green-500/50";
    return "border-l-2 border-l-violet-500/30";
  }

  return (
    <div id={`dest-${stay.code}-${stay.arrivalIso}`} className={`border-b border-white/[0.04] last:border-b-0 ${getClimateBorderClass()}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left tap-scale"
      >
        <span className="text-xl leading-none shrink-0">{stay.flag}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-white">{city}</span>
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Moon className="h-2.5 w-2.5" />
              {stay.nights} {locale === "es" ? "noches" : "nights"}
            </span>
            <span className="text-xs text-gray-600">
              {formatDateShort(stay.arrivalIso, locale)} → {formatDateShort(stay.departureIso, locale)}
            </span>
          </div>
          {profile && (
            <div className="mt-0.5">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Thermometer className="h-2.5 w-2.5" />
                  {stay.tempMin}–{stay.tempMax}°C
                </span>
                {climate && (
                  <span className="text-xs text-gray-600 truncate">{climate}</span>
                )}
              </div>
              {/* Temperature gradient bar */}
              <div className="mt-2 mb-1">
                <div className="h-1.5 rounded-full overflow-hidden bg-gradient-to-r from-blue-500 via-green-400 to-orange-500 opacity-60" />
                <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
                  <span>{stay.tempMin}°</span>
                  <span>{stay.tempMax}°</span>
                </div>
              </div>
              {/* Weather alert pills */}
              {profile.weatherAlerts.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {profile.weatherAlerts.map((alert, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300">
                      ⚠ {locale === "es" ? alert.es : alert.en}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-gray-500 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && profile && (
        <div>
          {/* Tab bar */}
          <div className="flex border-b border-white/[0.06] px-4">
            {(["packing", "activities", "tips"] as const).map((tab) => {
              const labels = {
                packing: locale === "es" ? "Equipaje" : "Packing",
                activities: locale === "es" ? "Qué hacer" : "What to do",
                tips: locale === "es" ? "Tips" : "Tips",
              };
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px ${
                    activeTab === tab
                      ? "border-violet-500 text-violet-300"
                      : "border-transparent text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {labels[tab]}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="px-4 py-3">
            {activeTab === "packing" && (
              <ul className="space-y-1">
                {profile.packing.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                    <span className="text-gray-600 mt-0.5">•</span>
                    <span>{locale === "es" ? item.es : item.en}</span>
                  </li>
                ))}
              </ul>
            )}
            {activeTab === "activities" && profile && (
              <ul className="space-y-2">
                {profile.activities.length === 0 ? (
                  <li className="text-xs text-gray-500">
                    {locale === "es" ? "Sin actividades registradas." : "No activities listed."}
                  </li>
                ) : (
                  profile.activities.map((act, i) => (
                    <li key={i} className="text-xs">
                      <span className="font-medium text-gray-300">{locale === "es" ? act.name : act.nameEn}</span>
                      {(locale === "es" ? act.desc : act.descEn) && (
                        <span className="text-gray-500 ml-1">— {locale === "es" ? act.desc : act.descEn}</span>
                      )}
                    </li>
                  ))
                )}
              </ul>
            )}
            {activeTab === "tips" && (
              <ul className="space-y-1">
                {tips.map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                    <span className="text-violet-500 mt-0.5">✦</span>
                    <span>{locale === "es" ? t.es : t.en}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PackingSection({
  stays,
  locale,
  aiPacking,
}: {
  stays: StayInfo[];
  locale: "es" | "en";
  aiPacking?: TripAdviceResult["packing"];
}) {
  const [open, setOpen] = useState(true);
  const [listCopied, setListCopied] = useState(false);

  const signature = staysKey(stays);

  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem(`packing-${signature}`) ?? "{}") as Record<string, boolean>;
    } catch {
      return {};
    }
  });

  function toggleItem(item: string) {
    const next = { ...checked, [item]: !checked[item] };
    setChecked(next);
    try {
      localStorage.setItem(`packing-${signature}`, JSON.stringify(next));
    } catch {}
  }

  if (aiPacking && aiPacking.length > 0) {
    const copyList = () => {
      const text = aiPacking
        .map(
          (i) =>
            `${i.priority === "essential" ? "🔴" : i.priority === "recommended" ? "🟡" : "⚪"} ${i.item}: ${i.reason}`,
        )
        .join("\n");
      navigator.clipboard.writeText(text).catch(() => {});
      setListCopied(true);
      setTimeout(() => setListCopied(false), 1500);
    };

    return (
      <div className="border-t border-white/[0.04]">
        <div className="w-full flex items-center gap-2 px-4 py-2 text-left">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 flex-1 tap-scale"
          >
            <span className="text-xs leading-none">🧳</span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex-1">
              {locale === "es" ? "Equipaje del viaje" : "Trip packing"}
            </span>
            <span className="text-xs text-gray-600">{aiPacking.length}</span>
          </button>
          <button
            onClick={copyList}
            className="text-gray-500 hover:text-gray-300 transition-colors"
            title={locale === "es" ? "Copiar lista" : "Copy list"}
          >
            {listCopied ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={() => {
              const text = aiPacking
                .map((i) => `${checked[i.item] ? "✅" : "☐"} ${i.item}`)
                .join("\n");
              window.open(
                `https://wa.me/?text=${encodeURIComponent((locale === "es" ? "Lista de equipaje:\n" : "Packing list:\n") + text)}`,
                "_blank",
              );
            }}
            className="flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 transition-colors"
            title="WhatsApp"
          >
            <span>WhatsApp</span>
          </button>
          <button onClick={() => setOpen((v) => !v)}>
            <ChevronDown
              className={`h-3 w-3 text-gray-600 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        {open && (
          <div className="px-4 pb-3">
            {(["essential", "recommended", "optional"] as const).map((priority) => {
              const items = aiPacking.filter((item) => item.priority === priority);
              if (items.length === 0) return null;
              const labels = {
                essential: locale === "es" ? "Esencial" : "Essential",
                recommended: locale === "es" ? "Recomendado" : "Recommended",
                optional: locale === "es" ? "Opcional" : "Optional",
              };
              const colors = {
                essential: "text-red-400 bg-red-500/10 border-red-500/20",
                recommended: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
                optional: "text-gray-400 bg-white/[0.04] border-white/[0.08]",
              };
              return (
                <div key={priority} className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${colors[priority]}`}>
                      {labels[priority]}
                    </span>
                    <span className="text-[10px] text-gray-600">{items.length}</span>
                  </div>
                  <ul className="space-y-2">
                    {items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={!!checked[item.item]}
                          onChange={() => toggleItem(item.item)}
                          className="w-5 h-5 mt-0.5 shrink-0 cursor-pointer accent-violet-500"
                        />
                        <div>
                          <span className="text-gray-300">{item.item}</span>
                          {item.reason && <p className="text-[11px] text-gray-500 mt-0.5">{item.reason}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Static fallback: temp ranges per destination
  const tempRanges = stays
    .map((s) => ({ min: s.tempMin, max: s.tempMax }))
    .filter((r) => r.min !== 20 || r.max !== 30);

  if (tempRanges.length === 0) return null;

  const globalMin = Math.min(...tempRanges.map((r) => r.min));
  const globalMax = Math.max(...tempRanges.map((r) => r.max));
  const hasMixedClimate = globalMax - globalMin >= 10;

  const items =
    locale === "es"
      ? [
          `Temperatura del viaje: ${globalMin}–${globalMax}°C`,
          hasMixedClimate ? `Clima mixto (${globalMin}°C frío → ${globalMax}°C cálido) — empacá en capas` : null,
          "Protector solar FPS 50+",
          "Paraguas compacto",
          "Calzado cómodo para caminar",
        ].filter(Boolean) as string[]
      : [
          `Trip temperature range: ${globalMin}–${globalMax}°C`,
          hasMixedClimate ? `Mixed climate (${globalMin}°C cold → ${globalMax}°C warm) — pack in layers` : null,
          "SPF 50+ sunscreen",
          "Compact umbrella",
          "Comfortable walking shoes",
        ].filter(Boolean) as string[];

  return (
    <div className="border-t border-white/[0.04]">
      <SectionHeader
        emoji="🧳"
        label={locale === "es" ? "Equipaje del viaje" : "Trip packing"}
        open={open}
        onToggle={() => setOpen((v) => !v)}
      />
      {open && (
        <ul className="px-4 pb-3 space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span
                className={`shrink-0 mt-1 text-xs ${
                  i === 0
                    ? "text-blue-400"
                    : i === 1 && hasMixedClimate
                    ? "text-orange-400"
                    : "text-gray-600"
                }`}
              >
                {i === 0 ? "📊" : i === 1 && hasMixedClimate ? "⚠️" : "•"}
              </span>
              <span
                className={`text-xs leading-snug ${
                  i === 0
                    ? "text-blue-300 font-medium"
                    : i === 1 && hasMixedClimate
                    ? "text-orange-300"
                    : "text-gray-300"
                }`}
              >
                {item}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

// ── Activity chips ────────────────────────────────────────────────────────────

const ACTIVITY_CHIPS: { id: string; label: string; labelEn: string; emoji: string }[] = [
  { id: "playa",    label: "Playa",    labelEn: "Beach",    emoji: "🏖️" },
  { id: "trabajo",  label: "Trabajo",  labelEn: "Work",     emoji: "💼" },
  { id: "montana",  label: "Montaña",  labelEn: "Mountain", emoji: "🏔️" },
  { id: "ciudad",   label: "Ciudad",   labelEn: "City",     emoji: "🏙️" },
  { id: "deportes", label: "Deportes", labelEn: "Sports",   emoji: "⚽" },
  { id: "formal",   label: "Formal",   labelEn: "Formal",   emoji: "👔" },
];

// ── Cache ─────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas
const CACHE_PREFIX = "tc_advice_";

function readCache(key: string): TripAdviceResult | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as { data: TripAdviceResult; timestamp: number };
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function writeCache(key: string, data: TripAdviceResult) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {}
}

export function TripAdvisor({ flights, locale }: TripAdvisorProps) {
  const [expanded, setExpanded] = useState(true);
  const [aiStatus, setAiStatus] = useState<"idle" | "loading" | "done" | "failed">("idle");
  const [aiData, setAiData] = useState<TripAdviceResult | null>(null);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [activitiesConfirmed, setActivitiesConfirmed] = useState(false);
  const fetchedKey = useRef<string>("");

  const stays = computeStays(flights);
  const key = staysKey(stays);

  function toggleActivity(id: string) {
    setSelectedActivities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  }

  function handleGenerateAdvice() {
    setActivitiesConfirmed(true);
  }

  useEffect(() => {
    if (!activitiesConfirmed) return;
    if (stays.length === 0 || fetchedKey.current === key) return;
    fetchedKey.current = key;

    // Check localStorage cache first (activities change the cache key)
    const activitySuffix = selectedActivities.sort().join(",");
    const cacheKey = activitySuffix ? `${key}|${activitySuffix}` : key;
    const cached = readCache(cacheKey);
    if (cached) {
      setAiData(cached);
      setAiStatus("done");
      return;
    }

    setAiStatus("loading");

    const payload = stays.map((s) => ({
      code: s.code,
      city: locale === "es" ? s.city : s.cityEn,
      nights: s.nights,
      arrivalDate: formatDateShort(s.arrivalIso, locale),
      departureDate: formatDateShort(s.departureIso, locale),
      tempMin: s.tempMin,
      tempMax: s.tempMax,
      climate: locale === "es" ? s.climate : s.climateEn,
    }));

    fetch("/api/trip-advice", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stays: payload, locale, activities: selectedActivities }),
    })
      .then((r) => r.json())
      .then((body: { data?: TripAdviceResult; error?: string }) => {
        if (body.data) {
          writeCache(cacheKey, body.data);
          setAiData(body.data);
          setAiStatus("done");
        } else {
          setAiStatus("failed");
        }
      })
      .catch(() => setAiStatus("failed"));
  }, [activitiesConfirmed, key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (stays.length === 0) return null;

  const totalNights = stays.reduce((s, x) => s + x.nights, 0);
  const isLoadingAi = aiStatus === "loading";

  return (
    <div
      className="rounded-2xl border border-white/[0.07] overflow-hidden"
      style={{ background: "linear-gradient(150deg, rgba(12,12,22,0.97) 0%, rgba(8,8,16,0.99) 100%)" }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-4 py-3.5 flex items-center gap-3 text-left tap-scale"
      >
        <MapPin className="h-4 w-4 text-blue-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white leading-snug">
            {locale === "es" ? "Consejos para tu viaje" : "Trip tips"}
          </p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {stays.length} {locale === "es" ? "destinos" : "destinations"} ·{" "}
            {totalNights} {locale === "es" ? "noches" : "nights"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isLoadingAi && <TripCopilotIcon spinning size={40} />}
          {aiStatus === "done" && <TripCopilotIcon size={40} />}
          <div className="flex items-center gap-1 flex-wrap">
            {stays.map((stay, i) => (
              <span key={stay.code + stay.arrivalIso} className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const el = document.getElementById(`dest-${stay.code}-${stay.arrivalIso}`);
                    el?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-200 transition-colors tap-scale"
                >
                  <span>{stay.flag}</span>
                  <span>{locale === "es" ? stay.city : stay.cityEn}</span>
                </button>
                {i < stays.length - 1 && <span className="text-gray-600 text-[10px] mx-0.5">→</span>}
              </span>
            ))}
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-gray-500 shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {/* Content */}
      {expanded && (
        <div className="border-t border-white/[0.05]">
          {/* Activity chip selector — only before first fetch */}
          {!activitiesConfirmed && (
            <div className="px-4 py-3 border-b border-white/[0.04]">
              {/* Empty state description */}
              <div className="mb-4 space-y-1">
                <p className="text-xs text-gray-400 leading-relaxed">
                  {locale === "es"
                    ? "La IA puede prepararte consejos de:"
                    : "The AI can prepare tips about:"}
                </p>
                <ul className="space-y-0.5 text-xs text-gray-500">
                  <li>🌡 {locale === "es" ? "Clima y qué llevar" : "Weather and what to pack"}</li>
                  <li>🎯 {locale === "es" ? "Qué hacer en cada ciudad" : "Things to do in each city"}</li>
                  <li>💡 {locale === "es" ? "Tips locales" : "Local tips"}</li>
                </ul>
              </div>
              {/* Destination preview strip */}
              {stays.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-hide">
                  {stays.map((stay) => (
                    <div key={stay.code + stay.arrivalIso} className="shrink-0 flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2">
                      <span className="text-lg">{stay.flag}</span>
                      <div>
                        <p className="text-xs font-medium text-gray-300">{locale === "es" ? stay.city : stay.cityEn}</p>
                        <p className="text-[10px] text-gray-500">{stay.nights} {locale === "es" ? "noches" : "nights"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                {locale === "es" ? "¿Qué vas a hacer en este viaje?" : "What are you doing on this trip?"}
              </p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {ACTIVITY_CHIPS.map((chip) => {
                  const selected = selectedActivities.includes(chip.id);
                  return (
                    <button
                      key={chip.id}
                      onClick={() => toggleActivity(chip.id)}
                      className={`inline-flex items-center gap-1 text-xs font-medium px-4 py-2 rounded-xl border transition-all ${
                        selected
                          ? "bg-violet-600/20 text-violet-200 border-violet-500/50 scale-[1.02]"
                          : "bg-white/[0.04] text-gray-300 border-white/[0.08] hover:border-white/20"
                      }`}
                    >
                      {selected && <span className="text-violet-400 text-[10px]">✓ </span>}
                      <span>{chip.emoji}</span>
                      <span>{locale === "es" ? chip.label : chip.labelEn}</span>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={handleGenerateAdvice}
                className="shimmer-btn w-full py-2 rounded-xl bg-violet-700/40 border border-violet-500/40 text-sm font-semibold text-violet-100 hover:bg-violet-700/60 transition-colors"
              >
                {locale === "es" ? "Pedirle consejos a la IA →" : "Ask the AI for tips →"}
              </button>
            </div>
          )}

          {/* AI summary banner */}
          {aiData?.summary && (
            <div className="px-4 py-3 border-b border-white/[0.04] flex items-start gap-2">
              <TripCopilotIcon size={32} />
              <p className="text-xs text-gray-300 leading-relaxed">{aiData.summary}</p>
            </div>
          )}

          {/* Packing section — shown before destination cards when AI data is ready */}
          {aiData && (
            <PackingSection
              stays={stays}
              locale={locale}
              aiPacking={aiData.packing}
            />
          )}

          {/* Per-destination cards */}
          <div className="divide-y divide-white/[0.04]">
            {stays.map((stay) => {
              const aiTips = aiData?.destination_tips?.find((d) => d.code === stay.code)?.tips;
              return (
                <DestinationCard
                  key={`${stay.code}-${stay.arrivalIso}`}
                  stay={stay}
                  locale={locale}
                  aiTips={aiTips}
                />
              );
            })}
          </div>

          {/* Packing section — static fallback (no AI data yet) */}
          {!aiData && (
            <PackingSection
              stays={stays}
              locale={locale}
            />
          )}

          {/* by_leg notes */}
          {aiData?.by_leg && aiData.by_leg.length > 0 && (
            <div className="border-t border-white/[0.04] px-4 py-3 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-600">
                {locale === "es" ? "Conexiones" : "Connections"}
              </p>
              {aiData.by_leg.map((leg, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-xs font-mono text-gray-500 shrink-0 mt-0.5">
                    {leg.from}→{leg.to}
                  </span>
                  <p className="text-xs text-gray-400 leading-snug">{leg.note}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
