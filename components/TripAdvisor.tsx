"use client";

import { useState, useCallback } from "react";
import { ChevronDown, Sparkles, MapPin, Moon, Thermometer, Loader2, AlertCircle } from "lucide-react";
import { getDestinationProfile, getDestinationConfig } from "@/lib/destinationConfig";

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
  /** Month of arrival (1-12) */
  month: number;
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

/** Compute stays of ≥2 nights from the flights array */
function computeStays(flights: FlightItem[]): StayInfo[] {
  const stays: StayInfo[] = [];

  for (let i = 0; i < flights.length; i++) {
    const dest = flights[i].destinationCode;
    // Find the next flight that departs from this destination
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

// ── Sub-components ────────────────────────────────────────────────────────────

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
        <span className="text-[10px] text-gray-600">{count}</span>
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
}: {
  stay: StayInfo;
  locale: "es" | "en";
}) {
  const [open, setOpen] = useState(true);
  const [packingOpen, setPackingOpen] = useState(true);
  const [activitiesOpen, setActivitiesOpen] = useState(true);
  const [tipsOpen, setTipsOpen] = useState(false);

  const profile = getDestinationProfile(stay.code, stay.arrivalIso);
  const config = getDestinationConfig(stay.code);

  const city = locale === "es" ? stay.city : stay.cityEn;
  const climate = profile
    ? locale === "es"
      ? profile.climateDesc
      : profile.climateDescEn
    : null;

  return (
    <div className="border-b border-white/[0.04] last:border-b-0">
      {/* Destination header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left tap-scale"
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
              {formatDateShort(stay.arrivalIso, locale)} → {formatDateShort(stay.departureIso, locale)}
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

      {open && profile && (
        <div className="divide-y divide-white/[0.03]">
          {/* Weather alerts (inline, no collapse) */}
          {profile.weatherAlerts.length > 0 && (
            <div className="px-4 py-2 space-y-1">
              {profile.weatherAlerts.map((w, i) => (
                <p key={i} className="text-xs text-yellow-400/80 flex items-start gap-1.5">
                  <span className="shrink-0 mt-0.5">⚠️</span>
                  <span>{locale === "es" ? w.es : w.en}</span>
                </p>
              ))}
            </div>
          )}

          {/* Packing */}
          {profile.packing.length > 0 && (
            <div>
              <SectionHeader
                emoji="👕"
                label={locale === "es" ? "Equipaje" : "Packing"}
                count={profile.packing.length}
                open={packingOpen}
                onToggle={() => setPackingOpen((v) => !v)}
              />
              {packingOpen && (
                <ul className="px-4 pb-2 space-y-1.5">
                  {profile.packing.map((p, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-gray-600 shrink-0 mt-1 text-[10px]">•</span>
                      <span className="text-xs text-gray-300 leading-snug">
                        {locale === "es" ? p.es : p.en}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Activities */}
          {profile.activities && profile.activities.length > 0 && (
            <div>
              <SectionHeader
                emoji="🗺️"
                label={locale === "es" ? "Qué hacer" : "Things to do"}
                count={profile.activities.length}
                open={activitiesOpen}
                onToggle={() => setActivitiesOpen((v) => !v)}
              />
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
          {profile.tips.length > 0 && (
            <div>
              <SectionHeader
                emoji="💡"
                label={locale === "es" ? "Tips" : "Tips"}
                count={profile.tips.length}
                open={tipsOpen}
                onToggle={() => setTipsOpen((v) => !v)}
              />
              {tipsOpen && (
                <ul className="px-4 pb-2 space-y-1.5">
                  {profile.tips.map((t, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-gray-600 shrink-0 mt-1 text-[10px]">•</span>
                      <span className="text-xs text-gray-300 leading-snug">
                        {locale === "es" ? t.es : t.en}
                      </span>
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

// ── Cross-trip packing summary ────────────────────────────────────────────────

function CrossTripSummary({
  stays,
  locale,
}: {
  stays: StayInfo[];
  locale: "es" | "en";
}) {
  const [open, setOpen] = useState(true);

  // Collect all packing items and deduplicate loosely
  const tempRanges = stays.map((s) => {
    const p = getDestinationProfile(s.code, s.arrivalIso);
    return p ? { min: p.tempMinC, max: p.tempMaxC } : null;
  }).filter(Boolean) as { min: number; max: number }[];

  const globalMin = Math.min(...tempRanges.map((r) => r.min));
  const globalMax = Math.max(...tempRanges.map((r) => r.max));
  const tempSpread = globalMax - globalMin;
  const hasMixedClimate = tempSpread >= 10;

  const es_items = [
    `Rango de temperatura total del viaje: ${globalMin}–${globalMax}°C`,
    hasMixedClimate
      ? `Clima mixto detectado (${globalMin}°C en frío vs ${globalMax}°C en tropical) — empacá en capas`
      : null,
    "Protector solar FPS 50+ (obligatorio en GCM y MIA)",
    "Una campera de abrigo para NY (noches pueden bajar a 8°C)",
    "Campera liviana para el AC de restaurantes en toda la ruta",
    "Paraguas compacto — lluvia posible en todos los destinos",
    "Calzado cómodo para caminar (vas a caminar mucho en NYC y MIA)",
    "Documentos: pasaporte vigente + seguro de viaje activo",
  ].filter(Boolean) as string[];

  const en_items = [
    `Total trip temperature range: ${globalMin}–${globalMax}°C`,
    hasMixedClimate
      ? `Mixed climate detected (${globalMin}°C cold vs ${globalMax}°C tropical) — pack in layers`
      : null,
    "SPF 50+ sunscreen (essential in GCM and MIA)",
    "A warm jacket for NYC (nights can drop to 8°C)",
    "Light jacket for restaurant A/C throughout the trip",
    "Compact umbrella — rain possible at all destinations",
    "Comfortable walking shoes (lots of walking in NYC and MIA)",
    "Documents: valid passport + active travel insurance",
  ].filter(Boolean) as string[];

  const items = locale === "es" ? es_items : en_items;

  return (
    <div className="border-b border-white/[0.04] last:border-b-0">
      <SectionHeader
        emoji="🧳"
        label={locale === "es" ? "Resumen de equipaje del viaje" : "Full-trip packing summary"}
        open={open}
        onToggle={() => setOpen((v) => !v)}
      />
      {open && (
        <ul className="px-4 pb-3 space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span
                className={`shrink-0 mt-1 text-[10px] ${
                  i === 0 ? "text-blue-400" : i === 1 && hasMixedClimate ? "text-orange-400" : "text-gray-600"
                }`}
              >
                {i === 0 ? "📊" : i === 1 && hasMixedClimate ? "⚠️" : "•"}
              </span>
              <span className={`text-xs leading-snug ${i === 0 ? "text-blue-300 font-medium" : i === 1 && hasMixedClimate ? "text-orange-300" : "text-gray-300"}`}>
                {item}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Claude AI card ─────────────────────────────────────────────────────────────

function ClaudeAdvisorCard({
  stays,
  locale,
}: {
  stays: StayInfo[];
  locale: "es" | "en";
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [advice, setAdvice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAdvice = useCallback(async () => {
    setStatus("loading");
    setError(null);

    const payload = stays.map((s) => {
      const p = getDestinationProfile(s.code, s.arrivalIso);
      const c = getDestinationConfig(s.code);
      return {
        code: s.code,
        city: locale === "es" ? s.city : s.cityEn,
        nights: s.nights,
        arrivalDate: formatDateShort(s.arrivalIso, locale),
        departureDate: formatDateShort(s.departureIso, locale),
        tempMin: p?.tempMinC ?? 20,
        tempMax: p?.tempMaxC ?? 30,
        climate:
          locale === "es"
            ? (p?.climateDesc ?? "")
            : (p?.climateDescEn ?? ""),
      };
    });

    try {
      const res = await fetch("/api/trip-advice", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stays: payload, locale }),
      });
      const data = await res.json() as { advice?: string; error?: string };
      if (!res.ok || data.error) {
        setError(data.error ?? "Error");
        setStatus("error");
      } else {
        setAdvice(data.advice ?? "");
        setStatus("done");
      }
    } catch {
      setError(locale === "es" ? "Sin conexión" : "No connection");
      setStatus("error");
    }
  }, [stays, locale]);

  return (
    <div className="mx-4 mb-4 mt-2 rounded-xl border border-purple-700/30 bg-purple-950/20 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-purple-700/20">
        <Sparkles className="h-4 w-4 text-purple-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-purple-200">
            {locale === "es" ? "Análisis IA del viaje" : "AI trip analysis"}
          </p>
          <p className="text-[11px] text-purple-400/70">
            {locale === "es"
              ? "Recomendaciones personalizadas con Claude"
              : "Personalized recommendations with Claude"}
          </p>
        </div>
      </div>

      <div className="px-4 py-3">
        {status === "idle" && (
          <button
            onClick={fetchAdvice}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-purple-600/40 bg-purple-900/30 text-purple-300 hover:bg-purple-900/50 transition-colors py-2.5 text-sm font-medium"
          >
            <Sparkles className="h-4 w-4" />
            {locale === "es" ? "✨ Generar análisis con IA" : "✨ Generate AI analysis"}
          </button>
        )}

        {status === "loading" && (
          <div className="flex items-center justify-center gap-2 py-4 text-purple-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">
              {locale === "es" ? "Analizando tu viaje…" : "Analyzing your trip…"}
            </span>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-2">
            <div className="flex items-start gap-2 text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="text-xs">{error}</p>
            </div>
            <button
              onClick={fetchAdvice}
              className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              {locale === "es" ? "Reintentar" : "Try again"}
            </button>
          </div>
        )}

        {status === "done" && advice && (
          <div className="space-y-3">
            {advice.split("\n").filter((l) => l.trim()).map((line, i) => {
              const isBold = line.startsWith("**") || /^\d+\./.test(line) || line.startsWith("###");
              const clean = line.replace(/\*\*/g, "").replace(/^###\s*/, "").replace(/^\d+\.\s*/, "");
              return (
                <p
                  key={i}
                  className={`text-xs leading-relaxed ${
                    isBold ? "font-semibold text-purple-200 mt-2" : "text-gray-300"
                  }`}
                >
                  {clean}
                </p>
              );
            })}
            <button
              onClick={() => { setStatus("idle"); setAdvice(null); }}
              className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors"
            >
              {locale === "es" ? "Regenerar" : "Regenerate"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function TripAdvisor({ flights, locale }: TripAdvisorProps) {
  const [expanded, setExpanded] = useState(true);

  const stays = computeStays(flights);

  if (stays.length === 0) return null;

  const totalNights = stays.reduce((s, x) => s + x.nights, 0);

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
            {locale === "es" ? "Recomendaciones del viaje" : "Trip recommendations"}
          </p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {stays.length}{" "}
            {locale === "es" ? "destinos" : "destinations"} ·{" "}
            {totalNights} {locale === "es" ? "noches totales" : "total nights"}
          </p>
        </div>
        <div className="flex gap-1 shrink-0">
          {stays.map((s) => (
            <span key={s.code} className="text-base">{s.flag}</span>
          ))}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-gray-500 shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {/* Content */}
      {expanded && (
        <div className="border-t border-white/[0.05]">
          {/* Per-destination cards */}
          <div className="divide-y divide-white/[0.04]">
            {stays.map((stay) => (
              <DestinationCard key={`${stay.code}-${stay.arrivalIso}`} stay={stay} locale={locale} />
            ))}
          </div>

          {/* Cross-trip summary */}
          <div className="border-t border-white/[0.04]">
            <CrossTripSummary stays={stays} locale={locale} />
          </div>

          {/* Claude AI card */}
          <div className="border-t border-white/[0.04] pt-3">
            <ClaudeAdvisorCard stays={stays} locale={locale} />
          </div>
        </div>
      )}
    </div>
  );
}
