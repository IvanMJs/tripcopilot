"use client";

import { Plane, Bell, Zap, Shield } from "lucide-react";

interface OnboardingModalProps {
  locale: "es" | "en";
  onSeeExample: () => void;
  onStartFresh: () => void;
}

const FEATURES = [
  {
    icon: Plane,
    es: { title: "Monitoreo en tiempo real", desc: "Estado FAA + internacional para cada aeropuerto de tu ruta" },
    en: { title: "Real-time monitoring",     desc: "FAA + international status for every airport on your route" },
  },
  {
    icon: Bell,
    es: { title: "Notificaciones push",      desc: "Check-in 24h antes, alerta pre-vuelo, demoras y cancelaciones" },
    en: { title: "Push notifications",       desc: "Check-in 24h before, pre-flight alert, delays and cancellations" },
  },
  {
    icon: Zap,
    es: { title: "TripCopilot IA",           desc: "Importá tu reserva de hotel con un screenshot o texto de email" },
    en: { title: "TripCopilot AI",           desc: "Import your hotel booking from a screenshot or email text" },
  },
  {
    icon: Shield,
    es: { title: "Análisis de conexiones",   desc: "Riesgo de cada conexión según MCT del aeropuerto y demoras" },
    en: { title: "Connection analysis",      desc: "Risk per connection based on airport MCT and live delays" },
  },
];

export function OnboardingModal({ locale, onSeeExample, onStartFresh }: OnboardingModalProps) {
  const es = locale === "es";
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-gray-950 shadow-2xl overflow-hidden animate-fade-in-up">

        {/* Header */}
        <div className="px-6 pt-7 pb-4 text-center">
          <img src="/tripcopliot-avatar.svg" alt="TripCopilot" className="h-14 w-auto mx-auto mb-4" />
          <h2 className="text-xl font-black text-white mb-1">
            {es ? "Bienvenido a TripCopilot" : "Welcome to TripCopilot"}
          </h2>
          <p className="text-sm text-gray-400 leading-relaxed">
            {es
              ? "Tu itinerario completo con alertas en tiempo real"
              : "Your complete itinerary with real-time alerts"}
          </p>
        </div>

        {/* Feature list */}
        <div className="px-6 py-2 space-y-3">
          {FEATURES.map(({ icon: Icon, es: esL, en: enL }) => {
            const f = es ? esL : enL;
            return (
              <div key={f.title} className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5 h-7 w-7 rounded-lg bg-blue-600/20 border border-blue-600/30 flex items-center justify-center">
                  <Icon className="h-3.5 w-3.5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white leading-tight">{f.title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTAs */}
        <div className="px-6 pb-7 pt-5 space-y-2">
          <button
            onClick={onSeeExample}
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-sm font-bold py-3 transition-all tap-scale"
          >
            {es ? "Ver viaje de ejemplo" : "See example trip"}
          </button>
          <button
            onClick={onStartFresh}
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-gray-300 text-sm font-medium py-3 transition-all tap-scale"
          >
            {es ? "Empezar desde cero" : "Start from scratch"}
          </button>
        </div>

      </div>
    </div>
  );
}
