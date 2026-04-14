"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";

interface OnboardingModalProps {
  locale: "es" | "en";
  onSeeExample: () => void;
  onStartFresh: () => void;
}

const STEP_COUNT = 3;

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

          {/* Step 0: Welcome */}
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

          {/* Step 2: App preview */}
          {step === 2 && (
            <div
              key="step-2"
              className={`absolute inset-0 px-6 pt-8 pb-4 flex flex-col items-center justify-center text-center gap-4 ${
                direction === "forward" ? "animate-slide-in-right" : "animate-slide-in-left"
              }`}
            >
              <div>
                <h2 className="text-xl font-black text-white mb-1">
                  {es ? "Esto es lo que verás" : "This is what you'll see"}
                </h2>
                <p className="text-sm text-gray-400 leading-relaxed max-w-xs mx-auto">
                  {es
                    ? "Tu vuelo, el clima y cuándo salir — todo en un vistazo."
                    : "Your flight, the weather, and when to leave — all at a glance."}
                </p>
              </div>

              {/* Mini flight card mockup */}
              <motion.div
                className="w-full max-w-[280px] rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/60 to-indigo-950/40 px-4 py-3.5 text-left shadow-lg shadow-violet-900/20"
                initial={{ opacity: 0, scale: 0.92, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3, ease: "easeOut" }}
              >
                {/* Flight header */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white/90 tracking-wide">AA 1234</span>
                  <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-900/30 border border-emerald-700/30 px-1.5 py-0.5 rounded-full">
                    {es ? "✅ A tiempo" : "✅ On time"}
                  </span>
                </div>

                {/* Route */}
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-sm font-black text-white">Buenos Aires</span>
                  <span className="text-gray-500 text-xs">→</span>
                  <span className="text-sm font-black text-white">Miami</span>
                </div>

                {/* Details row */}
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    🌡️ 24°C ☀️
                  </span>
                  <span className="text-xs text-violet-300 font-semibold">
                    {es ? "Salí a las 14:30 · en 2h" : "Leave at 14:30 · in 2h"}
                  </span>
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
