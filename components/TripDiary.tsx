"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Loader2, RefreshCw, Copy, Check } from "lucide-react";
import { TripFlight, TripTab } from "@/lib/types";

interface TripDiaryProps {
  trip: TripTab;
  locale: "es" | "en";
}

const L = {
  es: {
    title: "Diario de viaje",
    subtitle: "Una historia de tu aventura generada por IA",
    generate: "Generar diario",
    regenerate: "Regenerar",
    generating: "Escribiendo tu historia…",
    copy: "Copiar",
    copied: "¡Copiado!",
    noFlights: "Agregá vuelos al viaje para generar tu diario.",
    error: "No se pudo generar el diario. Intentá de nuevo.",
  },
  en: {
    title: "Trip Diary",
    subtitle: "An AI-generated story of your adventure",
    generate: "Generate diary",
    regenerate: "Regenerate",
    generating: "Writing your story…",
    copy: "Copy",
    copied: "Copied!",
    noFlights: "Add flights to the trip to generate your diary.",
    error: "Could not generate the diary. Please try again.",
  },
};

function diaryKey(tripId: string) {
  return `trip-diary-${tripId}`;
}

function buildFlights(flights: TripFlight[]) {
  return flights.map((f) => ({
    originCode: f.originCode,
    destinationCode: f.destinationCode,
    isoDate: f.isoDate,
    airline: f.airlineName,
    flightNumber: f.flightNumber,
  }));
}

export function TripDiary({ trip, locale }: TripDiaryProps) {
  const labels = L[locale];
  const [diary, setDiary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!trip.id) return;
    const stored = localStorage.getItem(diaryKey(trip.id));
    if (stored) setDiary(stored);
  }, [trip.id]);

  const hasFlights = trip.flights.length > 0;

  async function generate() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/trip-diary", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tripId: trip.id,
          tripName: trip.name,
          flights: buildFlights(trip.flights),
          locale,
        }),
      });
      if (!res.ok) throw new Error("bad response");
      const json = await res.json() as { diary?: string };
      const text = json.diary ?? "";
      setDiary(text);
      localStorage.setItem(diaryKey(trip.id), text);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!diary) return;
    await navigator.clipboard.writeText(diary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="px-4 pb-6">
      <div className="rounded-2xl border border-amber-700/30 bg-gradient-to-br from-amber-950/30 via-orange-950/20 to-yellow-950/20 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-amber-700/20">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4 text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white/90">{labels.title}</p>
            <p className="text-xs text-gray-400">{labels.subtitle}</p>
          </div>
          {diary && !loading && (
            <button
              onClick={handleCopy}
              className="ml-auto shrink-0 flex items-center gap-1.5 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 px-2.5 py-1.5 text-xs text-gray-300 transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? labels.copied : labels.copy}
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-4 py-4">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-sm text-amber-400/80 py-4"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                {labels.generating}
              </motion.div>
            ) : diary ? (
              <motion.div key="diary" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{diary}</p>
                <button
                  onClick={generate}
                  className="mt-4 flex items-center gap-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 active:scale-95 px-3 py-2 text-xs text-amber-400 font-medium transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {labels.regenerate}
                </button>
              </motion.div>
            ) : error ? (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <p className="text-sm text-red-400 mb-3">{labels.error}</p>
                <button
                  onClick={generate}
                  className="rounded-xl bg-amber-600/80 hover:bg-amber-500/80 active:scale-95 text-white text-sm font-semibold px-4 py-2 transition-all"
                >
                  {labels.generate}
                </button>
              </motion.div>
            ) : !hasFlights ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <p className="text-sm text-gray-500 italic">{labels.noFlights}</p>
              </motion.div>
            ) : (
              <motion.div key="cta" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <button
                  onClick={generate}
                  className="w-full rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 active:scale-95 text-white text-sm font-semibold py-2.5 transition-all flex items-center justify-center gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  {labels.generate}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
