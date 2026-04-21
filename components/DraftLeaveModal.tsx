"use client";

import { ModalBase } from "@/components/ui/ModalBase";
import { Button } from "@/components/ui/Button";

interface Props {
  locale: "es" | "en";
  draftName: string;
  onSave: () => Promise<void>;
  onDiscard: () => void;
  onCancel: () => void;
  targetTab: string;
  onNavigate: (tab: string) => void;
}

export function DraftLeaveModal({ locale, draftName, onSave, onDiscard, onCancel, targetTab, onNavigate }: Props) {
  return (
    <ModalBase open={true} onClose={onCancel} maxWidth="sm">
      <div className="p-5 space-y-4">
          <div>
            <h3 className="text-base font-black text-white">
              {locale === "es" ? "Tenés un borrador sin guardar" : "You have an unsaved draft"}
            </h3>
            <p className="text-sm text-gray-400 mt-2 leading-relaxed">
              {locale === "es"
                ? `El viaje "${draftName}" todavía no fue guardado. ¿Qué querés hacer?`
                : `The trip "${draftName}" hasn't been saved yet. What would you like to do?`}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              variant="primary"
              onClick={async () => { await onSave(); onNavigate(targetTab); }}
            >
              {locale === "es" ? "Guardar y continuar" : "Save and continue"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => { onDiscard(); onNavigate(targetTab); }}
            >
              {locale === "es" ? "Descartar borrador" : "Discard draft"}
            </Button>
            <Button
              variant="ghost"
              onClick={onCancel}
              size="sm"
            >
              {locale === "es" ? "Cancelar" : "Cancel"}
            </Button>
          </div>
      </div>
    </ModalBase>
  );
}
