"use client";

import { useEffect, useState } from "react";
import { Check, Copy, TrendingUp } from "lucide-react";
import {
  Expense,
  EXPENSE_CATEGORIES,
  ExpenseCategory,
  loadExpenses,
} from "@/lib/expenseParser";

// ── Labels ────────────────────────────────────────────────────────────────────

const LABELS = {
  es: {
    header:       "Resumen de gastos",
    total:        "Total gastado",
    dailyAvg:     "Promedio diario",
    topCategory:  "Mayor categoría",
    share:        "Copiar resumen",
    copied:       "Copiado",
    noExpenses:   "Sin gastos registrados.",
    breakdown:    "Por categoría",
    noCurrency:   "—",
  },
  en: {
    header:       "Expense summary",
    total:        "Total spent",
    dailyAvg:     "Daily average",
    topCategory:  "Top category",
    share:        "Copy summary",
    copied:       "Copied",
    noExpenses:   "No expenses yet.",
    breakdown:    "By category",
    noCurrency:   "—",
  },
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns the primary currency (the one with the highest total). */
function primaryCurrency(expenses: Expense[]): string {
  const totals = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.currency] = (acc[e.currency] ?? 0) + e.amount;
    return acc;
  }, {});

  let best = "USD";
  let bestAmt = -1;
  for (const [cur, amt] of Object.entries(totals)) {
    if (amt > bestAmt) {
      best    = cur;
      bestAmt = amt;
    }
  }
  return best;
}

/** Sums amounts for a given currency. */
function sumForCurrency(expenses: Expense[], currency: string): number {
  return expenses
    .filter((e) => e.currency === currency)
    .reduce((s, e) => s + e.amount, 0);
}

/** Returns unique sorted dates in the expense list. */
function uniqueDates(expenses: Expense[]): string[] {
  return Array.from(new Set(expenses.map((e) => e.date))).sort();
}

function fmtAmount(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

interface CategoryTotal {
  id:       ExpenseCategory;
  emoji:    string;
  labelEs:  string;
  labelEn:  string;
  amount:   number;
}

function buildCategoryTotals(expenses: Expense[], currency: string): CategoryTotal[] {
  const totals = expenses
    .filter((e) => e.currency === currency)
    .reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + e.amount;
      return acc;
    }, {});

  return EXPENSE_CATEGORIES
    .map((cat) => ({
      id:      cat.id,
      emoji:   cat.emoji,
      labelEs: cat.label.es,
      labelEn: cat.label.en,
      amount:  totals[cat.id] ?? 0,
    }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

function buildShareText(
  categories: CategoryTotal[],
  total: number,
  currency: string,
  dailyAvg: number,
  locale: "es" | "en",
): string {
  const L = LABELS[locale];
  const lines: string[] = [
    `${L.header}`,
    `${L.total}: ${fmtAmount(total, currency)}`,
    `${L.dailyAvg}: ${fmtAmount(dailyAvg, currency)}`,
    "",
    `${L.breakdown}:`,
    ...categories.map((c) => {
      const label = locale === "es" ? c.labelEs : c.labelEn;
      return `  ${c.emoji} ${label}: ${fmtAmount(c.amount, currency)}`;
    }),
    "",
    "— TripCopilot",
  ];
  return lines.join("\n");
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface ExpenseSummaryProps {
  tripId: string;
  locale?: "es" | "en";
}

// ── Component ──────────────────────────────────────────────────────────────────

export function ExpenseSummary({ tripId, locale = "es" }: ExpenseSummaryProps) {
  const L = LABELS[locale];

  const [expenses, setExpenses]   = useState<Expense[]>([]);
  const [copied,   setCopied]     = useState(false);

  useEffect(() => {
    setExpenses(loadExpenses(tripId));
  }, [tripId]);

  if (expenses.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-5 text-center">
        <p className="text-xs text-gray-600">{L.noExpenses}</p>
      </div>
    );
  }

  const currency       = primaryCurrency(expenses);
  const total          = sumForCurrency(expenses, currency);
  const dates          = uniqueDates(expenses);
  const days           = Math.max(dates.length, 1);
  const dailyAvg       = total / days;
  const categories     = buildCategoryTotals(expenses, currency);
  const topCategory    = categories[0];

  function handleCopy() {
    const text = buildShareText(categories, total, currency, dailyAvg, locale);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Clipboard API blocked — silently skip
    });
  }

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">

      {/* Header */}
      <div className="px-4 pt-3 pb-2 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-gray-500" />
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
            {L.header}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 px-4 py-3 text-center">
        <div>
          <p className="text-[10px] text-gray-500 mb-0.5">{L.total}</p>
          <p className="text-sm font-bold text-white">
            {fmtAmount(total, currency)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500 mb-0.5">{L.dailyAvg}</p>
          <p className="text-sm font-bold text-gray-300">
            {fmtAmount(dailyAvg, currency)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500 mb-0.5">{L.topCategory}</p>
          {topCategory ? (
            <p className="text-sm font-bold text-gray-300">
              {topCategory.emoji}{" "}
              {locale === "es" ? topCategory.labelEs : topCategory.labelEn}
            </p>
          ) : (
            <p className="text-sm text-gray-600">{L.noCurrency}</p>
          )}
        </div>
      </div>

      {/* Category bar chart */}
      {categories.length > 0 && (
        <div className="px-4 pb-3 space-y-2 border-t border-white/[0.04] pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-600 mb-2">
            {L.breakdown}
          </p>
          {categories.map((cat) => {
            const pct = total > 0 ? (cat.amount / total) * 100 : 0;
            return (
              <div key={cat.id} className="flex items-center gap-2">
                <span className="text-sm leading-none shrink-0" aria-hidden="true">
                  {cat.emoji}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-1 mb-0.5">
                    <span className="text-[11px] text-gray-400 truncate">
                      {locale === "es" ? cat.labelEs : cat.labelEn}
                    </span>
                    <span className="text-[11px] text-gray-500 shrink-0">
                      {fmtAmount(cat.amount, currency)}
                    </span>
                  </div>
                  {/* Horizontal bar */}
                  <div className="h-1 w-full rounded-full bg-white/[0.05] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#FFB800]/70 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <span className="text-[10px] text-gray-600 w-8 text-right shrink-0">
                  {Math.round(pct)}%
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Share / copy button */}
      <div className="px-4 pb-4 border-t border-white/[0.04] pt-3">
        <button
          onClick={handleCopy}
          className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] py-2 text-xs font-semibold text-gray-400 hover:text-white transition-all"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-400">{L.copied}</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              {L.share}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
