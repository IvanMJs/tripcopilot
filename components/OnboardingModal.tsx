"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface OnboardingModalProps {
  locale: "es" | "en";
  onSeeExample: () => void;
  onStartFresh: () => void;
}

const STEP_COUNT = 5;

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
    if (isLast) {
      onStartFresh();
      return;
    }
    if (step === 3) {
      if (username.length > 0 && usernameStatus !== "available") {
        return;
      }
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

          {/* Step 1: Welcome + Create your first trip */}
          {step === 1 && (
            <div
              key="step-1"
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

          {/* Step 3: TripSocial username setup */}
          {step === 3 && (
            <div
              key="step-3"
              className={`absolute inset-0 px-5 pt-6 pb-4 flex flex-col items-center justify-start text-center gap-3 overflow-y-auto ${
                direction === "forward" ? "animate-slide-in-right" : "animate-slide-in-left"
              }`}
            >
              {/* Icon */}
              <div className="relative h-14 w-14 flex items-center justify-center shrink-0 mt-2">
                <div className="absolute inset-0 rounded-2xl bg-pink-600/20 border border-pink-600/30" />
                <svg className="h-7 w-7 text-pink-400 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>

              {/* Headline */}
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

              {/* Value props mini-cards */}
              <div className="w-full max-w-xs space-y-1.5">
                {[
                  { icon: "✈️", text: es ? "Tus vuelos y viajes en un perfil público" : "Your flights & trips on a public profile" },
                  { icon: "👫", text: es ? "Seguí a amigos y vé dónde están viajando" : "Follow friends and see where they're flying" },
                  { icon: "🌍", text: es ? "Descubrí viajeros con los mismos destinos" : "Discover travelers with the same destinations" },
                ].map((vp) => (
                  <div key={vp.icon} className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] px-3 py-2 text-left">
                    <span className="text-base shrink-0">{vp.icon}</span>
                    <span className="text-xs text-gray-300 leading-snug">{vp.text}</span>
                  </div>
                ))}
              </div>

              {/* Inputs */}
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
                    className="w-full pl-7 pr-10 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white placeholder-gray-600 text-sm outline-none focus:border-violet-500/50 transition-colors"
                  />
                  {usernameStatus === "checking" && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">{es ? "..." : "..."}</span>
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
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white placeholder-gray-600 text-sm outline-none focus:border-violet-500/50 transition-colors"
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

          {/* Step 4: Discover tab + AI suggestions + travel stats */}
          {step === 4 && (
            <div
              key="step-4"
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
