"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Keyboard } from "lucide-react";

interface Shortcut {
  keys: string[];
  description: string;
}

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
  locale: "es" | "en";
}

const SHORTCUTS_ES: Shortcut[] = [
  { keys: ["Ctrl", "N"],    description: "Nuevo viaje" },
  { keys: ["Ctrl", "1"],    description: "Ir a Hoy (tab 1)" },
  { keys: ["Ctrl", "2"],    description: "Ir a Mis viajes (tab 2)" },
  { keys: ["Ctrl", "3"],    description: "Ir a Descubrir (tab 3)" },
  { keys: ["Ctrl", "4"],    description: "Ir a Perfil (tab 4)" },
  { keys: ["Esc"],          description: "Cerrar modal / hoja" },
  { keys: ["?"],            description: "Mostrar esta ayuda" },
];

const SHORTCUTS_EN: Shortcut[] = [
  { keys: ["Ctrl", "N"],    description: "New trip" },
  { keys: ["Ctrl", "1"],    description: "Go to Today (tab 1)" },
  { keys: ["Ctrl", "2"],    description: "Go to My trips (tab 2)" },
  { keys: ["Ctrl", "3"],    description: "Go to Discover (tab 3)" },
  { keys: ["Ctrl", "4"],    description: "Go to Profile (tab 4)" },
  { keys: ["Esc"],          description: "Close modal / sheet" },
  { keys: ["?"],            description: "Show this help" },
];

function KeyBadge({ label }: { label: string }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 rounded-md border border-white/20 bg-white/[0.08] text-[11px] font-mono font-semibold text-gray-300 shadow-sm">
      {label}
    </kbd>
  );
}

export function KeyboardShortcutsHelp({ open, onClose, locale }: KeyboardShortcutsHelpProps) {
  const shortcuts = locale === "es" ? SHORTCUTS_ES : SHORTCUTS_EN;
  const title = locale === "es" ? "Atajos de teclado" : "Keyboard shortcuts";
  const macNote = locale === "es" ? "En Mac, usá ⌘ en lugar de Ctrl" : "On Mac, use ⌘ instead of Ctrl";

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="kbd-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="kbd-panel"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-[61] flex items-center justify-center px-4 pointer-events-none"
          >
            <div
              className="w-full max-w-sm pointer-events-auto rounded-2xl border border-white/[0.1] shadow-2xl self-center"
              style={{ background: "linear-gradient(160deg, rgba(15,15,28,0.98) 0%, rgba(8,8,18,1) 100%)" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
                <div className="flex items-center gap-2">
                  <Keyboard className="h-4 w-4 text-[#FFB800]" />
                  <h2 className="text-sm font-bold text-white">{title}</h2>
                </div>
                <button
                  onClick={onClose}
                  className="h-7 w-7 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center transition-colors"
                  aria-label={locale === "es" ? "Cerrar" : "Close"}
                >
                  <X className="h-3.5 w-3.5 text-gray-400" />
                </button>
              </div>

              {/* Shortcut list */}
              <div className="px-5 py-4 space-y-2">
                {shortcuts.map((s, i) => (
                  <div key={i} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-gray-300">{s.description}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {s.keys.map((k, ki) => (
                        <KeyBadge key={ki} label={k} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Mac note */}
              <div className="px-5 pb-4">
                <p className="text-[11px] text-gray-600">{macNote}</p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
