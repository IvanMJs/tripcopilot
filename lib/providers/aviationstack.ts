import type { FlightData, FlightDataResult } from "../flightDataProvider";

const AVIATIONSTACK_BASE = "http://api.aviationstack.com/v1";

// Shape of a single flight object returned by AviationStack /flights
interface AviationStackFlight {
  flight_status?: string;
  flight?: { iata?: string };
  departure?: {
    iata?: string;
    terminal?: string;
    gate?: string;
    delay?: number;
    scheduled?: string;
    estimated?: string;
    actual?: string;
  };
  arrival?: {
    iata?: string;
    terminal?: string;
    gate?: string;
    delay?: number;
    estimated?: string;
    actual?: string;
  };
  aircraft?: { iata?: string };
}

interface AviationStackResponse {
  data?: AviationStackFlight[];
  error?: { message?: string };
}

function normalizeStatus(raw: string | undefined): FlightData["status"] {
  switch (raw) {
    case "scheduled":
      return "scheduled";
    case "active":
      return "active";
    case "landed":
      return "landed";
    case "cancelled":
      return "cancelled";
    case "diverted":
      return "diverted";
    default:
      return "unknown";
  }
}

export async function fetchFromAviationStack(
  flightCode: string,
  isoDate: string,
): Promise<FlightDataResult> {
  const apiKey = process.env.AVIATIONSTACK_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: "AVIATIONSTACK_API_KEY not configured",
      provider: "aviationstack",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const params = new URLSearchParams({
      access_key: apiKey,
      flight_iata: flightCode,
      limit: "1",
    });
    if (isoDate) params.set("flight_date", isoDate);

    const res = await fetch(`${AVIATIONSTACK_BASE}/flights?${params}`, {
      headers: { "User-Agent": "AirportMonitor/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return {
        success: false,
        error: `AviationStack returned HTTP ${res.status}`,
        provider: "aviationstack",
      };
    }

    const json: AviationStackResponse = await res.json();

    if (json.error) {
      return {
        success: false,
        error: json.error.message ?? "AviationStack API error",
        provider: "aviationstack",
      };
    }

    const raw = json.data?.[0];
    if (!raw) {
      return {
        success: false,
        error: "No flight data found",
        provider: "aviationstack",
      };
    }

    const data: FlightData = {
      flightCode: raw.flight?.iata ?? flightCode,
      status: normalizeStatus(raw.flight_status),
      departure: {
        iataCode: raw.departure?.iata ?? "",
        scheduledTime: raw.departure?.scheduled ?? undefined,
        estimatedTime: raw.departure?.estimated ?? undefined,
        actualTime: raw.departure?.actual ?? undefined,
        gate: raw.departure?.gate ?? undefined,
        terminal: raw.departure?.terminal ?? undefined,
        delay:
          typeof raw.departure?.delay === "number"
            ? raw.departure.delay
            : undefined,
      },
      arrival: {
        iataCode: raw.arrival?.iata ?? "",
        estimatedTime: raw.arrival?.estimated ?? undefined,
        actualTime: raw.arrival?.actual ?? undefined,
        gate: raw.arrival?.gate ?? undefined,
        terminal: raw.arrival?.terminal ?? undefined,
        delay:
          typeof raw.arrival?.delay === "number"
            ? raw.arrival.delay
            : undefined,
      },
      aircraft: raw.aircraft?.iata ?? undefined,
      provider: "aviationstack",
    };

    return { success: true, data };
  } catch (err) {
    clearTimeout(timeout);
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      provider: "aviationstack",
    };
  }
}
