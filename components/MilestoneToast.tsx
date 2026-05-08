"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Confetti } from "@/components/Confetti";
import type { Milestone } from "@/lib/milestones";

// ── Labels ────────────────────────────────────────────────────────────────────

const LABELS = {
  es: {
    dismiss: "¡Genial!",
    newMilestone: "Nuevo logro desbloqueado",
  },
  en: {
    dismiss: "Awesome!",
    newMilestone: "New milestone unlocked",
  },
} as const;

// ── Props ─────────────────────────────────────────────────────────────────────

interface MilestoneToastProps {
  milestone: Milestone | null;
  locale: "es" | "en";
  onDismiss: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MilestoneToast({
  milestone,
  locale,
  onDismiss,
}: MilestoneToastProps) {
  const L = LABELS[locale];
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (!milestone) return;

    timerRef.current = setTimeout(() => {
      onDismiss();
    }, 5000);

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, [milestone, onDismiss]);

  return (
    <>
      {/* Confetti fires when a milestone is visible */}
      <Confetti trigger={milestone !== null} />

      <AnimatePresence>
        {milestone && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
              onClick={onDismiss}
              aria-hidden="true"
            />

            {/* Modal card */}
            <motion.div
              key="card"
              role="dialog"
              aria-modal="true"
              aria-label={L.newMilestone}
              initial={{ opacity: 0, scale: 0.75, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 12 }}
              transition={{
                type: "spring",
                stiffness: 340,
                damping: 22,
              }}
              className="fixed inset-0 z-[201] flex items-center justify-center pointer-events-none px-6"
            >
              <div className="pointer-events-auto w-full max-w-xs rounded-3xl border border-[rgba(255,184,0,0.30)] bg-[#111] shadow-2xl overflow-hidden">
                {/* Amber glow strip at top */}
                <div
                  className="h-1 w-full"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, #FFB800, transparent)",
                  }}
                  aria-hidden="true"
                />

                <div className="flex flex-col items-center gap-4 px-6 py-8 text-center">
                  {/* Label chip */}
                  <span className="inline-flex items-center rounded-full bg-[rgba(255,184,0,0.12)] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#FFB800]">
                    {L.newMilestone}
                  </span>

                  {/* Emoji — pop-in spring */}
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: [0, 1.25, 1], opacity: 1 }}
                    transition={{
                      scale: {
                        type: "spring",
                        stiffness: 380,
                        damping: 16,
                        delay: 0.12,
                      },
                      opacity: { duration: 0.15, delay: 0.12 },
                    }}
                    className="text-7xl leading-none select-none"
                    aria-hidden="true"
                  >
                    {milestone.emoji}
                  </motion.span>

                  {/* Title */}
                  <motion.h2
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25, duration: 0.3 }}
                    className="text-xl font-black text-white leading-tight"
                  >
                    {milestone.title[locale]}
                  </motion.h2>

                  {/* Description */}
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.32, duration: 0.3 }}
                    className="text-sm text-gray-400 leading-relaxed"
                  >
                    {milestone.description[locale]}
                  </motion.p>

                  {/* Dismiss button */}
                  <motion.button
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.42, duration: 0.3 }}
                    onClick={onDismiss}
                    className="mt-2 w-full rounded-2xl bg-[#FFB800] py-3 text-sm font-black text-black transition-opacity active:opacity-80"
                  >
                    {L.dismiss}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
