"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

export type UIMode = "relax" | "pilot";

const STORAGE_KEY = "tripcopilot_ui_mode";

interface UIModeResult {
  mode: UIMode;
  setMode: (mode: UIMode) => Promise<void>;
  isRelax: boolean;
  isPilot: boolean;
}

export function useUIMode(): UIModeResult {
  const [mode, setModeState] = useState<UIMode>("relax");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as UIMode | null;
      if (stored === "relax" || stored === "pilot") {
        setModeState(stored);
        return;
      }
      // Fresh device: read from auth metadata (synced by previous device/session)
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        const meta = data?.user?.user_metadata?.ui_mode as UIMode | undefined;
        if (meta === "relax" || meta === "pilot") {
          setModeState(meta);
          localStorage.setItem(STORAGE_KEY, meta);
        }
      }).catch(() => {});
    } catch {
      // localStorage unavailable (SSR / private browsing edge case)
    }
  }, []);

  const setMode = useCallback(async (newMode: UIMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem(STORAGE_KEY, newMode);
    } catch {
      // ignore
    }
    // Persist in auth metadata for cross-device sync
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        await supabase.auth.updateUser({ data: { ui_mode: newMode } });
      }
    } catch {
      // Network error — localStorage already saved, non-critical
    }
  }, []);

  return {
    mode,
    setMode,
    isRelax: mode === "relax",
    isPilot: mode === "pilot",
  };
}
