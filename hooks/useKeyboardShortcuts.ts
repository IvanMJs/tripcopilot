"use client";

import { useEffect, useCallback } from "react";

export interface KeyboardShortcutsConfig {
  onNewTrip: () => void;
  onSwitchTab: (index: number) => void;
  onEscape: () => void;
  onHelp: () => void;
  /** Pass true to disable all shortcuts (e.g., when user is typing in an input) */
  disabled?: boolean;
}

function isInputFocused(): boolean {
  const tag = (document.activeElement as HTMLElement | null)?.tagName ?? "";
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function useKeyboardShortcuts({
  onNewTrip,
  onSwitchTab,
  onEscape,
  onHelp,
  disabled = false,
}: KeyboardShortcutsConfig): void {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (disabled) return;

      const meta = e.metaKey || e.ctrlKey;

      // Ctrl/Cmd+N — New trip (always, even in inputs)
      if (meta && e.key === "n") {
        e.preventDefault();
        onNewTrip();
        return;
      }

      // Escape — Close modal/sheet (always)
      if (e.key === "Escape") {
        onEscape();
        return;
      }

      // Skip remaining shortcuts when typing in an input
      if (isInputFocused()) return;

      // Ctrl/Cmd+1..4 — Switch tabs
      if (meta && ["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        onSwitchTab(parseInt(e.key, 10) - 1);
        return;
      }

      // ? — Show help overlay
      if (e.key === "?" && !meta) {
        onHelp();
        return;
      }
    },
    [disabled, onNewTrip, onSwitchTab, onEscape, onHelp],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
