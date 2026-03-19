"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { Locale, translations, Translations } from "@/lib/i18n";
import { createClient } from "@/utils/supabase/client";

interface LanguageContextValue {
  locale: Locale;
  t: Translations;
  setLocale: (l: Locale) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  locale: "es",
  t: translations.es,
  setLocale: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("es");

  useEffect(() => {
    const saved = localStorage.getItem("airport-monitor-locale") as Locale | null;
    if (saved === "es" || saved === "en") setLocaleState(saved);
  }, []);

  function setLocale(l: Locale) {
    setLocaleState(l);
    localStorage.setItem("airport-monitor-locale", l);
    // Persist locale in auth metadata so the cron can send bilingual notifications
    const supabase = createClient();
    supabase.auth.updateUser({ data: { locale: l } }).catch(() => {});
  }

  return (
    <LanguageContext.Provider value={{ locale, t: translations[locale], setLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
