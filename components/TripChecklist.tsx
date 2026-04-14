"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Plus, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import {
  ChecklistItem,
  ChecklistCategory,
  CHECKLIST_CATEGORIES,
  DEFAULT_CHECKLIST_ITEMS,
  getItemsByCategory,
  countChecked,
} from "@/lib/checklistDefaults";

// ── Labels ────────────────────────────────────────────────────────────────────

const LABELS = {
  es: {
    title:            "Lista de verificación",
    resetBtn:         "Reiniciar",
    resetConfirm:     "¿Reiniciar todos los ítems?",
    addPlaceholder:   "Nuevo ítem…",
    addBtn:           "Agregar",
    cancel:           "Cancelar",
    completed:        "completados",
    of:               "de",
    items:            "ítems",
    addCustom:        "Agregar ítem",
  },
  en: {
    title:            "Pre-trip checklist",
    resetBtn:         "Reset all",
    resetConfirm:     "Reset all items?",
    addPlaceholder:   "New item…",
    addBtn:           "Add",
    cancel:           "Cancel",
    completed:        "completed",
    of:               "of",
    items:            "items",
    addCustom:        "Add item",
  },
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function storageKey(tripId: string) {
  return `tripcopilot-checklist-${tripId}`;
}

function loadItems(tripId: string): ChecklistItem[] {
  if (typeof window === "undefined") return DEFAULT_CHECKLIST_ITEMS.map((i) => ({ ...i }));
  try {
    const raw = window.localStorage.getItem(storageKey(tripId));
    if (!raw) return DEFAULT_CHECKLIST_ITEMS.map((i) => ({ ...i }));
    return JSON.parse(raw) as ChecklistItem[];
  } catch {
    return DEFAULT_CHECKLIST_ITEMS.map((i) => ({ ...i }));
  }
}

function saveItems(tripId: string, items: ChecklistItem[]): void {
  try {
    window.localStorage.setItem(storageKey(tripId), JSON.stringify(items));
  } catch {
    // storage quota exceeded or private mode — fail silently
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface AddItemRowProps {
  onAdd: (label: string) => void;
  locale: "es" | "en";
}

function AddItemRow({ onAdd, locale }: AddItemRowProps) {
  const L = LABELS[locale];
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  function handleAdd() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setValue("");
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors py-1"
      >
        <Plus className="h-3.5 w-3.5" />
        {L.addCustom}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-1">
      <input
        autoFocus
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleAdd();
          if (e.key === "Escape") { setOpen(false); setValue(""); }
        }}
        placeholder={L.addPlaceholder}
        className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:border-white/20 focus:outline-none"
      />
      <button
        onClick={handleAdd}
        disabled={!value.trim()}
        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-40 transition-colors"
      >
        {L.addBtn}
      </button>
      <button
        onClick={() => { setOpen(false); setValue(""); }}
        className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
      >
        {L.cancel}
      </button>
    </div>
  );
}

interface CategorySectionProps {
  category: ChecklistCategory;
  items: ChecklistItem[];
  locale: "es" | "en";
  onToggle: (id: string) => void;
  onAddCustom: (category: ChecklistCategory["id"], label: string) => void;
}

function CategorySection({ category, items, locale, onToggle, onAddCustom }: CategorySectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { checked, total } = countChecked(items);
  const allDone = total > 0 && checked === total;

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
      {/* Category header */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">{category.emoji}</span>
          <span className="text-sm font-semibold text-gray-200">
            {locale === "es" ? category.labelEs : category.labelEn}
          </span>
          <span className="text-xs text-gray-500">
            {checked}/{total}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {allDone && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-400/10 rounded-full px-2 py-0.5">
              <Check className="h-3 w-3" />
              {locale === "es" ? "Listo" : "Done"}
            </span>
          )}
          {collapsed
            ? <ChevronDown className="h-4 w-4 text-gray-500" />
            : <ChevronUp   className="h-4 w-4 text-gray-500" />
          }
        </div>
      </button>

      {/* Items */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-1 border-t border-white/[0.06]">
              {items.map((item) => (
                <motion.button
                  key={item.id}
                  onClick={() => onToggle(item.id)}
                  layout
                  className="w-full flex items-center gap-3 py-2 text-left group"
                >
                  {/* Checkbox */}
                  <span
                    className={`shrink-0 flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
                      item.checked
                        ? "border-emerald-500 bg-emerald-500"
                        : "border-white/20 bg-transparent group-hover:border-white/40"
                    }`}
                  >
                    <AnimatePresence>
                      {item.checked && (
                        <motion.span
                          key="check"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        >
                          <Check className="h-3 w-3 text-white" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </span>

                  {/* Label */}
                  <span
                    className={`text-sm transition-all ${
                      item.checked
                        ? "line-through text-gray-600"
                        : "text-gray-300 group-hover:text-gray-100"
                    }`}
                  >
                    {locale === "es" ? item.labelEs : item.labelEn}
                  </span>
                </motion.button>
              ))}

              {/* Add custom item */}
              <AddItemRow
                locale={locale}
                onAdd={(label) => onAddCustom(category.id, label)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── TripChecklist ─────────────────────────────────────────────────────────────

interface TripChecklistProps {
  tripId: string;
  locale: "es" | "en";
}

export function TripChecklist({ tripId, locale }: TripChecklistProps) {
  const L = LABELS[locale];

  const [items, setItems] = useState<ChecklistItem[]>(() => loadItems(tripId));
  const [confirmReset, setConfirmReset] = useState(false);

  // Persist on every change
  useEffect(() => {
    saveItems(tripId, items);
  }, [tripId, items]);

  // Reload when tripId changes
  useEffect(() => {
    setItems(loadItems(tripId));
    setConfirmReset(false);
  }, [tripId]);

  const handleToggle = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) => item.id === id ? { ...item, checked: !item.checked } : item),
    );
  }, []);

  const handleAddCustom = useCallback((category: ChecklistCategory["id"], label: string) => {
    const customId = `custom-${category}-${Date.now()}`;
    const newItem: ChecklistItem = {
      id:       customId,
      labelEs:  label,
      labelEn:  label,
      category,
      checked:  false,
    };
    setItems((prev) => [...prev, newItem]);
  }, []);

  const handleReset = useCallback(() => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    setItems(DEFAULT_CHECKLIST_ITEMS.map((i) => ({ ...i })));
    setConfirmReset(false);
  }, [confirmReset]);

  const { checked, total } = countChecked(items);
  const progressPct = total === 0 ? 0 : Math.round((checked / total) * 100);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
          {L.title}
        </h3>
        <button
          onClick={handleReset}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
            confirmReset
              ? "border-red-500/50 bg-red-500/10 text-red-400 hover:bg-red-500/20"
              : "border-white/[0.08] text-gray-500 hover:text-gray-300 hover:border-white/20"
          }`}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {confirmReset ? L.resetConfirm : L.resetBtn}
        </button>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {checked} {L.of} {total} {L.items} {L.completed}
          </span>
          <span className="font-semibold text-gray-400">{progressPct}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-emerald-500"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Category sections */}
      <div className="space-y-3">
        {CHECKLIST_CATEGORIES.map((cat) => (
          <CategorySection
            key={cat.id}
            category={cat}
            items={getItemsByCategory(items, cat.id)}
            locale={locale}
            onToggle={handleToggle}
            onAddCustom={handleAddCustom}
          />
        ))}
      </div>
    </div>
  );
}
