import { describe, it, expect } from "vitest";
import { formatTzOffset, cityFromTimezone, convertFlightTime } from "@/lib/airportTimezone";

// ── cityFromTimezone ──────────────────────────────────────────────────────────

describe("cityFromTimezone", () => {
  it("extracts city from a two-part timezone", () => {
    expect(cityFromTimezone("Europe/London")).toBe("London");
  });

  it("extracts city from a three-part timezone (region/country/city)", () => {
    expect(cityFromTimezone("America/Argentina/Buenos_Aires")).toBe("Buenos Aires");
  });

  it("replaces underscores with spaces", () => {
    expect(cityFromTimezone("America/New_York")).toBe("New York");
  });

  it("handles single-component string (no slash)", () => {
    expect(cityFromTimezone("UTC")).toBe("UTC");
  });

  it("handles Asia/Kolkata", () => {
    expect(cityFromTimezone("Asia/Kolkata")).toBe("Kolkata");
  });
});

// ── formatTzOffset ────────────────────────────────────────────────────────────

describe("formatTzOffset", () => {
  it("returns UTC for the UTC timezone", () => {
    const result = formatTzOffset("UTC", new Date("2026-06-15T12:00:00Z"));
    expect(result).toBe("UTC");
  });

  it("returns UTC-5 for America/New_York in winter (EST)", () => {
    const date = new Date("2026-01-15T12:00:00Z");
    const result = formatTzOffset("America/New_York", date);
    expect(result).toBe("UTC-5");
  });

  it("returns UTC-4 for America/New_York in summer (EDT)", () => {
    const date = new Date("2026-07-15T12:00:00Z");
    const result = formatTzOffset("America/New_York", date);
    expect(result).toBe("UTC-4");
  });

  it("returns UTC+5:30 for Asia/Kolkata (sub-hour offset)", () => {
    const date = new Date("2026-06-15T12:00:00Z");
    const result = formatTzOffset("Asia/Kolkata", date);
    expect(result).toBe("UTC+5:30");
  });

  it("returns UTC-3 for America/Argentina/Buenos_Aires", () => {
    const date = new Date("2026-06-15T12:00:00Z");
    const result = formatTzOffset("America/Argentina/Buenos_Aires", date);
    expect(result).toBe("UTC-3");
  });

  it("returns UTC+2 for Europe/Paris in summer (CEST)", () => {
    const date = new Date("2026-07-15T12:00:00Z");
    const result = formatTzOffset("Europe/Paris", date);
    expect(result).toBe("UTC+2");
  });

  it("returns empty string for an invalid timezone", () => {
    const result = formatTzOffset("Not/A_Real_Timezone", new Date());
    expect(result).toBe("");
  });

  it("returns UTC-7 for America/Phoenix (no DST, summer)", () => {
    const date = new Date("2026-07-15T12:00:00Z");
    const result = formatTzOffset("America/Phoenix", date);
    expect(result).toBe("UTC-7");
  });
});

// ── convertFlightTime ─────────────────────────────────────────────────────────

describe("convertFlightTime", () => {
  it("returns the same time when fromTz equals toTz", () => {
    const result = convertFlightTime("20:30", "2026-06-15", "America/New_York", "America/New_York");
    expect(result).toBe("20:30");
  });

  it("converts UTC 12:00 to New York winter time (UTC-5 = 07:00)", () => {
    // 12:00 UTC → 07:00 EST (UTC-5, January)
    const result = convertFlightTime("12:00", "2026-01-15", "UTC", "America/New_York");
    expect(result).toBe("07:00");
  });

  it("converts UTC 12:00 to New York summer time (UTC-4 = 08:00)", () => {
    // 12:00 UTC → 08:00 EDT (UTC-4, July)
    const result = convertFlightTime("12:00", "2026-07-15", "UTC", "America/New_York");
    expect(result).toBe("08:00");
  });

  it("converts UTC 00:00 to Asia/Kolkata (UTC+5:30 = 05:30)", () => {
    const result = convertFlightTime("00:00", "2026-06-15", "UTC", "Asia/Kolkata");
    expect(result).toBe("05:30");
  });

  it("returns original string for invalid time format (non-numeric)", () => {
    const result = convertFlightTime("invalid", "2026-06-15", "UTC", "America/New_York");
    expect(result).toBe("invalid");
  });

  it("produces a padded two-digit output for early morning hours", () => {
    // UTC 02:00 → New York winter (UTC-5) = 21:00 previous day, but same-day math gives result
    // UTC 06:00 → New York winter = 01:00 → should be padded "01:00"
    const result = convertFlightTime("06:00", "2026-01-15", "UTC", "America/New_York");
    expect(result).toMatch(/^\d{2}:\d{2}$/);
    expect(result).toBe("01:00");
  });

  it("returns identical string when fromTz and toTz are the exact same string", () => {
    // The early-exit guard `if (fromTz === toTz) return timeStr` fires on identical strings
    const result = convertFlightTime("14:00", "2026-06-15", "America/Sao_Paulo", "America/Sao_Paulo");
    expect(result).toBe("14:00");
  });
});
