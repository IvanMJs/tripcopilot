"use client";

import { motion } from "framer-motion";
import { X, MapPin } from "lucide-react";
import { LandedFlightInfo } from "@/hooks/usePostFlightWelcome";

interface PostFlightWelcomeBannerProps {
  flight: LandedFlightInfo;
  locale: "es" | "en";
  onDismiss: () => void;
}

export function PostFlightWelcomeBanner({
  flight,
  locale,
  onDismiss,
}: PostFlightWelcomeBannerProps) {
  const heading =
    locale === "es"
      ? `✈️ ¡Bienvenido a ${flight.cityName}!`
      : `✈️ Welcome to ${flight.cityName}!`;

  const subtitle =
    locale === "es"
      ? `Tu vuelo ${flight.flightCode} aterrizó. ¡Buen viaje!`
      : `Your flight ${flight.flightCode} has landed. Enjoy your trip!`;

  function handleDismiss() {
    if ("vibrate" in navigator) {
      navigator.vibrate(30);
    }
    onDismiss();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="relative rounded-xl overflow-hidden border border-amber-500/30 bg-gradient-to-r from-amber-950/70 via-orange-950/60 to-amber-950/70 shadow-lg shadow-amber-900/20"
    >
      {/* Subtle inner glow line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />

      <div className="flex items-start gap-3 px-4 py-3.5 pr-3">
        {/* Icon */}
        <div className="shrink-0 mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 border border-amber-400/20">
          <MapPin className="h-4 w-4 text-amber-300" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-amber-200 leading-snug">{heading}</p>
          <p className="text-xs text-amber-400/80 mt-0.5 leading-snug">{subtitle}</p>
        </div>

        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          className="shrink-0 mt-0.5 p-1.5 rounded-lg text-amber-500/60 hover:text-amber-300 hover:bg-amber-500/10 transition-colors tap-scale"
          aria-label={locale === "es" ? "Cerrar" : "Close"}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
