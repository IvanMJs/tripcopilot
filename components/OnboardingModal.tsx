"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const es = locale === "es";
  const isLast = step === STEP_COUNT - 1;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (username.length < 3) {
      setUsernameStatus("idle");
      return;
    }
    setUsernameStatus("checking");
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/profile/check-username?u=${encodeURIComponent(username)}`);
        if (res.ok) {
          const data = (await res.json()) as { available?: boolean };
          setUsernameStatus(data.available ? "available" : "taken");
        } else {
          setUsernameStatus("invalid");
        }
      } catch {
        setUsernameStatus("invalid");
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [username]);

  const goTo = useCallback((next: number) => {
    setDirection(next > step ? "forward" : "back");
    setStep(next);
  }, [step]);

  async function handleNext() {
    if (isLast) return; // final step uses explicit CTAs — no "next"
    if (step === 1) {
      // Username step: block advance only if username entered but not valid
      if (username.length > 0 && usernameStatus !== "available") return;
      if (username.length >= 3 && usernameStatus === "available") {
        try {
          await fetch("/api/profile/setup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, displayName }),
          });
        } catch {
          // non-blocking — proceed even if setup fails
        }
      }
    }
    goTo(step + 1);
  }

  function handleBack() {
    if (step > 0) goTo(step - 1);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-gray-950 shadow-2xl overflow-hidden animate-slide-up">

        {/* Steps — fixed height to prevent layout shift */}
        <div className="relative overflow-hidden" style={{ minHeight: 290 }}>

          {/* Step 0: AI boarding pass scan */}
          {step === 0 && (
            <div
              key="step-0"
              className={`absolute inset-0 px-6 pt-10 pb-4 flex flex-col items-center justify-center text-center gap-5 ${
                direction === "forward" ? "animate-slide-in-right" : "animate-slide-in-left"
              }`}
            >
              <div className="relative h-16 w-16 shrink-0">
                <div className="h-16 w-16 rounded-2xl bg-[#FFB800]/20 border border-[rgba(255,184,0,0.25)] flex items-center justify-center overflow-hidden">
                  <svg className="h-8 w-8 text-[#FFB800]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <rect x="4" y="2" width="16" height="20" rx="2" />
                    <line x1="8" y1="8" x2="16" y2="8" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                    <line x1="8" y1="16" x2="12" y2="16" />
                  </svg>
                  <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#FFC933] to-transparent opacity-90 animate-onboarding-scan" />
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

          {/* Step 1: TripSocial username setup */}
          {step === 1 && (
            <div
              key="step-1"
              className={`absolute inset-0 px-5 pt-6 pb-4 flex flex-col items-center justify-start text-center gap-3 overflow-y-auto ${
                direction === "forward" ? "animate-slide-in-right" : "animate-slide-in-left"
              }`}
            >
              <div className="relative h-14 w-14 flex items-center justify-center shrink-0 mt-2">
                <div className="absolute inset-0 rounded-2xl bg-pink-600/20 border border-pink-600/30" />
                <svg className="h-7 w-7 text-pink-400 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>

              <div>
                <h2 className="text-xl font-black text-white mb-1">
                  {es ? "Creá tu identidad viajera" : "Create your traveler identity"}
                </h2>
                <p className="text-sm text-gray-400 leading-relaxed max-w-xs mx-auto">
                  {es
                    ? "Tu @username te conecta con otros viajeros y le da vida a tu perfil."
                    : "Your @username connects you with other travelers and brings your profile to life."}
                </p>
              </div>

              <div className="w-full max-w-xs space-y-2">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">@</span>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    placeholder={es ? "tunombre" : "yourname"}
                    maxLength={20}
                    autoCapitalize="none"
                    autoCorrect="off"
                    className="w-full pl-7 pr-10 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white placeholder-gray-600 text-sm outline-none focus:border-[rgba(255,184,0,0.25)] transition-colors"
                  />
                  {usernameStatus === "checking" && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">...</span>
                  )}
                  {usernameStatus === "available" && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-green-400 font-bold">✓</span>
                  )}
                  {usernameStatus === "taken" && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-red-400">
                      {es ? "Tomado" : "Taken"}
                    </span>
                  )}
                  {usernameStatus === "invalid" && username.length > 0 && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-400">
                      {es ? "Inválido" : "Invalid"}
                    </span>
                  )}
                </div>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value.slice(0, 40))}
                  placeholder={es ? "Tu nombre (ej: María G.)" : "Your name (e.g. Maria G.)"}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white placeholder-gray-600 text-sm outline-none focus:border-[rgba(255,184,0,0.25)] transition-colors"
                />
                <p className="text-[11px] text-gray-600 text-center">
                  {es ? "Solo letras minúsculas, números y _ · 3–20 caracteres" : "Lowercase letters, numbers and _ · 3–20 chars"}
                </p>
                <button
                  onClick={() => goTo(step + 1)}
                  className="text-xs text-gray-600 hover:text-gray-400 transition-colors block mx-auto"
                >
                  {es ? "Saltar por ahora →" : "Skip for now →"}
                </button>
              </div>
            </div>
          )}

          {/* Step 2 (final): Choose your path */}
          {step === 2 && (
            <div
              key="step-2"
              className={`absolute inset-0 px-6 pt-10 pb-4 flex flex-col items-center justify-center text-center gap-5 ${
                direction === "forward" ? "animate-slide-in-right" : "animate-slide-in-left"
              }`}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="text-5xl"
              >
                ✈️
              </motion.div>
              <div>
                <h2 className="text-xl font-black text-white mb-2">
                  {es ? "¡Listo para volar!" : "Ready for takeoff!"}
                </h2>
                <p className="text-sm text-gray-400 leading-relaxed max-w-xs mx-auto">
                  {es
                    ? "¿Querés ver cómo funciona con un viaje de ejemplo, o arrancás con el tuyo?"
                    : "Want to see how it works with a sample trip, or jump straight in with yours?"}
                </p>
              </div>
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
                  ? "h-2 w-5 bg-[#FFB800]"
                  : "h-2 w-2 bg-white/20 hover:bg-white/35"
              }`}
            />
          ))}
        </div>

        {/* CTAs */}
        <div className="px-6 pb-7 pt-3 space-y-2">
          {!isLast ? (
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
                onClick={() => void handleNext()}
                className="flex-1 rounded-xl bg-[#FFB800] hover:bg-[#FFC933] active:scale-95 text-[#07070d] text-sm font-bold py-3 transition-all tap-scale"
              >
                {es ? "Siguiente →" : "Next →"}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={onSeeExample}
                className="w-full rounded-xl bg-[#FFB800] hover:bg-[#FFC933] active:scale-95 text-[#07070d] text-sm font-bold py-3.5 transition-all tap-scale"
              >
                {es ? "Ver viaje de ejemplo ✈️" : "See example trip ✈️"}
              </button>
              <button
                onClick={onStartFresh}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-gray-300 text-sm font-medium py-3 transition-all tap-scale"
              >
                {es ? "Crear mi primer viaje" : "Create my first trip"}
              </button>
              <button
                onClick={handleBack}
                className="block mx-auto text-xs text-gray-600 hover:text-gray-400 transition-colors pt-1"
              >
                {es ? "← Volver" : "← Back"}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
