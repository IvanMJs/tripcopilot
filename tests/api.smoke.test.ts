import { describe, it, expect } from "vitest";
import { parseXML, generateWhatsAppSummary } from "@/lib/faa";
import { localToUTC, localHourInTimezone, CRON_LABELS } from "@/lib/cronUtils";

// ── lib/faa.ts — parseXML ─────────────────────────────────────────────────────

describe("parseXML", () => {
  it("returns empty map for empty XML string", () => {
    const result = parseXML("");
    expect(result).toEqual({});
  });

  it("returns empty map when XML has no AIRPORT_STATUS_INFORMATION node", () => {
    const result = parseXML("<root><nothing/></root>");
    expect(result).toEqual({});
  });

  it("parses a ground delay correctly", () => {
    const xml = `
      <AIRPORT_STATUS_INFORMATION>
        <Delay_type>
          <Name>Ground Delay Program</Name>
          <Ground_Delay_List>
            <Ground_Delay>
              <ARPT>JFK</ARPT>
              <Reason>Weather</Reason>
              <Avg>1 hour and 20 minutes</Avg>
              <Max>4 hours</Max>
            </Ground_Delay>
          </Ground_Delay_List>
        </Delay_type>
      </AIRPORT_STATUS_INFORMATION>
    `;

    const result = parseXML(xml);

    expect(result["JFK"]).toBeDefined();
    expect(result["JFK"].status).toBe("ground_delay");
    expect(result["JFK"].groundDelay?.avgMinutes).toBe(80);
  });

  it("parses a ground stop correctly", () => {
    const xml = `
      <AIRPORT_STATUS_INFORMATION>
        <Delay_type>
          <Name>Ground Stop</Name>
          <Ground_Stop_List>
            <Ground_Stop>
              <ARPT>ORD</ARPT>
              <Reason>Snow</Reason>
              <Stop_End_Time>3:00 PM</Stop_End_Time>
            </Ground_Stop>
          </Ground_Stop_List>
        </Delay_type>
      </AIRPORT_STATUS_INFORMATION>
    `;

    const result = parseXML(xml);

    expect(result["ORD"]).toBeDefined();
    expect(result["ORD"].status).toBe("ground_stop");
    expect(result["ORD"].groundStop?.endTime).toBe("3:00 PM");
  });

  it("parses an airport closure correctly", () => {
    const xml = `
      <AIRPORT_STATUS_INFORMATION>
        <Delay_type>
          <Name>Airport Closure</Name>
          <Airport_Closure_List>
            <Airport>
              <ARPT>DEN</ARPT>
              <Reason>Blizzard</Reason>
            </Airport>
          </Airport_Closure_List>
        </Delay_type>
      </AIRPORT_STATUS_INFORMATION>
    `;

    const result = parseXML(xml);

    expect(result["DEN"]).toBeDefined();
    expect(result["DEN"].status).toBe("closure");
    expect(result["DEN"].closure?.reason).toBeDefined();
  });
});

// ── lib/faa.ts — generateWhatsAppSummary ──────────────────────────────────────

describe("generateWhatsAppSummary", () => {
  it("reports all normal when no airports have issues", () => {
    const msg = generateWhatsAppSummary({}, ["JFK", "LAX"]);

    expect(msg).toContain("Todo normal");
    expect(msg).toContain("JFK");
    expect(msg).toContain("LAX");
  });

  it("reports problem airports correctly", () => {
    const statusMap = {
      JFK: {
        iata: "JFK",
        name: "John F. Kennedy International",
        city: "New York",
        state: "NY",
        status: "ground_stop" as const,
        groundStop: { reason: "Weather" },
        lastChecked: new Date(),
      },
    };

    const msg = generateWhatsAppSummary(statusMap, ["JFK", "LAX"]);

    expect(msg).toContain("JFK");
    expect(msg).toContain("1 aeropuerto(s)");
  });
});

// ── lib/cronUtils.ts — localToUTC ────────────────────────────────────────────

describe("localToUTC", () => {
  it("converts Chicago noon to correct UTC (UTC-5 in winter / UTC-6...)", () => {
    // Chicago in March 2026 is CDT (UTC-5) after daylight saving
    const result = localToUTC("2026-03-22", "12:00", "America/Chicago");

    expect(result).toBeInstanceOf(Date);
    // Chicago CDT = UTC-5, so 12:00 local = 17:00 UTC
    expect(result.getUTCHours()).toBe(17);
    expect(result.getUTCMinutes()).toBe(0);
  });

  it("returns a Date object", () => {
    const result = localToUTC("2026-06-15", "08:00", "America/New_York");
    expect(result).toBeInstanceOf(Date);
  });

  it("handles midnight correctly", () => {
    const result = localToUTC("2026-06-15", "00:00", "America/Chicago");
    expect(result).toBeInstanceOf(Date);
    // CDT (UTC-5): midnight local = 05:00 UTC
    expect(result.getUTCHours()).toBe(5);
  });
});

// ── lib/cronUtils.ts — localHourInTimezone ───────────────────────────────────

describe("localHourInTimezone", () => {
  it("returns the correct local hour for a known UTC timestamp", () => {
    // 2026-03-22 17:00 UTC = 12:00 CDT in Chicago
    const utcDate = new Date("2026-03-22T17:00:00Z");
    const hour = localHourInTimezone(utcDate, "America/Chicago");
    expect(hour).toBe(12);
  });

  it("returns a number between 0 and 23", () => {
    const result = localHourInTimezone(new Date(), "America/New_York");
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(23);
  });
});

// ── lib/cronUtils.ts — CRON_LABELS ───────────────────────────────────────────

describe("CRON_LABELS", () => {
  it("morningBriefing es template includes flight code and time", () => {
    const { title, body } = CRON_LABELS.es.morningBriefing(
      "AA900", "14:30", "JFK", "MIA", "Normal ✅"
    );
    expect(title).toContain("AA900");
    expect(title).toContain("14:30");
    expect(body).toContain("JFK");
    expect(body).toContain("MIA");
  });

  it("morningBriefing en template includes flight code and time", () => {
    const { title, body } = CRON_LABELS.en.morningBriefing(
      "UA500", "08:00", "ORD", "LAX", "Normal ✅"
    );
    expect(title).toContain("UA500");
    expect(title).toContain("08:00");
    expect(body).toContain("ORD");
    expect(body).toContain("LAX");
  });

  it("flightDelay es template includes delay minutes when provided", () => {
    const { body } = CRON_LABELS.es.flightDelay(
      "AA900", "45 min", "14:45", "14:00", "", "JFK", "MIA", 45
    );
    expect(body).toContain("+45 min");
  });

  it("flightCancelled en template includes flight code and airports", () => {
    const { title, body } = CRON_LABELS.en.flightCancelled("DL200", "ATL", "BOS");
    expect(title).toContain("DL200");
    expect(body).toContain("ATL");
    expect(body).toContain("BOS");
  });

  it("statusLabel map contains all expected keys for both locales", () => {
    const expectedKeys = [
      "ok", "delay_minor", "delay_moderate", "delay_severe",
      "ground_delay", "ground_stop", "closure",
    ];
    for (const key of expectedKeys) {
      expect(CRON_LABELS.es.statusLabel[key]).toBeDefined();
      expect(CRON_LABELS.en.statusLabel[key]).toBeDefined();
    }
  });
});
