"use client";

import { ModalBase } from "@/components/ui/ModalBase";
import { Button } from "@/components/ui/Button";

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
    <ModalBase open={true} onClose={onClose} maxWidth="sm">
      <div className="p-5 space-y-4">
          <div>
            <h3 id="delete-trip-modal-title" className="text-base font-black text-white">
              {locale === "es" ? "¿Eliminar viaje?" : "Delete trip?"}
            </h3>
            <p className="text-sm text-gray-400 mt-2 leading-relaxed">
              {locale === "es"
                ? `¿Estás seguro de eliminar "${tripName}"${flightSuffix}? Esta acción no se puede deshacer.`
                : `Are you sure you want to delete "${tripName}"${flightSuffix}? This can't be undone.`}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="secondary"
              onClick={onClose}
            >
              {locale === "es" ? "Cancelar" : "Cancel"}
            </Button>
            <Button
              variant="danger"
              onClick={onConfirm}
            >
              {locale === "es" ? "Eliminar" : "Delete"}
            </Button>
          </div>
      </div>
    </ModalBase>
  );
}
