export const runtime = "nodejs";
export const alt = "TripCopilot — Seguimiento de viaje";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

import { ImageResponse } from "next/og";
import { getTripByShareToken } from "@/lib/tripShareServer";
import { AIRPORTS } from "@/lib/airports";

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildRouteString(
  flights: Array<{ origin_code: string; destination_code: string }>,
): string {
  if (flights.length === 0) return "";
  const codes = [flights[0].origin_code];
  for (const f of flights) codes.push(f.destination_code);
  const deduped: string[] = [codes[0]];
  for (let i = 1; i < codes.length; i++) {
    if (codes[i] !== codes[i - 1]) deduped.push(codes[i]);
  }
  return deduped.join(" → ");
}

// Build a simplified SVG path string for the route arc between airports.
// Returns an SVG path `d` attribute string and a list of dot positions.
function buildRouteSvgData(
  flights: Array<{ origin_code: string; destination_code: string }>,
): {
  pathD: string;
  dots: Array<{ x: number; y: number; code: string; isEndpoint: boolean }>;
} | null {
  const codes = flights.length > 0
    ? [flights[0].origin_code, ...flights.map((f) => f.destination_code)]
    : [];
  const unique: string[] = [codes[0]];
  for (let i = 1; i < codes.length; i++) {
    if (codes[i] !== codes[i - 1]) unique.push(codes[i]);
  }
  if (unique.length < 2) return null;

  const airportData = unique
    .map((c) => ({ code: c, info: AIRPORTS[c] }))
    .filter((a) => a.info != null);

  if (airportData.length < 2) return null;

  const lngs = airportData.map((a) => a.info!.lng);
  const lats  = airportData.map((a) => a.info!.lat);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const lngR = maxLng - minLng || 1;
  const latR  = maxLat - minLat || 1;

  const W = 600;
  const H = 120;
  const PAD = 24;

  const toSvg = (lat: number, lng: number) => ({
    x: PAD + ((lng - minLng) / lngR) * (W - 2 * PAD),
    y: PAD + ((maxLat - lat) / latR) * (H - 2 * PAD),
  });

  const pts = airportData.map((a) => toSvg(a.info!.lat, a.info!.lng));

  // Build quadratic bezier segments
  const segments: string[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const cx = (p0.x + p1.x) / 2;
    const cy = (p0.y + p1.y) / 2 - 30;
    if (i === 0) segments.push(`M ${p0.x.toFixed(1)} ${p0.y.toFixed(1)}`);
    segments.push(`Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`);
  }

  const dots = airportData.map((a, i) => ({
    ...toSvg(a.info!.lat, a.info!.lng),
    code: a.code,
    isEndpoint: i === 0 || i === airportData.length - 1,
  }));

  return { pathD: segments.join(" "), dots };
}

// ── OG Image ──────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function Image({ params }: PageProps) {
  const { token } = await params;
  const trip = await getTripByShareToken(token);

  const tripName      = trip?.name ?? "TripCopilot";
  const flights       = trip?.flights ?? [];
  const sortedFlights = [...flights].sort((a, b) => a.iso_date.localeCompare(b.iso_date));
  const routeStr      = buildRouteString(sortedFlights);
  const flightCount   = sortedFlights.length;

  // Hero destination city (last flight destination)
  const lastFlight = sortedFlights[sortedFlights.length - 1];
  const heroCity   = lastFlight
    ? (AIRPORTS[lastFlight.destination_code]?.city ?? lastFlight.destination_code)
    : "";

  // Unique destinations for sub-headline
  const destCities = Array.from(new Set(
    sortedFlights.map((f) => AIRPORTS[f.destination_code]?.city ?? f.destination_code)
  )).slice(0, 3);

  // Route SVG data
  const svgData = buildRouteSvgData(sortedFlights);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0a0a12",
          position: "relative",
          overflow: "hidden",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Violet gradient accent — top-right */}
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -120,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(109,40,217,0.40) 0%, transparent 70%)",
          }}
        />

        {/* Blue glow — bottom-left */}
        <div
          style={{
            position: "absolute",
            bottom: -60,
            left: -60,
            width: 350,
            height: 350,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(79,70,229,0.22) 0%, transparent 70%)",
          }}
        />

        {/* Content wrapper */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: "56px 72px",
            justifyContent: "space-between",
          }}
        >
          {/* ── TOP ROW: live badge + wordmark ── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {/* Live badge */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(6,78,59,0.40)",
                border: "1px solid rgba(6,78,59,0.80)",
                borderRadius: 24,
                padding: "6px 14px",
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#34d399" }} />
              <span style={{ fontSize: 15, fontWeight: 700, color: "#34d399", letterSpacing: 1 }}>
                SEGUIMIENTO EN VIVO
              </span>
            </div>

            {/* Wordmark */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontSize: 18, color: "#ffffff" }}>✈</span>
              </div>
              <span style={{ fontSize: 22, fontWeight: 800, color: "#d1d5db", letterSpacing: -0.5 }}>
                TripCopilot
              </span>
            </div>
          </div>

          {/* ── MIDDLE: Trip name + destination ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div
              style={{
                fontSize: flightCount === 0 ? 72 : 62,
                fontWeight: 900,
                color: "#ffffff",
                lineHeight: 1.1,
                letterSpacing: -2,
              }}
            >
              {tripName}
            </div>

            {/* Destination cities */}
            {destCities.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {destCities.map((city, i) => (
                  <div key={city} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {i > 0 && (
                      <span style={{ fontSize: 20, color: "rgba(109,40,217,0.6)" }}>→</span>
                    )}
                    <span
                      style={{
                        fontSize: i === destCities.length - 1 ? 34 : 26,
                        fontWeight: i === destCities.length - 1 ? 700 : 500,
                        color: i === destCities.length - 1
                          ? "rgba(167,139,250,0.90)"
                          : "rgba(167,139,250,0.55)",
                      }}
                    >
                      {city}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Route string */}
            {routeStr && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                <span style={{ fontSize: 20, color: "#6b7280" }}>✈</span>
                <span
                  style={{
                    fontSize: 26,
                    fontWeight: 700,
                    color: "#9ca3af",
                    fontFamily: "monospace",
                    letterSpacing: 2,
                  }}
                >
                  {routeStr}
                </span>
              </div>
            )}
          </div>

          {/* ── ROUTE ARC SVG ── */}
          {svgData && (
            <div style={{ display: "flex", marginBottom: -8 }}>
              <svg
                viewBox="0 0 600 120"
                width="600"
                height="120"
                style={{ opacity: 0.85 }}
              >
                {/* Arc path */}
                <path
                  d={svgData.pathD}
                  fill="none"
                  stroke="rgba(167,139,250,0.35)"
                  strokeWidth="2"
                  strokeDasharray="6 4"
                />
                {/* Dots */}
                {svgData.dots.map((dot) => (
                  <g key={dot.code}>
                    <circle
                      cx={dot.x}
                      cy={dot.y}
                      r={dot.isEndpoint ? 5 : 3.5}
                      fill={dot.isEndpoint ? "#6d28d9" : "rgba(109,40,217,0.5)"}
                    />
                    <text
                      x={dot.x}
                      y={dot.y + 16}
                      textAnchor="middle"
                      fontSize="11"
                      fill="rgba(156,163,175,0.80)"
                      fontFamily="monospace"
                    >
                      {dot.code}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          )}

          {/* ── BOTTOM ROW: stats ── */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 12 }}>
              {/* Flight count badge */}
              {flightCount > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 10,
                    padding: "8px 16px",
                  }}
                >
                  <span style={{ fontSize: 22, color: "#a78bfa" }}>✈</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: "#e5e7eb" }}>
                    {flightCount} {flightCount === 1 ? "vuelo" : "vuelos"}
                  </span>
                </div>
              )}

              {/* Hero city badge */}
              {heroCity && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "rgba(109,40,217,0.15)",
                    border: "1px solid rgba(109,40,217,0.30)",
                    borderRadius: 10,
                    padding: "8px 16px",
                  }}
                >
                  <span style={{ fontSize: 18, color: "#c4b5fd" }}>📍</span>
                  <span style={{ fontSize: 18, fontWeight: 600, color: "#c4b5fd" }}>
                    {heroCity}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
