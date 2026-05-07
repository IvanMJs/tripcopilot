"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { getPackingSuggestions, PackingSuggestion } from "@/lib/packingEngine";

// ── Types ──────────────────────────────────────────────────────────────────

interface WeatherInput {
  tempMax: number;
  tempMin: number;
  precipProbability: number;
  weatherCode: number;
}

export interface PackingChecklistProps {
  tripId: string;
  weather: WeatherInput;
}

// ── Storage helpers ────────────────────────────────────────────────────────

function loadChecked(tripId: string): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(`tc-packing-${tripId}`);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function saveChecked(tripId: string, state: Record<string, boolean>): void {
  try {
    localStorage.setItem(`tc-packing-${tripId}`, JSON.stringify(state));
  } catch {
    // localStorage unavailable — no-op
  }
}

// ── Item key derivation (stable across re-renders) ─────────────────────────
function itemKey(suggestion: PackingSuggestion): string {
  return suggestion.item.toLowerCase().replace(/\s+/g, "-");
}

// ── Component ──────────────────────────────────────────────────────────────

export function PackingChecklist({ tripId, weather }: PackingChecklistProps) {
  const { locale } = useLanguage();

  const suggestions = getPackingSuggestions(weather, locale as "es" | "en");

  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  // Load from localStorage on mount
  useEffect(() => {
    setChecked(loadChecked(tripId));
  }, [tripId]);

  function toggle(key: string) {
    setChecked((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveChecked(tripId, next);
      return next;
    });
  }

  const checkedCount = suggestions.filter((s) => checked[itemKey(s)]).length;
  const total = suggestions.length;

  const headerLabel = locale === "en" ? "Packing list" : "Lista de equipaje";
  const progressLabel =
    locale === "en"
      ? `${checkedCount} of ${total} packed`
      : `${checkedCount} de ${total} empacados`;

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] overflow-hidden">
      {/* Header / toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left focus-visible:outline-none"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <span className="text-base" aria-hidden>🧳</span>
          <span className="text-sm font-medium text-white/90">{headerLabel}</span>
          {checkedCount > 0 && (
            <span className="text-xs text-white/50 ml-1">{progressLabel}</span>
          )}
        </div>
        <span className="text-white/40">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {/* Progress bar */}
      {open && (
        <div className="px-4 pb-1">
          <div className="h-1 rounded-full bg-white/[0.08] overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: total > 0 ? `${(checkedCount / total) * 100}%` : "0%" }}
            />
          </div>
        </div>
      )}

      {/* Items list */}
      {open && (
        <ul className="px-4 pb-4 pt-2 space-y-2">
          {suggestions.map((suggestion) => {
            const key = itemKey(suggestion);
            const isChecked = !!checked[key];
            return (
              <li key={key}>
                <label className="flex items-start gap-3 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggle(key)}
                    className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border border-white/20 bg-white/[0.06] checked:bg-emerald-500 checked:border-emerald-500 focus-visible:outline-none accent-emerald-500 cursor-pointer"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm" aria-hidden>{suggestion.emoji}</span>
                      <span
                        className={`text-sm font-medium leading-tight transition-colors ${
                          isChecked ? "text-white/35 line-through" : "text-white/85"
                        }`}
                      >
                        {suggestion.item}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-white/40 leading-snug">
                      {suggestion.reason}
                    </p>
                  </div>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
