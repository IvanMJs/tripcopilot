"use client";

interface Props {
  locale: "es" | "en";
  tripName: string;
  flightCount: number;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteTripModal({ locale, tripName, flightCount, onClose, onConfirm }: Props) {
  const flightSuffix = flightCount > 0
    ? locale === "es"
      ? ` y sus ${flightCount} vuelo${flightCount !== 1 ? "s" : ""}`
      : ` and its ${flightCount} flight${flightCount !== 1 ? "s" : ""}`
    : "";

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
              {locale === "es" ? "¿Eliminar viaje?" : "Delete trip?"}
            </h3>
            <p className="text-sm text-gray-400 mt-2 leading-relaxed">
              {locale === "es"
                ? `¿Estás seguro de eliminar "${tripName}"${flightSuffix}? Esta acción no se puede deshacer.`
                : `Are you sure you want to delete "${tripName}"${flightSuffix}? This can't be undone.`}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={onClose}
              className="w-full sm:w-auto flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 text-sm font-semibold text-gray-400 hover:text-white transition-colors"
            >
              {locale === "es" ? "Cancelar" : "Cancel"}
            </button>
            <button
              onClick={onConfirm}
              className="w-full sm:w-auto flex-1 rounded-xl bg-red-700 hover:bg-red-600 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              {locale === "es" ? "Eliminar" : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
