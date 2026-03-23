import { fetchFromAviationStack } from "./providers/aviationstack";
import { fetchFromOpenSky } from "./providers/opensky";
import type { FlightDataResult } from "./flightDataProvider";

const _cache = new Map<string, { data: FlightDataResult; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getFlightData(
  flightCode: string,
  isoDate: string,
): Promise<FlightDataResult> {
  const cacheKey = `${flightCode}:${isoDate}`;
  const cached = _cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  const avsResult = await fetchFromAviationStack(flightCode, isoDate);
  if (avsResult.success) {
    _cache.set(cacheKey, { data: avsResult, ts: Date.now() });
    return avsResult;
  }

  console.warn(
    `[flightData] AviationStack failed for ${flightCode}: ${avsResult.error}. Trying OpenSky...`,
  );

  const osResult = await fetchFromOpenSky(flightCode, isoDate);
  if (osResult.success) {
    _cache.set(cacheKey, { data: osResult, ts: Date.now() });
    return osResult;
  }

  console.error(
    `[flightData] All providers failed for ${flightCode}. AviationStack: ${avsResult.error} | OpenSky: ${osResult.error}`,
  );

  return { success: false, error: "All providers unavailable" };
}
