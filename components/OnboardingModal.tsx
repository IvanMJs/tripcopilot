"use client";

import { useState } from "react";
import { Plane, Bell, Users, Import } from "lucide-react";

interface OnboardingModalProps {
  locale: "es" | "en";
  onSeeExample: () => void;
  onStartFresh: () => void;
}

const STEPS = [
  {
    id: "welcome",
    icon: null,
    es: {
      title: "Bienvenido a TripCopilot",
      desc: "TripCopilot monitorea tus vuelos 24/7 con alertas en tiempo real.",
    },
    en: {
      title: "Welcome to TripCopilot",
      desc: "TripCopilot monitors your flights 24/7 with real-time alerts.",
    },
  },
  {
    id: "import",
    icon: Import,
    es: {
      title: "Importá tus vuelos",
      desc: "Pegá el texto de tu reserva y la IA extrae todo automáticamente.",
    },
    en: {
      title: "Import your flights",
      desc: "Paste your booking text and the AI extracts everything automatically.",
    },
  },
  {
    id: "alerts",
    icon: Bell,
    es: {
      title: "Activá alertas",
      desc: "Recibí push antes de que salga tu vuelo — demoras, puertas, cancelaciones.",
    },
    en: {
      title: "Activate alerts",
      desc: "Get push notifications before your flight — delays, gates, cancellations.",
    },
  },
  {
    id: "share",
    icon: Users,
    es: {
      title: "Invitá familia",
      desc: "Compartí el link de tracking con quien quieras en un tap.",
    },
    en: {
      title: "Invite family",
      desc: "Share the tracking link with anyone you want in one tap.",
    },
  },
];

export function OnboardingModal({ locale, onSeeExample, onStartFresh }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const es = locale === "es";
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];
  const content = es ? current.es : current.en;

  function handleNext() {
    if (isLast) {
      onStartFresh();
    } else {
      setStep((s) => s + 1);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-gray-950 shadow-2xl overflow-hidden animate-fade-in-up">

        {/* Step content */}
        <div className="px-6 pt-8 pb-4 text-center min-h-[220px] flex flex-col items-center justify-center gap-4">
          {current.id === "welcome" ? (
            /* Plane animation for step 0 */
            <div className="relative h-16 w-16 flex items-center justify-center">
              <div
                className="absolute inset-0 rounded-2xl bg-blue-600/20 border border-blue-600/30"
                style={{ animation: "pulse 2s ease-in-out infinite" }}
              />
              <Plane
                className="h-8 w-8 text-blue-400 relative z-10"
                style={{ animation: "onboarding-fly 2.5s ease-in-out infinite" }}
              />
              <style>{`
                @keyframes onboarding-fly {
                  0%, 100% { transform: translateX(-4px) rotate(-8deg); }
                  50% { transform: translateX(4px) rotate(8deg); }
                }
              `}</style>
            </div>
          ) : current.icon ? (
            <div className="h-16 w-16 rounded-2xl bg-blue-600/20 border border-blue-600/30 flex items-center justify-center">
              <current.icon className="h-8 w-8 text-blue-400" />
            </div>
          ) : null}

          <div>
            <h2 className="text-xl font-black text-white mb-2">{content.title}</h2>
            <p className="text-sm text-gray-400 leading-relaxed max-w-xs mx-auto">{content.desc}</p>
          </div>
        </div>

        {/* Dot progress */}
        <div className="flex justify-center gap-1.5 pb-2">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              aria-label={`Step ${i + 1}`}
              className={`rounded-full transition-all duration-300 ${
                i === step
                  ? "h-2 w-5 bg-blue-500"
                  : "h-2 w-2 bg-white/20 hover:bg-white/30"
              }`}
            />
          ))}
        </div>

        {/* CTAs */}
        <div className="px-6 pb-7 pt-4 space-y-2">
          <button
            onClick={handleNext}
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-sm font-bold py-3 transition-all tap-scale"
          >
            {isLast
              ? (es ? "Empezar" : "Get started")
              : (es ? "Siguiente →" : "Next →")}
          </button>
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
