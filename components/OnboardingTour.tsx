"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { analytics } from "@/lib/analytics";

interface OnboardingTourProps {
  onDone: () => void;
  onStartImport?: () => void;
  locale?: "es" | "en";
}

const STEPS_ES = [
  {
    icon: "📲",
    tag: "01 · IMPORTAR",
    title: "Pegá tu confirmación y listo",
    desc: "TripCopilot lee cualquier email o screenshot de reserva y carga todos tus vuelos solo. Sin tipear nada.",
    cta: "Siguiente",
  },
  {
    icon: "🔔",
    tag: "02 · ALERTAS",
    title: "Te avisamos antes que nadie",
    desc: "24 horas antes de tu vuelo activamos el monitoreo. Cambio de puerta, demora o cancelación — la notificación te llega al celular en menos de 2 minutos, aunque la app esté cerrada.",
    cta: "Siguiente",
  },
  {
    icon: "✈",
    tag: "03 · TABLERO",
    title: "Tu vuelo como en el aeropuerto",
    desc: "Abrí /board y ves todos tus vuelos en tiempo real con animaciones estilo cartel de aeropuerto. Mandále el link a tu familia — ven exactamente en qué vuelo estás.",
    cta: "📷 Importar mi primer vuelo",
    highlight: true,
  },
];

const STEPS_EN = [
  {
    icon: "📲",
    tag: "01 · IMPORT",
    title: "Paste your confirmation and done",
    desc: "TripCopilot reads any booking email or screenshot and loads all your flights automatically. No typing needed.",
    cta: "Next",
  },
  {
    icon: "🔔",
    tag: "02 · ALERTS",
    title: "We notify you before anyone else",
    desc: "24 hours before your flight we start monitoring. Gate change, delay or cancellation — push notification arrives in under 2 minutes, even with the app closed.",
    cta: "Next",
  },
  {
    icon: "✈",
    tag: "03 · BOARD",
    title: "Your flight like at the airport",
    desc: "Open /board and see all your flights in real time with airport-style flip animations. Share the link with your family — they see exactly which flight you're on.",
    cta: "📷 Import my first flight",
    highlight: true,
  },
];

export function OnboardingTour({ onDone, onStartImport, locale = "es" }: OnboardingTourProps) {
  const [step, setStep] = useState(0);
  const steps = locale === "en" ? STEPS_EN : STEPS_ES;
  const current = steps[step];
  const isLast = step === steps.length - 1;

  useEffect(() => {
    analytics.onboardingTourStarted();
  }, []);

  function next() {
    if (isLast) {
      analytics.onboardingTourCompleted();
      onDone();
      onStartImport?.();
    } else {
      setStep((s) => s + 1);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onDone}
      />

      {/* Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.22 }}
          className="relative w-full max-w-sm rounded-2xl border border-white/[0.08] p-7 flex flex-col gap-5"
          style={{ background: "linear-gradient(160deg, #0e0e1c 0%, #09090f 100%)" }}
        >
          {/* Skip */}
          <button
            onClick={onDone}
            className="absolute top-4 right-4 text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            {locale === "en" ? "Skip" : "Saltar"}
          </button>

          {/* Icon */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
            style={{
              background: current.highlight ? "rgba(255,184,0,0.1)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${current.highlight ? "rgba(255,184,0,0.25)" : "rgba(255,255,255,0.06)"}`,
            }}
          >
            {current.icon}
          </div>

          {/* Tag */}
          <p
            className="text-[10px] font-bold tracking-[0.18em]"
            style={{ color: current.highlight ? "#FFB800" : "rgba(232,232,240,0.35)", fontFamily: "'JetBrains Mono',monospace" }}
          >
            {current.tag}
          </p>

          {/* Title */}
          <h3 className="text-xl font-black tracking-tight leading-tight -mt-3">
            {current.title}
          </h3>

          {/* Desc */}
          <p className="text-sm text-gray-400 leading-relaxed -mt-1">
            {current.desc}
          </p>

          {/* Step dots */}
          <div className="flex gap-2 items-center">
            {steps.map((_, i) => (
              <div
                key={i}
                className="h-1 rounded-full transition-all duration-300"
                style={{
                  width: i === step ? 20 : 6,
                  background: i === step ? "#FFB800" : "rgba(255,255,255,0.12)",
                }}
              />
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={next}
            className="w-full py-3.5 rounded-xl text-sm font-bold tracking-wide transition-all active:scale-[0.98]"
            style={{
              background: current.highlight ? "#FFB800" : "rgba(255,255,255,0.06)",
              color: current.highlight ? "#07070d" : "#fff",
              border: current.highlight ? "none" : "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {current.cta}
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
