"use client";

import { useState } from "react";
import { PLANS } from "@/lib/mercadopago";

// ── Labels ─────────────────────────────────────────────────────────────────

const LABELS = {
  es: {
    title: "Elige tu plan",
    close: "Cerrar",
    currentPlan: "Plan actual",
    freePricing: "Gratis para siempre",
    redirecting: "Redirigiendo...",
    goExplorer: "Ir a Explorer →",
    goPilot: "Ir a Pilot →",
    footerNote: "Pago seguro por MercadoPago · Cancelá cuando quieras",
    errorCheckout: "Error al iniciar el pago. Intentá de nuevo.",
    explorerPrice: "$5.000 ARS/mes",
    explorerPriceUsd: "USD ~$5/mes",
    pilotPrice: "$10.000 ARS/mes",
    pilotPriceUsd: "USD ~$10/mes",
    freeFeatures: ["2 viajes", "3 vuelos por viaje", "Alertas básicas de check-in"],
    explorerFeatures: [
      "10 viajes · 15 vuelos c/u",
      "Todas las notificaciones push",
      "AI TripAdvisor",
      "Mapa mundial de viajes",
      "Travel Wrapped compartible",
      "Trip Debrief",
      "Export .ics / CSV",
    ],
    pilotFeatures: [
      "Viajes y vuelos ilimitados",
      "Todo lo de Explorer",
      "AI Health Check 48h antes",
      "Viajes compartidos",
      "Morning Briefing semanal",
      "Soporte prioritario",
    ],
  },
  en: {
    title: "Choose your plan",
    close: "Close",
    currentPlan: "Current plan",
    freePricing: "Free forever",
    redirecting: "Redirecting...",
    goExplorer: "Go Explorer →",
    goPilot: "Go Pilot →",
    footerNote: "Secure payment via MercadoPago · Cancel anytime",
    errorCheckout: "Payment failed to start. Please try again.",
    explorerPrice: "ARS $5,000/mo",
    explorerPriceUsd: "USD ~$5/mo",
    pilotPrice: "ARS $10,000/mo",
    pilotPriceUsd: "USD ~$10/mo",
    freeFeatures: ["2 trips", "3 flights per trip", "Basic check-in alerts"],
    explorerFeatures: [
      "10 trips · 15 flights each",
      "All push notifications",
      "AI TripAdvisor",
      "World trip map",
      "Shareable Travel Wrapped",
      "Trip Debrief",
      "Export .ics / CSV",
    ],
    pilotFeatures: [
      "Unlimited trips & flights",
      "Everything in Explorer",
      "AI Health Check 48h before",
      "Shared trips",
      "Weekly Morning Briefing",
      "Priority support",
    ],
  },
} as const;

// ── Props ──────────────────────────────────────────────────────────────────

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  locale?: "es" | "en";
}

// ── Component ──────────────────────────────────────────────────────────────

export function UpgradeModal({ isOpen, onClose, locale = "es" }: UpgradeModalProps) {
  const [loading, setLoading] = useState<"explorer" | "pilot" | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const L = LABELS[locale];

  if (!isOpen) return null;

  async function handleUpgrade(planId: "explorer" | "pilot") {
    setLoading(planId);
    setCheckoutError(null);
    try {
      const successUrl = `${window.location.origin}/app?upgrade=success`;
      const cancelUrl  = `${window.location.origin}/app?upgrade=cancel`;

      const res = await fetch("/api/mercadopago/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ successUrl, cancelUrl, planId }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = (await res.json()) as { url?: string };
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setCheckoutError(L.errorCheckout);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-white/10 bg-surface-input shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
          <h2 className="text-lg font-black text-white">{L.title}</h2>
          <button
            onClick={onClose}
            aria-label={L.close}
            className="rounded-lg p-1.5 text-gray-400 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto px-6 pb-6">

          {/* Error banner */}
          {checkoutError && (
            <div className="mb-4 rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-3 flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-red-400 shrink-0">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-sm text-red-300">{checkoutError}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Free card */}
          <div className="rounded-xl border border-white/[0.12] bg-white/[0.03] p-5 flex flex-col gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">{L.currentPlan}</span>
              <p className="mt-1 text-xl font-black text-white">{PLANS.free.name}</p>
              <p className="text-sm text-gray-500 mt-0.5">{L.freePricing}</p>
            </div>
            <ul className="space-y-2 flex-1">
              {L.freeFeatures.map((feat) => (
                <li key={feat} className="flex items-center gap-2 text-sm text-gray-400">
                  <span className="h-4 w-4 shrink-0 rounded-full border border-gray-600 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5 text-gray-500">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  {feat}
                </li>
              ))}
            </ul>
          </div>

          {/* Explorer card */}
          <div className="rounded-xl border border-sky-500/40 bg-gradient-to-b from-sky-950/30 to-[#0a0a14] p-5 flex flex-col gap-4 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none rounded-xl" style={{ boxShadow: "inset 0 0 40px rgba(14,165,233,0.06)" }} />
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/20 border border-sky-500/40 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-sky-300 mb-2">
                EXPLORER
              </span>
              <p className="text-xl font-black text-white">{PLANS.explorer.name}</p>
              <p className="text-sm text-sky-400/80 mt-0.5">{L.explorerPrice}</p>
              <p className="text-xs text-sky-400/50 mt-0.5">{L.explorerPriceUsd}</p>
            </div>
            <ul className="space-y-2 flex-1">
              {L.explorerFeatures.map((feat) => (
                <li key={feat} className="flex items-center gap-2 text-sm text-gray-200">
                  <span className="h-4 w-4 shrink-0 rounded-full bg-sky-500/20 border border-sky-500/40 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5 text-sky-400">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  {feat}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleUpgrade("explorer")}
              disabled={loading !== null}
              className="relative z-10 w-full rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-95 disabled:opacity-60 text-white text-sm font-black py-3 transition-all"
            >
              {loading === "explorer" ? L.redirecting : L.goExplorer}
            </button>
          </div>

          {/* Pilot card */}
          <div className="rounded-xl border-2 border-amber-500/60 bg-gradient-to-b from-amber-950/30 to-[#0a0a14] p-5 flex flex-col gap-4 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none rounded-xl" style={{ boxShadow: "inset 0 0 40px rgba(245,158,11,0.07)" }} />
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-black mb-2">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                PILOT
              </span>
              <p className="text-xl font-black text-white">{PLANS.pilot.name}</p>
              <p className="text-sm text-amber-400/80 mt-0.5">{L.pilotPrice}</p>
              <p className="text-xs text-amber-400/50 mt-0.5">{L.pilotPriceUsd}</p>
            </div>
            <ul className="space-y-2 flex-1">
              {L.pilotFeatures.map((feat) => (
                <li key={feat} className="flex items-center gap-2 text-sm text-gray-200">
                  <span className="h-4 w-4 shrink-0 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5 text-amber-400">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  {feat}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleUpgrade("pilot")}
              disabled={loading !== null}
              className="relative z-10 w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 active:scale-95 disabled:opacity-60 text-black text-sm font-black py-3 transition-all"
            >
              {loading === "pilot" ? L.redirecting : L.goPilot}
            </button>
          </div>

          </div>

          {/* Footer note */}
          <p className="text-center text-xs text-gray-600 pt-2 pb-2">
            {L.footerNote}
          </p>
        </div>
      </div>
    </div>
  );
}
