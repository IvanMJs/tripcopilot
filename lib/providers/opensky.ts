import type { FlightData, FlightDataResult } from "../flightDataProvider";

const OPENSKY_BASE = "https://opensky-network.org/api";

// OpenSky /flights/all returns an array of state vectors
interface OpenSkyFlight {
  callsign?: string | null;
  estDepartureAirport?: string | null;
  estArrivalAirport?: string | null;
  firstSeen?: number | null;
  lastSeen?: number | null;
}

function toIsoTime(epochSeconds: number | null | undefined): string | undefined {
  if (epochSeconds == null) return undefined;
  return new Date(epochSeconds * 1000).toISOString();
}

// Normalize callsign: "AA 900 " → "AA900"
function normalizeCallsign(callsign: string | null | undefined): string {
  return (callsign ?? "").replace(/\s+/g, "").toUpperCase();
}

export async function fetchFromOpenSky(
  flightCode: string,
  isoDate: string,
): Promise<FlightDataResult> {
  // Parse isoDate ("YYYY-MM-DD") into UTC epoch range for the full day
  const dayStart = new Date(`${isoDate}T00:00:00Z`);
  if (isNaN(dayStart.getTime())) {
    return {
      success: false,
      error: `Invalid isoDate: ${isoDate}`,
      provider: "opensky",
    };
  }
  const epochStart = Math.floor(dayStart.getTime() / 1000);
  const epochEnd = epochStart + 86400; // +24 hours

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const params = new URLSearchParams({
      begin: String(epochStart),
      end: String(epochEnd),
    });

    const res = await fetch(`${OPENSKY_BASE}/flights/all?${params}`, {
      headers: { "User-Agent": "AirportMonitor/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return {
        success: false,
        error: `OpenSky returned HTTP ${res.status}`,
        provider: "opensky",
      };
    }

    const json: OpenSkyFlight[] | null = await res.json();

    if (!Array.isArray(json)) {
      return {
        success: false,
        error: "OpenSky returned unexpected response shape",
        provider: "opensky",
      };
    }

    const targetCode = normalizeCallsign(flightCode);
    const match = json.find(
      (f) => normalizeCallsign(f.callsign) === targetCode,
    );

    if (!match) {
      return {
        success: false,
        error: `Flight ${flightCode} not found in OpenSky data`,
        provider: "opensky",
      };
    }

    // Determine status: if lastSeen is close to end of day, flight is likely landed
    const now = Math.floor(Date.now() / 1000);
    const lastSeen = match.lastSeen ?? 0;
    const flightStatus: FlightData["status"] =
      lastSeen > 0 && lastSeen < now - 1800 ? "landed" : "active";

    const data: FlightData = {
      flightCode: targetCode,
      status: flightStatus,
      departure: {
        iataCode: (match.estDepartureAirport ?? "").toUpperCase(),
        scheduledTime: toIsoTime(match.firstSeen),
        actualTime: toIsoTime(match.firstSeen),
        // OpenSky does not provide gate/terminal/delay
      },
      arrival: {
        iataCode: (match.estArrivalAirport ?? "").toUpperCase(),
        estimatedTime: toIsoTime(match.lastSeen),
        actualTime: lastSeen > 0 && lastSeen < now - 1800
          ? toIsoTime(match.lastSeen)
          : undefined,
        // OpenSky does not provide gate/terminal/delay
      },
      provider: "opensky",
    };

    return { success: true, data };
  } catch (err) {
    clearTimeout(timeout);
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      provider: "opensky",
    };
  }
}
