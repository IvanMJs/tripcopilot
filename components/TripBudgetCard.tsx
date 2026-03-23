"use client";

import { useMemo, useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { TripTab } from "@/lib/types";
import { estimateTripBudget, TripExpense } from "@/lib/tripBudget";
import { useTripExpenses } from "@/hooks/useTripExpenses";

// ── Labels ────────────────────────────────────────────────────────────────

const LABELS = {
  es: {
    title:         "Presupuesto estimado",
    estimated:     "Estimado",
    actual:        "Gastado",
    remaining:     "Restante",
    overBudget:    "Excedido",
    addExpense:    "Agregar gasto",
    disclaimer:    "Estimaciones aproximadas — no son precios reales",
    form: {
      category:    "Categoría",
      description: "Descripción",
      amount:      "Monto (USD)",
      date:        "Fecha",
      cancel:      "Cancelar",
      save:        "Guardar",
    },
    categories: {
      flight:     "Vuelos",
      hotel:      "Alojamiento",
      food:       "Comida",
      transport:  "Transporte",
      activity:   "Actividades",
      other:      "Otro",
    } as Record<TripExpense["category"], string>,
  },
  en: {
    title:         "Estimated budget",
    estimated:     "Estimated",
    actual:        "Spent",
    remaining:     "Remaining",
    overBudget:    "Over budget",
    addExpense:    "Add expense",
    disclaimer:    "Rough estimates only — not real prices",
    form: {
      category:    "Category",
      description: "Description",
      amount:      "Amount (USD)",
      date:        "Date",
      cancel:      "Cancel",
      save:        "Save",
    },
    categories: {
      flight:     "Flights",
      hotel:      "Hotel",
      food:       "Food",
      transport:  "Transport",
      activity:   "Activities",
      other:      "Other",
    } as Record<TripExpense["category"], string>,
  },
} as const;

const EXPENSE_CATEGORIES: TripExpense["category"][] = [
  "flight",
  "hotel",
  "food",
  "transport",
  "activity",
  "other",
];

// ── Helpers ───────────────────────────────────────────────────────────────

function fmt(usd: number): string {
  return new Intl.NumberFormat("en-US", {
    style:                 "currency",
    currency:              "USD",
    maximumFractionDigits: 0,
  }).format(usd);
}

/** Progress colour: green → amber → red as ratio climbs toward and past 1. */
function progressColor(ratio: number): string {
  if (ratio >= 1)   return "bg-red-500";
  if (ratio >= 0.8) return "bg-amber-400";
  return "bg-emerald-500";
}

// ── Component ─────────────────────────────────────────────────────────────

interface TripBudgetCardProps {
  trip: TripTab;
  locale: "es" | "en";
}

export function TripBudgetCard({ trip, locale }: TripBudgetCardProps) {
  const L = LABELS[locale];
  const { expenses, loading, addExpense } = useTripExpenses(trip.id);

  const budget = useMemo(
    () => estimateTripBudget(trip, expenses),
    [trip, expenses],
  );

  const [showForm, setShowForm]           = useState(false);
  const [formCategory, setFormCategory]   = useState<TripExpense["category"]>("other");
  const [formDescription, setFormDescription] = useState("");
  const [formAmount, setFormAmount]       = useState("");
  const [formDate, setFormDate]           = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting]       = useState(false);

  async function handleSubmit() {
    const amount = parseFloat(formAmount);
    if (!formDescription.trim() || isNaN(amount) || amount <= 0) return;

    setSubmitting(true);
    await addExpense({
      category:    formCategory,
      description: formDescription.trim(),
      amount:   amount,
      currency:    "USD",
      expenseDate: formDate,
    });
    setSubmitting(false);
    setShowForm(false);
    setFormDescription("");
    setFormAmount("");
    setFormCategory("other");
    setFormDate(new Date().toISOString().slice(0, 10));
  }

  const ratio = budget.totalEstimatedUSD > 0
    ? Math.min(budget.totalActualUSD / budget.totalEstimatedUSD, 1.05)
    : 0;

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 border-b border-white/[0.06] flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
          {L.title}
        </p>
        {loading && <Loader2 className="h-3 w-3 animate-spin text-gray-600" />}
      </div>

      {/* Totals row */}
      <div className="px-4 py-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[10px] text-gray-500 mb-0.5">{L.estimated}</p>
          <p className="text-sm font-bold text-gray-300">{fmt(budget.totalEstimatedUSD)}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500 mb-0.5">{L.actual}</p>
          <p className="text-sm font-bold text-white">{fmt(budget.totalActualUSD)}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500 mb-0.5">
            {budget.overBudget ? L.overBudget : L.remaining}
          </p>
          <p className={`text-sm font-bold ${budget.overBudget ? "text-red-400" : "text-emerald-400"}`}>
            {fmt(Math.abs(budget.remainingUSD))}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 pb-3">
        <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressColor(ratio)}`}
            style={{ width: `${Math.min(ratio * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Category breakdown */}
      <div className="px-4 pb-3 space-y-2 border-t border-white/[0.04] pt-3">
        {budget.categories.map((cat) => {
          const catRatio = cat.estimatedUSD > 0
            ? Math.min(cat.actualUSD / cat.estimatedUSD, 1.05)
            : 0;
          const delta = cat.actualUSD - cat.estimatedUSD;

          return (
            <div key={cat.label} className="flex items-center gap-2">
              <span className="text-base leading-none" aria-hidden>{cat.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-1 mb-0.5">
                  <span className="text-[11px] text-gray-400 truncate">{cat.label}</span>
                  <span className="text-[11px] text-gray-500 shrink-0">
                    {fmt(cat.actualUSD)} / {fmt(cat.estimatedUSD)}
                  </span>
                </div>
                <div className="h-1 w-full rounded-full bg-white/[0.05] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${progressColor(catRatio)}`}
                    style={{ width: `${Math.min(catRatio * 100, 100)}%` }}
                  />
                </div>
              </div>
              {cat.actualUSD > 0 && (
                <span className={`text-[10px] font-semibold shrink-0 ${delta > 0 ? "text-red-400" : "text-emerald-400"}`}>
                  {delta > 0 ? "+" : ""}{fmt(delta)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Disclaimer */}
      <div className="px-4 pb-2">
        <p className="text-[10px] text-gray-600 italic">{L.disclaimer}</p>
      </div>

      {/* Add expense form */}
      {showForm ? (
        <div className="border-t border-white/[0.06] px-4 py-3 space-y-2">
          <select
            value={formCategory}
            onChange={(e) => setFormCategory(e.target.value as TripExpense["category"])}
            className="w-full rounded-lg bg-white/[0.06] border border-white/[0.08] px-3 py-1.5 text-xs text-gray-300 outline-none focus:border-blue-500/50"
          >
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat} className="bg-[#0f0f17]">
                {L.categories[cat]}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder={L.form.description}
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            maxLength={80}
            className="w-full rounded-lg bg-white/[0.06] border border-white/[0.08] px-3 py-1.5 text-xs text-gray-300 placeholder-gray-600 outline-none focus:border-blue-500/50"
          />

          <div className="flex gap-2">
            <input
              type="number"
              placeholder={L.form.amount}
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              min={0}
              step={0.01}
              className="flex-1 rounded-lg bg-white/[0.06] border border-white/[0.08] px-3 py-1.5 text-xs text-gray-300 placeholder-gray-600 outline-none focus:border-blue-500/50"
            />
            <input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="flex-1 rounded-lg bg-white/[0.06] border border-white/[0.08] px-3 py-1.5 text-xs text-gray-300 outline-none focus:border-blue-500/50"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
            >
              {L.form.cancel}
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !formDescription.trim() || !formAmount}
              className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed py-1.5 text-xs font-semibold text-white transition-colors flex items-center justify-center gap-1"
            >
              {submitting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                L.form.save
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="px-4 pb-3 border-t border-white/[0.06] pt-3">
          <button
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.07] py-1.5 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            {L.addExpense}
          </button>
        </div>
      )}
    </div>
  );
}
