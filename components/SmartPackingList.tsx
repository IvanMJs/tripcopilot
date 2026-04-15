"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  RefreshCw,
  FileText,
  Shirt,
  Zap,
  Cpu,
  MapPin,
  Loader2,
  Sparkles,
} from "lucide-react";
import { PackingCategory, PackingItem } from "@/lib/packingList";
import { usePackingList } from "@/hooks/usePackingList";

// ── Labels ─────────────────────────────────────────────────────────────────

const LABELS = {
  es: {
    title: "Lista de equipaje",
    regenerate: "Regenerar",
    regenerating: "Generando...",
    aiEnhanced: "Mejorada con IA",
    close: "Cerrar",
    emptyCategory: "No hay items en esta categoría",
    errorRetry: "Reintentar",
    categories: {
      documents: "Documentos",
      clothes: "Ropa",
      toiletries: "Artículos de tocador",
      electronics: "Electrónica",
      destination: "Para el destino",
    },
    checkedCount: (checked: number, total: number) =>
      `${checked} de ${total} listos`,
    essential: "Esencial",
  },
  en: {
    title: "Packing List",
    regenerate: "Regenerate",
    regenerating: "Generating...",
    aiEnhanced: "AI enhanced",
    close: "Close",
    emptyCategory: "No items in this category",
    errorRetry: "Retry",
    categories: {
      documents: "Documents",
      clothes: "Clothes",
      toiletries: "Toiletries",
      electronics: "Electronics",
      destination: "For the destination",
    },
    checkedCount: (checked: number, total: number) =>
      `${checked} of ${total} ready`,
    essential: "Essential",
  },
} as const;

// ── Category icon map ──────────────────────────────────────────────────────

function CategoryIcon({ category }: { category: PackingCategory }) {
  switch (category) {
    case "documents":
      return <FileText className="h-4 w-4 text-blue-400" />;
    case "clothes":
      return <Shirt className="h-4 w-4 text-violet-400" />;
    case "toiletries":
      return <Zap className="h-4 w-4 text-amber-400" />;
    case "electronics":
      return <Cpu className="h-4 w-4 text-cyan-400" />;
    case "destination":
      return <MapPin className="h-4 w-4 text-emerald-400" />;
  }
}

const CATEGORY_ORDER: PackingCategory[] = [
  "documents",
  "clothes",
  "toiletries",
  "electronics",
  "destination",
];

// ── Props ──────────────────────────────────────────────────────────────────

interface SmartPackingListProps {
  tripId: string;
  destination: string;
  durationDays: number;
  tempC: number;
  activities?: string[];
  locale: "es" | "en";
  onClose: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────

export function SmartPackingList({
  tripId,
  destination,
  durationDays,
  tempC,
  activities = [],
  locale,
  onClose,
}: SmartPackingListProps) {
  const L = LABELS[locale];

  const { items, checkedIds, loading, error, aiEnhanced, toggle, regenerate } =
    usePackingList({
      tripId,
      destination,
      durationDays,
      tempC,
      activities,
      locale,
      enabled: true,
    });

  // Group items by category
  const grouped = useMemo(() => {
    const map = new Map<PackingCategory, PackingItem[]>();
    for (const cat of CATEGORY_ORDER) {
      map.set(cat, []);
    }
    for (const item of items) {
      const arr = map.get(item.category);
      if (arr) arr.push(item);
    }
    return map;
  }, [items]);

  const checkedCount = checkedIds.size;
  const totalCount = items.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={L.title}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        className="relative z-10 w-full max-w-lg bg-surface-card border border-white/[0.07] rounded-t-2xl sm:rounded-2xl flex flex-col"
        style={{ maxHeight: "90dvh" }}
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        transition={{ type: "spring", stiffness: 340, damping: 30 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/[0.08] shrink-0">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-emerald-400" />
            <h2 className="text-base font-black text-white">{L.title}</h2>
            {aiEnhanced && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-900/40 border border-violet-700/40 text-[10px] font-bold text-violet-300">
                <Sparkles className="h-3 w-3" />
                {L.aiEnhanced}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Regenerate button */}
            <button
              onClick={regenerate}
              disabled={loading}
              title={L.regenerate}
              aria-label={L.regenerate}
              className="p-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-gray-400 hover:text-white hover:border-white/20 disabled:opacity-50 disabled:pointer-events-none transition-colors"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
            </button>
            {/* Close button */}
            <button
              onClick={onClose}
              aria-label={L.close}
              className="p-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-gray-400 hover:text-white hover:border-white/20 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="px-4 py-2 shrink-0 border-b border-white/[0.06]">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-gray-500 font-medium">
                {L.checkedCount(checkedCount, totalCount)}
              </p>
              <p className="text-xs text-gray-600 font-medium">
                {Math.round((checkedCount / totalCount) * 100)}%
              </p>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/[0.06]">
              <motion.div
                className="h-full rounded-full bg-emerald-500"
                animate={{
                  width: `${Math.round((checkedCount / totalCount) * 100)}%`,
                }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {/* Loading state */}
          {loading && items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-500">
              <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
              <p className="text-sm font-medium">{L.regenerating}</p>
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="flex flex-col items-center gap-3 py-8">
              <p className="text-sm text-red-400">{error}</p>
              <button
                onClick={regenerate}
                className="rounded-xl bg-white/[0.06] border border-white/[0.1] text-sm font-bold text-white px-4 py-2 hover:bg-white/10 transition-colors"
              >
                {L.errorRetry}
              </button>
            </div>
          )}

          {/* Category sections */}
          {!loading || items.length > 0 ? (
            <AnimatePresence>
              {CATEGORY_ORDER.map((category) => {
                const catItems = grouped.get(category) ?? [];
                if (catItems.length === 0) return null;
                return (
                  <motion.section
                    key={category}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Category header */}
                    <div className="flex items-center gap-2 mb-2">
                      <CategoryIcon category={category} />
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        {L.categories[category]}
                      </h3>
                      <span className="text-[10px] text-gray-600 font-medium ml-auto">
                        {catItems.filter((i) => checkedIds.has(i.id)).length}/
                        {catItems.length}
                      </span>
                    </div>

                    {/* Items */}
                    <div className="space-y-1">
                      {catItems.map((packItem) => {
                        const isChecked = checkedIds.has(packItem.id);
                        return (
                          <button
                            key={packItem.id}
                            onClick={() => toggle(packItem.id)}
                            className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                              isChecked
                                ? "bg-emerald-950/30 border border-emerald-700/30"
                                : "bg-white/[0.03] border border-white/[0.07] hover:bg-white/[0.06] hover:border-white/[0.12]"
                            }`}
                          >
                            {/* Checkbox */}
                            <div
                              className={`shrink-0 h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all ${
                                isChecked
                                  ? "bg-emerald-500 border-emerald-500"
                                  : "border-gray-600"
                              }`}
                            >
                              {isChecked && (
                                <motion.svg
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="h-3 w-3 text-white"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={3}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 13l4 4L19 7"
                                  />
                                </motion.svg>
                              )}
                            </div>

                            {/* Label */}
                            <span
                              className={`flex-1 text-sm font-medium transition-colors ${
                                isChecked
                                  ? "line-through text-gray-500"
                                  : "text-gray-200"
                              }`}
                            >
                              {packItem.label}
                            </span>

                            {/* Essential badge */}
                            {packItem.essential && !isChecked && (
                              <span className="shrink-0 text-[10px] font-bold text-amber-400/80 bg-amber-900/20 border border-amber-700/30 rounded-full px-1.5 py-0.5">
                                {L.essential}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </motion.section>
                );
              })}
            </AnimatePresence>
          ) : null}
        </div>

        {/* Safe area padding for mobile */}
        <div className="h-safe-bottom shrink-0" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }} />
      </motion.div>
    </div>
  );
}
