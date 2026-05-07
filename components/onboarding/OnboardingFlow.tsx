"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ModeSelector } from "./ModeSelector";
import { QuickImport } from "./QuickImport";
import { SetupComplete } from "./SetupComplete";
import { ProgressDots } from "./ProgressDots";

interface OnboardingFlowProps {
  onComplete: (mode: "relax" | "pilot") => void;
}

const slideVariants = {
  enter: {
    x: 28,
    opacity: 0,
  },
  center: {
    x: 0,
    opacity: 1,
  },
  exit: {
    x: -28,
    opacity: 0,
  },
};

const slideTransition = {
  duration: 0.26,
  ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
};

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [selectedMode, setSelectedMode] = useState<"relax" | "pilot">("relax");

  function handleModeSelect(mode: "relax" | "pilot") {
    setSelectedMode(mode);
    setStep(1);
  }

  function handleImportNext(_method: "paste" | "scan" | "manual") {
    setStep(2);
  }

  function handleSkip() {
    setStep(2);
  }

  async function handleActivate() {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        await Notification.requestPermission();
      } catch {
        // Permission request failed — non-critical
      }
    }
    onComplete(selectedMode);
  }

  function handleEnter() {
    onComplete(selectedMode);
  }

  return (
    <div role="main" aria-label="Onboarding" className="min-h-[100dvh] bg-[#080810] flex flex-col items-center justify-center px-5 py-10">
      {/* Progress dots */}
      <div className="mb-8">
        <ProgressDots total={3} current={step} />
      </div>

      {/* Animated step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={slideTransition}
          className="w-full flex flex-col items-center"
        >
          {step === 0 && (
            <ModeSelector onSelect={handleModeSelect} />
          )}

          {step === 1 && (
            <QuickImport
              onNext={handleImportNext}
              onSkip={handleSkip}
            />
          )}

          {step === 2 && (
            <SetupComplete
              onActivate={handleActivate}
              onEnter={handleEnter}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
