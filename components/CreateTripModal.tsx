"use client";

import { useRef } from "react";

interface Props {
  locale: "es" | "en";
  tripCount: number;
  onClose: () => void;
  onConfirm: (name: string) => void;
}

export function CreateTripModal({ locale, tripCount, onClose, onConfirm }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleConfirm() {
    const val = inputRef.current?.value.trim() ?? "";
    const name = val || (locale === "en" ? `Trip ${tripCount + 1}` : `Viaje ${tripCount + 1}`);
    onConfirm(name);
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none">
        <div
          className="w-full max-w-sm pointer-events-auto rounded-2xl border border-white/[0.08] shadow-2xl p-5 space-y-4"
          style={{ background: "linear-gradient(160deg, rgba(18,18,32,0.99) 0%, rgba(10,10,20,1) 100%)" }}
        >
          <div>
            <h3 className="text-base font-black text-white">
              {locale === "es" ? "Nuevo viaje" : "New trip"}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {locale === "es" ? "Podés renombrarlo después" : "You can rename it later"}
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              {locale === "es" ? "Nombre del viaje" : "Trip name"}
            </label>
            <input
              ref={inputRef}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConfirm();
                if (e.key === "Escape") onClose();
              }}
              placeholder={locale === "es" ? "Ej: Vacaciones Miami 2026" : "E.g. Miami Trip 2026"}
              maxLength={40}
              autoFocus
              className="w-full rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 text-sm font-semibold text-gray-400 hover:text-white transition-colors"
            >
              {locale === "es" ? "Cancelar" : "Cancel"}
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 py-2.5 text-sm font-semibold text-white transition-colors tap-scale"
            >
              {locale === "es" ? "Crear viaje" : "Create trip"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
