"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AIRPORTS } from "@/lib/airports";

interface AirportSearchInputProps {
  value: string;
  onChange: (iata: string) => void;
  placeholder: string;
  locale: "es" | "en";
  label?: string;
}

interface AirportResult {
  iata: string;
  city: string;
  name: string;
}

function searchAirports(query: string): AirportResult[] {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  const results: AirportResult[] = [];
  for (const [iata, info] of Object.entries(AIRPORTS)) {
    if (
      iata.toLowerCase().includes(q) ||
      info.city.toLowerCase().includes(q) ||
      info.name.toLowerCase().includes(q)
    ) {
      results.push({ iata, city: info.city, name: info.name });
    }
    if (results.length >= 6) break;
  }
  return results;
}

export function AirportSearchInput({
  value,
  onChange,
  placeholder,
  locale,
}: AirportSearchInputProps) {
  // displayValue shows the human-readable text; value prop holds the IATA code
  const [inputText, setInputText] = useState(() => {
    if (!value) return "";
    const info = AIRPORTS[value];
    return info ? `${info.city} (${value})` : value;
  });
  const [results, setResults] = useState<AirportResult[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync inputText when value prop changes externally (e.g. form reset)
  useEffect(() => {
    if (!value) {
      setInputText("");
    } else {
      const info = AIRPORTS[value];
      setInputText(info ? `${info.city} (${value})` : value);
    }
  }, [value]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputText(text);
    setActiveIndex(-1);

    // If user is clearing the field, clear the parent value too
    if (!text.trim()) {
      onChange("");
      setResults([]);
      setOpen(false);
      return;
    }

    const found = searchAirports(text);
    setResults(found);
    setOpen(found.length > 0);
  }, [onChange]);

  const selectAirport = useCallback((result: AirportResult) => {
    setInputText(`${result.city} (${result.iata})`);
    onChange(result.iata);
    setResults([]);
    setOpen(false);
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectAirport(results[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }, [open, results, activeIndex, selectAirport]);

  const handleBlur = useCallback((e: React.FocusEvent) => {
    // Only close if focus leaves the container entirely
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setOpen(false);
      // If the current inputText doesn't correspond to the selected value, restore it
      if (value) {
        const info = AIRPORTS[value];
        setInputText(info ? `${info.city} (${value})` : value);
      }
    }
  }, [value]);

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-surface-darker px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500/70";

  const noResultsLabel = locale === "es" ? "Sin resultados" : "No results";

  return (
    <div ref={containerRef} className="relative" onBlur={handleBlur}>
      <input
        ref={inputRef}
        type="text"
        value={inputText}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls="airport-search-listbox"
        aria-haspopup="listbox"
        aria-autocomplete="list"
        aria-activedescendant={activeIndex >= 0 && results[activeIndex] ? `${results[activeIndex].iata}-option` : undefined}
        className={inputClass}
      />
      {open && (
        <ul
          id="airport-search-listbox"
          className="absolute z-50 mt-1 w-full rounded-xl border border-white/[0.07] bg-surface-elevated shadow-2xl overflow-hidden"
          role="listbox"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2.5 text-xs text-gray-500">{noResultsLabel}</li>
          ) : (
            results.map((r, i) => (
              <li
                key={r.iata}
                id={`${r.iata}-option`}
                role="option"
                aria-selected={i === activeIndex}
                onMouseDown={(e) => {
                  // Prevent blur from firing before click
                  e.preventDefault();
                  selectAirport(r);
                }}
                className={`px-3 py-2.5 cursor-pointer text-sm transition-colors ${
                  i === activeIndex
                    ? "bg-blue-600/30 text-white"
                    : "text-gray-300 hover:bg-white/[0.05]"
                }`}
              >
                <span className="font-semibold text-white">{r.city}</span>
                {" "}
                <span className="text-blue-400">({r.iata})</span>
                {" "}
                <span className="text-gray-500 text-xs">— {r.name}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
