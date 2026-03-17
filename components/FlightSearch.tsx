"use client";

import { useState, useEffect } from "react";
import { Search, X, ExternalLink, Plane, Info } from "lucide-react";
import { AirportStatusMap } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
import { useLanguage } from "@/contexts/LanguageContext";
import { AIRPORTS } from "@/lib/airports";
import { AIRLINES, ParsedFlight, parseFlightCode } from "@/lib/flightUtils";

interface TrackedFlight {
  parsed: ParsedFlight;
  airportCode: string;
}

const TRACKED_KEY = "airport-monitor-tracked-flights";

interface StoredFlight { airlineCode: string; flightNumber: string; airportCode: string; }

function loadTracked(): TrackedFlight[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(TRACKED_KEY);
    if (!stored) return [];
    const raw: StoredFlight[] = JSON.parse(stored);
    return raw.flatMap(({ airlineCode, flightNumber, airportCode }) => {
      const parsed = parseFlightCode(`${airlineCode}${flightNumber}`);
      return parsed ? [{ parsed, airportCode }] : [];
    });
  } catch {
    return [];
  }
}

// Build sorted airline list (IATA codes only — 2-char or digit-prefixed, exclude ICAO duplicates)
const airlineList = Object.entries(AIRLINES)
  .filter(([code]) => code.length <= 2 || /^\d/.test(code))
  .map(([code, info]) => ({ code, name: info.name }))
  .sort((a, b) => a.name.localeCompare(b.name));

interface FlightSearchProps {
  statusMap: AirportStatusMap;
}

const LABELS = {
  es: {
    title: "Buscar vuelo por código",
    placeholder: "Ej: AA900, B6766, EDV5068",
    add: "Agregar",
    track: "Rastrear en FlightAware",
    airportStatus: "Estado del aeropuerto de salida",
    airportPlaceholder: "Código IATA del aeropuerto (ej: MIA)",
    airportOptional: "Aeropuerto de salida (opcional, para ver demoras FAA)",
    remove: "Quitar",
    noAirport: "Sin aeropuerto asignado — ingresá el código IATA para ver demoras FAA",
    faaNote: "Mostramos el estado en tiempo real del aeropuerto de salida vía FAA oficial.",
    invalidCode: "Código inválido. Usá formato: AA900, B6766 o EDV5068",
    unknownAirline: "Aerolínea no reconocida. Intentá con FlightAware directamente.",
    trackedFlights: "Vuelos rastreados",
    empty: "Ingresá un código (ej: AA900) para ver el estado del aeropuerto de salida y rastrear el vuelo en FlightAware.",
    airportLabel: "Aeropuerto:",
    unknownAirport: "Aeropuerto no reconocido. Verificá el código IATA.",
    airlineFilter: "Aerolínea...",
  },
  en: {
    title: "Search flight by code",
    placeholder: "E.g.: AA900, B6766, EDV5068",
    add: "Add",
    track: "Track on FlightAware",
    airportStatus: "Departure airport status",
    airportPlaceholder: "IATA airport code (e.g.: MIA)",
    airportOptional: "Departure airport (optional, to show FAA delays)",
    remove: "Remove",
    noAirport: "No airport assigned — enter IATA code to see FAA delays",
    faaNote: "We show real-time departure airport status via official FAA data.",
    invalidCode: "Invalid code. Use format: AA900, B6766 or EDV5068",
    unknownAirline: "Airline not recognized. Try FlightAware directly.",
    trackedFlights: "Tracked flights",
    empty: "Enter a code (e.g. AA900) to see departure airport status and track the flight on FlightAware.",
    airportLabel: "Airport:",
    unknownAirport: "Airport not recognized. Check the IATA code.",
    airlineFilter: "Airline...",
  },
};

export function FlightSearch({ statusMap }: FlightSearchProps) {
  const { locale } = useLanguage();
  const L = LABELS[locale];

  const [input, setInput] = useState("");
  const [airportInput, setAirportInput] = useState("");
  const [error, setError] = useState("");
  const [tracked, setTracked] = useState<TrackedFlight[]>([]);
  const [selectedAirline, setSelectedAirline] = useState<string>("");

  useEffect(() => { setTracked(loadTracked()); }, []);

  useEffect(() => {
    const toStore: StoredFlight[] = tracked.map(({ parsed, airportCode }) => ({
      airlineCode: parsed.airlineCode,
      flightNumber: parsed.flightNumber,
      airportCode,
    }));
    localStorage.setItem(TRACKED_KEY, JSON.stringify(toStore));
  }, [tracked]);

  function handleAdd() {
    setError("");
    const parsed = parseFlightCode(input);
    if (!parsed) {
      const clean = input.trim().toUpperCase().replace(/\s+/g, "");
      const codeMatch = clean.match(/^([A-Z]{2,3}|[A-Z0-9]{2})\d+$/);
      if (codeMatch && !AIRLINES[codeMatch[1]]) {
        setError(L.unknownAirline);
      } else {
        setError(L.invalidCode);
      }
      return;
    }

    const airportCode = airportInput.trim().toUpperCase();
    if (airportCode && !AIRPORTS[airportCode]) {
      setError(L.unknownAirport);
      return;
    }

    const alreadyExists = tracked.some(
      (t) => t.parsed.fullCode === parsed.fullCode
    );
    if (alreadyExists) return;

    setTracked((prev) => [
      ...prev,
      { parsed, airportCode },
    ]);
    setInput("");
    setAirportInput("");
    setSelectedAirline("");
  }

  function handleRemove(fullCode: string) {
    setTracked((prev) => prev.filter((t) => t.parsed.fullCode !== fullCode));
  }

  return (
    <div className="space-y-4">

      {/* Formulario de búsqueda */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-300">{L.title}</h3>

        <div className="flex gap-2 flex-wrap">
          {/* Airline filter select */}
          <select
            value={selectedAirline}
            onChange={(e) => {
              setSelectedAirline(e.target.value);
              if (e.target.value) {
                setInput(e.target.value);
                setError("");
              }
            }}
            className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[140px]"
          >
            <option value="">{L.airlineFilter}</option>
            {airlineList.map(({ code, name }) => (
              <option key={code} value={code}>{code} — {name}</option>
            ))}
          </select>

          {/* Flight code input */}
          <div className="relative flex-1 min-w-[140px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
            <input
              type="text"
              value={input}
              onChange={(e) => {
                const val = e.target.value;
                setInput(val);
                setError("");
                // Clear airline selection if user removes the prefix
                if (selectedAirline && !val.toUpperCase().startsWith(selectedAirline)) {
                  setSelectedAirline("");
                }
              }}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder={L.placeholder}
              className="w-full rounded-lg border border-gray-700 bg-gray-950 pl-9 pr-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Airport input */}
          <div className="relative flex-1 min-w-[120px]">
            <Plane className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
            <input
              type="text"
              value={airportInput}
              onChange={(e) => setAirportInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder={L.airportPlaceholder}
              maxLength={3}
              className="w-full rounded-lg border border-gray-700 bg-gray-950 pl-9 pr-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleAdd}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
          >
            {L.add}
          </button>
        </div>

        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}

        <p className="text-xs text-gray-600 flex items-start gap-1.5">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          {L.faaNote}
        </p>
      </div>

      {/* Resultados */}
      {tracked.length === 0 ? (
        <p className="text-sm text-gray-600 text-center py-6">{L.empty}</p>
      ) : (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            {L.trackedFlights}
          </h3>
          {tracked.map(({ parsed, airportCode }) => {
            const airportStatus = airportCode ? statusMap[airportCode] : undefined;
            const status = airportStatus?.status ?? "ok";
            const hasIssue = status !== "ok" && !!airportCode;

            return (
              <div
                key={parsed.fullCode}
                className={`rounded-xl border-2 p-4 transition-all ${
                  hasIssue ? "border-orange-600/50 bg-orange-950/10" : "border-gray-800 bg-gray-900/30"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-2xl font-black text-white">{parsed.fullCode}</span>
                      <span className="inline-flex items-center rounded-md border border-gray-700 bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-300">
                        {parsed.airlineCode}
                      </span>
                      <span className="text-sm text-gray-500">{parsed.airlineName}</span>
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

                    {/* Detalle de demora si existe */}
                    {airportStatus?.delays && (
                      <p className="text-xs text-orange-300 mt-1">
                        ⚠️ {airportStatus.delays.minMinutes}–{airportStatus.delays.maxMinutes} min
                        {" · "}{airportStatus.delays.reason}
                      </p>
                    )}
                    {airportStatus?.groundDelay && (
                      <p className="text-xs text-red-300 mt-1">
                        🔴 {locale === "en" ? "Ground Delay" : "Demora en Tierra"} avg {airportStatus.groundDelay.avgMinutes} min
                        {" · "}{airportStatus.groundDelay.reason}
                      </p>
                    )}
                    {airportStatus?.groundStop && (
                      <p className="text-xs text-red-300 mt-1">
                        🛑 {locale === "en" ? "Ground Stop" : "Parada en Tierra"} {locale === "en" ? "until" : "hasta"} {airportStatus.groundStop.endTime ?? "?"} · {airportStatus.groundStop.reason}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() => handleRemove(parsed.fullCode)}
                      className="rounded-full p-1 text-gray-600 hover:text-gray-400 hover:bg-gray-800 transition-colors"
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
