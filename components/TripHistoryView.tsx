"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, Calendar, Copy, Eye, X } from "lucide-react";
import { TripTab } from "@/lib/types";
import { getArchivedTrips, getTripSummary } from "@/lib/tripArchive";
import { AIRPORTS } from "@/lib/airports";

// ── Labels ─────────────────────────────────────────────────────────────────

const LABELS = {
  es: {
    title: "Historial de viajes",
    searchPlaceholder: "Buscar por destino o nombre...",
    allYears: "Todos",
    viewDetails: "Ver detalles",
    createSimilar: "Crear similar",
    flights: (n: number) => `${n} vuelo${n !== 1 ? "s" : ""}`,
    days: (n: number) => `${n} día${n !== 1 ? "s" : ""}`,
    km: (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k km` : `${n} km`),
    noTrips: "No hay viajes archivados",
    noTripsHint: "Los viajes pasados aparecerán aquí automáticamente",
    noResults: "Sin resultados",
    noResultsHint: "Intenta con otro término",
  },
  en: {
    title: "Trip history",
    searchPlaceholder: "Search by destination or name...",
    allYears: "All",
    viewDetails: "View details",
    createSimilar: "Create similar",
    flights: (n: number) => `${n} flight${n !== 1 ? "s" : ""}`,
    days: (n: number) => `${n} day${n !== 1 ? "s" : ""}`,
    km: (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k km` : `${n} km`),
    noTrips: "No archived trips",
    noTripsHint: "Past trips will appear here automatically",
    noResults: "No results",
    noResultsHint: "Try a different search term",
  },
} as const;

// ── Helpers ─────────────────────────────────────────────────────────────────

function cityForIata(iata: string): string {
  return AIRPORTS[iata]?.city ?? iata;
}

function formatDateShort(isoDate: string): string {
  if (!isoDate) return "";
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function yearFromIso(isoDate: string): string {
  return isoDate ? isoDate.slice(0, 4) : "";
}

/** Ordered unique IATA codes forming the route breadcrumb for a trip */
function routeIatas(trip: TripTab): string[] {
  const sorted = [...trip.flights].sort(
    (a, b) => new Date(a.isoDate).getTime() - new Date(b.isoDate).getTime(),
  );
  const result: string[] = [];
  for (const f of sorted) {
    if (result.length === 0 || result[result.length - 1] !== f.originCode) {
      result.push(f.originCode);
    }
    if (result[result.length - 1] !== f.destinationCode) {
      result.push(f.destinationCode);
    }
  }
  return result;
}

// ── TripCard ────────────────────────────────────────────────────────────────

function TripCard({
  trip,
  locale,
  index,
  onViewTrip,
  onCreateSimilar,
}: {
  trip: TripTab;
  locale: "es" | "en";
  index: number;
  onViewTrip?: (trip: TripTab) => void;
  onCreateSimilar?: (trip: TripTab) => void;
}) {
  const L = LABELS[locale];
  const summary = useMemo(() => getTripSummary(trip), [trip]);
  const breadcrumb = useMemo(() => routeIatas(trip), [trip]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-4 flex flex-col gap-3"
    >
      {/* Trip name + date range */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-black text-white truncate">{trip.name}</p>
          {summary.dateRange.start && (
            <p className="text-[11px] text-gray-500 mt-0.5">
              {formatDateShort(summary.dateRange.start)}
              {summary.dateRange.end !== summary.dateRange.start && (
                <> → {formatDateShort(summary.dateRange.end)}</>
              )}
            </p>
          )}
        </div>
        <Calendar className="h-4 w-4 text-gray-600 shrink-0 mt-0.5" />
      </div>

      {/* Route breadcrumb */}
      {breadcrumb.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {breadcrumb.map((iata, i) => (
            <span key={`${iata}-${i}`} className="flex items-center gap-1">
              <span className="text-xs font-mono font-bold text-violet-300">
                {iata}
              </span>
              {i < breadcrumb.length - 1 && (
                <span className="text-[10px] text-gray-600">→</span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-3 text-[11px] text-gray-500">
        <span className="font-medium">{L.km(summary.totalKm)}</span>
        <span className="w-px h-3 bg-white/[0.1]" />
        <span className="font-medium">{L.flights(summary.totalFlights)}</span>
        <span className="w-px h-3 bg-white/[0.1]" />
        <span className="font-medium">{L.days(summary.durationDays)}</span>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {onViewTrip && (
          <button
            onClick={() => onViewTrip(trip)}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08] text-gray-300 text-xs font-bold py-2 transition-all active:scale-95"
          >
            <Eye className="h-3.5 w-3.5" />
            {L.viewDetails}
          </button>
        )}
        {onCreateSimilar && (
          <button
            onClick={() => onCreateSimilar(trip)}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/35 border border-violet-500/30 text-violet-300 text-xs font-bold py-2 transition-all active:scale-95"
          >
            <Copy className="h-3.5 w-3.5" />
            {L.createSimilar}
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ── TripHistoryView ─────────────────────────────────────────────────────────

interface TripHistoryViewProps {
  trips: TripTab[];
  locale: "es" | "en";
  onCreateSimilar?: (trip: TripTab) => void;
  onViewTrip?: (trip: TripTab) => void;
  onClose?: () => void;
}

export function TripHistoryView({
  trips,
  locale,
  onCreateSimilar,
  onViewTrip,
  onClose,
}: TripHistoryViewProps) {
  const L = LABELS[locale];
  const [query, setQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState<string | null>(null);

  const archived = useMemo(() => getArchivedTrips(trips), [trips]);

  // Unique years sorted descending
  const years = useMemo(() => {
    const set = new Set<string>();
    for (const t of archived) {
      for (const f of t.flights) {
        const y = yearFromIso(f.isoDate);
        if (y) set.add(y);
      }
    }
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [archived]);

  const filtered = useMemo(() => {
    let result = archived;

    // Year filter
    if (selectedYear !== null) {
      result = result.filter((t) =>
        t.flights.some((f) => yearFromIso(f.isoDate) === selectedYear),
      );
    }

    // Search filter
    const q = query.trim().toLowerCase();
    if (q.length > 0) {
      result = result.filter((t) => {
        if (t.name.toLowerCase().includes(q)) return true;
        for (const f of t.flights) {
          if (f.destinationCode.toLowerCase().includes(q)) return true;
          if (cityForIata(f.destinationCode).toLowerCase().includes(q))
            return true;
          if (f.originCode.toLowerCase().includes(q)) return true;
          if (cityForIata(f.originCode).toLowerCase().includes(q)) return true;
        }
        return false;
      });
    }

    return result;
  }, [archived, selectedYear, query]);

  const isEmpty = archived.length === 0;
  const noResults = !isEmpty && filtered.length === 0;

  return (
    <section aria-label={L.title} className="px-4 pb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-black text-white">{L.title}</h2>
        {onClose && (
          <button
            onClick={onClose}
            aria-label={locale === "es" ? "Cerrar historial" : "Close history"}
            className="rounded-lg p-1.5 text-gray-500 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {!isEmpty && (
        <div className="flex flex-col gap-2 mb-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-600 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={L.searchPlaceholder}
              className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] pl-8 pr-3 py-2.5 text-xs text-white placeholder:text-gray-600 outline-none focus:border-violet-500/50 transition-colors"
            />
          </div>

          {/* Year pills */}
          {years.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
              <YearPill
                label={L.allYears}
                active={selectedYear === null}
                onClick={() => setSelectedYear(null)}
              />
              {years.map((y) => (
                <YearPill
                  key={y}
                  label={y}
                  active={selectedYear === y}
                  onClick={() =>
                    setSelectedYear(selectedYear === y ? null : y)
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {isEmpty ? (
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-8 flex flex-col items-center gap-3">
          <span className="text-4xl" aria-hidden>
            🗃️
          </span>
          <p className="text-sm font-bold text-gray-400">{L.noTrips}</p>
          <p className="text-xs text-gray-600 text-center leading-relaxed">
            {L.noTripsHint}
          </p>
        </div>
      ) : noResults ? (
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-8 flex flex-col items-center gap-2">
          <p className="text-sm font-bold text-gray-400">{L.noResults}</p>
          <p className="text-xs text-gray-600">{L.noResultsHint}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((trip, index) => (
            <TripCard
              key={trip.id}
              trip={trip}
              locale={locale}
              index={index}
              onViewTrip={onViewTrip}
              onCreateSimilar={onCreateSimilar}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ── YearPill ────────────────────────────────────────────────────────────────

function YearPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold border transition-all active:scale-95 ${
        active
          ? "bg-violet-600/30 border-violet-500/50 text-violet-200"
          : "bg-white/[0.04] border-white/[0.08] text-gray-500 hover:bg-white/[0.08] hover:text-gray-300"
      }`}
    >
      {label}
    </button>
  );
}
