import { AIRPORTS } from "./airports";
import { AIRLINES, parseFlightCode } from "./flightUtils";

export interface ParsedFlight {
  flightCode:    string;
  airlineCode:   string;
  airlineName:   string;
  airlineIcao:   string;
  flightNumber:  string;
  originCode:    string;
  destinationCode: string;
  isoDate:       string;
  departureTime: string;
  arrivalDate?:  string;
  arrivalTime?:  string;
  arrivalBuffer: number;
  bookingCode?:  string;
  confidence:    "high" | "medium" | "low";
}

export interface ParseResult {
  flights: ParsedFlight[];
  unresolved: string[];   // Lines / tokens we couldn't parse
}

// ── Regex patterns ─────────────────────────────────────────────────────────────

// Flight code: AA900, B6766, UA 123, LA 800, etc.
const FLIGHT_CODE_RE = /\b([A-Z]{2})\s*(\d{3,4})\b/g;

// IATA airport code (3 capital letters, validated against AIRPORTS dict)
const IATA_RE = /\b([A-Z]{3})\b/g;

// Date formats:
// 2026-03-29 | 29/03/2026 | 03/29/2026 | March 29, 2026 | 29 Mar 2026 | 29MAR | 29MAR2026
const DATE_PATTERNS: Array<{ re: RegExp; parse: (m: RegExpMatchArray) => string | null }> = [
  {
    // ISO: 2026-03-29
    re: /\b(\d{4})-(\d{2})-(\d{2})\b/,
    parse: (m) => `${m[1]}-${m[2]}-${m[3]}`,
  },
  {
    // DD/MM/YYYY or MM/DD/YYYY (try both, prefer DD/MM for AR/LA)
    re: /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/,
    parse: (m) => {
      const a = parseInt(m[1]), b = parseInt(m[2]);
      const year = m[3];
      // If a > 12 → must be day first
      const [day, month] = a > 12 ? [a, b] : [b, a];
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    },
  },
  {
    // "March 29, 2026" or "29 March 2026"
    re: /\b(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})\b/i,
    parse: (m) => {
      const months: Record<string, string> = {
        jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",
        jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12",
      };
      const monthKey = m[2].substring(0,3).toLowerCase();
      return `${m[3]}-${months[monthKey]}-${m[1].padStart(2,"0")}`;
    },
  },
  {
    // "(Month) DD, YYYY": "March 29, 2026"
    re: /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),?\s+(\d{4})\b/i,
    parse: (m) => {
      const months: Record<string, string> = {
        jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",
        jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12",
      };
      const monthKey = m[1].substring(0,3).toLowerCase();
      return `${m[3]}-${months[monthKey]}-${m[2].padStart(2,"0")}`;
    },
  },
  {
    // 29MAR or 29MAR2026
    re: /\b(\d{2})(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)(\d{4})?\b/i,
    parse: (m) => {
      const months: Record<string, string> = {
        JAN:"01",FEB:"02",MAR:"03",APR:"04",MAY:"05",JUN:"06",
        JUL:"07",AUG:"08",SEP:"09",OCT:"10",NOV:"11",DEC:"12",
      };
      const year = m[3] ?? "2026";
      return `${year}-${months[m[2].toUpperCase()]}-${m[1].padStart(2,"0")}`;
    },
  },
];

// Time: 20:30 | 8:30 PM | 20h30
const TIME_RE = /\b(\d{1,2})[:\s](\d{2})\s*(AM|PM|hs|h)?\b/gi;

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractDate(text: string): string | null {
  for (const { re, parse } of DATE_PATTERNS) {
    const m = text.match(re);
    if (m) {
      const result = parse(m);
      if (result) return result;
    }
  }
  return null;
}

function extractTime(text: string): string | null {
  const matches = Array.from(text.matchAll(TIME_RE));
  if (!matches.length) return null;

  // Pick the first time that's plausible for a departure
  for (const m of matches) {
    let h = parseInt(m[1]);
    const min = m[2];
    const meridiem = (m[3] ?? "").toUpperCase();

    if (meridiem === "PM" && h < 12) h += 12;
    if (meridiem === "AM" && h === 12) h = 0;
    if (h < 0 || h > 23) continue;

    return `${String(h).padStart(2,"0")}:${min}`;
  }
  return null;
}

function findAirports(text: string): string[] {
  const found: string[] = [];
  const matches = Array.from(text.matchAll(IATA_RE));
  for (const m of matches) {
    const code = m[1];
    if (AIRPORTS[code]) found.push(code);
  }
  // Deduplicate while preserving order
  return found.filter((v, i, a) => a.indexOf(v) === i);
}

// ── Main parser ───────────────────────────────────────────────────────────────

/**
 * Parse free-form text (email body, confirmation text, etc.) and extract
 * flight information. Handles most major airline confirmation formats.
 */
export function parseFlightsFromText(text: string): ParseResult {
  const flights: ParsedFlight[] = [];
  const unresolved: string[] = [];

  // Normalize: collapse runs of whitespace, uppercase for matching
  const normalized = text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ");

  // ── Strategy 1: Line-by-line ("segment" mode) ─────────────────────────────
  // Many confirmation emails list each flight on 1-3 lines.
  // We collect all flight codes first, then try to associate context.
  const flightCodeMatches = Array.from(normalized.matchAll(FLIGHT_CODE_RE));
  const seen = new Set<string>();

  for (const match of flightCodeMatches) {
    const rawCode = `${match[1]}${match[2]}`;
    if (seen.has(rawCode)) continue;
    seen.add(rawCode);

    const parsed = parseFlightCode(rawCode);
    if (!parsed) {
      unresolved.push(rawCode);
      continue;
    }

    // Extract a "window" of text around this flight code for context
    const pos = match.index ?? 0;
    const window = normalized.substring(Math.max(0, pos - 80), pos + 200);

    const airports = findAirports(window);
    const date     = extractDate(window) ?? extractDate(normalized);
    const time     = extractTime(window);

    const originCode = airports[0] ?? "";
    const destCode   = airports[1] ?? "";

    if (!originCode || !destCode) {
      unresolved.push(rawCode);
      continue;
    }

    if (!date) {
      unresolved.push(rawCode);
      continue;
    }

    flights.push({
      flightCode:      parsed.fullCode,
      airlineCode:     parsed.airlineCode,
      airlineName:     parsed.airlineName,
      airlineIcao:     parsed.airlineIcao,
      flightNumber:    parsed.flightNumber,
      originCode,
      destinationCode: destCode,
      isoDate:         date,
      departureTime:   time ?? "",
      arrivalBuffer:   2,
      confidence:      (originCode && destCode && date && time) ? "high"
                     : (originCode && destCode && date)          ? "medium"
                     : "low",
    });
  }

  // ── Strategy 2: Table-format ("AA900 EZE MIA 29MAR 20:30") ────────────────
  // Handles compact formats like those exported from GDS or custom tools.
  if (flights.length === 0) {
    const lines = normalized.split("\n");
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 3) continue;

      const codeMatch = parts[0].match(/^([A-Z]{2})(\d{3,4})$/);
      if (!codeMatch) continue;

      const parsed = parseFlightCode(parts[0]);
      if (!parsed) continue;

      const airportTokens = parts.filter((p) => AIRPORTS[p]);
      const date = extractDate(line);
      const time = extractTime(line);

      if (airportTokens.length >= 2 && date) {
        flights.push({
          flightCode:      parsed.fullCode,
          airlineCode:     parsed.airlineCode,
          airlineName:     parsed.airlineName,
          airlineIcao:     parsed.airlineIcao,
          flightNumber:    parsed.flightNumber,
          originCode:      airportTokens[0],
          destinationCode: airportTokens[1],
          isoDate:         date,
          departureTime:   time ?? "",
          arrivalBuffer:   2,
          confidence:      time ? "high" : "medium",
        });
      }
    }
  }

  // Deduplicate by (flightCode + date)
  const deduped = flights.reduce<ParsedFlight[]>((acc, f) => {
    const key = `${f.flightCode}-${f.isoDate}`;
    if (!acc.some((x) => `${x.flightCode}-${x.isoDate}` === key)) acc.push(f);
    return acc;
  }, []);

  return { flights: deduped, unresolved };
}
