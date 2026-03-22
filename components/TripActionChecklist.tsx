"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckSquare, Square, ChevronDown, AlertTriangle, MapPin } from "lucide-react";
import { AirportStatusMap, DelayStatus } from "@/lib/types";
import { getDestinationProfile, getDestinationConfig } from "@/lib/destinationConfig";

// ── Types ────────────────────────────────────────────────────────────────────

interface ChecklistItem {
  id: string;
  emoji: string;
  label: { es: string; en: string };
  section: "packing" | "weather" | "documents" | "airport" | "delay";
  /** If set, only show when these FAA statuses are active */
  relevantStatuses?: DelayStatus[];
}

// ── Static items always shown (not destination-specific) ─────────────────────

const STATIC_ITEMS: ChecklistItem[] = [
  {
    id: "passport",
    emoji: "🗂️",
    section: "documents",
    label: { es: "Pasaporte vigente (internacional)", en: "Valid passport (international flight)" },
  },
  {
    id: "travel_insurance",
    emoji: "🛡️",
    section: "documents",
    label: { es: "Seguro de viaje activo", en: "Active travel insurance" },
  },
  {
    id: "boarding_pass",
    emoji: "📱",
    section: "documents",
    label: { es: "Boarding pass descargado (digital o impreso)", en: "Boarding pass downloaded (digital or printed)" },
  },
  {
    id: "charge_devices",
    emoji: "🔋",
    section: "airport",
    label: { es: "Cargar todos los dispositivos antes de salir", en: "Charge all devices before leaving" },
  },
  {
    id: "currency",
    emoji: "💵",
    section: "documents",
    label: { es: "Efectivo en moneda local o USD para el destino", en: "Cash in local currency or USD for destination" },
  },
];

// ── FAA-status-based items ────────────────────────────────────────────────────

const DELAY_ITEMS: ChecklistItem[] = [
  {
    id: "call_airline",
    emoji: "📞",
    section: "delay",
    label: { es: "Llamar a la aerolínea si hay cambio de horario", en: "Call the airline if schedule has changed" },
    relevantStatuses: ["delay_severe", "ground_stop", "closure"],
  },
  {
    id: "allow_extra_time",
    emoji: "⏱️",
    section: "delay",
    label: { es: "Salir antes al aeropuerto (demoras activas)", en: "Leave earlier for the airport (active delays)" },
    relevantStatuses: ["delay_minor", "delay_moderate", "delay_severe", "ground_delay"],
  },
  {
    id: "rebooking",
    emoji: "🔄",
    section: "delay",
    label: { es: "Consultar opciones de rebooking sin cargo", en: "Ask about free rebooking options" },
    relevantStatuses: ["ground_stop", "closure", "delay_severe"],
  },
  {
    id: "lounge",
    emoji: "🛋️",
    section: "delay",
    label: { es: "Buscar sala VIP o lounge para esperar", en: "Find the airport lounge or VIP room to wait" },
    relevantStatuses: ["delay_moderate", "delay_severe", "ground_delay", "ground_stop"],
  },
  {
    id: "hotel_cancel",
    emoji: "🏨",
    section: "delay",
    label: { es: "Revisar política de cancelación del hotel", en: "Check hotel cancellation policy" },
    relevantStatuses: ["ground_stop", "closure"],
  },
  {
    id: "notify_contacts",
    emoji: "📲",
    section: "delay",
    label: { es: "Avisar a contactos del retraso", en: "Notify contacts about the delay" },
    relevantStatuses: ["delay_severe", "ground_stop", "closure"],
  },
];

// ── Storage ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = "copiloto-checklist";

function loadChecked(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function saveChecked(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {}
}

// ── Section config ────────────────────────────────────────────────────────────

const SECTION_LABELS: Record<string, { es: string; en: string; emoji: string }> = {
  packing:   { emoji: "👕", es: "Equipaje",   en: "Packing"    },
  weather:   { emoji: "🌤", es: "Clima",      en: "Weather"    },
  documents: { emoji: "🗂️", es: "Documentos", en: "Documents"  },
  airport:   { emoji: "✈️", es: "Aeropuerto", en: "Airport"    },
  delay:     { emoji: "⚠️", es: "Alertas",    en: "Alerts"     },
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface NextFlight {
  destinationCode: string;
  isoDate: string;
  isInternational: boolean;
  arrivalRecommendation: string;
  flightNum: string;
}

interface TripActionChecklistProps {
  statusMap: AirportStatusMap;
  tripAirports: string[];
  locale: "es" | "en";
  nextFlight?: NextFlight | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TripActionChecklist({
  statusMap,
  tripAirports,
  locale,
  nextFlight,
}: TripActionChecklistProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["packing", "weather", "documents", "airport", "delay"]),
  );

  useEffect(() => {
    setChecked(loadChecked());
  }, []);

  // ── Active FAA statuses ──────────────────────────────────────────────────
  const activeStatuses = new Set<DelayStatus>();
  tripAirports.forEach((code) => {
    const s = statusMap[code]?.status;
    if (s && s !== "ok" && s !== "unknown") activeStatuses.add(s as DelayStatus);
  });
  const hasDelays = activeStatuses.size > 0;

  // ── Destination profile ──────────────────────────────────────────────────
  const destProfile = nextFlight
    ? getDestinationProfile(nextFlight.destinationCode, nextFlight.isoDate)
    : null;
  const destConfig = nextFlight
    ? getDestinationConfig(nextFlight.destinationCode)
    : null;

  // ── Build item list ──────────────────────────────────────────────────────

  // Destination-based packing items
  const packingItems: ChecklistItem[] = (destProfile?.packing ?? []).map((p, i) => ({
    id: `pack_${i}`,
    emoji: "👕",
    section: "packing" as const,
    label: p,
  }));

  // Destination-based weather items
  const weatherItems: ChecklistItem[] = (destProfile?.weatherAlerts ?? []).map((w, i) => ({
    id: `wx_${i}`,
    emoji: "🌦️",
    section: "weather" as const,
    label: w,
  }));

  // Tip items (shown in airport section)
  const tipItems: ChecklistItem[] = (destProfile?.tips ?? []).map((tip, i) => ({
    id: `tip_${i}`,
    emoji: "💡",
    section: "airport" as const,
    label: tip,
  }));

  // Arrival time item
  const arrivalItem: ChecklistItem | null = nextFlight ? {
    id: "arrival_time",
    emoji: "🕐",
    section: "airport",
    label: {
      es: `Llegar al aeropuerto a las ${nextFlight.arrivalRecommendation} para el vuelo ${nextFlight.flightNum}`,
      en: `Arrive at the airport at ${nextFlight.arrivalRecommendation} for flight ${nextFlight.flightNum}`,
    },
  } : null;

  // Delay-triggered items
  const activeDelayItems = DELAY_ITEMS.filter((item) =>
    item.relevantStatuses?.some((s) => activeStatuses.has(s)),
  );

  // Final item list by section
  const allItems: ChecklistItem[] = [
    ...packingItems,
    ...weatherItems,
    ...STATIC_ITEMS.filter((i) =>
      i.section !== "airport" || !nextFlight || i.id !== "currency" || !destConfig?.usdAccepted
    ),
    ...(arrivalItem ? [arrivalItem] : []),
    ...tipItems,
    ...activeDelayItems,
  ];

  const doneCount  = allItems.filter((i) => checked.has(i.id)).length;
  const totalCount = allItems.length;
  const allDone    = doneCount === totalCount && totalCount > 0;

  const toggle = useCallback((id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveChecked(next);
      return next;
    });
  }, []);

  function toggleSection(section: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }

  // Group by section
  const sections = ["packing", "weather", "documents", "airport", "delay"] as const;
  const grouped: Record<string, ChecklistItem[]> = {};
  sections.forEach((s) => {
    grouped[s] = allItems.filter((i) => i.section === s);
  });

  return (
    <div
      className={`rounded-2xl border overflow-hidden ${hasDelays ? "border-orange-700/40" : "border-white/[0.07]"}`}
      style={{ background: "linear-gradient(150deg, rgba(12,12,22,0.97) 0%, rgba(8,8,16,0.99) 100%)" }}
    >
      {/* ── Header ── */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-4 py-3.5 flex items-center gap-3 text-left tap-scale"
      >
        {hasDelays && <AlertTriangle className="h-4 w-4 text-orange-400 shrink-0" />}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-white leading-snug">
              {locale === "es" ? "Checklist del viaje" : "Trip checklist"}
            </p>
            {destConfig && nextFlight && (
              <span className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                <MapPin className="h-2.5 w-2.5" />
                {destConfig.flag} {locale === "es" ? destConfig.city : destConfig.cityEn}
                {destProfile && (
                  <span className="ml-1 text-gray-600">
                    · {destProfile.tempMinC}–{destProfile.tempMaxC}°C
                  </span>
                )}
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {allDone
              ? (locale === "es" ? "Todo listo ✓" : "All set ✓")
              : `${doneCount}/${totalCount} ${locale === "es" ? "completadas" : "done"}`}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-16 h-1.5 rounded-full bg-white/[0.07] overflow-hidden shrink-0">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              allDone ? "bg-emerald-500" : hasDelays ? "bg-orange-500" : "bg-blue-500"
            }`}
            style={{ width: totalCount ? `${(doneCount / totalCount) * 100}%` : "0%" }}
          />
        </div>

        <ChevronDown
          className={`h-4 w-4 text-gray-500 shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {/* ── Sections ── */}
      {expanded && (
        <div className="border-t border-white/[0.05]">
          {sections.map((section) => {
            const items = grouped[section];
            if (!items || items.length === 0) return null;
            const secLabel = SECTION_LABELS[section];
            const isSectionOpen = expandedSections.has(section);
            const secDone = items.filter((i) => checked.has(i.id)).length;

            return (
              <div key={section} className="border-b border-white/[0.04] last:border-b-0">
                {/* Section header */}
                <button
                  onClick={() => toggleSection(section)}
                  className="w-full flex items-center gap-2 px-4 py-2 text-left tap-scale"
                >
                  <span className="text-xs leading-none">{secLabel.emoji}</span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex-1">
                    {locale === "es" ? secLabel.es : secLabel.en}
                  </span>
                  <span className="text-xs text-gray-600">
                    {secDone}/{items.length}
                  </span>
                  <ChevronDown
                    className={`h-3 w-3 text-gray-600 transition-transform duration-150 ${isSectionOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Section items */}
                {isSectionOpen && (
                  <div className="divide-y divide-white/[0.03]">
                    {items.map((item) => {
                      const done = checked.has(item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => toggle(item.id)}
                          className="w-full flex items-start gap-3 px-4 py-2.5 text-left tap-scale"
                        >
                          {done ? (
                            <CheckSquare className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                          ) : (
                            <Square className="h-4 w-4 text-gray-600 shrink-0 mt-0.5" />
                          )}
                          <span className="text-sm leading-none mr-0.5 mt-0.5">{item.emoji}</span>
                          <span className={`text-sm leading-snug flex-1 ${done ? "line-through text-gray-600" : "text-gray-200"}`}>
                            {locale === "es" ? item.label.es : item.label.en}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Reset */}
          {doneCount > 0 && (
            <div className="px-4 py-2.5 flex justify-end">
              <button
                onClick={() => {
                  const next = new Set<string>();
                  saveChecked(next);
                  setChecked(next);
                }}
                className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors"
              >
                {locale === "es" ? "Reiniciar lista" : "Reset list"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
