import { describe, it, expect } from "vitest";
import { parseFlightCode, subtractHours, buildArrivalNote } from "@/lib/flightUtils";

// ── parseFlightCode ────────────────────────────────────────────────────────────

describe("parseFlightCode", () => {
  it("parses a standard IATA 2-letter code (AA900)", () => {
    const result = parseFlightCode("AA900");

    expect(result).not.toBeNull();
    expect(result!.airlineCode).toBe("AA");
    expect(result!.airlineName).toBe("American Airlines");
    expect(result!.airlineIcao).toBe("AAL");
    expect(result!.flightNumber).toBe("900");
    expect(result!.fullCode).toBe("AA 900");
  });

  it("parses a code with leading/trailing spaces and lowercase ('  b6766  ')", () => {
    const result = parseFlightCode("  b6766  ");

    expect(result).not.toBeNull();
    expect(result!.airlineCode).toBe("B6");
    expect(result!.airlineName).toBe("JetBlue Airways");
    expect(result!.flightNumber).toBe("766");
  });

  it("parses an ICAO 3-letter code (AAL900)", () => {
    const result = parseFlightCode("AAL900");

    expect(result).not.toBeNull();
    expect(result!.airlineCode).toBe("AAL");
    expect(result!.airlineName).toBe("American Airlines");
  });

  it("returns null for an unknown airline code (ZZ999)", () => {
    const result = parseFlightCode("ZZ999");

    expect(result).toBeNull();
  });

  it("returns null for a code with no digits (ABCDE)", () => {
    const result = parseFlightCode("ABCDE");

    expect(result).toBeNull();
  });

  it("builds the correct FlightAware URL", () => {
    const result = parseFlightCode("UA500");

    expect(result).not.toBeNull();
    expect(result!.flightAwareUrl).toBe("https://www.flightaware.com/live/flight/UAL500");
  });

  it("parses a numeric-prefixed IATA code (9E5068)", () => {
    const result = parseFlightCode("9E5068");

    expect(result).not.toBeNull();
    expect(result!.airlineCode).toBe("9E");
    expect(result!.airlineName).toBe("Endeavor Air");
  });
});

// ── subtractHours ──────────────────────────────────────────────────────────────

describe("subtractHours", () => {
  it("subtracts whole hours correctly (20:30 - 3h = 17:30)", () => {
    expect(subtractHours("20:30", 3)).toBe("17:30");
  });

  it("subtracts fractional hours correctly (12:55 - 1.5h = 11:25)", () => {
    expect(subtractHours("12:55", 1.5)).toBe("11:25");
  });

  it("wraps around midnight correctly (01:00 - 2h = 23:00)", () => {
    expect(subtractHours("01:00", 2)).toBe("23:00");
  });

  it("handles exactly midnight (00:00 - 1h = 23:00)", () => {
    expect(subtractHours("00:00", 1)).toBe("23:00");
  });
});

// ── buildArrivalNote ───────────────────────────────────────────────────────────

describe("buildArrivalNote", () => {
  it("returns Spanish format for locale 'es'", () => {
    expect(buildArrivalNote(2, "es")).toBe("2 hs antes");
  });

  it("returns English format for locale 'en'", () => {
    expect(buildArrivalNote(3, "en")).toBe("3 hrs before");
  });

  it("handles fractional buffer values", () => {
    expect(buildArrivalNote(1.5, "es")).toBe("1.5 hs antes");
    expect(buildArrivalNote(1.5, "en")).toBe("1.5 hrs before");
  });
});
