import { describe, it, expect } from "vitest";
import { analyzeConnection } from "@/lib/connectionRisk";
import type { TripFlight, AirportStatusMap } from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeFlight(overrides: Partial<TripFlight> & Pick<TripFlight, "originCode" | "destinationCode">): TripFlight {
  return {
    id: "f1",
    flightCode: "AA100",
    airlineCode: "AA",
    airlineName: "American Airlines",
    airlineIcao: "AAL",
    flightNumber: "100",
    isoDate: "2026-06-15",
    departureTime: "10:00",
    arrivalBuffer: 2,
    ...overrides,
  };
}

const emptyStatusMap: AirportStatusMap = {};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("analyzeConnection", () => {
  it("returns null when flights do not connect (destination != next origin)", () => {
    const flightA = makeFlight({ id: "a", originCode: "ATL", destinationCode: "DFW" });
    const flightB = makeFlight({ id: "b", originCode: "ORD", destinationCode: "LAX" });

    const result = analyzeConnection(flightA, flightB, emptyStatusMap);

    expect(result).toBeNull();
  });

  it("returns null when flightA has an empty departureTime", () => {
    const flightA = makeFlight({ id: "a", originCode: "ATL", destinationCode: "ORD", departureTime: "" });
    const flightB = makeFlight({ id: "b", originCode: "ORD", destinationCode: "LAX", departureTime: "18:00" });

    const result = analyzeConnection(flightA, flightB, emptyStatusMap);

    expect(result).toBeNull();
  });

  it("returns null when flightB has an empty departureTime", () => {
    const flightA = makeFlight({ id: "a", originCode: "ATL", destinationCode: "ORD", departureTime: "08:00" });
    const flightB = makeFlight({ id: "b", originCode: "ORD", destinationCode: "LAX", departureTime: "" });

    const result = analyzeConnection(flightA, flightB, emptyStatusMap);

    expect(result).toBeNull();
  });

  it("identifies a safe connection when buffer is well above MCT * 1.6", () => {
    // ATL departs 08:00, ORD departs 15:00 → buffer=285min >> ORD domestic MCT*1.6=96 → safe
    const flightA = makeFlight({ id: "a", originCode: "ATL", destinationCode: "ORD", departureTime: "08:00", isoDate: "2026-06-15" });
    const flightB = makeFlight({ id: "b", originCode: "ORD", destinationCode: "LAX", departureTime: "15:00", isoDate: "2026-06-15" });

    const result = analyzeConnection(flightA, flightB, emptyStatusMap);

    expect(result).not.toBeNull();
    expect(result!.risk).toBe("safe");
    expect(result!.connectionAirport).toBe("ORD");
    expect(result!.delayAddedMinutes).toBe(0);
  });

  it("identifies a tight connection when buffer is between MCT and MCT * 1.6", () => {
    // ATL departs 08:00, ORD departs 11:00 → buffer=75min, ORD domestic MCT=60, 60 < 75 < 96 → tight
    const flightA = makeFlight({ id: "a", originCode: "ATL", destinationCode: "ORD", departureTime: "08:00", isoDate: "2026-06-15" });
    const flightB = makeFlight({ id: "b", originCode: "ORD", destinationCode: "LAX", departureTime: "11:00", isoDate: "2026-06-15" });

    const result = analyzeConnection(flightA, flightB, emptyStatusMap);

    expect(result).not.toBeNull();
    expect(result!.risk).toBe("tight");
    expect(result!.mctMinutes).toBe(60);
  });

  it("identifies at_risk connection when effective buffer is below MCT but non-negative", () => {
    // ATL departs 08:00, ORD departs 10:30 → buffer=45min, ORD domestic MCT=60, 0 <= 45 < 60 → at_risk
    const flightA = makeFlight({ id: "a", originCode: "ATL", destinationCode: "ORD", departureTime: "08:00", isoDate: "2026-06-15" });
    const flightB = makeFlight({ id: "b", originCode: "ORD", destinationCode: "LAX", departureTime: "10:30", isoDate: "2026-06-15" });

    const result = analyzeConnection(flightA, flightB, emptyStatusMap);

    expect(result).not.toBeNull();
    expect(result!.risk).toBe("at_risk");
    expect(result!.effectiveBufferMinutes).toBeLessThan(result!.mctMinutes);
    expect(result!.effectiveBufferMinutes).toBeGreaterThanOrEqual(0);
  });

  it("identifies missed connection when effective buffer is negative", () => {
    // ATL departs 08:00 (local ET), ORD departs 09:00 (local CT)
    // UTC math: ATL 08:00 ET (UTC-4) = 12:00 UTC, dur=165 → arrival 14:45 UTC
    // ORD 09:00 CT (UTC-5) = 14:00 UTC → buffer = 14:00 - 14:45 = -45min → missed
    const flightA = makeFlight({ id: "a", originCode: "ATL", destinationCode: "ORD", departureTime: "08:00", isoDate: "2026-06-15" });
    const flightB = makeFlight({ id: "b", originCode: "ORD", destinationCode: "LAX", departureTime: "09:00", isoDate: "2026-06-15" });

    const result = analyzeConnection(flightA, flightB, emptyStatusMap);

    expect(result).not.toBeNull();
    expect(result!.risk).toBe("missed");
    expect(result!.effectiveBufferMinutes).toBeLessThan(0);
  });

  it("applies ground stop delay (90 min) and worsens risk", () => {
    // ATL departs 08:00, ORD departs 11:00 → buffer=75min, with +90min ground stop → effective=-15 → missed
    const flightA = makeFlight({ id: "a", originCode: "ATL", destinationCode: "ORD", departureTime: "08:00", isoDate: "2026-06-15" });
    const flightB = makeFlight({ id: "b", originCode: "ORD", destinationCode: "LAX", departureTime: "11:00", isoDate: "2026-06-15" });

    const statusMap: AirportStatusMap = {
      ORD: {
        iata: "ORD",
        name: "O'Hare International",
        city: "Chicago",
        state: "IL",
        status: "ground_stop",
        groundStop: { reason: "Weather" },
        lastChecked: new Date(),
      },
    };

    const result = analyzeConnection(flightA, flightB, statusMap);

    expect(result).not.toBeNull();
    expect(result!.delayAddedMinutes).toBe(90);
    expect(result!.effectiveBufferMinutes).toBe(result!.scheduledBufferMinutes - 90);
    expect(result!.risk).toBe("missed");
  });

  it("applies ground delay program minutes from status", () => {
    const flightA = makeFlight({ id: "a", originCode: "ATL", destinationCode: "ORD", departureTime: "08:00", isoDate: "2026-06-15" });
    const flightB = makeFlight({ id: "b", originCode: "ORD", destinationCode: "LAX", departureTime: "15:00", isoDate: "2026-06-15" });

    const statusMap: AirportStatusMap = {
      ORD: {
        iata: "ORD",
        name: "O'Hare International",
        city: "Chicago",
        state: "IL",
        status: "ground_delay",
        groundDelay: { reason: "Volume", avgMinutes: 45, maxTime: "16:00" },
        lastChecked: new Date(),
      },
    };

    const result = analyzeConnection(flightA, flightB, statusMap);

    expect(result).not.toBeNull();
    expect(result!.delayAddedMinutes).toBe(45);
    expect(result!.effectiveBufferMinutes).toBe(result!.scheduledBufferMinutes - 45);
  });

  it("uses domestic MCT for two US airports connecting through a US hub", () => {
    // ATL (US) -> ORD (US) -> LAX (US): all domestic → ORD domestic MCT = 60
    const flightA = makeFlight({ id: "a", originCode: "ATL", destinationCode: "ORD", departureTime: "08:00", isoDate: "2026-06-15" });
    const flightB = makeFlight({ id: "b", originCode: "ORD", destinationCode: "LAX", departureTime: "15:00", isoDate: "2026-06-15" });

    const result = analyzeConnection(flightA, flightB, emptyStatusMap);

    expect(result).not.toBeNull();
    expect(result!.mctMinutes).toBe(60);
  });

  it("uses international MCT when origin is a non-US airport", () => {
    // EZE (Argentina, not in US_AIRPORTS) -> ORD -> LAX: international → ORD international MCT = 90
    const flightA = makeFlight({ id: "a", originCode: "EZE", destinationCode: "ORD", departureTime: "08:00", isoDate: "2026-06-15" });
    const flightB = makeFlight({ id: "b", originCode: "ORD", destinationCode: "LAX", departureTime: "15:00", isoDate: "2026-06-15" });

    const result = analyzeConnection(flightA, flightB, emptyStatusMap);

    expect(result).not.toBeNull();
    expect(result!.mctMinutes).toBe(90);
  });

  it("uses default international MCT for airports not in the MCT table", () => {
    // SJU is not in the MCT table and is not in US_AIRPORTS (only FAA-covered set) → international default = 90
    const flightA = makeFlight({ id: "a", originCode: "ATL", destinationCode: "SJU", departureTime: "08:00", isoDate: "2026-06-15" });
    const flightB = makeFlight({ id: "b", originCode: "SJU", destinationCode: "MIA", departureTime: "15:00", isoDate: "2026-06-15" });

    const result = analyzeConnection(flightA, flightB, emptyStatusMap);

    expect(result).not.toBeNull();
    expect(result!.mctMinutes).toBe(90);
  });

  it("returns correct connectionAirport value", () => {
    const flightA = makeFlight({ id: "a", originCode: "ATL", destinationCode: "MIA", departureTime: "08:00" });
    const flightB = makeFlight({ id: "b", originCode: "MIA", destinationCode: "GRU", departureTime: "15:00" });

    const result = analyzeConnection(flightA, flightB, emptyStatusMap);

    expect(result).not.toBeNull();
    expect(result!.connectionAirport).toBe("MIA");
  });

  it("returns scheduledBufferMinutes = effectiveBufferMinutes when there are no delays", () => {
    const flightA = makeFlight({ id: "a", originCode: "ATL", destinationCode: "ORD", departureTime: "08:00" });
    const flightB = makeFlight({ id: "b", originCode: "ORD", destinationCode: "LAX", departureTime: "15:00" });

    const result = analyzeConnection(flightA, flightB, emptyStatusMap);

    expect(result).not.toBeNull();
    expect(result!.effectiveBufferMinutes).toBe(result!.scheduledBufferMinutes);
  });
});
