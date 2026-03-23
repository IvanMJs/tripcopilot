"use client";

import { useEffect, useRef, useState } from "react";
import { X, Check, Zap } from "lucide-react";
import { PLANS } from "@/lib/stripe";

interface Props {
  onClose: () => void;
  /** Absolute URL for Stripe to redirect on success */
  successUrl?: string;
  /** Absolute URL for Stripe to redirect on cancel */
  cancelUrl?: string;
}

export function UpgradeModal({ onClose, successUrl, cancelUrl }: Props) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function handleUpgrade() {
    setLoading(true);
    setError(null);

    const priceId = PLANS.premium.priceId;
    if (!priceId) {
      setError("Stripe price not configured.");
      setLoading(false);
      return;
    }

    const origin = window.location.origin;
    const body = {
      priceId,
      successUrl: successUrl ?? `${origin}/app?upgraded=1`,
      cancelUrl: cancelUrl ?? `${origin}/app`,
    };

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? "Something went wrong.");
        setLoading(false);
        return;
      }

      const { url } = await res.json() as { url: string };
      window.location.href = url;
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none">
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="upgrade-modal-title"
          className="w-full max-w-lg pointer-events-auto rounded-2xl border border-white/[0.08] shadow-2xl p-6 overflow-y-auto max-h-[90dvh]"
          style={{
            background:
              "linear-gradient(160deg, rgba(18,18,32,0.99) 0%, rgba(10,10,20,1) 100%)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2
              id="upgrade-modal-title"
              className="text-lg font-black text-white"
            >
              Elegir plan
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {/* Free */}
            <div className="rounded-xl border border-white/[0.08] p-4 space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {PLANS.free.name}
                </p>
                <p className="text-2xl font-black text-white mt-1">$0</p>
                <p className="text-xs text-gray-500">para siempre</p>
              </div>
              <ul className="space-y-2">
                {PLANS.free.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-400">
                    <Check className="w-4 h-4 shrink-0 text-gray-600 mt-0.5" />
                    {f}
                  </li>
                ))}
                <li className="flex items-start gap-2 text-sm text-gray-500">
                  <Check className="w-4 h-4 shrink-0 text-gray-600 mt-0.5" />
                  Hasta {PLANS.free.maxTrips} viajes
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-500">
                  <Check className="w-4 h-4 shrink-0 text-gray-600 mt-0.5" />
                  Hasta {PLANS.free.maxFlightsPerTrip} vuelos por viaje
                </li>
              </ul>
              <button
                disabled
                className="w-full rounded-lg py-2 text-sm font-semibold text-gray-500 bg-white/[0.04] cursor-default"
              >
                Plan actual
              </button>
            </div>

            {/* Premium */}
            <div className="rounded-xl border border-indigo-500/40 bg-indigo-500/5 p-4 space-y-3 relative">
              <div className="absolute -top-2.5 left-4">
                <span className="bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Recomendado
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                  {PLANS.premium.name}
                </p>
                <p className="text-2xl font-black text-white mt-1">
                  ${PLANS.premium.priceMonthlyUSD.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">/mes USD</p>
              </div>
              <ul className="space-y-2">
                {PLANS.premium.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 shrink-0 text-indigo-400 mt-0.5" />
                    {f}
                  </li>
                ))}
                <li className="flex items-start gap-2 text-sm text-gray-300">
                  <Check className="w-4 h-4 shrink-0 text-indigo-400 mt-0.5" />
                  Viajes y vuelos ilimitados
                </li>
              </ul>
              <button
                onClick={handleUpgrade}
                disabled={loading}
                className="w-full rounded-lg py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                {loading ? "Redirigiendo..." : `Upgrade — $${PLANS.premium.priceMonthlyUSD.toFixed(2)}/mes`}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}

          <p className="text-center text-xs text-gray-600 mt-4">
            Pago seguro via Stripe. Cancelá cuando quieras.
          </p>
        </div>
      </div>
    </>
  );
}
