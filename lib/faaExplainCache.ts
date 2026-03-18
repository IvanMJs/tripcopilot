const CACHE_KEY_PREFIX = "copiloto-faa-explain";
const BUCKET_MS = 30 * 60 * 1000; // 30-minute buckets

interface FaaExplainEntry {
  explanation: string;
}

function buildKey(airportCode: string, status: string): string {
  const bucket = Math.floor(Date.now() / BUCKET_MS);
  return `${CACHE_KEY_PREFIX}-${airportCode}-${status}-${bucket}`;
}

export function getCachedFaaExplanation(airportCode: string, status: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(buildKey(airportCode, status));
    if (!raw) return null;
    const entry: FaaExplainEntry = JSON.parse(raw);
    return entry.explanation ?? null;
  } catch {
    return null;
  }
}

export function setCachedFaaExplanation(
  airportCode: string,
  status: string,
  explanation: string,
): void {
  try {
    const entry: FaaExplainEntry = { explanation };
    localStorage.setItem(buildKey(airportCode, status), JSON.stringify(entry));
  } catch {}
}
