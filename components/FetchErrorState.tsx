"use client";

const LABELS = {
  es: {
    title: "Error al cargar",
    retry: "Reintentar",
    desc: "No pudimos obtener los datos. Verifica tu conexión.",
  },
  en: {
    title: "Failed to load",
    retry: "Retry",
    desc: "We couldn't fetch the data. Check your connection.",
  },
};

interface Props {
  locale: "es" | "en";
  onRetry?: () => void;
  message?: string;
}

export function FetchErrorState({ locale, onRetry, message }: Props) {
  const t = LABELS[locale];
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center">
      {onRetry && !t.title ? (
        // Render a spinner here
        <div className="animate-spin inline-block w-8 h-8 border-b-2 border-r-2 border-white"></div>
      ) : (
        <>
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-3">
            <span className="text-red-400 text-xl">!</span>
          </div>
          <h4 className="text-sm font-semibold text-white/80 mb-1">{t.title}</h4>
          <p className="text-xs text-white/40 mb-3">
            {message ?? (locale === "es" ? t.desc : `Por favor, verifica tu conexión.`)}
          </p>
        </>
      )}
      {onRetry && !t.title && (
        <button
          onClick={onRetry}
          className="px-3 py-1.5 bg-white/[0.06] rounded-lg text-xs text-white/70 hover:bg-white/[0.1] transition-colors"
          aria-label="Retry fetching data"
        >
          {t.retry}
        </button>
      )}
    </div>
  );
}