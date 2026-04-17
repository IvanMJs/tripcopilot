export interface GeoPlace {
  city: string;
  country: string;
  countryCode: string;
}

interface CacheEntry {
  data: GeoPlace;
  ts: number;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function cacheKey(lat: number, lng: number): string {
  return `tc-rgeo-${lat.toFixed(2)}-${lng.toFixed(2)}`;
}

function readCache(key: string): GeoPlace | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw) as CacheEntry;
    if (Date.now() - entry.ts > CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function writeCache(key: string, data: GeoPlace): void {
  if (typeof localStorage === "undefined") return;
  try {
    const entry: CacheEntry = { data, ts: Date.now() };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // ignore quota errors
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeoPlace | null> {
  const key = cacheKey(lat, lng);
  const cached = readCache(key);
  if (cached) return cached;

  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;

    const json = await res.json() as {
      city?: string;
      locality?: string;
      principalSubdivision?: string;
      countryName?: string;
      countryCode?: string;
    };

    const city = json.city || json.locality || json.principalSubdivision || null;
    const country = json.countryName ?? null;
    const countryCode = json.countryCode ?? null;

    if (!city || !country || !countryCode) return null;

    const place: GeoPlace = { city, country, countryCode };
    writeCache(key, place);
    return place;
  } catch {
    return null;
  }
}
