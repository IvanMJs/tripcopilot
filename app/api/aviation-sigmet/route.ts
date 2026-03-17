export const dynamic = "force-dynamic";

const AWC_SIGMET_URL =
  "https://api.aviationweather.gov/api/data/sigmet?format=geojson";

export async function GET() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(AWC_SIGMET_URL, {
      headers: { "User-Agent": "AirportMonitor/1.0 (personal travel app)" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`AWC SIGMET returned ${res.status}`);

    const json = await res.json();

    return Response.json(json, {
      headers: {
        "Cache-Control": "public, max-age=600, s-maxage=600",
      },
    });
  } catch (err) {
    clearTimeout(timeout);
    return Response.json(
      { error: "AWC SIGMET unavailable", detail: String(err) },
      { status: 502 },
    );
  }
}
