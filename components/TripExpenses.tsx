"use client";

import { useState } from "react";
import { Plus, X, ChevronDown, Wallet } from "lucide-react";
import { useTripExpenses } from "@/hooks/useTripExpenses";
import { TripExpense } from "@/lib/types";

const CATEGORIES: { value: TripExpense["category"]; labelEs: string; labelEn: string; emoji: string }[] = [
  { value: "flight",    labelEs: "Vuelo",       labelEn: "Flight",    emoji: "✈️" },
  { value: "hotel",     labelEs: "Hotel",       labelEn: "Hotel",     emoji: "🏨" },
  { value: "food",      labelEs: "Comida",      labelEn: "Food",      emoji: "🍽" },
  { value: "transport", labelEs: "Transporte",  labelEn: "Transport", emoji: "🚕" },
  { value: "activity",  labelEs: "Actividad",   labelEn: "Activity",  emoji: "🎯" },
  { value: "other",     labelEs: "Otro",        labelEn: "Other",     emoji: "💳" },
];

const CURRENCIES = ["ARS", "USD", "EUR", "GBP", "BRL", "UYU"];

interface TripExpensesProps {
  tripId: string;
  locale: "es" | "en";
  readOnly?: boolean;
}

export function TripExpenses({ tripId, locale, readOnly = false }: TripExpensesProps) {
  const { expenses, loading, error, addExpense, removeExpense, totalByCurrency } = useTripExpenses(tripId);
  const [expanded, setExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formAmount, setFormAmount]       = useState("");
  const [formCurrency, setFormCurrency]   = useState("USD");
  const [formCategory, setFormCategory]   = useState<TripExpense["category"]>("other");
  const [formDesc, setFormDesc]           = useState("");
  const [formDate, setFormDate]           = useState("");
  const [submitting, setSubmitting]       = useState(false);

  const totals = totalByCurrency();
  const totalEntries = Object.entries(totals);

  function getCategoryLabel(cat: TripExpense["category"]): string {
    const found = CATEGORIES.find((c) => c.value === cat);
    if (!found) return cat;
    return `${found.emoji} ${locale === "es" ? found.labelEs : found.labelEn}`;
  }

  async function handleSubmit() {
    const amount = parseFloat(formAmount);
    if (!formAmount || isNaN(amount) || amount <= 0) return;

    setSubmitting(true);
    const ok = await addExpense({
      amount,
      currency:    formCurrency,
      category:    formCategory,
      description: formDesc.trim() || undefined,
      expenseDate: formDate || undefined,
    });
    setSubmitting(false);
    if (!ok) return;
    setFormAmount("");
    setFormDesc("");
    setFormDate("");
    setShowForm(false);
  }

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
      {/* Header toggle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <Wallet className="h-3.5 w-3.5 text-gray-500" />
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            {locale === "es" ? "Gastos del viaje" : "Trip expenses"}
          </span>
          {!loading && totalEntries.length > 0 && (
            <span className="text-xs text-gray-600">
              {totalEntries.map(([cur, amt]) => `${cur} ${amt.toLocaleString(undefined, { maximumFractionDigits: 2 })}`).join(" · ")}
            </span>
          )}
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 text-gray-600 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Totals summary */}
          {totalEntries.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {totalEntries.map(([cur, amt]) => (
                <span
                  key={cur}
                  className="px-2.5 py-1 rounded-lg bg-violet-950/40 border border-violet-800/30 text-xs font-semibold text-violet-300"
                >
                  {cur} {amt.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              ))}
            </div>
          )}

          {/* Expense list */}
          {loading ? (
            <p className="text-xs text-gray-600 py-2">{locale === "es" ? "Cargando..." : "Loading..."}</p>
          ) : expenses.length > 0 ? (
            <ul className="space-y-1.5">
              {expenses.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.05]"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base shrink-0">
                      {CATEGORIES.find((c) => c.value === e.category)?.emoji ?? "💳"}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">
                        {e.description ?? getCategoryLabel(e.category)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {e.currency} {e.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        {e.expenseDate && <span className="ml-1 text-gray-600">· {e.expenseDate}</span>}
                      </p>
                    </div>
                  </div>
                  {!readOnly && (
                    <button
                      onClick={() => removeExpense(e.id)}
                      aria-label={locale === "es" ? "Eliminar gasto" : "Remove expense"}
                      className="shrink-0 p-1 rounded-md text-gray-600 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-600 text-center py-1">
              {locale === "es" ? "Sin gastos registrados." : "No expenses yet."}
            </p>
          )}

          {/* Add expense form — hidden for read-only (viewer) role */}
          {!readOnly && showForm ? (
            <div className="space-y-2 pt-1 border-t border-white/5">
              <div className="flex gap-2">
                <input
                  type="number"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  placeholder={locale === "es" ? "Monto" : "Amount"}
                  min="0"
                  step="0.01"
                  className="w-28 bg-white/[0.05] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500/50 transition-colors"
                />
                <select
                  value={formCurrency}
                  onChange={(e) => setFormCurrency(e.target.value)}
                  className="bg-white/[0.05] border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white outline-none focus:border-blue-500/50 transition-colors"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as TripExpense["category"])}
                className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-blue-500/50 transition-colors"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.emoji} {locale === "es" ? c.labelEs : c.labelEn}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder={locale === "es" ? "Descripción (opcional)" : "Description (optional)"}
                maxLength={100}
                className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500/50 transition-colors"
              />
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-blue-500/50 transition-colors"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !formAmount}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                >
                  {submitting
                    ? (locale === "es" ? "Guardando..." : "Saving...")
                    : (locale === "es" ? "Guardar gasto" : "Save expense")}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
                >
                  {locale === "es" ? "Cancelar" : "Cancel"}
                </button>
              </div>
              {error && (
                <p className="text-xs text-red-400 mt-1">
                  {locale === "es" ? "Error al guardar: " : "Failed to save: "}{error}
                </p>
              )}
            </div>
          ) : !readOnly ? (
            <button
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] py-2 text-xs font-semibold text-gray-400 hover:text-white transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              {locale === "es" ? "Agregar gasto" : "Add expense"}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
