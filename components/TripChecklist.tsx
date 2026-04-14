"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Plus, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import {
  ChecklistItem,
  ChecklistCategory,
  TripType,
  CHECKLIST_CATEGORIES,
  getChecklistForTripType,
  getItemsByCategory,
  countChecked,
} from "@/lib/checklistDefaults";
import { haptics } from "@/lib/haptics";

// ── Labels ────────────────────────────────────────────────────────────────────

const LABELS = {
  es: {
    title:                    "Lista de verificación",
    resetBtn:                 "Reiniciar",
    resetConfirm:             "¿Reiniciar todos los ítems?",
    addPlaceholder:           "Nuevo ítem…",
    addBtn:                   "Agregar",
    cancel:                   "Cancelar",
    completed:                "completados",
    of:                       "de",
    items:                    "ítems",
    addCustom:                "Agregar ítem",
    templateTitle:            "¿Qué tipo de viaje?",
    templateSubtitle:         "Elegí una plantilla para personalizar tu checklist",
    templateChangeCta:        "Cambiar plantilla",
    templateChangeConfirm:    "Esto reiniciará tu checklist. ¿Continuar?",
    templates: {
      domestic:              { label: "Doméstico", desc: "Vuelo dentro del país, sin pasaporte ni visa." },
      international:         { label: "Internacional", desc: "Viaje al exterior con documentación completa." },
      first_international:   { label: "Primera vez al exterior", desc: "Lista extendida con guía para viajeros nuevos." },
    },
  },
  en: {
    title:                    "Pre-trip checklist",
    resetBtn:                 "Reset all",
    resetConfirm:             "Reset all items?",
    addPlaceholder:           "New item…",
    addBtn:                   "Add",
    cancel:                   "Cancel",
    completed:                "completed",
    of:                       "of",
    items:                    "items",
    addCustom:                "Add item",
    templateTitle:            "What kind of trip?",
    templateSubtitle:         "Choose a template to personalize your checklist",
    templateChangeCta:        "Change template",
    templateChangeConfirm:    "This will reset your checklist. Continue?",
    templates: {
      domestic:              { label: "Domestic", desc: "Domestic flight — no passport or visa needed." },
      international:         { label: "International", desc: "International travel with full documentation." },
      first_international:   { label: "First time abroad", desc: "Extended list with guidance for first-time travelers." },
    },
  },
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function itemsKey(tripId: string) {
  return `tripcopilot-checklist-${tripId}`;
}

function typeKey(tripId: string) {
  return `tripcopilot-checklist-type-${tripId}`;
}

interface StoredPayload {
  tripType: TripType;
  items: ChecklistItem[];
}

/** Returns null when no data is stored — caller shows template selector. */
function loadPayload(tripId: string): StoredPayload | null {
  if (typeof window === "undefined") return null;
  try {
    // Check for the trip-type key first (new format)
    const storedType = window.localStorage.getItem(typeKey(tripId)) as TripType | null;
    const rawItems   = window.localStorage.getItem(itemsKey(tripId));

    if (!rawItems) return null;

    const items = JSON.parse(rawItems) as ChecklistItem[];

    // Backward-compat: if old data exists but no type key, treat as "international"
    const tripType: TripType = storedType ?? "international";

    return { tripType, items };
  } catch {
    return null;
  }
}

function savePayload(tripId: string, tripType: TripType, items: ChecklistItem[]): void {
  try {
    window.localStorage.setItem(itemsKey(tripId), JSON.stringify(items));
    window.localStorage.setItem(typeKey(tripId), tripType);
  } catch {
    // storage quota exceeded or private mode — fail silently
  }
}

function clearPayload(tripId: string): void {
  try {
    window.localStorage.removeItem(itemsKey(tripId));
    window.localStorage.removeItem(typeKey(tripId));
  } catch {
    // fail silently
  }
}

function celebrationKey(tripId: string) {
  return `tripcopilot-checklist-celebrated-${tripId}`;
}

function hasCelebrated(tripId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(celebrationKey(tripId)) === "1";
  } catch {
    return false;
  }
}

function markCelebrated(tripId: string): void {
  try {
    window.localStorage.setItem(celebrationKey(tripId), "1");
  } catch {
    // fail silently
  }
}

// ── Confetti ──────────────────────────────────────────────────────────────────

const CONFETTI_COLORS = [
  "#f59e0b", "#10b981", "#6366f1", "#ec4899", "#3b82f6", "#f97316",
  "#a3e635", "#e879f9", "#38bdf8", "#fb7185",
];

function ConfettiLayer() {
  const pieces = useRef(
    Array.from({ length: 24 }, (_, i) => ({
      key:   i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      left:  `${Math.random() * 100}%`,
      delay: `${(Math.random() * 0.4).toFixed(2)}s`,
      size:  Math.random() > 0.5 ? "6px" : "8px",
    })),
  ).current;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-20 overflow-hidden"
      style={{ zIndex: 10 }}
    >
      {pieces.map((p) => (
        <span
          key={p.key}
          className="confetti-piece"
          style={{
            left:            p.left,
            top:             "-8px",
            width:           p.size,
            height:          p.size,
            background:      p.color,
            animationDelay:  p.delay,
            animationDuration: "0.9s",
          }}
        />
      ))}
    </div>
  );
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
  readOnly?: boolean;
}

function CategorySection({ category, items, locale, onToggle, onAddCustom, readOnly = false }: CategorySectionProps) {
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

              {/* Add custom item — hidden for read-only (viewer) role */}
              {!readOnly && (
                <AddItemRow
                  locale={locale}
                  onAdd={(label) => onAddCustom(category.id, label)}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── TemplatePicker ────────────────────────────────────────────────────────────

const TRIP_TYPES: TripType[] = ["domestic", "international", "first_international"];

const TRIP_TYPE_ICONS: Record<TripType, string> = {
  domestic:            "🏠",
  international:       "🌍",
  first_international: "✈",
};

interface TemplatePickerProps {
  locale: "es" | "en";
  onSelect: (tripType: TripType) => void;
}

function TemplatePicker({ locale, onSelect }: TemplatePickerProps) {
  const L = LABELS[locale];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
          {L.templateTitle}
        </h3>
        <p className="text-xs text-gray-500 mt-1">{L.templateSubtitle}</p>
      </div>
      <div className="space-y-2">
        {TRIP_TYPES.map((type) => {
          const tpl = L.templates[type];
          return (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className="w-full flex items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 text-left hover:bg-white/[0.06] hover:border-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500/60"
            >
              <span className="text-2xl leading-none mt-0.5">{TRIP_TYPE_ICONS[type]}</span>
              <div>
                <p className="text-sm font-semibold text-gray-200">{tpl.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{tpl.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── TripChecklist ─────────────────────────────────────────────────────────────

interface TripChecklistProps {
  tripId: string;
  locale: "es" | "en";
  readOnly?: boolean;
}

export function TripChecklist({ tripId, locale, readOnly = false }: TripChecklistProps) {
  const L = LABELS[locale];

  // null tripType means "not yet selected" — show the template picker
  const [tripType, setTripType] = useState<TripType | null>(() => {
    const payload = loadPayload(tripId);
    return payload?.tripType ?? null;
  });
  const [items, setItems] = useState<ChecklistItem[]>(() => {
    const payload = loadPayload(tripId);
    return payload?.items ?? [];
  });
  const [confirmReset, setConfirmReset]           = useState(false);
  const [confirmChangeTemplate, setConfirmChangeTemplate] = useState(false);
  const [showConfetti, setShowConfetti]           = useState(false);
  const prevAllDoneRef = useRef(false);

  // Persist whenever items or tripType change (only when a template is selected)
  useEffect(() => {
    if (tripType) {
      savePayload(tripId, tripType, items);
    }
  }, [tripId, tripType, items]);

  // Reload when tripId changes
  useEffect(() => {
    const payload = loadPayload(tripId);
    setTripType(payload?.tripType ?? null);
    setItems(payload?.items ?? []);
    setConfirmReset(false);
    setConfirmChangeTemplate(false);
    prevAllDoneRef.current = false;
  }, [tripId]);

  // Confetti celebration when all items are checked
  useEffect(() => {
    if (items.length === 0) return;
    const { checked, total } = countChecked(items);
    const allDone = checked === total;

    if (allDone && !prevAllDoneRef.current && !hasCelebrated(tripId)) {
      prevAllDoneRef.current = true;
      markCelebrated(tripId);
      haptics.impact();
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    } else if (!allDone) {
      prevAllDoneRef.current = false;
    }
  }, [items, tripId]);

  const handleSelectTemplate = useCallback((type: TripType) => {
    const newItems = getChecklistForTripType(type);
    setTripType(type);
    setItems(newItems);
    savePayload(tripId, type, newItems);
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
    if (tripType) {
      setItems(getChecklistForTripType(tripType));
    }
    setConfirmReset(false);
    setShowConfetti(false);
    prevAllDoneRef.current = false;
    try { window.localStorage.removeItem(celebrationKey(tripId)); } catch { /* silent */ }
  }, [confirmReset, tripId, tripType]);

  const handleChangeTemplate = useCallback(() => {
    if (!confirmChangeTemplate) {
      setConfirmChangeTemplate(true);
      return;
    }
    clearPayload(tripId);
    setTripType(null);
    setItems([]);
    setConfirmChangeTemplate(false);
  }, [confirmChangeTemplate, tripId]);

  // Template not yet chosen — show picker (hidden for read-only viewers)
  if (!tripType) {
    if (readOnly) return null;
    return <TemplatePicker locale={locale} onSelect={handleSelectTemplate} />;
  }

  const { checked, total } = countChecked(items);
  const progressPct = total === 0 ? 0 : Math.round((checked / total) * 100);

  return (
    <div className="relative space-y-4">
      {/* Confetti burst */}
      <AnimatePresence>
        {showConfetti && <ConfettiLayer />}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
          {L.title}
        </h3>
        {!readOnly && (
          <div className="flex items-center gap-2">
            {/* Change template button */}
            <button
              onClick={handleChangeTemplate}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                confirmChangeTemplate
                  ? "border-amber-500/50 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                  : "border-white/[0.08] text-gray-500 hover:text-gray-300 hover:border-white/20"
              }`}
            >
              {confirmChangeTemplate ? L.templateChangeConfirm : L.templateChangeCta}
            </button>
            {/* Reset button */}
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
        )}
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

        {/* Celebration message */}
        <AnimatePresence>
          {showConfetti && (
            <motion.div
              key="celebration"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3 }}
              className="animate-success-flash flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold text-emerald-400"
            >
              {locale === "es" ? "🎉 ¡Lista completa!" : "🎉 All done!"}
            </motion.div>
          )}
        </AnimatePresence>
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
            readOnly={readOnly}
          />
        ))}
      </div>
    </div>
  );
}
