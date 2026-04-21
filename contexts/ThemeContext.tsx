"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type ThemePreference = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

interface ThemeContextValue {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "tripcopilot-theme";

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === "system") return getSystemTheme();
  return preference;
}

function applyTheme(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("light", resolved === "light");
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>("dark");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark");

  // Read from localStorage on mount and resolve initial theme
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as ThemePreference | null;
      const preference: ThemePreference =
        stored === "light" || stored === "dark" || stored === "system"
          ? stored
          : "dark";
      const resolved = resolveTheme(preference);
      setThemeState(preference);
      setResolvedTheme(resolved);
      applyTheme(resolved);
      
      // Aplicar clase dark-forced en mount según preferencia guardada
      if (preference === "dark") {
        document.documentElement.classList.add('dark-forced');
      }
    } catch {
      // localStorage unavailable (SSR / private browsing edge case)
    }
  }, []);

  // Listen for OS-level color scheme changes when preference is "system"
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-color-scheme: light)");

    function handleChange() {
      setThemeState((prev) => {
        if (prev === "system") {
          const resolved = getSystemTheme();
          setResolvedTheme(resolved);
          applyTheme(resolved);
        }
        return prev;
      });
    }

    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  function setTheme(preference: ThemePreference) {
    const resolved = resolveTheme(preference);
    setThemeState(preference);
    setResolvedTheme(resolved);
    applyTheme(resolved);
    
    // Manejar clase dark-forced para prefers-color-scheme automático
    if (preference === "dark") {
      document.documentElement.classList.add('dark-forced');
    } else {
      document.documentElement.classList.remove('dark-forced');
    }
    
    try {
      localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // ignore
    }
  }

  function toggleTheme() {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
