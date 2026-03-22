"use client";

import { useState, useRef, useEffect } from "react";
import { AIRPORTS } from "@/lib/airports";
import { Plus, Search } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const COUNTRY_FLAGS: Record<string, string> = {
  "Argentina":      "🇦🇷",
  "Brazil":         "🇧🇷",
  "Chile":          "🇨🇱",
  "Colombia":       "🇨🇴",
  "Peru":           "🇵🇪",
  "Uruguay":        "🇺🇾",
  "Panama":         "🇵🇦",
  "Mexico":         "🇲🇽",
  "Bahamas":        "🇧🇸",
  "Antigua":        "🇦🇬",
  "Ecuador":        "🇪🇨",
  "Bolivia":        "🇧🇴",
  "Cayman Islands": "🇰🇾",
  "USA":            "🇺🇸",
};

const AIRPORT_FLAGS: Record<string, string> = {
  EZE: "🇦🇷", AEP: "🇦🇷", COR: "🇦🇷", MDZ: "🇦🇷", BRC: "🇦🇷",
  MIA: "🇺🇸", JFK: "🇺🇸", LAX: "🇺🇸", ORD: "🇺🇸", ATL: "🇺🇸",
  GRU: "🇧🇷", SCL: "🇨🇱", BOG: "🇨🇴", LIM: "🇵🇪", MEX: "🇲🇽",
  MAD: "🇪🇸", BCN: "🇪🇸", LHR: "🇬🇧", CDG: "🇫🇷", FCO: "🇮🇹",
  GCM: "🇰🇾", NRT: "🇯🇵", DXB: "🇦🇪", IST: "🇹🇷", SYD: "🇦🇺",
};

const POPULAR = ["EZE", "AEP", "MIA", "GRU", "SCL", "MAD", "JFK", "LHR"];

interface AirportSearchProps {
  watchedAirports: string[];
  onAdd: (iata: string) => void;
}

export function AirportSearch({ watchedAirports, onAdd }: AirportSearchProps) {
  const { t, locale } = useLanguage();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Build sorted unique country list: USA first, then alphabetical
  const countries: string[] = (() => {
    const set = new Set<string>();
    Object.values(AIRPORTS).forEach((info) => {
      set.add(info.country ?? "USA");
    });
    const arr = Array.from(set);
    return arr.sort((a, b) => {
      if (a === "USA") return -1;
      if (b === "USA") return 1;
      return a.localeCompare(b);
    });
  })();

  const available = Object.entries(AIRPORTS)
    .filter(([code, info]) => {
      if (watchedAirports.includes(code)) return false;
      if (selectedCountry !== null && (info.country ?? "USA") !== selectedCountry) return false;
      const q = query.toLowerCase();
      return (
        code.toLowerCase().includes(q) ||
        info.name.toLowerCase().includes(q) ||
        info.city.toLowerCase().includes(q)
      );
    })
    .slice(0, selectedCountry !== null ? 12 : 8);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
        setSelectedCountry(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleAdd(iata: string) {
    onAdd(iata);
    setQuery("");
    setOpen(false);
    setSelectedCountry(null);
  }

  return (
    <div ref={containerRef} className="relative">
      {watchedAirports.length === 0 && (
        <p className="text-xs text-gray-600 mb-3 text-center">
          {locale === "es"
            ? "Agregá los aeropuertos de tu ruta para ver su estado en tiempo real"
            : "Add your route airports to monitor their status in real-time"}
        </p>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-dashed border-gray-600 px-4 py-3 text-sm text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors h-full min-h-[120px] w-full justify-center"
      >
        <Plus className="h-5 w-5" />
        {t.addAirport}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-gray-700 bg-gray-900 shadow-2xl">
          {/* Search input */}
          <div className="flex items-center gap-2 border-b border-gray-700 p-3">
            <Search className="h-4 w-4 text-gray-500 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder={t.searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-500 outline-none"
            />
          </div>

          {/* Country filter pills */}
          <div className="px-3 pb-2 pt-1 flex gap-1.5 flex-wrap border-b border-gray-700/50">
            <button
              onClick={() => setSelectedCountry(null)}
              className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                selectedCountry === null
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200"
              }`}
            >
              All
            </button>
            {countries.map((country) => (
              <button
                key={country}
                onClick={() => setSelectedCountry(country === selectedCountry ? null : country)}
                className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors flex items-center gap-1 ${
                  selectedCountry === country
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200"
                }`}
              >
                <span>{COUNTRY_FLAGS[country] ?? "🌐"}</span>
                {country}
              </button>
            ))}
          </div>

          {/* Popular suggestions — shown when query is empty and no airports watched */}
          {!query && watchedAirports.length === 0 && (
            <div className="p-3 border-b border-gray-700/50">
              <p className="text-xs text-gray-500 mb-2">
                {locale === "es" ? "Aeropuertos populares" : "Popular airports"}
              </p>
              <div className="flex flex-wrap gap-2">
                {POPULAR.map((code) => (
                  <button
                    key={code}
                    onClick={() => handleAdd(code)}
                    className="text-xs bg-white/5 hover:bg-violet-500/20 border border-white/10 hover:border-violet-500/40 text-gray-300 px-2.5 py-1 rounded-full transition-all"
                  >
                    {AIRPORT_FLAGS[code]} {code}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          <div className="max-h-64 overflow-y-auto">
            {!query && available.length > 0 && (
              <p className="text-xs text-gray-500 text-center py-3">
                {locale === "es"
                  ? "Escribe el código IATA o nombre del aeropuerto"
                  : "Type IATA code or airport name to search"}
              </p>
            )}
            {available.length === 0 ? (
              <p className="p-4 text-center text-xs text-gray-500">{t.noResults}</p>
            ) : (
              available.map(([code, info]) => (
                <button
                  key={code}
                  onClick={() => handleAdd(code)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-800 transition-colors"
                >
                  <span className="w-12 font-bold text-white text-sm">
                    {AIRPORT_FLAGS[code] ? `${AIRPORT_FLAGS[code]} ` : ""}{code}
                  </span>
                  <span className="flex-1 text-xs text-gray-400 leading-tight">
                    {info.name}
                    <br />
                    <span className="text-gray-500">
                      {info.country
                        ? `${COUNTRY_FLAGS[info.country] ?? "🌐"} ${info.city}`
                        : `🇺🇸 ${info.city}, ${info.state}`}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
