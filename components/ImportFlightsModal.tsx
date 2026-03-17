"use client";

import { useState } from "react";
import { X, Upload, CheckCircle, AlertCircle, Loader2, FileText } from "lucide-react";
import { parseFlightsFromText, ParsedFlight } from "@/lib/importFlights";

interface ImportFlightsModalProps {
  onImport: (flights: ParsedFlight[]) => void;
  onClose: () => void;
  locale: "es" | "en";
}

const L = {
  es: {
    title: "Importar vuelos",
    subtitle: "Pegá el texto de tu confirmación de vuelo. Detectamos automáticamente los datos.",
    placeholder: `Pegá el texto de tu email de confirmación aquí...

Ejemplos que funcionan:
• AA900 EZE MIA 29MAR 20:30
• Flight AA 900 Buenos Aires (EZE) → Miami (MIA) March 29, 2026 · Dep. 8:30 PM
• UA456 | EWR → MIA | 2026-03-29 | 14:25`,
    parse: "Detectar vuelos",
    parsing: "Detectando...",
    foundFlights: (n: number) => `${n} vuelo${n !== 1 ? "s" : ""} detectado${n !== 1 ? "s" : ""}`,
    noFlights: "No se detectaron vuelos. Verificá el formato del texto.",
    addAll: (n: number) => `Agregar ${n} vuelo${n !== 1 ? "s" : ""}`,
    cancel: "Cancelar",
    confidence: { high: "Alta confianza", medium: "Confianza media", low: "Baja confianza" },
    origin: "Origen",
    dest: "Destino",
    date: "Fecha",
    time: "Hora",
    noTime: "—",
    unresolved: (n: number) => `${n} código${n !== 1 ? "s" : ""} no reconocido${n !== 1 ? "s" : ""}`,
    tip: "Funciona con confirmaciones de American, United, Delta, JetBlue, LATAM, Aerolíneas y muchas más.",
    selectAll: "Seleccionar todos",
    deselectAll: "Deseleccionar todos",
  },
  en: {
    title: "Import flights",
    subtitle: "Paste your flight confirmation text. We'll automatically detect the details.",
    placeholder: `Paste your confirmation email text here...

Examples that work:
• AA900 EZE MIA 29MAR 20:30
• Flight AA 900 Buenos Aires (EZE) → Miami (MIA) March 29, 2026 · Dep. 8:30 PM
• UA456 | EWR → MIA | 2026-03-29 | 14:25`,
    parse: "Detect flights",
    parsing: "Detecting...",
    foundFlights: (n: number) => `${n} flight${n !== 1 ? "s" : ""} detected`,
    noFlights: "No flights detected. Check the text format.",
    addAll: (n: number) => `Add ${n} flight${n !== 1 ? "s" : ""}`,
    cancel: "Cancel",
    confidence: { high: "High confidence", medium: "Medium confidence", low: "Low confidence" },
    origin: "Origin",
    dest: "Dest",
    date: "Date",
    time: "Time",
    noTime: "—",
    unresolved: (n: number) => `${n} unrecognized code${n !== 1 ? "s" : ""}`,
    tip: "Works with American, United, Delta, JetBlue, LATAM, Aerolíneas, and many more.",
    selectAll: "Select all",
    deselectAll: "Deselect all",
  },
};

const CONFIDENCE_COLORS = {
  high:   "text-emerald-400 bg-emerald-900/30 border-emerald-800/50",
  medium: "text-yellow-400 bg-yellow-900/30 border-yellow-800/50",
  low:    "text-red-400 bg-red-900/30 border-red-800/50",
};

export function ImportFlightsModal({ onImport, onClose, locale }: ImportFlightsModalProps) {
  const t = L[locale];
  const [text, setText] = useState("");
  const [result, setResult] = useState<ReturnType<typeof parseFlightsFromText> | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [parsing, setParsing] = useState(false);

  function handleParse() {
    if (!text.trim()) return;
    setParsing(true);
    // Small delay for UX (let loader show)
    setTimeout(() => {
      const parsed = parseFlightsFromText(text.toUpperCase());
      setResult(parsed);
      setSelected(new Set(parsed.flights.map((_, i) => i)));
      setParsing(false);
    }, 400);
  }

  function toggleSelect(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  function handleImport() {
    if (!result) return;
    const toImport = result.flights.filter((_, i) => selected.has(i));
    onImport(toImport);
    onClose();
  }

  const allSelected = result && selected.size === result.flights.length;

  function formatDate(iso: string, loc: "es" | "en") {
    return new Date(iso + "T00:00:00").toLocaleDateString(
      loc === "en" ? "en-US" : "es-AR",
      { day: "numeric", month: "short", year: "numeric" }
    );
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Panel */}
      <div className="relative w-full max-w-2xl rounded-2xl border border-white/8 bg-[#0f0f17] shadow-2xl animate-fade-in-up">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-white/6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-400" />
              {t.title}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5 max-w-md">{t.subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/8 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Textarea */}
          {!result && (
            <div className="space-y-3">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t.placeholder}
                rows={9}
                className="w-full rounded-xl border border-white/8 bg-[#080810] px-4 py-3 text-sm text-gray-200 placeholder-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500/60 resize-none font-mono leading-relaxed"
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] text-gray-600 flex items-center gap-1.5">
                  <FileText className="h-3 w-3" />
                  {t.tip}
                </p>
                <button
                  onClick={handleParse}
                  disabled={!text.trim() || parsing}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 px-4 py-2 text-sm font-semibold text-white transition-colors shrink-0"
                >
                  {parsing ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {t.parsing}
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" />
                      {t.parse}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-3">
              {/* Summary bar */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {result.flights.length > 0 ? (
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-400" />
                  )}
                  <span className={`text-sm font-semibold ${result.flights.length > 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {result.flights.length > 0
                      ? t.foundFlights(result.flights.length)
                      : t.noFlights}
                  </span>
                  {result.unresolved.length > 0 && (
                    <span className="text-xs text-gray-500">
                      · {t.unresolved(result.unresolved.length)}
                    </span>
                  )}
                </div>
                {result.flights.length > 0 && (
                  <button
                    onClick={() =>
                      allSelected
                        ? setSelected(new Set())
                        : setSelected(new Set(result.flights.map((_, i) => i)))
                    }
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {allSelected ? t.deselectAll : t.selectAll}
                  </button>
                )}
              </div>

              {/* Flight list */}
              {result.flights.length > 0 && (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {result.flights.map((f, i) => (
                    <button
                      key={i}
                      onClick={() => toggleSelect(i)}
                      className={`w-full text-left rounded-xl border px-4 py-3 transition-all ${
                        selected.has(i)
                          ? "border-blue-600/40 bg-blue-950/25"
                          : "border-white/6 bg-[#080810] opacity-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {/* Checkbox indicator */}
                          <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                            selected.has(i) ? "border-blue-500 bg-blue-500" : "border-gray-600"
                          }`}>
                            {selected.has(i) && (
                              <svg viewBox="0 0 10 8" fill="none" className="h-2.5 w-2.5">
                                <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-sm">{f.flightCode}</span>
                              <span className="text-xs text-gray-500">{f.airlineName}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-400">
                              <span className="font-semibold text-gray-200">{f.originCode}</span>
                              <span className="text-gray-600">→</span>
                              <span className="font-semibold text-gray-200">{f.destinationCode}</span>
                              <span className="text-gray-600">·</span>
                              <span>{formatDate(f.isoDate, locale)}</span>
                              {f.departureTime && (
                                <>
                                  <span className="text-gray-600">·</span>
                                  <span className="text-blue-400 font-medium">{f.departureTime}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${CONFIDENCE_COLORS[f.confidence]}`}>
                          {t.confidence[f.confidence]}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Try again */}
              <button
                onClick={() => { setResult(null); setSelected(new Set()); }}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors underline"
              >
                {locale === "en" ? "Try different text" : "Intentar con otro texto"}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-white/6">
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            {t.cancel}
          </button>
          {result && result.flights.length > 0 && selected.size > 0 && (
            <button
              onClick={handleImport}
              className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 px-5 py-2 text-sm font-semibold text-white transition-colors"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              {t.addAll(selected.size)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
