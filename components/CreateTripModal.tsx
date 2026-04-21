"use client";

import { useRef, useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { AirportSearchInput } from "@/components/AirportSearchInput";
import { ModalBase } from "@/components/ui/ModalBase";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
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

  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  // Focus trap — runs once on mount only to avoid re-stealing focus on re-renders
  useEffect(() => {
    inputRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    <ModalBase open={true} onClose={onClose} maxWidth="sm">
      <div ref={modalRef} className="p-5 space-y-4">
          <div>
            <h3 id="create-trip-modal-title" className="text-base font-black text-white">
              {locale === "es" ? "Nuevo viaje" : "New trip"}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {locale === "es" ? "Podés renombrarlo después" : "You can rename it later"}
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="trip-name-input" className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {locale === "es" ? "Nombre del viaje" : "Trip name"}
            </label>
            <Input
              id="trip-name-input"
              ref={inputRef}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConfirm();
                if (e.key === "Escape") onClose();
              }}
              placeholder={locale === "es" ? "Ej: Vacaciones Miami 2026" : "E.g. Miami Trip 2026"}
              maxLength={40}
            />
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
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={creating}
            >
              {locale === "es" ? "Cancelar" : "Cancel"}
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              disabled={creating}
              loading={creating}
            >
              {locale === "es" ? "Crear viaje" : "Create trip"}
            </Button>
          </div>
      </div>
    </ModalBase>
  );
}
