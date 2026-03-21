"use client";

import { useState, useEffect } from "react";

// Map IATA airport codes to their local currency
const IATA_TO_CURRENCY: Record<string, string> = {
  // USD
  JFK: "USD", LAX: "USD", MIA: "USD", EWR: "USD", ORD: "USD",
  SFO: "USD", DFW: "USD", ATL: "USD", BOS: "USD", MCO: "USD",
  IAH: "USD", SEA: "USD", LAS: "USD", PHX: "USD", DEN: "USD",
  // EUR
  MAD: "EUR", BCN: "EUR", CDG: "EUR", ORY: "EUR",
  FCO: "EUR", MXP: "EUR", AMS: "EUR", FRA: "EUR", MUC: "EUR",
  LIS: "EUR", VIE: "EUR", BRU: "EUR", CPH: "EUR",
  ARN: "EUR", HEL: "EUR", ATH: "EUR",
  // GBP
  LHR: "GBP", LGW: "GBP",
  // CHF
  ZRH: "CHF",
  // NOK
  OSL: "NOK",
  // PLN
  WAW: "PLN",
  // CZK
  PRG: "CZK",
  // HUF
  BUD: "HUF",
  // CAD
  YYZ: "CAD", YVR: "CAD", YUL: "CAD",
  // AUD
  SYD: "AUD", MEL: "AUD",
  // JPY
  NRT: "JPY", KIX: "JPY",
  // AED
  DXB: "AED", AUH: "AED",
  // TRY
  IST: "TRY",
  // SGD
  SIN: "SGD",
  // THB
  BKK: "THB",
  // MYR
  KUL: "MYR",
  // KRW
  ICN: "KRW",
  // CNY
  PEK: "CNY", PVG: "CNY",
  // ZAR
  JNB: "ZAR",
  // BRL
  GRU: "BRL", GIG: "BRL", BSB: "BRL", FOR: "BRL",
  // CLP
  SCL: "CLP",
  // PEN
  LIM: "PEN",
  // COP
  BOG: "COP", MDE: "COP",
  // MXN
  MEX: "MXN", CUN: "MXN", GDL: "MXN",
  // UYU
  MVD: "UYU",
  // PYG
  ASU: "PYG",
  // BOB
  VVI: "BOB", LPB: "BOB",
};

// Argentine airports — skip rate display for these
const ARGENTINA_IATA = new Set([
  "EZE", "AEP", "MDZ", "COR", "BRC", "IGR", "SLA", "TUC",
  "ROS", "NQN", "CRD", "USH", "PMY", "RGL", "FTE",
]);

export interface ExchangeRateResult {
  currency: string;
  rate: number | null;
  loading: boolean;
  error: boolean;
}

/**
 * Returns the ARS → destination currency exchange rate.
 * Uses frankfurter.app (free, no key needed).
 * Returns null if the destination is Argentine or currency is unknown.
 */
export function useExchangeRate(destinationCode: string): ExchangeRateResult | null {
  const currency = IATA_TO_CURRENCY[destinationCode];

  const [rate, setRate]       = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(false);

  useEffect(() => {
    if (!currency || ARGENTINA_IATA.has(destinationCode) || currency === "ARS") {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    fetch(`https://api.frankfurter.app/latest?from=ARS&to=${currency}`)
      .then((r) => r.json())
      .then((data: { rates?: Record<string, number> }) => {
        if (cancelled) return;
        const fetched = data.rates?.[currency];
        setRate(fetched ?? null);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinationCode, currency]);

  if (!currency || ARGENTINA_IATA.has(destinationCode) || currency === "ARS") {
    return null;
  }

  return { currency, rate, loading, error };
}
