import { TripAdviceResult, TripAdviceCacheEntry } from "@/lib/types/tripAdvice";

const CACHE_KEY = "copiloto-trip-advice";
const TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export interface FlightSignatureItem {
  isoDate: string;
  originCode: string;
  destinationCode: string;
}

export function computeTripSignature(flights: FlightSignatureItem[]): string {
  return flights
    .map((f) => `${f.isoDate}:${f.originCode}:${f.destinationCode}`)
    .join("|");
}

export function getCachedTripAdvice(signature: string): TripAdviceResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: TripAdviceCacheEntry = JSON.parse(raw);
    if (entry.signature !== signature) return null;
    if (Date.now() - entry.timestamp > TTL_MS) return null;
    return entry.data;
  } catch {
    return null;
  }
}

export function setCachedTripAdvice(signature: string, data: TripAdviceResult): void {
  try {
    const entry: TripAdviceCacheEntry = { data, signature, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {}
}

export function clearTripAdviceCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {}
}
