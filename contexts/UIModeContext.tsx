"use client";

import { createContext, useContext, ReactNode } from "react";
import { useUIMode, UIMode } from "@/hooks/useUIMode";

interface UIModeContextValue {
  mode: UIMode;
  setMode: (mode: UIMode) => Promise<void>;
  isRelax: boolean;
  isPilot: boolean;
}

const UIModeContext = createContext<UIModeContextValue | null>(null);

export function UIModeProvider({ children }: { children: ReactNode }) {
  const uiMode = useUIMode();
  return (
    <UIModeContext.Provider value={uiMode}>
      {children}
    </UIModeContext.Provider>
  );
}

export function useUIModeContext(): UIModeContextValue {
  const ctx = useContext(UIModeContext);
  if (!ctx) throw new Error("useUIModeContext must be used inside UIModeProvider");
  return ctx;
}
