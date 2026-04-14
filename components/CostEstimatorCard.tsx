"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CITY_BUDGETS } from "@/lib/cityBudgets";

// ── Labels ─────────────────────────────────────────────────────────────────

const LABELS = {
  es: {
    title: "Estimado de costos",
    hotel: "Hotel / noche",
    meals: "Comidas / día",
    transport: "Transporte / día",
    totalEstimate: (days: number) => `Total est. ${days} días`,
    usd: "USD",
  },
  en: {
    title: "Cost estimate",
    hotel: "Hotel / night",
    meals: "Meals / day",
    transport: "Transport / day",
    totalEstimate: (days: number) => `Est. total ${days} days`,
    usd: "USD",
  },
} as const;

// ── Props ──────────────────────────────────────────────────────────────────

interface CostEstimatorCardProps {
  iata: string | null;
  durationDays?: number;
  locale: "es" | "en";
}

// ── Component ──────────────────────────────────────────────────────────────

export function CostEstimatorCard({
  iata,
  durationDays = 7,
  locale,
}: CostEstimatorCardProps) {
  const L = LABELS[locale];

  const budget = iata !== null ? CITY_BUDGETS[iata] : undefined;

  return (
    <AnimatePresence>
      {budget !== undefined && (
        <motion.div
          key={iata}
          initial={{ opacity: 0, y: 8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.25 }}
          className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-3"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">
              {L.title}
            </p>
            <span className="text-[11px] text-gray-600 font-medium">
              {budget.city}, {budget.country}
            </span>
          </div>

          {/* Cost rows */}
          <div className="flex gap-2">
            <CostItem
              label={L.hotel}
              value={budget.hotelPerNight}
              unit={L.usd}
              color="text-blue-400"
            />
            <CostItem
              label={L.meals}
              value={budget.mealsPerDay}
              unit={L.usd}
              color="text-emerald-400"
            />
            <CostItem
              label={L.transport}
              value={budget.transportPerDay}
              unit={L.usd}
              color="text-amber-400"
            />
          </div>

          {/* Total */}
          <div className="mt-2 pt-2 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-[11px] text-gray-500 font-medium">
              {L.totalEstimate(durationDays)}
            </span>
            <span className="text-sm font-black text-white tabular-nums">
              ${(
                (budget.hotelPerNight +
                  budget.mealsPerDay +
                  budget.transportPerDay) *
                durationDays
              ).toLocaleString()}{" "}
              <span className="text-[10px] font-semibold text-gray-500">
                {L.usd}
              </span>
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── CostItem ───────────────────────────────────────────────────────────────

function CostItem({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  return (
    <div className="flex-1 rounded-xl bg-white/[0.03] border border-white/[0.05] px-2 py-1.5 flex flex-col gap-0.5">
      <p className={`text-xs font-bold tabular-nums ${color}`}>
        ${value}
        <span className="text-[9px] font-semibold text-gray-600 ml-0.5">
          {unit}
        </span>
      </p>
      <p className="text-[10px] text-gray-600 leading-tight">{label}</p>
    </div>
  );
}
