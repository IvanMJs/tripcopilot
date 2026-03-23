import { describe, it, expect, vi } from "vitest";

// vi.mock calls are hoisted by Vitest before imports, so these run first.
// This allows the "use client" helpers.tsx to load without its React hook dependencies.
vi.mock("@/hooks/useExchangeRate", () => ({
  useExchangeRate: vi.fn(() => null),
}));

vi.mock("@/components/TripPanelLabels", () => ({
  TripPanelLabels: {},
}));

import { getTzAbbr } from "@/components/flight-card/helpers";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("getTzAbbr", () => {
  it("returns UTC-5 for America/New_York in winter (no DST)", () => {
    // January 15 — standard time (EST = UTC-5)
    const result = getTzAbbr("America/New_York", "2026-01-15");
    expect(result).toBe("UTC-5");
  });

  it("returns UTC-4 for America/New_York in summer (DST active)", () => {
    // July 15 — daylight saving time (EDT = UTC-4)
    const result = getTzAbbr("America/New_York", "2026-07-15");
    expect(result).toBe("UTC-4");
  });

  it("returns UTC for UTC timezone", () => {
    const result = getTzAbbr("UTC", "2026-06-15");
    expect(result).toBe("UTC");
  });

  it("returns UTC+5:30 for Asia/Kolkata (offset with non-zero minutes)", () => {
    const result = getTzAbbr("Asia/Kolkata", "2026-06-15");
    expect(result).toBe("UTC+5:30");
  });

  it("returns UTC-3 for America/Argentina/Buenos_Aires", () => {
    const result = getTzAbbr("America/Argentina/Buenos_Aires", "2026-06-15");
    expect(result).toBe("UTC-3");
  });

  it("returns empty string for an invalid timezone", () => {
    const result = getTzAbbr("Invalid/Timezone_XYZ", "2026-06-15");
    expect(result).toBe("");
  });

  it("returns UTC+1 for Europe/London in summer (BST)", () => {
    const result = getTzAbbr("Europe/London", "2026-07-15");
    expect(result).toBe("UTC+1");
  });

  it("returns UTC for Europe/London in winter (GMT)", () => {
    const result = getTzAbbr("Europe/London", "2026-01-15");
    expect(result).toBe("UTC");
  });
});
