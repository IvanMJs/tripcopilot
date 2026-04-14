"use client";

import { useRef, useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { AirportSearchInput } from "@/components/AirportSearchInput";
import { CostEstimatorCard } from "@/components/CostEstimatorCard";
import { CITY_BUDGETS } from "@/lib/cityBudgets";

interface Props {
  locale: "es" | "en";
  tripCount: number;
  onClose: () => void;
  onConfirm: (name: string, destination?: string) => void;
  prefillDestination?: string;
}

export function CreateTripModal({ locale, tripCount, onClose, onConfirm, prefillDestination }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [creating, setCreating] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState<string>(prefillDestination ?? "");

  // A7: Focus trap — focus first input on open, close on Escape
  useEffect(() => {
    const firstInput = modalRef.current?.querySelector<HTMLElement>("input, button, textarea");
    firstInput?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function handleConfirm() {
    const val = inputRef.current?.value.trim() ?? "";
    const name = val || (locale === "en" ? `Trip ${tripCount + 1}` : `Viaje ${tripCount + 1}`);
    setCreating(true);
    try {
      await Promise.resolve(onConfirm(name, selectedDestination || undefined));
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <div className="fixed inset-x-0 top-0 h-dvh z-50 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-0 top-0 h-dvh z-50 flex items-center justify-center px-4 pointer-events-none">
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-trip-modal-title"
          className="w-full max-w-sm pointer-events-auto rounded-2xl border border-white/[0.08] shadow-2xl p-5 space-y-4 overflow-y-auto max-h-[80dvh]"
          style={{ background: "linear-gradient(160deg, rgba(18,18,32,0.99) 0%, rgba(10,10,20,1) 100%)" }}
        >
          <div>
            <h3 id="create-trip-modal-title" className="text-base font-black text-white">
              {locale === "es" ? "Nuevo viaje" : "New trip"}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {locale === "es" ? "Podés renombrarlo después" : "You can rename it later"}
            </p>
          </div>

          <div className="input-float-wrapper mt-6">
            <input
              id="trip-name-input"
              ref={inputRef}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConfirm();
                if (e.key === "Escape") onClose();
              }}
              placeholder={locale === "es" ? "Ej: Vacaciones Miami 2026" : "E.g. Miami Trip 2026"}
              maxLength={40}
              className="w-full rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-transparent focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <label htmlFor="trip-name-input">
              {locale === "es" ? "Nombre del viaje" : "Trip name"}
            </label>
          </div>

          {/* Destination field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {locale === "es" ? "Destino (opcional)" : "Destination (optional)"}
            </label>
            <AirportSearchInput
              value={selectedDestination}
              onChange={setSelectedDestination}
              placeholder={locale === "es" ? "Ej: Miami, MIA..." : "E.g. Miami, MIA..."}
              locale={locale}
            />
          </div>

          {/* Cost estimator — shown when a known destination is selected */}
          {selectedDestination && CITY_BUDGETS[selectedDestination] && (
            <CostEstimatorCard iata={selectedDestination} locale={locale} />
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={creating}
              className="w-full sm:w-auto flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 text-sm font-semibold text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              {locale === "es" ? "Cancelar" : "Cancel"}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={creating}
              className={`btn-primary w-full sm:w-auto flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold tap-scale ${creating ? "opacity-70 cursor-not-allowed" : ""}`}
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {locale === "es" ? "Creando..." : "Creating..."}
                </>
              ) : (
                locale === "es" ? "Crear viaje" : "Create trip"
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
