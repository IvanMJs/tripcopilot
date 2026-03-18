export const dynamic = "force-dynamic";

import { AIRPORTS } from "@/lib/airports";
import { parseAeroDataBox } from "@/lib/aerodatabox";

function formatDateTime(d: Date): string {
  // "YYYY-MM-DDTHH:mm" — AeroDataBox expects local airport time; we pass UTC and
  // use a wide enough window so that flights are captured regardless of timezone offset.
  return d.toISOString().slice(0, 16);
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

  // No key configured → return empty object (graceful degradation)
  if (!key) {
    return Response.json({});
  }

  // Only query airports that are non-FAA and known in our list
  const intlAirports = iatas.filter(
    (iata) => AIRPORTS[iata] && AIRPORTS[iata].isFAA === false,
  );

  if (intlAirports.length === 0) {
    return Response.json({});
  }

  // Wide time window: now-1h to now+4h so we capture current flights
  // regardless of the airport's local timezone offset
  const now = new Date();
  const from = formatDateTime(new Date(now.getTime() - 60 * 60 * 1000));
  const to = formatDateTime(new Date(now.getTime() + 4 * 60 * 60 * 1000));

  const results: Record<string, object> = {};

  await Promise.allSettled(
    intlAirports.map(async (iata) => {
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

        if (!res.ok) return;

        const data = await res.json();
        const status = parseAeroDataBox(iata, data, locale);
        if (status) results[iata] = status;
      } catch {
        // Silently skip — individual airport failure shouldn't break others
      }
    }),
  );

  return Response.json(results, {
    headers: {
      // Cache 10 minutes — delays don't change faster than that
      "Cache-Control": "public, max-age=600, s-maxage=600",
    },
  });
}
