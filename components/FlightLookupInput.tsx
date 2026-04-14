"use client";

import { useState, useRef } from "react";
import { Search, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { CommonFlightInfo } from "@/lib/commonFlights";

interface FlightLookupInputProps {
  locale: "es" | "en";
  onAutoFill: (data: CommonFlightInfo) => void;
}

type LookupState = "idle" | "loading" | "found" | "not_found";

const LABELS = {
  es: {
    label: "Buscar vuelo (auto-completar)",
    placeholder: "AA900, IB6845, LA504…",
    found: "Auto-completado",
    notFound: "No encontrado — completá manualmente",
    hint: "Ingresá el código de vuelo para auto-completar origen, destino y horario",
  },
  en: {
    label: "Flight lookup (auto-fill)",
    placeholder: "AA900, IB6845, LA504…",
    found: "Auto-filled",
    notFound: "Not found — fill manually",
    hint: "Enter the flight code to auto-fill origin, destination and time",
  },
};

export function FlightLookupInput({ locale, onAutoFill }: FlightLookupInputProps) {
  const [value, setValue] = useState("");
  const [state, setState] = useState<LookupState>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const L = LABELS[locale];

  async function lookup(code: string) {
    if (code.length < 4) {
      setState("idle");
      return;
    }

    setState("loading");
    try {
      const res = await fetch("/api/flight-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flightNumber: code }),
      });
      if (!res.ok) {
        setState("not_found");
        return;
      }
      const json = await res.json() as { found: boolean; data?: CommonFlightInfo };
      if (json.found && json.data) {
        setState("found");
        onAutoFill(json.data);
      } else {
        setState("not_found");
      }
    } catch {
      setState("not_found");
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.toUpperCase().replace(/\s+/g, "");
    setValue(raw);
    setState("idle");

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => lookup(raw), 500);
  }

  function handleBlur() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length >= 4) lookup(value);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      lookup(value);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-white/[0.12] bg-[#080810] px-3 py-2.5 pl-9 pr-28 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500/70";

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
        {L.label}
      </label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500 pointer-events-none" />
        <input
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={L.placeholder}
          className={inputClass}
          autoComplete="off"
          spellCheck={false}
        />

        {/* Status indicator */}
        <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-medium">
          {state === "loading" && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />
          )}
          {state === "found" && (
            <>
              <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span className="text-emerald-400 whitespace-nowrap">{L.found}</span>
            </>
          )}
          {state === "not_found" && (
            <XCircle className="h-3.5 w-3.5 text-gray-600 shrink-0" />
          )}
        </span>
      </div>

      {/* Status message */}
      {state === "not_found" && (
        <p className="text-[11px] text-gray-600">{L.notFound}</p>
      )}
      {state === "idle" && value.length === 0 && (
        <p className="text-[11px] text-gray-700">{L.hint}</p>
      )}
    </div>
  );
}
