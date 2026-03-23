// Visa requirements — static lookup table for common passport/destination pairs
// Source: official government / Timatic data (approximate, verify before travel)

export interface VisaRequirement {
  originCountry: string;    // ISO 2-letter code
  destinationCountry: string;
  requirement: "visa_free" | "visa_on_arrival" | "e_visa" | "visa_required";
  maxStayDays: number | null;
  notes: string | null;
}

// ── IATA → Country ────────────────────────────────────────────────────────────

export const IATA_TO_COUNTRY: Record<string, string> = {
  // Argentina
  EZE: "AR", AEP: "AR", MDZ: "AR", COR: "AR", BRC: "AR", IGR: "AR",
  SLA: "AR", TUC: "AR", ROS: "AR", NQN: "AR", CRD: "AR", USH: "AR",
  PMY: "AR", RGL: "AR", FTE: "AR",
  // USA
  JFK: "US", LAX: "US", MIA: "US", EWR: "US", ORD: "US",
  SFO: "US", DFW: "US", ATL: "US", BOS: "US", MCO: "US",
  IAH: "US", SEA: "US", LAS: "US", PHX: "US", DEN: "US",
  // Europe
  MAD: "ES", BCN: "ES",
  LHR: "GB", LGW: "GB",
  CDG: "FR", ORY: "FR",
  FCO: "IT", MXP: "IT",
  AMS: "NL",
  FRA: "DE", MUC: "DE",
  LIS: "PT",
  ZRH: "CH",
  VIE: "AT",
  BRU: "BE",
  CPH: "DK",
  ARN: "SE",
  HEL: "FI",
  OSL: "NO",
  WAW: "PL",
  PRG: "CZ",
  BUD: "HU",
  ATH: "GR",
  // Latam
  GRU: "BR", GIG: "BR", BSB: "BR", FOR: "BR",
  SCL: "CL",
  LIM: "PE",
  BOG: "CO", MDE: "CO",
  MEX: "MX", CUN: "MX", GDL: "MX",
  UIO: "EC", GYE: "EC",
  MVD: "UY",
  ASU: "PY",
  VVI: "BO", LPB: "BO",
  CCS: "VE",
  GUA: "GT",
  SAL: "SV",
  TGU: "HN",
  MGA: "NI",
  SJO: "CR",
  PTY: "PA",
  // Caribbean
  MBJ: "JM", KIN: "JM",
  PUJ: "DO", SDQ: "DO",
  HAV: "CU",
  NAS: "BS",
  GCM: "KY",
  // North America
  YYZ: "CA", YVR: "CA", YUL: "CA",
  // Oceania
  SYD: "AU", MEL: "AU",
  // Asia
  NRT: "JP", KIX: "JP",
  DXB: "AE", AUH: "AE",
  IST: "TR",
  SIN: "SG",
  BKK: "TH",
  KUL: "MY",
  ICN: "KR",
  PEK: "CN", PVG: "CN",
  // Africa
  JNB: "ZA",
  CAI: "EG",
  CMN: "MA",
};

// ── Visa lookup table ─────────────────────────────────────────────────────────
// Key format: "PASSPORT→DESTINATION"

type VisaEntry = Pick<VisaRequirement, "requirement" | "maxStayDays" | "notes">;

const VISA_TABLE: Record<string, VisaEntry> = {
  // ── Argentine passport (AR) ───────────────────────────────────────────────
  // USA / Canada / Australia — electronic travel authorization (treated as e_visa)
  "AR→US": { requirement: "e_visa",        maxStayDays: 90,   notes: "ESTA required — esta.cbp.dhs.gov" },
  "AR→CA": { requirement: "e_visa",        maxStayDays: 180,  notes: "eTA required — canada.ca" },
  "AR→AU": { requirement: "e_visa",        maxStayDays: 90,   notes: "ETA required — immi.homeaffairs.gov.au" },
  "AR→GB": { requirement: "e_visa",        maxStayDays: 180,  notes: "UK ETA required — gov.uk/check-uk-visa" },
  "AR→KR": { requirement: "e_visa",        maxStayDays: 90,   notes: "K-ETA required — k-eta.go.kr" },
  "AR→CN": { requirement: "visa_required", maxStayDays: null, notes: "Visa required — apply at Chinese consulate in advance" },
  "AR→MA": { requirement: "visa_required", maxStayDays: null, notes: "Visa required — Moroccan consulate" },
  "AR→EG": { requirement: "visa_on_arrival", maxStayDays: 30, notes: "Visa on arrival available at main airports" },
  // Schengen (visa-free for AR up to 90 days)
  "AR→ES": { requirement: "visa_free", maxStayDays: 90,  notes: "Schengen — 90 days in any 180-day period" },
  "AR→FR": { requirement: "visa_free", maxStayDays: 90,  notes: "Schengen — 90 days in any 180-day period" },
  "AR→IT": { requirement: "visa_free", maxStayDays: 90,  notes: "Schengen — 90 days in any 180-day period" },
  "AR→DE": { requirement: "visa_free", maxStayDays: 90,  notes: "Schengen — 90 days in any 180-day period" },
  "AR→NL": { requirement: "visa_free", maxStayDays: 90,  notes: "Schengen — 90 days in any 180-day period" },
  "AR→PT": { requirement: "visa_free", maxStayDays: 90,  notes: "Schengen — 90 days in any 180-day period" },
  "AR→AT": { requirement: "visa_free", maxStayDays: 90,  notes: "Schengen — 90 days in any 180-day period" },
  "AR→BE": { requirement: "visa_free", maxStayDays: 90,  notes: "Schengen — 90 days in any 180-day period" },
  "AR→DK": { requirement: "visa_free", maxStayDays: 90,  notes: "Schengen — 90 days in any 180-day period" },
  "AR→SE": { requirement: "visa_free", maxStayDays: 90,  notes: "Schengen — 90 days in any 180-day period" },
  "AR→FI": { requirement: "visa_free", maxStayDays: 90,  notes: "Schengen — 90 days in any 180-day period" },
  "AR→NO": { requirement: "visa_free", maxStayDays: 90,  notes: "Schengen — 90 days in any 180-day period" },
  "AR→PL": { requirement: "visa_free", maxStayDays: 90,  notes: "Schengen — 90 days in any 180-day period" },
  "AR→CZ": { requirement: "visa_free", maxStayDays: 90,  notes: "Schengen — 90 days in any 180-day period" },
  "AR→HU": { requirement: "visa_free", maxStayDays: 90,  notes: "Schengen — 90 days in any 180-day period" },
  "AR→GR": { requirement: "visa_free", maxStayDays: 90,  notes: "Schengen — 90 days in any 180-day period" },
  "AR→CH": { requirement: "visa_free", maxStayDays: 90,  notes: "Schengen — 90 days in any 180-day period" },
  // Asia / Pacific
  "AR→JP": { requirement: "visa_free", maxStayDays: 90,  notes: null },
  "AR→AE": { requirement: "visa_free", maxStayDays: 30,  notes: null },
  "AR→TR": { requirement: "visa_free", maxStayDays: 90,  notes: null },
  "AR→SG": { requirement: "visa_free", maxStayDays: 90,  notes: null },
  "AR→TH": { requirement: "visa_free", maxStayDays: 30,  notes: null },
  "AR→MY": { requirement: "visa_free", maxStayDays: 90,  notes: null },
  // Africa
  "AR→ZA": { requirement: "visa_free", maxStayDays: 30,  notes: null },
  // Latam — all visa-free for AR
  "AR→BR": { requirement: "visa_free", maxStayDays: null, notes: "Free entry — Mercosur agreement" },
  "AR→CL": { requirement: "visa_free", maxStayDays: null, notes: "Free entry — Mercosur agreement" },
  "AR→UY": { requirement: "visa_free", maxStayDays: null, notes: "Free entry — Mercosur agreement" },
  "AR→PY": { requirement: "visa_free", maxStayDays: null, notes: "Free entry — Mercosur agreement" },
  "AR→PE": { requirement: "visa_free", maxStayDays: 183, notes: null },
  "AR→CO": { requirement: "visa_free", maxStayDays: 90,  notes: null },
  "AR→MX": { requirement: "visa_free", maxStayDays: 180, notes: null },
  "AR→EC": { requirement: "visa_free", maxStayDays: 90,  notes: null },
  "AR→BO": { requirement: "visa_free", maxStayDays: 90,  notes: null },
  "AR→VE": { requirement: "visa_free", maxStayDays: 90,  notes: null },
  "AR→GT": { requirement: "visa_free", maxStayDays: 90,  notes: null },
  "AR→SV": { requirement: "visa_free", maxStayDays: 90,  notes: null },
  "AR→HN": { requirement: "visa_free", maxStayDays: 90,  notes: null },
  "AR→NI": { requirement: "visa_free", maxStayDays: 90,  notes: null },
  "AR→CR": { requirement: "visa_free", maxStayDays: 90,  notes: null },
  "AR→PA": { requirement: "visa_free", maxStayDays: 180, notes: null },
  // Caribbean
  "AR→JM": { requirement: "visa_free", maxStayDays: 90,  notes: null },
  "AR→DO": { requirement: "visa_free", maxStayDays: 30,  notes: null },
  "AR→CU": { requirement: "visa_free", maxStayDays: 30,  notes: null },
  "AR→BS": { requirement: "visa_free", maxStayDays: 240, notes: null },
  "AR→KY": { requirement: "visa_free", maxStayDays: 30,  notes: null },

  // ── US passport ───────────────────────────────────────────────────────────
  "US→AR": { requirement: "visa_free", maxStayDays: 90,  notes: null },
  "US→BR": { requirement: "visa_free", maxStayDays: 90,  notes: null },
  "US→CL": { requirement: "visa_free", maxStayDays: 90,  notes: null },
  "US→MX": { requirement: "visa_free", maxStayDays: 180, notes: null },
  "US→CO": { requirement: "visa_free", maxStayDays: 90,  notes: null },
  "US→PE": { requirement: "visa_free", maxStayDays: 183, notes: null },
  "US→ES": { requirement: "visa_free", maxStayDays: 90,  notes: "Schengen — 90 days in any 180-day period" },
  "US→FR": { requirement: "visa_free", maxStayDays: 90,  notes: "Schengen — 90 days in any 180-day period" },
  "US→IT": { requirement: "visa_free", maxStayDays: 90,  notes: "Schengen — 90 days in any 180-day period" },
  "US→DE": { requirement: "visa_free", maxStayDays: 90,  notes: "Schengen — 90 days in any 180-day period" },
  "US→GB": { requirement: "visa_free", maxStayDays: 180, notes: null },
  "US→JP": { requirement: "visa_free", maxStayDays: 90,  notes: null },
  "US→AU": { requirement: "e_visa",    maxStayDays: 90,  notes: "ETA required — immi.homeaffairs.gov.au" },
  "US→CN": { requirement: "visa_free", maxStayDays: 10,  notes: "Visa-free transit 10 days (72/144h also available)" },
  "US→AE": { requirement: "visa_free", maxStayDays: 30,  notes: null },
  "US→TH": { requirement: "visa_free", maxStayDays: 60,  notes: null },
  "US→SG": { requirement: "visa_free", maxStayDays: 90,  notes: null },

  // ── Brazilian passport (BR) ───────────────────────────────────────────────
  "BR→AR": { requirement: "visa_free", maxStayDays: null, notes: "Free entry — Mercosur agreement" },
  "BR→US": { requirement: "visa_required", maxStayDays: null, notes: "B1/B2 visa required — apply at US consulate" },
  "BR→CA": { requirement: "e_visa",    maxStayDays: 180,  notes: "eTA required — canada.ca" },
  "BR→AU": { requirement: "e_visa",    maxStayDays: 90,   notes: "ETA required — immi.homeaffairs.gov.au" },
  "BR→ES": { requirement: "visa_free", maxStayDays: 90,   notes: "Schengen — 90 days in any 180-day period" },
  "BR→FR": { requirement: "visa_free", maxStayDays: 90,   notes: "Schengen — 90 days in any 180-day period" },
  "BR→GB": { requirement: "visa_free", maxStayDays: 180,  notes: null },
  "BR→JP": { requirement: "visa_free", maxStayDays: 90,   notes: null },
  "BR→AE": { requirement: "visa_free", maxStayDays: 30,   notes: null },

  // ── Mexican passport (MX) ─────────────────────────────────────────────────
  "MX→US": { requirement: "visa_required", maxStayDays: null, notes: "B1/B2 visa required — apply at US consulate" },
  "MX→CA": { requirement: "e_visa",    maxStayDays: 180,  notes: "eTA required — canada.ca" },
  "MX→ES": { requirement: "visa_free", maxStayDays: 90,   notes: "Schengen — 90 days in any 180-day period" },
  "MX→FR": { requirement: "visa_free", maxStayDays: 90,   notes: "Schengen — 90 days in any 180-day period" },
  "MX→GB": { requirement: "visa_free", maxStayDays: 180,  notes: null },
  "MX→AR": { requirement: "visa_free", maxStayDays: 90,   notes: null },
  "MX→BR": { requirement: "visa_free", maxStayDays: 90,   notes: null },
  "MX→JP": { requirement: "visa_free", maxStayDays: 90,   notes: null },

  // ── Spanish passport (ES) ─────────────────────────────────────────────────
  "ES→US": { requirement: "e_visa",    maxStayDays: 90,   notes: "ESTA required — esta.cbp.dhs.gov" },
  "ES→CA": { requirement: "e_visa",    maxStayDays: 180,  notes: "eTA required — canada.ca" },
  "ES→AU": { requirement: "e_visa",    maxStayDays: 90,   notes: "ETA required — immi.homeaffairs.gov.au" },
  "ES→AR": { requirement: "visa_free", maxStayDays: 90,   notes: null },
  "ES→BR": { requirement: "visa_free", maxStayDays: 90,   notes: null },
  "ES→MX": { requirement: "visa_free", maxStayDays: 180,  notes: null },
  "ES→JP": { requirement: "visa_free", maxStayDays: 90,   notes: null },
  "ES→AE": { requirement: "visa_free", maxStayDays: 30,   notes: null },

  // ── French passport (FR) ─────────────────────────────────────────────────
  "FR→US": { requirement: "e_visa",    maxStayDays: 90,   notes: "ESTA required — esta.cbp.dhs.gov" },
  "FR→CA": { requirement: "e_visa",    maxStayDays: 180,  notes: "eTA required — canada.ca" },
  "FR→AU": { requirement: "e_visa",    maxStayDays: 90,   notes: "ETA required — immi.homeaffairs.gov.au" },
  "FR→AR": { requirement: "visa_free", maxStayDays: 90,   notes: null },
  "FR→BR": { requirement: "visa_free", maxStayDays: 90,   notes: null },
  "FR→JP": { requirement: "visa_free", maxStayDays: 90,   notes: null },
  "FR→AE": { requirement: "visa_free", maxStayDays: 30,   notes: null },

  // ── German passport (DE) ─────────────────────────────────────────────────
  "DE→US": { requirement: "e_visa",    maxStayDays: 90,   notes: "ESTA required — esta.cbp.dhs.gov" },
  "DE→CA": { requirement: "e_visa",    maxStayDays: 180,  notes: "eTA required — canada.ca" },
  "DE→AU": { requirement: "e_visa",    maxStayDays: 90,   notes: "ETA required — immi.homeaffairs.gov.au" },
  "DE→AR": { requirement: "visa_free", maxStayDays: 90,   notes: null },
  "DE→BR": { requirement: "visa_free", maxStayDays: 90,   notes: null },
  "DE→JP": { requirement: "visa_free", maxStayDays: 90,   notes: null },

  // ── British passport (GB) ─────────────────────────────────────────────────
  "GB→US": { requirement: "e_visa",    maxStayDays: 90,   notes: "ESTA required — esta.cbp.dhs.gov" },
  "GB→CA": { requirement: "e_visa",    maxStayDays: 180,  notes: "eTA required — canada.ca" },
  "GB→AU": { requirement: "e_visa",    maxStayDays: 90,   notes: "ETA required — immi.homeaffairs.gov.au" },
  "GB→AR": { requirement: "visa_free", maxStayDays: 90,   notes: null },
  "GB→BR": { requirement: "visa_free", maxStayDays: 90,   notes: null },
  "GB→JP": { requirement: "visa_free", maxStayDays: 90,   notes: null },
  "GB→AE": { requirement: "visa_free", maxStayDays: 30,   notes: null },

  // ── Chinese passport (CN) ─────────────────────────────────────────────────
  "CN→US": { requirement: "visa_required", maxStayDays: null, notes: "B1/B2 visa required — apply at US consulate" },
  "CN→GB": { requirement: "visa_required", maxStayDays: null, notes: "UK visa required — gov.uk/check-uk-visa" },
  "CN→AU": { requirement: "visa_required", maxStayDays: null, notes: "Visa required — immi.homeaffairs.gov.au" },
  "CN→JP": { requirement: "visa_required", maxStayDays: null, notes: "Visa required — apply at Japanese consulate" },
  "CN→SG": { requirement: "visa_free",     maxStayDays: 30,  notes: null },
  "CN→TH": { requirement: "visa_free",     maxStayDays: 30,  notes: null },
  "CN→AE": { requirement: "visa_on_arrival", maxStayDays: 30, notes: "Visa on arrival available" },
  "CN→AR": { requirement: "visa_free",     maxStayDays: 90,  notes: null },

  // ── Japanese passport (JP) ────────────────────────────────────────────────
  "JP→US": { requirement: "e_visa",    maxStayDays: 90,   notes: "ESTA required — esta.cbp.dhs.gov" },
  "JP→CA": { requirement: "e_visa",    maxStayDays: 180,  notes: "eTA required — canada.ca" },
  "JP→AU": { requirement: "e_visa",    maxStayDays: 90,   notes: "ETA required — immi.homeaffairs.gov.au" },
  "JP→AR": { requirement: "visa_free", maxStayDays: 90,   notes: null },
  "JP→BR": { requirement: "visa_free", maxStayDays: 90,   notes: null },
  "JP→ES": { requirement: "visa_free", maxStayDays: 90,   notes: "Schengen — 90 days in any 180-day period" },
  "JP→GB": { requirement: "visa_free", maxStayDays: 180,  notes: null },
  "JP→AE": { requirement: "visa_free", maxStayDays: 30,   notes: null },

  // ── Australian passport (AU) ──────────────────────────────────────────────
  "AU→US": { requirement: "e_visa",    maxStayDays: 90,   notes: "ESTA required — esta.cbp.dhs.gov" },
  "AU→CA": { requirement: "e_visa",    maxStayDays: 180,  notes: "eTA required — canada.ca" },
  "AU→AR": { requirement: "visa_free", maxStayDays: 90,   notes: null },
  "AU→BR": { requirement: "visa_free", maxStayDays: 90,   notes: null },
  "AU→JP": { requirement: "visa_free", maxStayDays: 90,   notes: null },
  "AU→GB": { requirement: "visa_free", maxStayDays: 180,  notes: null },
  "AU→AE": { requirement: "visa_free", maxStayDays: 30,   notes: null },
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns visa requirement for a passport/destination country pair.
 * Returns null when origin equals destination or when no data is available.
 */
export function getVisaRequirement(
  passportCountry: string,
  destinationCountry: string,
): VisaRequirement | null {
  if (!passportCountry || !destinationCountry) return null;
  const origin = passportCountry.toUpperCase();
  const dest = destinationCountry.toUpperCase();
  if (origin === dest) return null;

  const entry = VISA_TABLE[`${origin}→${dest}`];
  if (!entry) return null;

  return {
    originCountry: origin,
    destinationCountry: dest,
    ...entry,
  };
}

/** Maps an airport IATA code to its country ISO-2 code. */
export function airportToCountry(iata: string): string | null {
  return IATA_TO_COUNTRY[iata.toUpperCase()] ?? null;
}
