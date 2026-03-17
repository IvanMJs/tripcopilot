export const dynamic = "force-dynamic";

const AWC_BASE = "https://api.aviationweather.gov/api/data";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ids  = url.searchParams.get("ids")  ?? "";
  const type = url.searchParams.get("type") ?? "metar";

  if (!ids.trim()) {
    return Response.json({ error: "ids param required" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    let awcUrl: string;

    if (type === "taf") {
      awcUrl = `${AWC_BASE}/taf?ids=${encodeURIComponent(ids)}&format=json&metar=false&hours=24`;
    } else {
      awcUrl = `${AWC_BASE}/metar?ids=${encodeURIComponent(ids)}&format=json&taf=false&hours=1`;
    }

    const res = await fetch(awcUrl, {
      headers: { "User-Agent": "AirportMonitor/1.0 (personal travel app)" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`AWC returned ${res.status}`);

    const json = await res.json();

    const cacheSeconds = type === "taf" ? 1800 : 300; // TAF: 30 min, METAR: 5 min
    return Response.json(json, {
      headers: {
        "Cache-Control": `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}`,
      },
    });
  } catch (err) {
    clearTimeout(timeout);
    return Response.json(
      { error: "AWC unavailable", detail: String(err) },
      { status: 502 },
    );
  }
}
