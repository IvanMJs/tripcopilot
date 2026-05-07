"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface QuickImportProps {
  onNext: (method: "paste" | "scan" | "manual") => void;
  onSkip: () => void;
}

type PasteState = "idle" | "detected" | "empty";

export function QuickImport({ onNext, onSkip }: QuickImportProps) {
  const [pasteState, setPasteState] = useState<PasteState>("idle");
  const [shakeKey, setShakeKey] = useState(0);

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim().length > 0) {
        setPasteState("detected");
        setTimeout(() => onNext("paste"), 480);
      } else {
        setPasteState("empty");
        setShakeKey((k) => k + 1);
        setTimeout(() => setPasteState("idle"), 1200);
      }
    } catch {
      // Clipboard read failed (non-HTTPS or permission denied)
      setPasteState("empty");
      setShakeKey((k) => k + 1);
      setTimeout(() => setPasteState("idle"), 1200);
    }
  }

  const isDetected = pasteState === "detected";

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm">
      {/* Hero icon */}
      <motion.div
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 22, delay: 0.05 }}
        className="flex h-[72px] w-[72px] items-center justify-center rounded-[18px] bg-amber-500/20 text-4xl"
        aria-hidden="true"
      >
        📋
      </motion.div>

      {/* Title + subtitle */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black text-white tracking-tight">
          Pegá tu reserva y listo
        </h2>
        <p className="text-sm text-white/45 leading-relaxed">
          Pegá el correo de tu reserva o el texto del boarding pass
        </p>
      </div>

      {/* Primary CTA */}
      <motion.button
        key={shakeKey}
        animate={
          pasteState === "empty"
            ? { x: [-6, 6, -5, 5, -3, 3, 0] }
            : { x: 0 }
        }
        transition={
          pasteState === "empty"
            ? { duration: 0.4, times: [0, 0.15, 0.3, 0.45, 0.6, 0.8, 1] }
            : {}
        }
        onClick={handlePaste}
        className={[
          "relative w-full min-h-[52px] rounded-2xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2",
          isDetected
            ? "bg-green-500/20 border border-green-500/40 text-green-400"
            : "bg-[#FFB800] hover:bg-[#FFC933] active:scale-[0.98] text-[#080810]",
        ].join(" ")}
      >
        <AnimatePresence mode="wait">
          {isDetected ? (
            <motion.span
              key="detected"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex items-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8.5L6.5 12L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              ¡Reserva detectada!
            </motion.span>
          ) : (
            <motion.span
              key="paste"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
            >
              📋 Pegar
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Divider */}
      <div className="flex w-full items-center gap-3">
        <div className="flex-1 h-px bg-white/[0.08]" />
        <span className="text-xs text-white/25 font-medium">o</span>
        <div className="flex-1 h-px bg-white/[0.08]" />
      </div>

      {/* Secondary buttons */}
      <div className="flex flex-col gap-2.5 w-full">
        <button
          onClick={() => onNext("scan")}
          className="w-full min-h-[44px] rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.07] active:scale-[0.98] text-sm text-white/70 font-medium transition-all duration-150"
        >
          📷 Escaneá tu boarding pass
        </button>
        <button
          onClick={() => onNext("manual")}
          className="w-full min-h-[44px] rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.07] active:scale-[0.98] text-sm text-white/70 font-medium transition-all duration-150"
        >
          ✈️ Agregar manualmente
        </button>
      </div>

      {/* Skip link */}
      <button
        onClick={onSkip}
        className="min-h-[44px] flex items-center justify-center text-sm text-white/28 hover:text-white/55 transition-colors duration-150"
      >
        Ahora no →
      </button>
    </div>
  );
}
