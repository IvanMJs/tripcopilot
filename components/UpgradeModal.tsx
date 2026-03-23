"use client";

import { useState } from "react";
import { PLANS } from "@/lib/mercadopago";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  async function handleUpgrade() {
    setLoading(true);
    try {
      const successUrl = `${window.location.origin}/app?upgrade=success`;
      const cancelUrl  = `${window.location.origin}/app?upgrade=cancel`;

      const res = await fetch("/api/mercadopago/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ successUrl, cancelUrl }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = (await res.json()) as { url?: string };
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // fail silently — user stays on modal and can retry
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0a0a14] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-lg font-black text-white">Elige tu plan</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-gray-400 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Cards */}
        <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Free card */}
          <div className="rounded-xl border border-white/[0.12] bg-white/[0.03] p-5 flex flex-col gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">Plan actual</span>
              <p className="mt-1 text-xl font-black text-white">{PLANS.free.name}</p>
              <p className="text-sm text-gray-500 mt-0.5">Gratis para siempre</p>
            </div>
            <ul className="space-y-2 flex-1">
              {PLANS.free.features.map((feat) => (
                <li key={feat} className="flex items-center gap-2 text-sm text-gray-400">
                  <span className="h-4 w-4 shrink-0 rounded-full border border-gray-600 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5 text-gray-500">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  {feat}
                </li>
              ))}
              <li className="flex items-center gap-2 text-sm text-gray-500">
                <span className="h-4 w-4 shrink-0 rounded-full border border-gray-700 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5 text-gray-600">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </span>
                Max. {PLANS.free.maxTrips} viajes
              </li>
            </ul>
          </div>

          {/* Premium card */}
          <div className="rounded-xl border-2 border-amber-500/60 bg-gradient-to-b from-amber-950/30 to-[#0a0a14] p-5 flex flex-col gap-4 relative overflow-hidden">
            {/* Glow */}
            <div className="absolute inset-0 pointer-events-none rounded-xl" style={{ boxShadow: "inset 0 0 40px rgba(245,158,11,0.07)" }} />

            <div>
              {/* Badge */}
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-black mb-2">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                PREMIUM
              </span>
              <p className="text-xl font-black text-white">{PLANS.premium.name}</p>
              <p className="text-sm text-amber-400/80 mt-0.5">$10.000 ARS/mes</p>
            </div>

            <ul className="space-y-2 flex-1">
              {PLANS.premium.features.map((feat) => (
                <li key={feat} className="flex items-center gap-2 text-sm text-gray-200">
                  <span className="h-4 w-4 shrink-0 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5 text-amber-400">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  {feat}
                </li>
              ))}
              <li className="flex items-center gap-2 text-sm text-gray-200">
                <span className="h-4 w-4 shrink-0 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5 text-amber-400">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                Viajes ilimitados
              </li>
            </ul>

            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="relative z-10 w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 active:scale-95 disabled:opacity-60 text-black text-sm font-black py-3 transition-all"
            >
              {loading ? "Redirigiendo..." : "Actualizar a Premium \u2192"}
            </button>
          </div>

        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-gray-600 pb-5">
          Pago seguro por MercadoPago \u00b7 Cancel\u00e1 cuando quieras
        </p>
      </div>
    </div>
  );
}
