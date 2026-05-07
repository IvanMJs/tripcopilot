"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ChevronDown, Plus, Trash2, Wallet } from "lucide-react";
import {
  appendExpense,
  CURRENCIES,
  deleteExpense,
  Expense,
  EXPENSE_CATEGORIES,
  ExpenseCategory,
  imageExceedsLimit,
  loadExpenses,
} from "@/lib/expenseParser";

// ── Labels ────────────────────────────────────────────────────────────────────

const LABELS = {
  es: {
    header:          "Gastos del viaje",
    addBtn:          "Agregar gasto",
    save:            "Guardar",
    cancel:          "Cancelar",
    amountPlaceholder: "0.00",
    descPlaceholder: "Descripción (opcional)",
    dateLabel:       "Fecha",
    photoBtn:        "Foto de recibo",
    noExpenses:      "Sin gastos registrados.",
    deleteLabel:     "Eliminar gasto",
    imageTooLarge:   "La imagen supera los 500 KB. Se guardará el gasto sin foto.",
    total:           "Total",
    today:           "Hoy",
    categoryLabel:   "Categoría",
  },
  en: {
    header:          "Trip expenses",
    addBtn:          "Add expense",
    save:            "Save",
    cancel:          "Cancel",
    amountPlaceholder: "0.00",
    descPlaceholder: "Description (optional)",
    dateLabel:       "Date",
    photoBtn:        "Receipt photo",
    noExpenses:      "No expenses yet.",
    deleteLabel:     "Remove expense",
    imageTooLarge:   "Image exceeds 500 KB. Expense saved without photo.",
    total:           "Total",
    today:           "Today",
    categoryLabel:   "Category",
  },
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function groupByDate(expenses: Expense[]): Map<string, Expense[]> {
  const map = new Map<string, Expense[]>();
  for (const e of expenses) {
    const key = e.date;
    const group = map.get(key) ?? [];
    group.push(e);
    map.set(key, group);
  }
  return map;
}

function formatDate(iso: string, locale: "es" | "en"): string {
  try {
    return new Intl.DateTimeFormat(locale === "es" ? "es-AR" : "en-US", {
      weekday: "short",
      month:   "short",
      day:     "numeric",
    }).format(new Date(`${iso}T00:00:00`));
  } catch {
    return iso;
  }
}

function categoryMeta(id: ExpenseCategory) {
  return EXPENSE_CATEGORIES.find((c) => c.id === id) ?? EXPENSE_CATEGORIES[5];
}

// ── Form state ─────────────────────────────────────────────────────────────────

interface FormState {
  amount:    string;
  currency:  string;
  category:  ExpenseCategory;
  desc:      string;
  date:      string;
  imageUrl?: string;
}

function emptyForm(): FormState {
  return {
    amount:   "",
    currency: "USD",
    category: "other",
    desc:     "",
    date:     todayIso(),
  };
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface ExpenseTrackerProps {
  tripId: string;
  locale?: "es" | "en";
}

// ── Component ──────────────────────────────────────────────────────────────────

export function ExpenseTracker({ tripId, locale = "es" }: ExpenseTrackerProps) {
  const L = LABELS[locale];

  const [expenses, setExpenses]     = useState<Expense[]>([]);
  const [expanded, setExpanded]     = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState<FormState>(emptyForm());
  const [imageWarning, setImageWarning] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load from localStorage ───────────────────────────────────────────────────

  useEffect(() => {
    setExpenses(loadExpenses(tripId));
  }, [tripId]);

  // ── Computed totals ──────────────────────────────────────────────────────────

  const totalByCurrency = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.currency] = (acc[e.currency] ?? 0) + e.amount;
    return acc;
  }, {});

  const totalEntries = Object.entries(totalByCurrency);
  const grouped      = groupByDate(expenses);
  const sortedDates  = Array.from(grouped.keys()).sort((a, b) => (a < b ? 1 : -1));

  // ── Form handlers ────────────────────────────────────────────────────────────

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const handlePhotoCapture = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        if (imageExceedsLimit(dataUrl)) {
          setImageWarning(true);
          updateForm("imageUrl", undefined);
        } else {
          setImageWarning(false);
          updateForm("imageUrl", dataUrl);
        }
      };
      reader.readAsDataURL(file);

      // Reset so the same file can be re-selected
      e.target.value = "";
    },
    [],
  );

  function handleSave() {
    const parsed = parseFloat(form.amount);
    if (!form.amount || isNaN(parsed) || parsed <= 0) return;

    const expense: Expense = {
      id:          crypto.randomUUID(),
      tripId,
      amount:      parsed,
      currency:    form.currency,
      category:    form.category,
      description: form.desc.trim() || categoryMeta(form.category).label[locale],
      date:        form.date || todayIso(),
      imageUrl:    form.imageUrl,
      createdAt:   new Date().toISOString(),
    };

    appendExpense(tripId, expense);
    setExpenses(loadExpenses(tripId));
    setForm(emptyForm());
    setImageWarning(false);
    setShowForm(false);
  }

  function handleDelete(id: string) {
    deleteExpense(tripId, id);
    setExpenses(loadExpenses(tripId));
  }

  function handleCancel() {
    setForm(emptyForm());
    setImageWarning(false);
    setShowForm(false);
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">

      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left select-none"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <Wallet className="h-3.5 w-3.5 text-gray-500" />
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            {L.header}
          </span>
          {totalEntries.length > 0 && (
            <span className="text-xs text-gray-600">
              {totalEntries
                .map(([cur, amt]) =>
                  `${cur} ${amt.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
                )
                .join(" · ")}
            </span>
          )}
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 text-gray-600 transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3">

          {/* Expense list grouped by date */}
          {expenses.length === 0 ? (
            <p className="text-xs text-gray-600 text-center py-2">{L.noExpenses}</p>
          ) : (
            <ul className="space-y-4">
              {sortedDates.map((date) => (
                <li key={date}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                    {formatDate(date, locale)}
                  </p>
                  <ul className="space-y-1.5">
                    {(grouped.get(date) ?? []).map((e) => {
                      const meta = categoryMeta(e.category);
                      return (
                        <li
                          key={e.id}
                          className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.05]"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {e.imageUrl ? (
                              <img
                                src={e.imageUrl}
                                alt=""
                                className="h-8 w-8 rounded-md object-cover shrink-0"
                                aria-hidden="true"
                              />
                            ) : (
                              <span
                                className="text-base shrink-0 leading-none"
                                aria-hidden="true"
                              >
                                {meta.emoji}
                              </span>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-200 truncate">
                                {e.description}
                              </p>
                              <p className="text-xs text-gray-500">
                                {e.currency}{" "}
                                {e.amount.toLocaleString(undefined, {
                                  maximumFractionDigits: 2,
                                })}
                                <span className="ml-1.5 text-gray-700">
                                  {meta.emoji} {meta.label[locale]}
                                </span>
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleDelete(e.id)}
                            aria-label={L.deleteLabel}
                            className="shrink-0 p-1 rounded-md text-gray-600 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          )}

          {/* Add expense form */}
          {showForm ? (
            <div className="space-y-3 pt-2 border-t border-white/[0.05]">

              {/* Amount + currency */}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) => updateForm("amount", e.target.value)}
                  placeholder={L.amountPlaceholder}
                  min="0"
                  step="0.01"
                  className="flex-1 bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-[rgba(255,184,0,0.35)] transition-colors"
                />
                <select
                  value={form.currency}
                  onChange={(e) => updateForm("currency", e.target.value)}
                  className="bg-white/[0.05] border border-white/10 rounded-lg px-2 py-2 text-sm text-white outline-none focus:border-[rgba(255,184,0,0.35)] transition-colors"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category grid */}
              <div>
                <p className="text-[10px] text-gray-600 mb-1.5 uppercase tracking-wider">
                  {L.categoryLabel}
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => updateForm("category", cat.id)}
                      className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-xs font-semibold transition-all active:scale-95 ${
                        form.category === cat.id
                          ? "border-[rgba(255,184,0,0.4)] bg-[rgba(255,184,0,0.07)] text-[#FFB800]"
                          : "border-white/[0.07] bg-white/[0.03] text-gray-400 hover:border-white/[0.12] hover:text-gray-200"
                      }`}
                    >
                      <span className="text-lg leading-none" aria-hidden="true">
                        {cat.emoji}
                      </span>
                      <span>{cat.label[locale]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <input
                type="text"
                value={form.desc}
                onChange={(e) => updateForm("desc", e.target.value)}
                placeholder={L.descPlaceholder}
                maxLength={100}
                className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-[rgba(255,184,0,0.35)] transition-colors"
              />

              {/* Date */}
              <input
                type="date"
                value={form.date}
                onChange={(e) => updateForm("date", e.target.value)}
                aria-label={L.dateLabel}
                className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[rgba(255,184,0,0.35)] transition-colors"
              />

              {/* Camera / file capture */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoCapture}
                  className="sr-only"
                  aria-label={L.photoBtn}
                  tabIndex={-1}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] px-3 py-2 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  <Camera className="h-3.5 w-3.5" />
                  {form.imageUrl ? (
                    <span className="text-emerald-400">
                      {locale === "es" ? "Foto adjunta" : "Photo attached"}
                    </span>
                  ) : (
                    L.photoBtn
                  )}
                </button>
                {form.imageUrl && (
                  <img
                    src={form.imageUrl}
                    alt=""
                    className="mt-2 h-16 w-16 rounded-lg object-cover border border-white/[0.08]"
                    aria-hidden="true"
                  />
                )}
                {imageWarning && (
                  <p className="mt-1 text-[11px] text-amber-400">{L.imageTooLarge}</p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={!form.amount || parseFloat(form.amount) <= 0}
                  className="flex-1 rounded-lg bg-[#FFB800] hover:bg-[#FFC933] disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2 text-xs font-bold text-[#07070d] transition-colors"
                >
                  {L.save}
                </button>
                <button
                  onClick={handleCancel}
                  className="rounded-lg border border-white/[0.08] px-3 py-2 text-xs text-gray-400 hover:text-gray-200 transition-colors"
                >
                  {L.cancel}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] py-2 text-xs font-semibold text-gray-400 hover:text-white transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              {L.addBtn}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
