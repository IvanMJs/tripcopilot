"use client";

import { useState, useEffect, useMemo } from "react";
import { CountryCelebration } from "@/components/CountryCelebration";
import { motion, AnimatePresence } from "framer-motion";
import { Plane, MapPin, Plus, X, Check } from "lucide-react";
import { TripTab } from "@/lib/types";
import { AIRPORTS } from "@/lib/airports";
import { countryFlag } from "@/lib/countryFlags";
import { createClient } from "@/utils/supabase/client";
import {
  VisitedPlace,
  inferVisitedPlaces,
  fetchDBPlaces,
  addDBPlace,
  removeDBPlace,
} from "@/lib/visitedPlaces";

interface PlacesTabProps {
  trips: TripTab[];
  locale: "es" | "en";
}

const LABELS = {
  es: {
    title: "Lugares visitados",
    empty: "Todavía no visitaste ningún lugar",
    emptySub: "Guardá vuelos con conexiones largas o agregá un lugar manualmente",
    add: "+ Agregar lugar",
    addTitle: "Agregar lugar",
    cityPlaceholder: "Ciudad…",
    dateLabel: "Fecha de visita",
    confirm: "Guardar",
    cancel: "Cancelar",
    inferred: "Detectado de tus vuelos",
    manual: "Agregado manualmente",
    firstVisit: "Primera visita",
  },
  en: {
    title: "Places visited",
    empty: "You haven't visited any places yet",
    emptySub: "Save flights with long layovers or add a place manually",
    add: "+ Add place",
    addTitle: "Add place",
    cityPlaceholder: "City…",
    dateLabel: "Date visited",
    confirm: "Save",
    cancel: "Cancel",
    inferred: "Detected from your flights",
    manual: "Added manually",
    firstVisit: "First visit",
  },
} as const;

function formatDate(iso: string | undefined, locale: "es" | "en"): string {
  if (!iso) return "–";
  try {
    return new Date(iso + "T12:00:00").toLocaleDateString(
      locale === "es" ? "es-AR" : "en-US",
      { day: "numeric", month: "long", year: "numeric" },
    );
  } catch {
    return iso;
  }
}

// Build city suggestions from AIRPORTS at module load time
const CITY_SUGGESTIONS: { city: string; country: string }[] = (() => {
  const seen = new Set<string>();
  const results: { city: string; country: string }[] = [];
  for (const a of Object.values(AIRPORTS)) {
    if (!a.city) continue;
    const country = a.country ?? "USA";
    const key = `${a.city}|${country}`;
    if (!seen.has(key)) {
      seen.add(key);
      results.push({ city: a.city, country });
    }
  }
  return results.sort((a, b) => a.city.localeCompare(b.city));
})();

export function PlacesTab({ trips, locale }: PlacesTabProps) {
  const L = LABELS[locale];
  const supabase = createClient();

  const [dbPlaces, setDbPlaces] = useState<VisitedPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [cityQuery, setCityQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<{ city: string; country: string } | null>(null);
  const [dateValue, setDateValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [celebration, setCelebration] = useState<{ country: string; flag: string; total: number } | null>(null);

  useEffect(() => {
    fetchDBPlaces(supabase).then((places) => {
      setDbPlaces(places);
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inferredPlaces = useMemo(() => inferVisitedPlaces(trips), [trips]);

  // Merge: inferred takes priority over manual DB entries with same city+country
  const allPlaces = useMemo<VisitedPlace[]>(() => {
    const inferredKeys = new Set(inferredPlaces.map((p) => `${p.city}|${p.country}`));
    const filteredDB = dbPlaces.filter((p) => !inferredKeys.has(`${p.city}|${p.country}`));
    return [...inferredPlaces, ...filteredDB].sort((a, b) =>
      b.dateVisited.localeCompare(a.dateVisited),
    );
  }, [inferredPlaces, dbPlaces]);

  const suggestions = useMemo(() => {
    if (!cityQuery.trim()) return [];
    const q = cityQuery.toLowerCase();
    return CITY_SUGGESTIONS.filter((s) => s.city.toLowerCase().startsWith(q)).slice(0, 6);
  }, [cityQuery]);

  async function handleAddConfirm() {
    if (!selectedCity || !dateValue || saving) return;
    setSaving(true);
    const saved = await addDBPlace(supabase, {
      city: selectedCity.city,
      country: selectedCity.country,
      dateVisited: dateValue,
    });
    if (saved) {
      setDbPlaces((prev) => [saved, ...prev]);
      const newTotal = allPlaces.length + 1;
      setCelebration({ country: selectedCity.country, flag: countryFlag(selectedCity.country), total: newTotal });
    }
    setSaving(false);
    setShowAdd(false);
    setCityQuery("");
    setSelectedCity(null);
    setDateValue("");
  }

  async function handleRemove(id: string) {
    setDbPlaces((prev) => prev.filter((p) => p.id !== id));
    await removeDBPlace(supabase, id);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-5 w-5 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 pb-6 space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between pt-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
          {L.title}
          {allPlaces.length > 0 && (
            <span className="ml-2 text-violet-400 font-black">{allPlaces.length}</span>
          )}
        </p>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-1 text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          {L.add}
        </button>
      </div>

      {/* Add-place inline form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-violet-800/40 bg-violet-950/20 p-3 space-y-3">
              <p className="text-xs font-bold text-violet-300">{L.addTitle}</p>

              {/* City search */}
              <div className="relative">
                <input
                  type="text"
                  value={selectedCity ? selectedCity.city : cityQuery}
                  onChange={(e) => { setCityQuery(e.target.value); setSelectedCity(null); }}
                  placeholder={L.cityPlaceholder}
                  className="w-full text-sm bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-violet-600/50"
                />
                {selectedCity && (
                  <button
                    onClick={() => { setSelectedCity(null); setCityQuery(""); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                {suggestions.length > 0 && !selectedCity && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-lg border border-white/[0.1] bg-gray-900 shadow-xl overflow-hidden">
                    {suggestions.map((s) => (
                      <button
                        key={`${s.city}|${s.country}`}
                        onClick={() => { setSelectedCity(s); setCityQuery(""); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/[0.06] transition-colors"
                      >
                        <span>{countryFlag(s.country)}</span>
                        <span className="text-white">{s.city}</span>
                        <span className="text-gray-500 text-xs ml-auto">{s.country}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">{L.dateLabel}</label>
                <input
                  type="date"
                  value={dateValue}
                  onChange={(e) => setDateValue(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                  className="w-full text-sm bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-600/50"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleAddConfirm}
                  disabled={!selectedCity || !dateValue || saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors"
                >
                  <Check className="h-3.5 w-3.5" />
                  {saving ? "…" : L.confirm}
                </button>
                <button
                  onClick={() => { setShowAdd(false); setCityQuery(""); setSelectedCity(null); setDateValue(""); }}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-gray-400 text-xs font-semibold transition-colors"
                >
                  {L.cancel}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {allPlaces.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
          <span className="text-4xl">🌍</span>
          <p className="text-sm font-semibold text-gray-400">{L.empty}</p>
          <p className="text-xs text-gray-600 max-w-[260px]">{L.emptySub}</p>
        </div>
      )}

      {/* Places grid */}
      {allPlaces.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5">
          {allPlaces.map((place) => (
            <PlaceCard
              key={place.id}
              place={place}
              locale={locale}
              onRemove={place.source === "manual" ? () => handleRemove(place.id) : undefined}
            />
          ))}
        </div>
      )}

      {celebration && (
        <CountryCelebration
          country={celebration.country}
          flag={celebration.flag}
          totalCountries={celebration.total}
          locale={locale}
          onDone={() => setCelebration(null)}
        />
      )}
    </div>
  );
}

interface PlaceCardProps {
  place: VisitedPlace;
  locale: "es" | "en";
  onRemove?: () => void;
}

function PlaceCard({ place, locale, onRemove }: PlaceCardProps) {
  const L = LABELS[locale];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="relative rounded-xl overflow-hidden"
      style={{
        background: "linear-gradient(145deg, rgba(245,240,220,0.96) 0%, rgba(230,220,190,0.98) 100%)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.4), inset 0 0 0 2px rgba(0,0,0,0.10), inset 0 0 0 5px rgba(245,240,220,0.4)",
        filter: "sepia(0.12)",
      }}
    >
      {/* Perforated border */}
      <div
        className="absolute inset-0 rounded-xl pointer-events-none"
        style={{ border: "1.5px dashed rgba(139,92,246,0.4)", margin: 5, borderRadius: 8 }}
      />

      {/* STAMP watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.06]">
        <p
          className="text-5xl font-black text-violet-700 uppercase tracking-widest"
          style={{ transform: "rotate(-20deg)" }}
        >
          STAMP
        </p>
      </div>

      <div className="relative z-10 px-3 pt-3 pb-3">
        {/* Source icon + remove */}
        <div className="flex items-center justify-between mb-1.5">
          <span title={place.source === "inferred" ? L.inferred : L.manual}>
            {place.source === "inferred"
              ? <Plane className="h-3 w-3 text-violet-600/60" />
              : <MapPin className="h-3 w-3 text-violet-600/60" />
            }
          </span>
          {onRemove && (
            <button
              onClick={onRemove}
              className="p-0.5 rounded-full bg-black/10 hover:bg-black/20 transition-colors"
            >
              <X className="h-2.5 w-2.5 text-gray-600" />
            </button>
          )}
        </div>

        {/* Flag + city */}
        <div className="text-center">
          <p className="text-2xl leading-none mb-1">{countryFlag(place.country)}</p>
          <p className="text-xs font-black text-gray-800 leading-tight">{place.city}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">{place.country}</p>
        </div>

        {/* Date */}
        <div className="mt-2 pt-2 border-t border-violet-400/20 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-0.5">{L.firstVisit}</p>
          <p className="text-[10px] font-black text-gray-700">{formatDate(place.dateVisited, locale)}</p>
        </div>
      </div>
    </motion.div>
  );
}
