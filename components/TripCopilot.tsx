"use client";

import { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  Moon,
  Thermometer,
  RefreshCw,
  AlertTriangle,
  Send,
  MessageCircle,
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
import { AirportStatusMap } from "@/lib/types";
import { WeatherData } from "@/hooks/useWeather";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FlightItem {
  isoDate: string;
  originCode: string;
  destinationCode: string;
  destinationName: string;
  destinationNameEn: string;
  // Optional — present when passed from MyFlightsPanel via FlightData
  flightNum?: string;
  departureTime?: string;
  arrivalTime?: string;
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
  tripName?: string;
  statusMap?: AirportStatusMap;
  weatherMap?: Record<string, WeatherData>;
}

// ── Chat types ─────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
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
      <p className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
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
                    className={`shrink-0 text-[11px] font-semibold px-1.5 py-0.5 rounded-full border ${
                      PRIORITY_STYLE[pk.priority]
                    }`}
                  >
                    {PRIORITY_LABEL[pk.priority][locale]}
                  </span>
                  <div className="min-w-0">
                    <span className="text-xs text-gray-200">{pk.item}</span>
                    {pk.reason && (
                      <span className="text-xs text-gray-500 ml-1.5">{pk.reason}</span>
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
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Moon className="h-2.5 w-2.5" />
              {stay.nights} {locale === "es" ? "noches" : "nights"}
            </span>
            <span className="text-xs text-gray-600">
              {fmtDate(stay.arrivalIso, locale)} → {fmtDate(stay.departureIso, locale)}
            </span>
          </div>
          {profile && (
            <div className="flex items-center gap-2 mt-0.5">
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Thermometer className="h-2.5 w-2.5" />
                {profile.tempMinC}–{profile.tempMaxC}°C
              </span>
              {climate && (
                <span className="text-xs text-gray-600 truncate">{climate}</span>
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
                <span className="text-xs text-gray-600">{profile.activities.length}</span>
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
              <p className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2 flex items-center gap-1">
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
                      <span className="text-gray-600 shrink-0 mt-1 text-xs">•</span>
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
      <p className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
        ✈️ {locale === "es" ? "Por tramo" : "Per leg"}
      </p>
      <ul className="space-y-1.5">
        {data.by_leg.map((leg, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-xs text-blue-500 font-mono shrink-0 mt-0.5">
              {leg.from}→{leg.to}
            </span>
            <span className="text-xs text-gray-400 leading-snug">{leg.note}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Airport context builder ───────────────────────────────────────────────────

function buildAirportContext(
  flights: FlightItem[],
  statusMap?: AirportStatusMap,
  weatherMap?: Record<string, WeatherData>,
): string {
  const allCodes = flights.flatMap((f) => [f.originCode, f.destinationCode]);
  const codes = allCodes.filter((code, idx) => allCodes.indexOf(code) === idx);
  return codes.map((code) => {
    const lines: string[] = [`${code}:`];
    const weather = weatherMap?.[code];
    if (weather) lines.push(`  clima: ${weather.temperature}°C, ${weather.description}`);
    const faa = statusMap?.[code];
    if (faa) {
      if (faa.status !== "ok") lines.push(`  FAA: ${faa.status}`);
      if (faa.delays) {
        const min = faa.delays.minMinutes ?? "?";
        const max = faa.delays.maxMinutes ?? "?";
        lines.push(`  demoras: ${min}–${max} min (${faa.delays.reason})`);
      }
      if (faa.groundDelay) lines.push(`  ground delay: avg ${faa.groundDelay.avgMinutes} min (${faa.groundDelay.reason})`);
      if (faa.groundStop) lines.push(`  ground stop hasta: ${faa.groundStop.endTime ?? "indefinido"}`);
    }
    return lines.join("\n");
  }).join("\n\n");
}

// ── Chat section ──────────────────────────────────────────────────────────────

function ChatSection({
  flights,
  tripName,
  locale,
  statusMap,
  weatherMap,
}: {
  flights: FlightItem[];
  tripName: string;
  locale: "es" | "en";
  statusMap?: AirportStatusMap;
  weatherMap?: Record<string, WeatherData>;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const quickPrompts = locale === "es"
    ? ["¿Llego a la conexión?", "¿Qué llevar?", "¿Hay demoras hoy?", "Resumen del viaje"]
    : ["Will I make my connection?", "What to pack?", "Any delays today?", "Trip summary"];

  async function sendMessage(q: string) {
    if (!q.trim() || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: q.trim() }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/trip-copilot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          question: q.trim(),
          tripContext: {
            flights: flights.map((f) => ({
              // flightNum is "DL 1514" — strip space to get "DL1514"
              flightCode:      (f.flightNum ?? "").replace(/\s+/g, ""),
              originCode:      f.originCode,
              destinationCode: f.destinationCode,
              isoDate:         f.isoDate,
              departureTime:   f.departureTime ?? undefined,
              arrivalTime:     f.arrivalTime   ?? undefined,
            })),
            tripName,
            userLocalTime: new Date().toLocaleString("sv-SE", { timeZoneName: "short" }),
            userTimezone:  Intl.DateTimeFormat().resolvedOptions().timeZone,
            airportContext: buildAirportContext(flights, statusMap, weatherMap),
          },
        }),
      });

      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        const errMsg = body.error ?? (locale === "es" ? "No se pudo obtener respuesta." : "Could not get a response.");
        setMessages((prev) => [...prev, { role: "assistant", content: errMsg }]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: answer };
          return updated.slice(-10);
        });
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: locale === "es" ? "Error al conectar con el asistente." : "Error connecting to assistant." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    await sendMessage(input);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <div className="border-t border-white/[0.04]">
      {/* Section header */}
      <div className="flex items-center gap-2 px-4 py-2">
        <MessageCircle className="h-3 w-3 text-purple-400 shrink-0" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex-1">
          {locale === "es" ? "Preguntar al copiloto" : "Ask copilot"}
        </span>
        <TripCopilotLogo className="h-4 w-auto opacity-60" />
      </div>

      {/* Message list */}
      {messages.length > 0 && (
        <div className="px-4 pb-2 space-y-2 max-h-56 overflow-y-auto">
          {messages.slice(-10).map((m, i) => (
            <div
              key={i}
              className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "assistant" && (
                <TripCopilotLogo className="h-4 w-auto shrink-0 mt-0.5 opacity-80" />
              )}
              <div
                className={`rounded-xl px-3 py-1.5 text-xs leading-relaxed max-w-[85%] ${
                  m.role === "user"
                    ? "bg-purple-900/40 text-purple-100 border border-purple-700/30"
                    : "bg-white/[0.04] text-gray-300 border border-white/[0.06]"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex gap-2 justify-start">
              <TripCopilotLogo className="h-4 w-auto shrink-0 mt-0.5 opacity-80" />
              <div className="rounded-xl px-3 py-1.5 text-xs text-gray-500 bg-white/[0.04] border border-white/[0.06] animate-pulse">
                {locale === "es" ? "Pensando…" : "Thinking…"}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Quick prompt chips */}
      <div className="flex gap-2 flex-wrap px-4 mt-1 mb-2">
        {quickPrompts.map((prompt) => (
          <button
            key={prompt}
            onClick={() => void sendMessage(prompt)}
            disabled={loading}
            className="text-xs bg-violet-900/40 hover:bg-violet-800/60 border border-violet-700/40 text-violet-300 px-3 py-1.5 rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input row */}
      <div className="px-4 pb-3 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={locale === "es" ? "Preguntá algo sobre tu viaje…" : "Ask something about your trip…"}
          disabled={loading}
          className="flex-1 min-w-0 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-gray-200 placeholder-gray-600 outline-none focus:border-purple-700/50 transition-colors disabled:opacity-50"
        />
        <button
          onClick={() => void handleSend()}
          disabled={!input.trim() || loading}
          className="p-1.5 rounded-lg bg-purple-800/40 border border-purple-700/30 text-purple-300 hover:bg-purple-800/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={locale === "es" ? "Enviar pregunta" : "Send question"}
        >
          <Send className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function TripCopilot({ flights, locale, tripName = "Mi viaje", statusMap, weatherMap }: TripCopilotProps) {
  const [expanded, setExpanded] = useState(false);
  const { data, status, error, refresh } = useTripAdvice(flights, locale);

  const stays = computeStays(flights);
  if (stays.length === 0) return null;

  const totalNights = stays.reduce((s, x) => s + x.nights, 0);

  // Check if any stay has weather alerts (for collapsed pill)
  const hasAlerts = stays.some((s) => {
    const p = getDestinationProfile(s.code, s.arrivalIso);
    return (p?.weatherAlerts ?? []).length > 0;
  });

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
        className="w-full px-4 py-3 flex items-center gap-3 text-left tap-scale"
      >
        {/* Logo — smaller when collapsed */}
        <TripCopilotLogo className={`shrink-0 w-auto transition-all duration-200 ${expanded ? "h-12" : "h-8"}`} />

        <div className="flex-1 min-w-0">
          {/* Title */}
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-white leading-snug tracking-tight">
              TripCopilot
            </p>
            {status === "loading" && expanded && (
              <span className="text-[11px] text-gray-600 animate-pulse">
                {locale === "es" ? "analizando…" : "analyzing…"}
              </span>
            )}
          </div>
          {/* Collapsed subtitle */}
          {!expanded && (
            <p className="text-xs text-gray-600 leading-snug mt-0.5">
              {locale === "es" ? "Tu copiloto para este viaje" : "Your travel copilot"}
            </p>
          )}

          {/* Collapsed: feature pills showing what's inside */}
          {!expanded && (
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-white/[0.04] border border-white/[0.06] rounded-full px-2 py-0.5">
                👕 {locale === "es" ? "Equipaje" : "Packing"}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-white/[0.04] border border-white/[0.06] rounded-full px-2 py-0.5">
                💡 Tips
              </span>
              {hasAlerts && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-600 bg-yellow-950/30 border border-yellow-800/30 rounded-full px-2 py-0.5">
                  ⚠️ {locale === "es" ? "Alertas" : "Alerts"}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-white/[0.04] border border-white/[0.06] rounded-full px-2 py-0.5">
                🗺️ {stays.length} {locale === "es" ? "destinos" : "destinations"}
              </span>
            </div>
          )}

          {/* Expanded: subtitle */}
          {expanded && (
            <p className="text-[11px] text-gray-600 mt-0.5">
              {stays.length} {locale === "es" ? "destinos" : "destinations"} ·{" "}
              {totalNights} {locale === "es" ? "noches" : "nights"}
            </p>
          )}
        </div>

        {/* Collapsed: CTA text + flags; Expanded: flags + refresh */}
        <div className="flex items-center gap-2 shrink-0">
          {!expanded && (
            <span className="text-xs text-gray-600">
              {locale === "es" ? "Ver guía →" : "Open guide →"}
            </span>
          )}
          {expanded && (
            <>
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
            </>
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

          {/* Chat */}
          <ChatSection flights={flights} tripName={tripName} locale={locale} statusMap={statusMap} weatherMap={weatherMap} />
        </div>
      )}
    </div>
  );
}
