"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeftRight, RefreshCw } from "lucide-react";
import { TripFlight } from "@/lib/types";

// ── Airport → currency mapping (by IATA prefix / country heuristic) ───────
const AIRPORT_CURRENCY: Record<string, string> = {
  // USA
  ATL: "USD", LAX: "USD", ORD: "USD", DFW: "USD", DEN: "USD",
  JFK: "USD", SFO: "USD", SEA: "USD", LAS: "USD", MCO: "USD",
  MIA: "USD", CLT: "USD", EWR: "USD", PHX: "USD", IAH: "USD",
  BOS: "USD", MSP: "USD", DTW: "USD", FLL: "USD", PHL: "USD",
  // Europe
  LHR: "GBP", LGW: "GBP", MAN: "GBP", EDI: "GBP",
  CDG: "EUR", ORY: "EUR", NCE: "EUR",
  MAD: "EUR", BCN: "EUR",
  FCO: "EUR", MXP: "EUR", NAP: "EUR",
  AMS: "EUR", BRU: "EUR", FRA: "EUR", MUC: "EUR", ZRH: "EUR",
  LIS: "EUR", OPO: "EUR",
  ARN: "SEK", OSL: "NOK", HEL: "EUR",
  WAW: "PLN", PRG: "CZK", BUD: "HUF",
  // Asia
  NRT: "JPY", HND: "JPY", KIX: "JPY",
  ICN: "KRW", GMP: "KRW",
  PEK: "CNY", PVG: "CNY",
  HKG: "HKD",
  SIN: "SGD",
  BKK: "THB", DMK: "THB",
  KUL: "MYR",
  CGK: "IDR",
  DEL: "INR", BOM: "INR",
  DXB: "AED", AUH: "AED", DOH: "QAR", KWI: "KWD",
  // Americas
  EZE: "ARS", AEP: "ARS",
  GRU: "BRL", GIG: "BRL", BSB: "BRL",
  MEX: "MXN", CUN: "MXN",
  BOG: "COP",
  LIM: "PEN",
  SCL: "CLP",
  MVD: "UYU",
  UIO: "USD",
  GUA: "GTQ",
  SJO: "CRC",
  PTY: "USD",
  // Oceania
  SYD: "AUD", MEL: "AUD", BNE: "AUD",
  AKL: "NZD",
  // Africa
  CAI: "EGP", CPT: "ZAR", JNB: "ZAR",
  ADD: "ETB", NBO: "KES",
  CAS: "MAD",
  // Caribbean
  HAV: "CUP",
  PUJ: "DOP", SDQ: "DOP",
};

const TOP_CURRENCIES = ["USD", "EUR", "ARS", "BRL", "GBP", "JPY", "MXN", "CLP"] as const;
type Currency = (typeof TOP_CURRENCIES)[number] | string;

interface RatesCache {
  base: string;
  rates: Record<string, number>;
  fetchedAt: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const CACHE_KEY_PREFIX = "tc-fx-";

function loadCache(base: string): RatesCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${CACHE_KEY_PREFIX}${base}`);
    if (!raw) return null;
    const cache = JSON.parse(raw) as RatesCache;
    if (Date.now() - cache.fetchedAt > CACHE_TTL_MS) return null;
    return cache;
  } catch {
    return null;
  }
}

function saveCache(cache: RatesCache) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${CACHE_KEY_PREFIX}${cache.base}`, JSON.stringify(cache));
  } catch {
    // quota exceeded — silently ignore
  }
}

interface CurrencyConverterProps {
  locale: "es" | "en";
  tripFlights?: TripFlight[];
}

export function CurrencyConverter({ locale, tripFlights }: CurrencyConverterProps) {
  const [amount, setAmount]       = useState("100");
  const [fromCcy, setFromCcy]     = useState<Currency>("USD");
  const [toCcy, setToCcy]         = useState<Currency>("EUR");
  const [rates, setRates]         = useState<Record<string, number> | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(false);

  // Auto-detect destination currency from last trip flight
  useEffect(() => {
    if (!tripFlights || tripFlights.length === 0) return;
    const last = [...tripFlights].sort((a, b) => b.isoDate.localeCompare(a.isoDate))[0];
    const detected = AIRPORT_CURRENCY[last.destinationCode];
    if (detected) {
      setToCcy(detected);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRates = useCallback(async (base: Currency) => {
    const cached = loadCache(base);
    if (cached) {
      setRates(cached.rates);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { rates?: Record<string, number> };
      if (!data.rates) throw new Error("No rates");
      setRates(data.rates);
      saveCache({ base, rates: data.rates, fetchedAt: Date.now() });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRates(fromCcy);
  }, [fromCcy, fetchRates]);

  function handleSwap() {
    setFromCcy(toCcy);
    setToCcy(fromCcy);
  }

  const parsedAmount = parseFloat(amount) || 0;
  const rate = rates?.[toCcy] ?? null;
  const converted = rate !== null ? parsedAmount * rate : null;

  const formatConverted = (val: number): string => {
    if (val === 0) return "0";
    if (val >= 1000) return val.toLocaleString(locale === "es" ? "es-AR" : "en-US", { maximumFractionDigits: 0 });
    return val.toLocaleString(locale === "es" ? "es-AR" : "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="rounded-2xl border border-white/[0.07] bg-gradient-to-br from-[#0e0e20]/90 to-[#09091a]/95 p-4 space-y-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">💱</span>
          <h3 className="text-sm font-bold text-white">
            {locale === "es" ? "Conversor de moneda" : "Currency converter"}
          </h3>
        </div>
        <button
          onClick={() => { void fetchRates(fromCcy); }}
          disabled={loading}
          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors disabled:opacity-40"
          aria-label={locale === "es" ? "Actualizar tasas" : "Refresh rates"}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Converter row */}
      <div className="flex items-center gap-2">
        {/* Amount + from currency */}
        <div className="flex-1 flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0"
            className="flex-1 min-w-0 bg-transparent text-sm font-bold text-white outline-none placeholder:text-gray-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            placeholder="100"
            aria-label={locale === "es" ? "Monto" : "Amount"}
          />
          <select
            value={fromCcy}
            onChange={(e) => setFromCcy(e.target.value)}
            className="bg-transparent text-xs font-bold text-violet-300 outline-none cursor-pointer"
            aria-label={locale === "es" ? "Moneda origen" : "From currency"}
          >
            {TOP_CURRENCIES.map((c) => (
              <option key={c} value={c} className="bg-surface-elevated text-white">{c}</option>
            ))}
          </select>
        </div>

        {/* Swap button */}
        <button
          onClick={handleSwap}
          className="shrink-0 p-2 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-gray-400 hover:text-white transition-colors tap-scale"
          aria-label={locale === "es" ? "Intercambiar monedas" : "Swap currencies"}
        >
          <ArrowLeftRight className="h-4 w-4" />
        </button>

        {/* Result + to currency */}
        <div className="flex-1 flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.span
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 text-sm font-bold text-gray-500"
              >
                ...
              </motion.span>
            ) : error ? (
              <motion.span
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 text-sm font-bold text-red-400"
              >
                —
              </motion.span>
            ) : (
              <motion.span
                key={`${converted}-${toCcy}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex-1 text-sm font-bold text-emerald-300"
              >
                {converted !== null ? formatConverted(converted) : "—"}
              </motion.span>
            )}
          </AnimatePresence>
          <select
            value={toCcy}
            onChange={(e) => setToCcy(e.target.value)}
            className="bg-transparent text-xs font-bold text-violet-300 outline-none cursor-pointer"
            aria-label={locale === "es" ? "Moneda destino" : "To currency"}
          >
            {TOP_CURRENCIES.map((c) => (
              <option key={c} value={c} className="bg-surface-elevated text-white">{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Rate info */}
      {!loading && !error && rate !== null && (
        <p className="text-[11px] text-gray-600 text-center">
          1 {fromCcy} = {rate.toLocaleString(locale === "es" ? "es-AR" : "en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 })} {toCcy}
          {" · "}
          <span className="text-gray-700">
            {locale === "es" ? "open.er-api.com" : "open.er-api.com"}
          </span>
        </p>
      )}
      {error && (
        <p className="text-[11px] text-red-400/70 text-center">
          {locale === "es" ? "No se pudo obtener la tasa de cambio" : "Could not fetch exchange rate"}
        </p>
      )}
    </motion.div>
  );
}
