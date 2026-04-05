"use client";

import { useState } from "react";
import { Search, X, ExternalLink, Plane, Info } from "lucide-react";
import { AirportStatusMap } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
import { useLanguage } from "@/contexts/LanguageContext";
import { AIRPORTS } from "@/lib/airports";
import { parseFlightCode } from "@/lib/flightUtils";
import { useTrackedFlights } from "@/hooks/useTrackedFlights";

function formatMinutes(min: number | undefined): string {
  if (min == null) return "?";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

interface FlightSearchProps {
  statusMap: AirportStatusMap;
}

const LABELS = {
  es: {
    title:           "Seguí cualquier vuelo",
    subtitle:        "Ingresá el código para ver el estado FAA y rastrear en tiempo real",
    flightPlaceholder: "Código de vuelo · AA900, B6766…",
    airportPlaceholder: "Aeropuerto IATA · MIA (opcional)",
    add:             "Agregar",
    track:           "Rastrear en FlightAware",
    airportStatus:   "Estado del aeropuerto de salida",
    remove:          "Quitar",
    noAirport:       "Sin aeropuerto — ingresá el código IATA para ver demoras FAA",
    faaNote:         "Estado del aeropuerto vía FAA oficial en tiempo real.",
    invalidCode:     "Código inválido. Usá formato AA900, B6766 o EDV5068",
    unknownAirline:  "Aerolínea no reconocida. Intentá con FlightAware directamente.",
    unknownAirport:  "Aeropuerto no reconocido. Verificá el código IATA.",
    trackedFlights:  "Vuelos rastreados",
    airportLabel:    "Aeropuerto:",
    emptyTitle:      "Todavía no rastreás ningún vuelo",
    emptyBullets: [
      "Verificar el estado FAA antes de ir al aeropuerto",
      "Seguir un vuelo en tiempo real",
      "Detectar demoras en cualquier ruta",
    ],
    emptyNote: "Ingresá un código de vuelo para empezar",
  },
  en: {
    title:           "Track any flight",
    subtitle:        "Enter the code to see FAA status and track in real time",
    flightPlaceholder: "Flight code · AA900, B6766…",
    airportPlaceholder: "IATA airport · MIA (optional)",
    add:             "Add",
    track:           "Track on FlightAware",
    airportStatus:   "Departure airport status",
    remove:          "Remove",
    noAirport:       "No airport — enter IATA code to see FAA delays",
    faaNote:         "Live departure airport status via official FAA data.",
    invalidCode:     "Invalid code. Use format AA900, B6766 or EDV5068",
    unknownAirline:  "Airline not recognized. Try FlightAware directly.",
    unknownAirport:  "Airport not recognized. Check the IATA code.",
    trackedFlights:  "Tracked flights",
    airportLabel:    "Airport:",
    emptyTitle:      "No flights tracked yet",
    emptyBullets: [
      "Check FAA status before heading to the airport",
      "Follow any flight live",
      "Detect delays on any route",
    ],
    emptyNote: "Enter a flight code to get started",
  },
};

export function FlightSearch({ statusMap }: FlightSearchProps) {
  const { locale } = useLanguage();
  const L = LABELS[locale];

  const [input, setInput] = useState("");
  const [airportInput, setAirportInput] = useState("");
  const [error, setError] = useState("");
  const { flights: tracked, add: addTracked, remove: removeTracked } = useTrackedFlights();

  function handleAdd() {
    setError("");
    const parsed = parseFlightCode(input);
    if (!parsed) { setError(L.invalidCode); return; }
    const airportCode = airportInput.trim().toUpperCase();
    if (airportCode && !AIRPORTS[airportCode]) { setError(L.unknownAirport); return; }
    if (tracked.some((t) => t.parsed.fullCode === parsed.fullCode)) return;
    addTracked(parsed, airportCode);
    setInput("");
    setAirportInput("");
  }

  return (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-bold text-white leading-snug">{L.title}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{L.subtitle}</p>
      </div>

      {/* ── Search form ────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-4 space-y-3">

        {/* Inputs — stack on mobile, row on sm+ */}
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Flight code */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
            <input
              type="text"
              value={input}
              onChange={(e) => { setInput(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder={L.flightPlaceholder}
              className="w-full rounded-lg border border-gray-700 bg-gray-950 pl-9 pr-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Airport (optional) */}
          <div className="relative sm:w-48">
            <Plane className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
            <input
              type="text"
              value={airportInput}
              onChange={(e) => setAirportInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder={L.airportPlaceholder}
              maxLength={3}
              className="w-full rounded-lg border border-gray-700 bg-gray-950 pl-9 pr-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Button — full width on mobile */}
          <button
            onClick={handleAdd}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors shrink-0"
          >
            {L.add}
          </button>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <p className="text-[11px] text-gray-600 flex items-start gap-1.5">
          <Info className="h-3 w-3 shrink-0 mt-0.5" />
          {L.faaNote}
        </p>
      </div>

      {/* ── Results or empty state ──────────────────────────────────────────── */}
      {tracked.length === 0 ? (

        /* Empty state */
        <div className="rounded-xl border border-gray-800/50 bg-gray-900/20 px-5 py-7 flex flex-col items-center text-center">
          <div className="text-3xl mb-3 select-none">🔍</div>
          <p className="text-sm font-semibold text-gray-400 mb-3">{L.emptyTitle}</p>
          <ul className="space-y-1.5 text-left mb-4 max-w-xs">
            {L.emptyBullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                <span className="text-gray-700 mt-0.5 shrink-0">→</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-700">{L.emptyNote}</p>
        </div>

      ) : (

        /* Tracked flights list */
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            {L.trackedFlights} · {tracked.length}
          </h3>
          {tracked.map(({ id, parsed, airportCode }) => {
            const airportStatus = airportCode ? statusMap[airportCode] : undefined;
            const status = airportStatus?.status ?? "ok";
            const hasIssue = status !== "ok" && !!airportCode;

            return (
              <div
                key={parsed.fullCode}
                className={`rounded-xl border p-4 transition-all ${
                  hasIssue
                    ? "border-orange-600/40 bg-orange-950/10"
                    : "border-gray-800 bg-gray-900/30"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-xl font-black text-white">{parsed.fullCode}</span>
                      <span className="text-xs text-gray-500">{parsed.airlineName}</span>
                    </div>

                    {airportCode ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-500">{L.airportLabel}</span>
                        <span className="font-bold text-white text-sm">{airportCode}</span>
                        <StatusBadge status={status} />
                      </div>
                    ) : (
                      <p className="text-xs text-gray-600 italic">{L.noAirport}</p>
                    )}

                    {airportStatus?.delays && (
                      <p className="text-xs text-orange-300">
                        ⚠️ {formatMinutes(airportStatus.delays.minMinutes)}–{formatMinutes(airportStatus.delays.maxMinutes)}
                        {" · "}{airportStatus.delays.reason}
                      </p>
                    )}
                    {airportStatus?.groundDelay && (
                      <p className="text-xs text-red-300">
                        🔴 {locale === "en" ? "Ground Delay" : "Demora en Tierra"}{" "}
                        avg {formatMinutes(airportStatus.groundDelay.avgMinutes)}
                        {" · "}{airportStatus.groundDelay.reason}
                      </p>
                    )}
                    {airportStatus?.groundStop && (
                      <p className="text-xs text-red-300">
                        🛑 {locale === "en" ? "Ground Stop until" : "Parada en Tierra hasta"}{" "}
                        {airportStatus.groundStop.endTime ?? "?"}{" · "}{airportStatus.groundStop.reason}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button
                      onClick={() => removeTracked(id)}
                      className="rounded-full p-1 text-gray-600 hover:text-gray-400 hover:bg-gray-800 transition-colors"
                      title={L.remove}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <a
                      href={parsed.flightAwareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-700/60 bg-blue-900/20 px-3 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-900/40 transition-all"
                    >
                      {L.track}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
