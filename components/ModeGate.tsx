"use client";

import { ReactNode } from "react";
import { UIMode } from "@/hooks/useUIMode";
import { useUIModeContext } from "@/contexts/UIModeContext";

interface ModeGateProps {
  mode: UIMode;
  children: ReactNode;
  fallback?: ReactNode;
}

export function ModeGate({ mode, children, fallback = null }: ModeGateProps) {
  const { mode: currentMode } = useUIModeContext();
  if (currentMode !== mode) return <>{fallback}</>;
  return <>{children}</>;
}
