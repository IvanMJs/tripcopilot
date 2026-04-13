export const dynamic = "force-dynamic";

import * as Sentry from "@sentry/nextjs";
import { AIRPORTS } from "@/lib/airports";
import { parseAeroDataBox } from "@/lib/aerodatabox";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min

function formatDateTime(d: Date): string {
  return d.toISOString().slice(0, 16);
}

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const airportParam = searchParams.get("airports") ?? "";
  const locale = (searchParams.get("locale") ?? "es") as "es" | "en";

  const iatas = airportParam
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  const key = process.env.AERODATABOX_RAPIDAPI_KEY;
  if (!key) return Response.json({});

  const intlAirports = iatas.filter(
    (iata) => AIRPORTS[iata] && AIRPORTS[iata].isFAA === false,
  );
  if (intlAirports.length === 0) return Response.json({});

  const now = new Date();
  const supabase = getServiceClient();
  const cacheThreshold = new Date(now.getTime() - CACHE_TTL_MS).toISOString();

  // Read fresh cache entries
  const { data: cachedRows } = await supabase
    .from("airport_status_cache")
    .select("iata, data")
    .in("iata", intlAirports)
    .gte("cached_at", cacheThreshold);

  const cachedMap = new Map<string, object>(
    (cachedRows ?? []).map((row: { iata: string; data: object }) => [row.iata, row.data]),
  );

  const results: Record<string, object> = {};
  const toFetch: string[] = [];

  for (const iata of intlAirports) {
    const hit = cachedMap.get(iata);
    if (hit) {
      results[iata] = hit;
    } else {
      toFetch.push(iata);
    }
  }

  // All served from cache — zero AeroDataBox calls
  if (toFetch.length === 0) {
    return Response.json(results, { headers: { "Cache-Control": "no-store" } });
  }

  // Fetch fresh data for stale/missing airports
  const from = formatDateTime(new Date(now.getTime() - 60 * 60 * 1000));
  const to   = formatDateTime(new Date(now.getTime() + 4 * 60 * 60 * 1000));

  for (const iata of toFetch) {
    try {
      const url =
        `https://aerodatabox.p.rapidapi.com/flights/airports/iata/${iata}/${from}/${to}` +
        `?direction=Departure&withLeg=false&withCancelled=true&withCodeshared=true` +
        `&withCargo=false&withPrivate=false&withLocation=false`;

      const res = await fetch(url, {
        headers: {
          "X-RapidAPI-Key": key,
          "X-RapidAPI-Host": "aerodatabox.p.rapidapi.com",
        },
        signal: AbortSignal.timeout(8000),
      });

      if (res.status === 429 || res.status === 402) {
        // Quota hit — return what we have (cache hits + any fresh fetches so far)
        return Response.json(
          Object.keys(results).length > 0 ? results : { quotaExceeded: true },
          { headers: { "Cache-Control": "no-store" } },
        );
      }
      if (!res.ok) continue;

      const data = await res.json();
      const status = parseAeroDataBox(iata, data, locale);
      if (status) {
        results[iata] = status;
        // Write to cache — fire-and-forget, don't block response
        supabase
          .from("airport_status_cache")
          .upsert({ iata, data: status, cached_at: now.toISOString() })
          .then(() => {});
      }
    } catch (err) {
      Sentry.captureException(err instanceof Error ? err : new Error(String(err)), { extra: { iata } });
      // Individual airport failure doesn't break others
    }
  }

  return Response.json(results, { headers: { "Cache-Control": "no-store" } });
}
