/**
 * FlightAware AeroAPI v4 client.
 *
 * Docs: https://www.flightaware.com/commercial/aeroapi/documentation
 * Auth: x-apikey header
 */

const BASE_URL = "https://aeroapi.flightaware.com/aeroapi";

function getApiKey(): string | undefined {
  return process.env.FLIGHTAWARE_API_KEY;
}

// ── Response types ──────────────────────────────────────────────────────────

interface FAFlight {
  ident: string;
  ident_iata?: string;
  ident_icao?: string;
  fa_flight_id?: string;
  operator?: string;
  operator_iata?: string;
  flight_number?: string;
  status?: string;
  cancelled: boolean;
  diverted: boolean;
  origin: { code: string; code_iata?: string; name?: string };
  destination: { code: string; code_iata?: string; name?: string };
  // scheduled times (ISO 8601 UTC)
  scheduled_out?: string;
  estimated_out?: string;
  actual_out?: string;
  // gate push times
  scheduled_off?: string;
  estimated_off?: string;
  actual_off?: string;
  // arrival
  scheduled_in?: string;
  estimated_in?: string;
  actual_in?: string;
  // delays (seconds)
  departure_delay?: number;
  arrival_delay?: number;
  // gate / terminal
  gate_origin?: string;
  gate_destination?: string;
  terminal_origin?: string;
  terminal_destination?: string;
  // aircraft
  aircraft_type?: string;
  registration?: string;
}

interface FAFlightsResponse {
  flights: FAFlight[];
  num_pages?: number;
}

// ── Public result type ──────────────────────────────────────────────────────

export interface FlightAwareResult {
  delayMinutes: number;
  estimatedDeparture: string | null; // HH:MM in origin local time (approx, from UTC)
  gate: string | null;
  terminal: string | null;
  cancelled: boolean;
  diverted: boolean;
  landed: boolean;
  faFlightId: string | null;
  rawStatus: string | null;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Extract HH:MM from an ISO UTC string (good enough for status display) */
function isoToHHMM(iso: string | undefined | null): string | null {
  if (!iso) return null;
  return iso.slice(11, 16);
}

/** Convert delay from seconds to minutes, clamped to 0 */
function secToMin(sec: number | undefined | null): number {
  if (!sec || sec <= 0) return 0;
  return Math.round(sec / 60);
}

// ── Core fetch ──────────────────────────────────────────────────────────────

/**
 * Fetch real-time status for a specific flight on a given date.
 *
 * @param flightCode  IATA flight code, e.g. "DL1514"
 * @param isoDate     Date string "YYYY-MM-DD"
 */
export async function fetchFlightStatusFromFlightAware(
  flightCode: string,
  isoDate: string,
): Promise<FlightAwareResult | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    // Query a 24-hour window for the given date
    const start = `${isoDate}T00:00:00Z`;
    const end   = `${isoDate}T23:59:59Z`;
    const url   = `${BASE_URL}/flights/${encodeURIComponent(flightCode)}?start=${start}&end=${end}&max_pages=1`;

    const res = await fetch(url, {
      headers: {
        "x-apikey": apiKey,
        "Accept": "application/json; charset=UTF-8",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (res.status === 429) {
      console.warn("[FlightAware] Rate limit exceeded");
      return null;
    }
    if (!res.ok) {
      console.warn(`[FlightAware] HTTP ${res.status} for ${flightCode}`);
      return null;
    }

    const data = (await res.json()) as FAFlightsResponse;
    if (!data.flights?.length) return null;

    // Pick the flight closest to scheduled departure on that date
    const flight = data.flights[0];

    const delayMinutes = secToMin(flight.departure_delay);

    // Best estimated departure: actual_out → estimated_out → scheduled_out
    const bestDeparture = flight.actual_out ?? flight.estimated_out ?? flight.scheduled_out;
    const estimatedDeparture = isoToHHMM(bestDeparture);

    const rawStatus = flight.status ?? null;
    const landed = rawStatus
      ? /arrived|landed|completed/i.test(rawStatus)
      : false;

    return {
      delayMinutes,
      estimatedDeparture,
      gate: flight.gate_origin ?? null,
      terminal: flight.terminal_origin ?? null,
      cancelled: flight.cancelled,
      diverted: flight.diverted,
      landed,
      faFlightId: flight.fa_flight_id ?? null,
      rawStatus,
    };
  } catch (e) {
    console.error(`[FlightAware] fetch error for ${flightCode}:`, e);
    return null;
  }
}

// ── Alert (webhook) registration ────────────────────────────────────────────

export interface FAAlertCreated {
  alert_id: number;
}

/**
 * Register a FlightAware push alert for a specific flight.
 * FlightAware will POST to `callbackUrl` when the flight status changes.
 *
 * @param flightCode   IATA code, e.g. "DL1514"
 * @param isoDate      "YYYY-MM-DD"
 * @param callbackUrl  Public HTTPS URL of our webhook endpoint
 */
export async function registerFlightAlert(
  flightCode: string,
  isoDate: string,
  callbackUrl: string,
): Promise<FAAlertCreated | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    // Use a 36-hour window centered on the flight date to handle all timezones
    // (UTC-12 to UTC+14). A strict 00:00–23:59 UTC window misses late-night
    // local departures that cross midnight in UTC.
    const prevDay = new Date(isoDate + "T12:00:00Z");
    prevDay.setUTCDate(prevDay.getUTCDate() - 1);
    const nextDay = new Date(isoDate + "T12:00:00Z");
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    const start_time = prevDay.toISOString().slice(0, 10) + "T12:00:00Z";
    const end_time   = nextDay.toISOString().slice(0, 10) + "T12:00:00Z";

    const res = await fetch(`${BASE_URL}/alerts`, {
      method: "POST",
      headers: {
        "x-apikey": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ident: flightCode,
        start_time,
        end_time,
        channels: "callback",
        callback_url: callbackUrl,
        events: {
          filed: true,
          departure: true,
          arrival: true,
          diverted: true,
          cancelled: true,
          position: false,
        },
        alert_on_first_occurrence_only: false,
        max_occurrences: 99,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn(`[FlightAware] alert register failed ${res.status}: ${text}`);
      return null;
    }

    const data = (await res.json()) as FAAlertCreated;
    return data;
  } catch (e) {
    console.error("[FlightAware] registerFlightAlert error:", e);
    return null;
  }
}

/**
 * Cancel a previously registered flight alert.
 */
export async function cancelFlightAlert(alertId: number): Promise<boolean> {
  const apiKey = getApiKey();
  if (!apiKey) return false;

  try {
    const res = await fetch(`${BASE_URL}/alerts/${alertId}`, {
      method: "DELETE",
      headers: { "x-apikey": apiKey },
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
