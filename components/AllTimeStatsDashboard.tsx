"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { TripTab } from "@/lib/types";
import { computeAllTimeStats } from "@/lib/allTimeStats";

// ── Labels ─────────────────────────────────────────────────────────────────

const LABELS = {
  es: {
    title: "Estadísticas Globales",
    totalCountries: "Países",
    totalKm: "Kilómetros",
    totalFlights: "Vuelos",
    avgTripDuration: "Días / viaje",
    busiestMonth: "Mes más activo",
    topAirport: "Aeropuerto top",
    noData: "Agrega vuelos para ver tus stats",
    noMonth: "—",
    noAirport: "—",
  },
  en: {
    title: "All-Time Stats",
    totalCountries: "Countries",
    totalKm: "Kilometres",
    totalFlights: "Flights",
    avgTripDuration: "Days / trip",
    busiestMonth: "Busiest month",
    topAirport: "Top airport",
    noData: "Add flights to see your stats",
    noMonth: "—",
    noAirport: "—",
  },
} as const;

// ── Count-up hook ───────────────────────────────────────────────────────────

function useCountUp(target: number, durationMs = 1500): number {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) {
      setCurrent(0);
      return;
    }

    startTimeRef.current = null;

    function tick(timestamp: number) {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / durationMs, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [target, durationMs]);

  return current;
}

// ── StatTile ────────────────────────────────────────────────────────────────

interface StatTileProps {
  emoji: string;
  label: string;
  numericTarget: number | null;
  textValue?: string;
  formatFn?: (n: number) => string;
  color: string;
  delay: number;
}

function StatTile({
  emoji,
  label,
  numericTarget,
  textValue,
  formatFn,
  color,
  delay,
}: StatTileProps) {
  const animated = useCountUp(numericTarget ?? 0, 1500);
  const displayValue =
    textValue !== undefined
      ? textValue
      : formatFn
        ? formatFn(animated)
        : animated.toLocaleString();

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-4 flex flex-col gap-2"
    >
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-base ${color}`}>
        {emoji}
      </div>
      <p className="text-xl font-black text-white tabular-nums leading-none">
        {displayValue}
      </p>
      <p className="text-[11px] text-gray-500 font-medium leading-tight">
        {label}
      </p>
    </motion.div>
  );
}

// ── AllTimeStatsDashboard ───────────────────────────────────────────────────

interface AllTimeStatsDashboardProps {
  trips: TripTab[];
  locale: "es" | "en";
}

export function AllTimeStatsDashboard({
  trips,
  locale,
}: AllTimeStatsDashboardProps) {
  const L = LABELS[locale];
  const stats = computeAllTimeStats(trips);
  const hasData = stats.totalFlights > 0;

  if (!hasData) {
    return (
      <section aria-label={L.title} className="px-4 pb-4">
        <h2 className="text-sm font-black text-white mb-3">{L.title}</h2>
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-6 flex items-center justify-center">
          <p className="text-sm text-gray-500">{L.noData}</p>
        </div>
      </section>
    );
  }

  const busiestMonthLabel =
    stats.busiestMonth.count > 0 ? stats.busiestMonth.label : L.noMonth;
  const topAirportLabel =
    stats.mostVisitedAirport.iata !== "" ? stats.mostVisitedAirport.iata : L.noAirport;

  return (
    <section aria-label={L.title} className="px-4 pb-4">
      <h2 className="text-sm font-black text-white mb-3">{L.title}</h2>

      <div className="grid grid-cols-2 gap-3">
        <StatTile
          emoji="🌍"
          label={L.totalCountries}
          numericTarget={stats.totalCountries}
          color="bg-blue-500/15"
          delay={0}
        />
        <StatTile
          emoji="✈️"
          label={L.totalKm}
          numericTarget={stats.totalKm}
          formatFn={(n) =>
            n >= 1000
              ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`
              : n.toLocaleString()
          }
          color="bg-emerald-500/15"
          delay={0.06}
        />
        <StatTile
          emoji="🛫"
          label={L.totalFlights}
          numericTarget={stats.totalFlights}
          color="bg-violet-500/15"
          delay={0.12}
        />
        <StatTile
          emoji="📅"
          label={L.avgTripDuration}
          numericTarget={stats.avgTripDurationDays}
          color="bg-amber-500/15"
          delay={0.18}
        />
        <StatTile
          emoji="📆"
          label={L.busiestMonth}
          numericTarget={null}
          textValue={busiestMonthLabel}
          color="bg-pink-500/15"
          delay={0.24}
        />
        <StatTile
          emoji="🏆"
          label={L.topAirport}
          numericTarget={null}
          textValue={topAirportLabel}
          color="bg-cyan-500/15"
          delay={0.30}
        />
      </div>
    </section>
  );
}
