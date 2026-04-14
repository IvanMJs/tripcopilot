"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";

interface OnboardingModalProps {
  locale: "es" | "en";
  onSeeExample: () => void;
  onStartFresh: () => void;
}

const STEP_COUNT = 4;

export function OnboardingModal({ locale, onSeeExample, onStartFresh }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const es = locale === "es";
  const isLast = step === STEP_COUNT - 1;

  const goTo = useCallback((next: number) => {
    setDirection(next > step ? "forward" : "back");
    setStep(next);
  }, [step]);

  function handleNext() {
    if (isLast) {
      onStartFresh();
    } else {
      goTo(step + 1);
    }
  }

  function handleBack() {
    if (step > 0) goTo(step - 1);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-gray-950 shadow-2xl overflow-hidden animate-slide-up">

        {/* Steps — fixed height to prevent layout shift */}
        <div className="relative overflow-hidden" style={{ minHeight: 290 }}>

          {/* Step 0: Welcome + Create your first trip */}
          {step === 0 && (
            <div
              key="step-0"
              className={`absolute inset-0 px-6 pt-10 pb-4 flex flex-col items-center justify-center text-center gap-5 ${
                direction === "forward" ? "animate-slide-in-right" : "animate-slide-in-left"
              }`}
            >
              {/* Animated plane icon */}
              <div className="relative h-16 w-16 flex items-center justify-center shrink-0">
                <div
                  className="absolute inset-0 rounded-2xl bg-blue-600/20 border border-blue-600/30 animate-pulse"
                />
                <svg
                  className="h-8 w-8 text-blue-400 relative z-10 animate-onboarding-fly"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 2L11 13" />
                  <path d="M22 2L15 22l-4-9-9-4 22-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-black text-white mb-2">
                  {es ? "Bienvenido a TripCopilot" : "Welcome to TripCopilot"}
                </h2>
                <p className="text-sm text-gray-400 leading-relaxed max-w-xs mx-auto">
                  {es
                    ? "TripCopilot monitorea tus vuelos 24/7 con alertas en tiempo real para que viajes tranquilo."
                    : "TripCopilot monitors your flights 24/7 with real-time alerts so you travel stress-free."}
                </p>
              </div>
              {/* Highlight: create first trip */}
              <div className="w-full max-w-xs rounded-xl border border-blue-500/30 bg-blue-950/30 px-4 py-3 text-left">
                <p className="text-xs font-bold text-blue-400 mb-1">
                  {es ? "Comenzá acá" : "Start here"}
                </p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {es
                    ? "Creá tu primer viaje con el botón + y empezá a monitorear tus vuelos."
                    : "Create your first trip with the + button and start monitoring your flights."}
                </p>
              </div>
            </div>
          )}

          {/* Step 1: AI boarding pass scan */}
          {step === 1 && (
            <div
              key="step-1"
              className={`absolute inset-0 px-6 pt-10 pb-4 flex flex-col items-center justify-center text-center gap-5 ${
                direction === "forward" ? "animate-slide-in-right" : "animate-slide-in-left"
              }`}
            >
              {/* Scan animation */}
              <div className="relative h-16 w-16 shrink-0">
                <div className="h-16 w-16 rounded-2xl bg-violet-600/20 border border-violet-600/30 flex items-center justify-center overflow-hidden">
                  {/* Document icon */}
                  <svg className="h-8 w-8 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <rect x="4" y="2" width="16" height="20" rx="2" />
                    <line x1="8" y1="8" x2="16" y2="8" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                    <line x1="8" y1="16" x2="12" y2="16" />
                  </svg>
                  {/* Scan line */}
                  <div
                    className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-violet-400 to-transparent opacity-90 animate-onboarding-scan"
                  />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-black text-white mb-2">
                  {es ? "IA que lee tus vuelos" : "AI that reads your flights"}
                </h2>
                <p className="text-sm text-gray-400 leading-relaxed max-w-xs mx-auto">
                  {es
                    ? "Sacá foto a tu boarding pass o pegá el texto de la reserva. TripCopilot extrae todo automáticamente — sin tipear nada."
                    : "Take a photo of your boarding pass or paste your booking text. TripCopilot extracts everything automatically."}
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Smart alerts + packing + weather */}
          {step === 2 && (
            <div
              key="step-2"
              className={`absolute inset-0 px-6 pt-8 pb-4 flex flex-col items-center justify-center text-center gap-4 ${
                direction === "forward" ? "animate-slide-in-right" : "animate-slide-in-left"
              }`}
            >
              {/* Icon */}
              <div className="relative h-16 w-16 flex items-center justify-center shrink-0">
                <div className="absolute inset-0 rounded-2xl bg-emerald-600/20 border border-emerald-600/30" />
                <svg
                  className="h-8 w-8 text-emerald-400 relative z-10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                  <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                  <line x1="6" y1="1" x2="6" y2="4" />
                  <line x1="10" y1="1" x2="10" y2="4" />
                  <line x1="14" y1="1" x2="14" y2="4" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-black text-white mb-2">
                  {es ? "Todo listo para volar" : "Ready to fly"}
                </h2>
                <p className="text-sm text-gray-400 leading-relaxed max-w-xs mx-auto">
                  {es
                    ? "Alertas inteligentes de demoras, lista de equipaje personalizada y el clima en destino — todo en un lugar."
                    : "Smart delay alerts, personalized packing list, and weather at your destination — all in one place."}
                </p>
              </div>
              {/* Feature pills */}
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  { icon: "🔔", label: es ? "Alertas de demoras" : "Delay alerts" },
                  { icon: "🌦️", label: es ? "Clima en destino" : "Destination weather" },
                  { icon: "🎒", label: es ? "Lista de equipaje" : "Packing list" },
                ].map((pill) => (
                  <span
                    key={pill.label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-300"
                  >
                    {pill.icon} {pill.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Discover tab + AI suggestions + travel stats */}
          {step === 3 && (
            <div
              key="step-3"
              className={`absolute inset-0 px-6 pt-8 pb-4 flex flex-col items-center justify-center text-center gap-4 ${
                direction === "forward" ? "animate-slide-in-right" : "animate-slide-in-left"
              }`}
            >
              {/* Icon */}
              <div className="relative h-16 w-16 flex items-center justify-center shrink-0">
                <div className="absolute inset-0 rounded-2xl bg-amber-600/20 border border-amber-600/30" />
                <svg
                  className="h-8 w-8 text-amber-400 relative z-10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-black text-white mb-2">
                  {es ? "Descubrí tu próximo viaje" : "Discover your next trip"}
                </h2>
                <p className="text-sm text-gray-400 leading-relaxed max-w-xs mx-auto">
                  {es
                    ? "Sugerencias de IA basadas en tus viajes anteriores, tus stats de viajero y destinos inspiradores para cada temporada."
                    : "AI suggestions based on your past trips, traveler stats, and inspiring destinations for every season."}
                </p>
              </div>
              {/* Mini stats mockup */}
              <motion.div
                className="w-full max-w-[280px] rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/40 to-orange-950/30 px-4 py-3 text-left"
                initial={{ opacity: 0, scale: 0.92, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3, ease: "easeOut" }}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400/70 mb-2">
                  {es ? "Tus stats de viajero" : "Your traveler stats"}
                </p>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-lg font-black text-white">12</p>
                    <p className="text-[10px] text-gray-500">{es ? "vuelos" : "flights"}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-black text-white">4</p>
                    <p className="text-[10px] text-gray-500">{es ? "países" : "countries"}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-black text-white">18k</p>
                    <p className="text-[10px] text-gray-500">km</p>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

        </div>

        {/* Dot pagination */}
        <div className="flex justify-center gap-2 py-2">
          {Array.from({ length: STEP_COUNT }).map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Step ${i + 1}`}
              className={`rounded-full transition-all duration-300 ${
                i === step
                  ? "h-2 w-5 bg-blue-500"
                  : "h-2 w-2 bg-white/20 hover:bg-white/35"
              }`}
            />
          ))}
        </div>

        {/* CTAs */}
        <div className="px-6 pb-7 pt-3 space-y-2">
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={handleBack}
                className="rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-gray-400 text-sm font-medium py-3 px-4 transition-all tap-scale"
              >
                {es ? "← Anterior" : "← Back"}
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-sm font-bold py-3 transition-all tap-scale"
            >
              {isLast
                ? (es ? "Comenzar" : "Get started")
                : (es ? "Siguiente →" : "Next →")}
            </button>
          </div>
          {step === 0 && (
            <button
              onClick={onSeeExample}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-gray-300 text-sm font-medium py-3 transition-all tap-scale"
            >
              {es ? "Ver viaje de ejemplo" : "See example trip"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
