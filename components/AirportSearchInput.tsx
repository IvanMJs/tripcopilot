"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AIRPORTS } from "@/lib/airports";
import { Input } from "@/components/ui/Input";

interface AirportSearchInputProps {
  value: string;
  onChange: (iata: string) => void;
  placeholder: string;
  locale: "es" | "en";
  label?: string;
  /** Suggested IATA codes — pills shown when input is empty */
  suggestions?: string[];
}

interface AirportResult {
  iata: string;
  city: string;
  name: string;
}

const DEFAULT_SUGGESTIONS = ["EZE", "AEP", "JFK", "MIA", "MAD", "GRU"];

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
  suggestions = DEFAULT_SUGGESTIONS,
}: AirportSearchInputProps) {
  const [inputText, setInputText] = useState(() => {
    if (!value) return "";
    const info = AIRPORTS[value];
    return info ? `${info.city} (${value})` : value;
  });
  const [results, setResults]         = useState<AirportResult[]>([]);
  const [open, setOpen]               = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [focused, setFocused]         = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);

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

  const selectIata = useCallback((iata: string) => {
    const info = AIRPORTS[iata];
    if (!info) return;
    selectAirport({ iata, city: info.city, name: info.name });
  }, [selectAirport]);

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
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setOpen(false);
      setFocused(false);
      if (value) {
        const info = AIRPORTS[value];
        setInputText(info ? `${info.city} (${value})` : value);
      }
    }
  }, [value]);

  const noResultsLabel   = locale === "es" ? "Sin resultados" : "No results";
  const suggestionsLabel = locale === "es" ? "Sugerencias" : "Suggestions";

  // Show pills when focused AND input empty AND no current value
  const showSuggestions = focused && !inputText.trim() && !value;


  return (
    <div ref={containerRef} className="relative" onBlur={handleBlur}>
       <Input
         ref={inputRef}
         type="text"
         value={inputText}
         onChange={handleInputChange}
         onKeyDown={handleKeyDown}
         onFocus={() => setFocused(true)}
         placeholder={placeholder}
         autoComplete="off"
         role="combobox"
         aria-expanded={open || showSuggestions}
         aria-controls="airport-search-listbox"
         aria-haspopup="listbox"
         aria-autocomplete="list"
         aria-activedescendant={activeIndex >= 0 && results[activeIndex] ? `${results[activeIndex].iata}-option` : undefined}
       />

      {showSuggestions && suggestions.length > 0 && (
        <div
          id="airport-search-listbox"
          className="absolute z-50 mt-1 w-full rounded-xl border border-white/[0.07] bg-surface-elevated shadow-2xl p-2"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 px-1 pb-1.5">
            {suggestionsLabel}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((iata) => {
              const info = AIRPORTS[iata];
              if (!info) return null;
              return (
                <button
                  key={iata}
                  onMouseDown={(e) => { e.preventDefault(); selectIata(iata); }}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-xs font-semibold text-white hover:border-[rgba(255,184,0,0.25)] hover:bg-[#FFC933]/10 hover:text-[#FFC933] transition-colors"
                  title={info.city}
                >
                  <span className="font-mono tracking-wider">{iata}</span>
                  <span className="text-gray-500 font-normal truncate max-w-[80px]">{info.city}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

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
                onMouseDown={(e) => { e.preventDefault(); selectAirport(r); }}
                className={`px-3 py-2.5 cursor-pointer text-sm transition-colors ${
                  i === activeIndex
                    ? "bg-[#FFB800]/25 text-[#07070d]"
                    : "text-gray-300 hover:bg-white/[0.05]"
                }`}
              >
                <span className="font-semibold text-white">{r.city}</span>
                {" "}
                <span className="text-[#FFB800] font-mono">({r.iata})</span>
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
