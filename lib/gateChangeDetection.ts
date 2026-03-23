import { TripFlight } from "./types";

export interface StoredGateInfo {
  flightNumber: string;
  isoDate: string;
  gate: string;
  checkedAt: string; // ISO timestamp
}

export interface GateChangeEvent {
  flightNumber: string;
  isoDate: string;
  oldGate: string;
  newGate: string;
}

type AeroDataBoxFlightLeg = {
  departure?: {
    gate?: string | null;
  };
};

/**
 * Fetches the current departure gate for a flight from AeroDataBox.
 * Returns null if the gate cannot be determined or the request fails.
 */
async function fetchLiveGate(
  flightCode: string,
  isoDate: string,
  rapidApiKey: string,
): Promise<string | null> {
  try {
    const url = `https://aerodatabox.p.rapidapi.com/flights/number/${flightCode}/${isoDate}`;
    const res = await fetch(url, {
      headers: {
        "X-RapidAPI-Key": rapidApiKey,
        "X-RapidAPI-Host": "aerodatabox.p.rapidapi.com",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as AeroDataBoxFlightLeg[];
    if (!Array.isArray(data) || data.length === 0) return null;

    return data[0].departure?.gate ?? null;
  } catch {
    return null;
  }
}

/**
 * Compares stored gates (from Supabase or localStorage) against live gates
 * fetched from AeroDataBox for each flight in the provided list.
 *
 * For each flight:
 * - If no gate is stored yet and a live gate exists, `updateStoredGate` is
 *   called to persist it — no change event is emitted.
 * - If a stored gate exists and the live gate differs, a `GateChangeEvent` is
 *   emitted and `updateStoredGate` is called with the new value.
 * - If both gates match or no live gate is available, nothing happens.
 *
 * @param flights          Flights to check.
 * @param getStoredGate    Returns the stored gate info for a flight, or null.
 * @param updateStoredGate Persists updated gate info (called on first-set and
 *                         on change).
 * @param rapidApiKey      AeroDataBox RapidAPI key for live gate lookups.
 * @returns Array of gate change events detected during this run.
 */
export async function detectGateChanges(
  flights: TripFlight[],
  getStoredGate: (flightNumber: string, isoDate: string) => StoredGateInfo | null,
  updateStoredGate: (info: StoredGateInfo) => void,
  rapidApiKey: string,
): Promise<GateChangeEvent[]> {
  const changes: GateChangeEvent[] = [];

  await Promise.allSettled(
    flights.map(async (flight) => {
      const liveGate = await fetchLiveGate(flight.flightCode, flight.isoDate, rapidApiKey);
      if (!liveGate) return;

      const stored = getStoredGate(flight.flightCode, flight.isoDate);
      const checkedAt = new Date().toISOString();

      if (!stored) {
        // First time we see a gate for this flight — persist it, no notification
        updateStoredGate({
          flightNumber: flight.flightCode,
          isoDate: flight.isoDate,
          gate: liveGate,
          checkedAt,
        });
        return;
      }

      if (stored.gate === liveGate) return;

      // Gate changed — record the event and update storage
      changes.push({
        flightNumber: flight.flightCode,
        isoDate: flight.isoDate,
        oldGate: stored.gate,
        newGate: liveGate,
      });

      updateStoredGate({
        flightNumber: flight.flightCode,
        isoDate: flight.isoDate,
        gate: liveGate,
        checkedAt,
      });
    }),
  );

  return changes;
}
