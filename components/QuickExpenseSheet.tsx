"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { TripExpense } from "@/lib/types";

// ── Categories (mirrors TripExpenses.tsx) ────────────────────────────────────

const CATEGORIES: {
  value: TripExpense["category"];
  labelEs: string;
  labelEn: string;
  emoji: string;
}[] = [
  { value: "flight",    labelEs: "Vuelo",      labelEn: "Flight",    emoji: "✈️" },
  { value: "hotel",     labelEs: "Hotel",      labelEn: "Hotel",     emoji: "🏨" },
  { value: "food",      labelEs: "Comida",     labelEn: "Food",      emoji: "🍽" },
  { value: "transport", labelEs: "Transporte", labelEn: "Transport", emoji: "🚕" },
  { value: "activity",  labelEs: "Actividad",  labelEn: "Activity",  emoji: "🎯" },
  { value: "other",     labelEs: "Otro",       labelEn: "Other",     emoji: "💳" },
];

const QUICK_CURRENCIES = ["USD", "ARS", "EUR"];
const ALL_CURRENCIES   = ["USD", "ARS", "EUR", "GBP", "BRL", "UYU"];

// ── Props ─────────────────────────────────────────────────────────────────────

interface QuickExpenseSheetProps {
  tripId: string;
  locale: "es" | "en";
  onClose: () => void;
}

// ── Step type ─────────────────────────────────────────────────────────────────

type Step = "amount" | "category";

// ── Component ─────────────────────────────────────────────────────────────────

export function QuickExpenseSheet({ tripId, locale, onClose }: QuickExpenseSheetProps) {
  const [step, setStep]             = useState<Step>("amount");
  const [amount, setAmount]         = useState("");
  const [currency, setCurrency]     = useState("USD");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const amountRef                   = useRef<HTMLInputElement>(null);

  // Focus amount input on mount
  useEffect(() => {
    const id = setTimeout(() => amountRef.current?.focus(), 300);
    return () => clearTimeout(id);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function handleAmountNext() {
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) return;
    setStep("category");
  }

  async function handleCategorySelect(category: TripExpense["category"]) {
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) return;

    navigator.vibrate?.(10);
    setSubmitting(true);
    setError(null);

    const today = new Date().toISOString().slice(0, 10);

    const supabase = createClient();
    const { error: insertError } = await supabase
      .from("trip_expenses")
      .insert({
        trip_id:      tripId,
        amount:       parsed,
        currency,
        category,
        description:  description.trim() || null,
        expense_date: today,
      });

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    onClose();
  }

  const L = {
    title:        locale === "es" ? "Gasto rápido"          : "Quick expense",
    amountLabel:  locale === "es" ? "¿Cuánto gastaste?"     : "How much did you spend?",
    descPlaceholder: locale === "es" ? "Descripción (opcional)" : "Description (optional)",
    next:         locale === "es" ? "Elegir categoría"       : "Choose category",
    categoryLabel: locale === "es" ? "¿En qué?"             : "Category",
    back:         locale === "es" ? "Atrás"                  : "Back",
    saving:       locale === "es" ? "Guardando..."           : "Saving...",
    errorPrefix:  locale === "es" ? "Error: "               : "Error: ",
  };

  return (
    <AnimatePresence>
      {/* Overlay */}
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <motion.div
        key="sheet"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 400, damping: 38 }}
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-[#13131f] border-t border-white/[0.08] px-5 pb-8 pt-4 max-w-lg mx-auto"
        role="dialog"
        aria-modal="true"
        aria-label={L.title}
      >
        {/* Handle bar */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-white">{L.title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.07] transition-colors"
            aria-label={locale === "es" ? "Cerrar" : "Close"}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step 1 — Amount */}
        {step === "amount" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">{L.amountLabel}</p>

            {/* Large amount display */}
            <div className="flex items-center gap-3">
              {/* Currency selector */}
              <div className="flex gap-1.5">
                {QUICK_CURRENCIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      currency === c
                        ? "bg-[#FFB800] border-[rgba(255,184,0,0.35)] text-[#07070d]"
                        : "bg-white/[0.04] border-white/[0.08] text-gray-400 hover:text-white"
                    }`}
                  >
                    {c}
                  </button>
                ))}
                <select
                  value={ALL_CURRENCIES.includes(currency) && !QUICK_CURRENCIES.includes(currency) ? currency : ""}
                  onChange={(e) => { if (e.target.value) setCurrency(e.target.value); }}
                  className="px-2 py-1 rounded-lg text-xs bg-white/[0.04] border border-white/[0.08] text-gray-400 outline-none"
                  aria-label={locale === "es" ? "Otra moneda" : "Other currency"}
                >
                  <option value="">···</option>
                  {ALL_CURRENCIES.filter((c) => !QUICK_CURRENCIES.includes(c)).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Amount input */}
            <div className="flex items-center gap-2 rounded-xl bg-white/[0.05] border border-white/[0.09] px-4 py-3">
              <span className="text-2xl font-bold text-gray-400">{currency}</span>
              <input
                ref={amountRef}
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAmountNext(); }}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="flex-1 bg-transparent text-3xl font-black text-white placeholder-gray-700 outline-none w-full"
              />
            </div>

            {/* Optional description */}
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={L.descPlaceholder}
              maxLength={100}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-[rgba(255,184,0,0.25)] transition-colors"
            />

            <button
              onClick={handleAmountNext}
              disabled={!amount || parseFloat(amount) <= 0}
              className="w-full rounded-xl bg-[#FFB800] hover:bg-[#FFC933] disabled:opacity-40 disabled:cursor-not-allowed px-4 py-3 text-sm font-bold text-[#07070d] transition-colors"
            >
              {L.next}
            </button>
          </div>
        )}

        {/* Step 2 — Category chips */}
        {step === "category" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              {L.categoryLabel} · <span className="font-semibold text-white">{currency} {parseFloat(amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </p>

            <div className="grid grid-cols-3 gap-2.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => handleCategorySelect(cat.value)}
                  disabled={submitting}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-[rgba(255,184,0,0.06)] hover:border-[rgba(255,184,0,0.25)] disabled:opacity-50 px-3 py-4 transition-all active:scale-95"
                >
                  <span className="text-2xl" aria-hidden="true">{cat.emoji}</span>
                  <span className="text-xs font-semibold text-gray-300">
                    {locale === "es" ? cat.labelEs : cat.labelEn}
                  </span>
                </button>
              ))}
            </div>

            {submitting && (
              <p className="text-center text-xs text-gray-500">{L.saving}</p>
            )}

            {error && (
              <p className="text-xs text-red-400">{L.errorPrefix}{error}</p>
            )}

            <button
              onClick={() => setStep("amount")}
              disabled={submitting}
              className="w-full rounded-xl border border-white/[0.08] bg-transparent hover:bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-gray-400 hover:text-white transition-colors"
            >
              {L.back}
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
