"use client";

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
    <>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none">
        <div
          className="w-full max-w-sm pointer-events-auto rounded-2xl border border-white/[0.08] shadow-2xl p-5 space-y-4"
          style={{ background: "linear-gradient(160deg, rgba(18,18,32,0.99) 0%, rgba(10,10,20,1) 100%)" }}
        >
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
            <button
              onClick={async () => { await onSave(); onNavigate(targetTab); }}
              className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              {locale === "es" ? "Guardar y continuar" : "Save and continue"}
            </button>
            <button
              onClick={() => { onDiscard(); onNavigate(targetTab); }}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 text-sm font-semibold text-gray-400 hover:text-white transition-colors"
            >
              {locale === "es" ? "Descartar borrador" : "Discard draft"}
            </button>
            <button
              onClick={onCancel}
              className="w-full py-2 text-xs text-gray-600 hover:text-gray-400 transition-colors"
            >
              {locale === "es" ? "Cancelar" : "Cancel"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
