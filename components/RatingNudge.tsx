"use client";

import { useEffect, useState } from "react";

const RATING_NUDGE_KEY = "tripcopilot-rating-nudge-shown";

interface RatingNudgeProps {
  showAfterTrips: number;
  tripCount: number;
}

export function RatingNudge({ showAfterTrips, tripCount }: RatingNudgeProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    if (localStorage.getItem(RATING_NUDGE_KEY)) return;
    if (tripCount >= showAfterTrips) {
      setVisible(true);
    }
  }, [tripCount, showAfterTrips]);

  function handleDismiss() {
    setVisible(false);
    localStorage.setItem(RATING_NUDGE_KEY, "1");
  }

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-24 right-4 z-40 w-72 rounded-2xl border border-white/10 bg-gray-950/90 backdrop-blur-md shadow-xl shadow-black/60 px-4 py-3 animate-fade-in-up"
    >
      <div className="flex items-start gap-3">
        <span className="text-xl leading-none mt-0.5" aria-hidden="true">⭐</span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white leading-tight">
            ¿Te gusta TripCopilot?
          </p>
          <p className="text-xs text-gray-400 mt-0.5 leading-snug">
            Dejanos una reseña y ayudá a otros viajeros
          </p>
          <a
            href="mailto:feedback@tripcopilot.app"
            onClick={handleDismiss}
            className="mt-2 inline-block rounded-lg bg-[#FFB800] hover:bg-[#FFC933] active:scale-95 text-[#07070d] text-xs font-semibold px-3 py-1.5 transition-all"
          >
            Dejar reseña
          </a>
        </div>

        <button
          onClick={handleDismiss}
          aria-label="Cerrar sugerencia de reseña"
          className="flex items-center justify-center rounded-lg p-1 text-gray-500 hover:text-gray-300 hover:bg-white/[0.06] transition-colors shrink-0 mt-0.5"
        >
          <span className="text-base leading-none" aria-hidden="true">×</span>
        </button>
      </div>
    </div>
  );
}
