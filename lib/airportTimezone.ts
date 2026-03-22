/** IANA timezone for each IATA code */
export const AIRPORT_TZ: Record<string, string> = {
  // ── USA East ──────────────────────────────────────────────────────────────
  ATL: "America/New_York",
  JFK: "America/New_York",
  EWR: "America/New_York",
  LGA: "America/New_York",
  MIA: "America/New_York",
  FLL: "America/New_York",
  MCO: "America/New_York",
  TPA: "America/New_York",
  CLT: "America/New_York",
  BOS: "America/New_York",
  PHL: "America/New_York",
  DCA: "America/New_York",
  IAD: "America/New_York",
  BWI: "America/New_York",
  DTW: "America/New_York",
  // ── USA Central ───────────────────────────────────────────────────────────
  ORD: "America/Chicago",
  MDW: "America/Chicago",
  DFW: "America/Chicago",
  IAH: "America/Chicago",
  MSP: "America/Chicago",
  // ── USA Mountain ──────────────────────────────────────────────────────────
  DEN: "America/Denver",
  SLC: "America/Denver",
  PHX: "America/Phoenix",   // no DST
  // ── USA Pacific ───────────────────────────────────────────────────────────
  LAX: "America/Los_Angeles",
  SFO: "America/Los_Angeles",
  SEA: "America/Los_Angeles",
  LAS: "America/Los_Angeles",
  SAN: "America/Los_Angeles",
  PDX: "America/Los_Angeles",
  // ── USA Hawaii ────────────────────────────────────────────────────────────
  HNL: "Pacific/Honolulu",
  // ── South America ─────────────────────────────────────────────────────────
  EZE: "America/Argentina/Buenos_Aires",
  GRU: "America/Sao_Paulo",
  GIG: "America/Sao_Paulo",
  SCL: "America/Santiago",
  MVD: "America/Montevideo",
  BOG: "America/Bogota",
  LIM: "America/Lima",
  UIO: "America/Guayaquil",
  VVI: "America/La_Paz",
  // ── Caribbean & Central America ───────────────────────────────────────────
  GCM: "America/Cayman",
  NAS: "America/Nassau",
  ANU: "America/Antigua",
  PTY: "America/Panama",
  CUN: "America/Cancun",
  MEX: "America/Mexico_City",

  // ── More Latin America ────────────────────────────────────────────────────
  BSB: "America/Sao_Paulo",
  CNF: "America/Sao_Paulo",
  FOR: "America/Fortaleza",
  REC: "America/Recife",
  SSA: "America/Bahia",
  CWB: "America/Sao_Paulo",
  POA: "America/Sao_Paulo",
  MDE: "America/Bogota",
  CTG: "America/Bogota",
  GYE: "America/Guayaquil",
  SDQ: "America/Santo_Domingo",
  SJU: "America/Puerto_Rico",
  CUR: "America/Curacao",
  AUA: "America/Aruba",
  HAV: "America/Havana",
  POS: "America/Port_of_Spain",
  BGI: "America/Barbados",
  MBJ: "America/Jamaica",
  KIN: "America/Jamaica",
  SAL: "America/El_Salvador",
  SJO: "America/Costa_Rica",
  GUA: "America/Guatemala",

  // ── Europe ────────────────────────────────────────────────────────────────
  LHR: "Europe/London",
  LGW: "Europe/London",
  STN: "Europe/London",
  MAN: "Europe/London",
  EDI: "Europe/London",
  CDG: "Europe/Paris",
  ORY: "Europe/Paris",
  AMS: "Europe/Amsterdam",
  MAD: "Europe/Madrid",
  BCN: "Europe/Madrid",
  FCO: "Europe/Rome",
  MXP: "Europe/Rome",
  MUC: "Europe/Berlin",
  FRA: "Europe/Berlin",
  DUS: "Europe/Berlin",
  HAM: "Europe/Berlin",
  BER: "Europe/Berlin",
  VIE: "Europe/Vienna",
  ZRH: "Europe/Zurich",
  GVA: "Europe/Zurich",
  BRU: "Europe/Brussels",
  LIS: "Europe/Lisbon",
  OPO: "Europe/Lisbon",
  CPH: "Europe/Copenhagen",
  ARN: "Europe/Stockholm",
  OSL: "Europe/Oslo",
  HEL: "Europe/Helsinki",
  DUB: "Europe/Dublin",
  ATH: "Europe/Athens",
  IST: "Europe/Istanbul",
  SAW: "Europe/Istanbul",
  WAW: "Europe/Warsaw",
  PRG: "Europe/Prague",
  BUD: "Europe/Budapest",
  OTP: "Europe/Bucharest",
  KBP: "Europe/Kyiv",

  // ── Middle East ───────────────────────────────────────────────────────────
  DXB: "Asia/Dubai",
  AUH: "Asia/Dubai",
  DOH: "Asia/Qatar",
  BAH: "Asia/Bahrain",
  KWI: "Asia/Kuwait",
  AMM: "Asia/Amman",
  BEY: "Asia/Beirut",
  TLV: "Asia/Jerusalem",
  RUH: "Asia/Riyadh",
  JED: "Asia/Riyadh",
  MCT: "Asia/Muscat",
  CAI: "Africa/Cairo",

  // ── Asia-Pacific ──────────────────────────────────────────────────────────
  NRT: "Asia/Tokyo",
  HND: "Asia/Tokyo",
  KIX: "Asia/Tokyo",
  ICN: "Asia/Seoul",
  GMP: "Asia/Seoul",
  PEK: "Asia/Shanghai",
  PKX: "Asia/Shanghai",
  PVG: "Asia/Shanghai",
  SHA: "Asia/Shanghai",
  CAN: "Asia/Shanghai",
  HKG: "Asia/Hong_Kong",
  TPE: "Asia/Taipei",
  SIN: "Asia/Singapore",
  KUL: "Asia/Kuala_Lumpur",
  BKK: "Asia/Bangkok",
  DMK: "Asia/Bangkok",
  CGK: "Asia/Jakarta",
  HAN: "Asia/Bangkok",
  SGN: "Asia/Ho_Chi_Minh",
  MNL: "Asia/Manila",
  DEL: "Asia/Kolkata",
  BOM: "Asia/Kolkata",
  BLR: "Asia/Kolkata",
  SYD: "Australia/Sydney",
  MEL: "Australia/Melbourne",
  BNE: "Australia/Brisbane",
  PER: "Australia/Perth",
  AKL: "Pacific/Auckland",

  // ── Africa ────────────────────────────────────────────────────────────────
  JNB: "Africa/Johannesburg",
  CPT: "Africa/Johannesburg",
  NBO: "Africa/Nairobi",
  ADD: "Africa/Addis_Ababa",
  CMN: "Africa/Casablanca",
  ACC: "Africa/Accra",
  LOS: "Africa/Lagos",
  TUN: "Africa/Tunis",
};

/**
 * Returns the current time string (HH:MM) at the given airport,
 * or null if the timezone is unknown.
 */
export function getAirportTime(iata: string): string | null {
  const tz = AIRPORT_TZ[iata];
  if (!tz) return null;
  return new Date().toLocaleTimeString("en-GB", {
    timeZone: tz,
    hour:   "2-digit",
    minute: "2-digit",
  });
}

/**
 * Returns a short timezone label like "ET", "CT", "ART", etc.
 */
export function getAirportTzLabel(iata: string): string | null {
  const tz = AIRPORT_TZ[iata];
  if (!tz) return null;
  // Extract the short abbreviation from the browser
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "short",
  }).formatToParts(new Date());
  return parts.find((p) => p.type === "timeZoneName")?.value ?? null;
}

/**
 * Converts a raw longOffset timezone name (e.g. "GMT-05:00", "GMT+05:30", "GMT")
 * to a consistent UTC±X label (e.g. "UTC-5", "UTC+5:30", "UTC").
 */
export function formatTzOffset(timezone: string, date: Date): string {
  try {
    const raw = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "longOffset",
    })
      .formatToParts(date)
      .find((p) => p.type === "timeZoneName")?.value ?? "";
    return raw
      .replace(/^GMT$/, "UTC")
      .replace(/^GMT([+-])0?(\d{1,2}):00$/, (_, sign, h) => `UTC${sign}${parseInt(h)}`)
      .replace(/^GMT([+-])0?(\d{1,2}):(\d{2})$/, (_, sign, h, m) => `UTC${sign}${parseInt(h)}:${m}`)
      .replace(/^UTC[+-]0$/, "UTC");
  } catch {
    return "";
  }
}

/**
 * Convert a flight time string from one IANA timezone to another.
 * E.g., "20:30" in "America/Argentina/Buenos_Aires" → "19:30" in "America/New_York"
 * Uses the isoDate to correctly account for DST transitions.
 */
export function convertFlightTime(
  timeStr: string,
  isoDate: string,
  fromTz: string,
  toTz: string,
): string {
  try {
    if (fromTz === toTz) return timeStr;
    const [h, m] = timeStr.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return timeStr;

    // Use the actual departure clock time to compute the UTC offset in fromTz
    // This correctly handles DST transitions (e.g., clocks at 02:00 on DST change day)
    const refStr = `${isoDate}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
    // Interpret refStr as a UTC timestamp, then ask Intl what local time that is in fromTz
    // But we want the reverse: given local time in fromTz, find UTC.
    // Strategy: binary-search-free — use the offset at that moment via Intl.
    const utcRef = new Date(refStr + "Z"); // naive UTC: treats HH:mm as UTC
    const fromParts = new Intl.DateTimeFormat("en-US", {
      timeZone: fromTz,
      hour: "2-digit", minute: "2-digit",
      hour12: false,
    }).formatToParts(utcRef);
    const fromH = parseInt(fromParts.find((p) => p.type === "hour")?.value ?? "0") % 24;
    const fromM = parseInt(fromParts.find((p) => p.type === "minute")?.value ?? "0");

    // Difference between naive-UTC interpretation and actual fromTz local time
    // This gives us the UTC offset at that moment
    const diffMin = (h * 60 + m) - (fromH * 60 + fromM);
    // diffMin = localMin - utcMin = offset (e.g., UTC-3 → diffMin = -3*60 = -180)

    // Now compute the true UTC timestamp for this local departure time
    const [yr, mo, dy] = isoDate.split("-").map(Number);
    const midnightUtcMs = Date.UTC(yr, mo - 1, dy);
    const depUtcMs = midnightUtcMs + (h * 60 + m - diffMin) * 60_000;

    // Format in target timezone
    const toParts = new Intl.DateTimeFormat("en-US", {
      timeZone: toTz,
      hour: "2-digit", minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date(depUtcMs));
    const toH = parseInt(toParts.find((p) => p.type === "hour")?.value ?? "0") % 24;
    const toM = parseInt(toParts.find((p) => p.type === "minute")?.value ?? "0");

    return `${String(toH).padStart(2, "0")}:${String(toM).padStart(2, "0")}`;
  } catch {
    return timeStr;
  }
}

/**
 * Extract city name from an IANA timezone string.
 * "America/New_York" → "New York", "Europe/London" → "London",
 * "America/Argentina/Buenos_Aires" → "Buenos Aires"
 */
export function cityFromTimezone(tz: string): string {
  const parts = tz.split("/");
  const city = parts[parts.length - 1];
  return city.replace(/_/g, " ");
}
