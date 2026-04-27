"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Share2, Plane, Globe, Clock } from "lucide-react";
import { TripTab } from "@/lib/types";
import { computeTripStats } from "@/lib/tripStats";

interface TripDebriefModalProps {
  trip: TripTab;
  locale: "es" | "en";
  onClose: (tripId: string, rating?: number) => void;
}

const LABELS = {
  es: {
    heading: "¡Viaje completado!",
    subheading: (name: string) => `Resumen de "${name}"`,
    flights: "Vuelos",
    km: "Kilómetros",
    countries: "Países",
    hours: "Horas en el aire",
    rateTrip: "¿Cómo fue tu viaje?",
    saveRating: "Guardar y cerrar",
    share: "Compartir",
    close: "Cerrar",
    shareText: (name: string, flights: number, km: number, countries: number) =>
      `Completé mi viaje "${name}": ${flights} vuelo${flights !== 1 ? "s" : ""}, ${km.toLocaleString()} km, ${countries} país${countries !== 1 ? "es" : ""}. ✈️ TripCopilot`,
  },
  en: {
    heading: "Trip completed!",
    subheading: (name: string) => `Summary of "${name}"`,
    flights: "Flights",
    km: "Kilometres",
    countries: "Countries",
    hours: "Hours airborne",
    rateTrip: "How was your trip?",
    saveRating: "Save & close",
    share: "Share",
    close: "Close",
    shareText: (name: string, flights: number, km: number, countries: number) =>
      `Completed my trip "${name}": ${flights} flight${flights !== 1 ? "s" : ""}, ${km.toLocaleString()} km, ${countries} countr${countries !== 1 ? "ies" : "y"}. ✈️ TripCopilot`,
  },
} as const;

export function TripDebriefModal({ trip, locale, onClose }: TripDebriefModalProps) {
  const L = LABELS[locale];
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [visible, setVisible] = useState(false);

  const stats = computeTripStats(trip);

  useEffect(() => {
    // Short delay so the modal entrance feels intentional
    const t = setTimeout(() => setVisible(true), 120);
    return () => clearTimeout(t);
  }, []);

  function handleClose() {
    if (rating > 0) {
      localStorage.setItem(`tc_rating_${trip.id}`, String(rating));
    }
    onClose(trip.id, rating || undefined);
  }

  async function handleShare() {
    const text = L.shareText(
      trip.name,
      stats.totalFlights,
      stats.totalDistanceKm,
      stats.countriesVisited.length,
    );
    try {
      if (navigator.share) {
        await navigator.share({ text, title: "TripCopilot" });
      } else {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      // cancelled or unsupported
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, y: 64, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 32, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="w-full max-w-sm rounded-3xl overflow-hidden bg-surface-input border border-white/[0.07] shadow-2xl self-center"
          >
            {/* Gradient hero */}
            <div className="relative px-6 pt-8 pb-5 bg-gradient-to-br from-[#FFB800]/70 via-blue-900/40 to-[#0c0c1a] self-center">
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 rounded-full p-1.5 text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
                aria-label={locale === "es" ? "Cerrar" : "Close"}
              >
                <X className="h-4 w-4" />
              </button>

              <div className="text-center">
                <span className="text-5xl block mb-3" aria-hidden>🏁</span>
                <h2 className="text-2xl font-black text-white">{L.heading}</h2>
                <p className="text-sm text-[#FFB800]/70 mt-1">{L.subheading(trip.name)}</p>
              </div>
            </div>

            {/* Stats grid */}
            <div className="px-5 py-4">
              <div className="grid grid-cols-2 gap-2.5">
                <StatPill
                  icon={<Plane className="h-4 w-4 text-[#FFB800]" />}
                  value={String(stats.totalFlights)}
                  label={L.flights}
                  accent="violet"
                />
                <StatPill
                  icon={<span className="text-base leading-none" aria-hidden>📏</span>}
                  value={stats.totalDistanceKm.toLocaleString()}
                  label={L.km}
                  accent="blue"
                />
                <StatPill
                  icon={<Globe className="h-4 w-4 text-emerald-400" />}
                  value={String(stats.countriesVisited.length)}
                  label={L.countries}
                  accent="emerald"
                />
                <StatPill
                  icon={<Clock className="h-4 w-4 text-amber-400" />}
                  value={`${stats.totalDurationHours}h`}
                  label={L.hours}
                  accent="amber"
                />
              </div>
            </div>

            {/* Star rating */}
            <div className="px-5 pb-4 text-center">
              <p className="text-[11px] text-gray-500 mb-3 font-semibold uppercase tracking-widest">{L.rateTrip}</p>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHovered(star)}
                    onMouseLeave={() => setHovered(0)}
                    className="transition-transform active:scale-90"
                    aria-label={`${star} ${locale === "es" ? "estrella" : "star"}${star !== 1 ? "s" : ""}`}
                  >
                    <Star
                      className={`h-8 w-8 transition-colors duration-100 ${
                        star <= (hovered || rating)
                          ? "text-amber-400 fill-amber-400"
                          : "text-gray-700"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="px-5 pb-6 flex gap-2.5">
              <button
                onClick={handleShare}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] text-white/60 text-sm font-semibold py-3 hover:bg-white/[0.07] active:scale-95 transition-all"
              >
                <Share2 className="h-4 w-4" />
                {L.share}
              </button>
              <button
                onClick={handleClose}
                className="flex-1 rounded-xl bg-gradient-to-r from-[#FFB800] to-blue-600 hover:from-[#FFB800] hover:to-blue-500 active:scale-95 text-white text-sm font-bold py-3 transition-all"
              >
                {rating > 0 ? L.saveRating : L.close}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StatPill({
  icon,
  value,
  label,
  accent,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  accent: "violet" | "blue" | "emerald" | "amber";
}) {
  const styles: Record<string, string> = {
    violet: "bg-[rgba(255,184,0,0.06)] border-[rgba(255,184,0,0.25)]",
    blue: "bg-blue-950/50 border-blue-800/30",
    emerald: "bg-emerald-950/50 border-emerald-800/30",
    amber: "bg-amber-950/50 border-amber-800/30",
  };
  return (
    <div className={`rounded-2xl border p-3 ${styles[accent]}`}>
      <div className="flex items-center gap-1.5 mb-1.5 h-5">{icon}</div>
      <p className="text-xl font-black text-white leading-none">{value}</p>
      <p className="text-[11px] text-gray-500 mt-0.5 font-medium">{label}</p>
    </div>
  );
}
