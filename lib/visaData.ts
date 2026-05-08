import { AIRPORTS } from "@/lib/airports";

// ── Types ──────────────────────────────────────────────────────────────────

export type VisaStatus = "visa_free" | "visa_on_arrival" | "eta_required" | "visa_required";

export interface VisaInfo {
  status: VisaStatus;
  /** Max stay in days (for visa_free / visa_on_arrival) */
  maxDays?: number;
  notes?: { es: string; en: string };
}

// ── Database ───────────────────────────────────────────────────────────────
// Key format: `${passportISO}_${destinationISO}` (ISO 3166-1 alpha-2, uppercase)
// Covers AR / US / BR / MX / CO / CL / PE / ES passports × major destinations

export const VISA_DB: Record<string, VisaInfo> = {

  // ── Argentine passport (AR) ──────────────────────────────────────────────
  AR_US: { status: "visa_required", notes: { es: "Requiere visa B1/B2", en: "B1/B2 visa required" } },
  AR_CA: { status: "eta_required", notes: { es: "eTA requerida desde 2016", en: "eTA required since 2016" } },
  AR_BR: { status: "visa_free", maxDays: 90 },
  AR_MX: { status: "visa_free", maxDays: 180 },
  AR_CL: { status: "visa_free", maxDays: 90 },
  AR_PE: { status: "visa_free", maxDays: 183 },
  AR_CO: { status: "visa_free", maxDays: 90 },
  AR_UY: { status: "visa_free", maxDays: 90 },
  AR_PY: { status: "visa_free", maxDays: 90 },
  AR_BO: { status: "visa_free", maxDays: 90 },
  AR_EC: { status: "visa_free", maxDays: 90 },
  AR_VE: { status: "visa_free", maxDays: 90 },
  AR_PA: { status: "visa_free", maxDays: 90 },
  AR_CR: { status: "visa_free", maxDays: 90 },
  AR_GB: { status: "eta_required", notes: { es: "ETA requerida desde 2025", en: "ETA required since 2025" } },
  AR_FR: { status: "visa_free", maxDays: 90, notes: { es: "Espacio Schengen", en: "Schengen area" } },
  AR_ES: { status: "visa_free", maxDays: 90, notes: { es: "Espacio Schengen", en: "Schengen area" } },
  AR_IT: { status: "visa_free", maxDays: 90, notes: { es: "Espacio Schengen", en: "Schengen area" } },
  AR_DE: { status: "visa_free", maxDays: 90, notes: { es: "Espacio Schengen", en: "Schengen area" } },
  AR_PT: { status: "visa_free", maxDays: 90, notes: { es: "Espacio Schengen", en: "Schengen area" } },
  AR_NL: { status: "visa_free", maxDays: 90, notes: { es: "Espacio Schengen", en: "Schengen area" } },
  AR_JP: { status: "visa_free", maxDays: 90 },
  AR_AU: { status: "eta_required", notes: { es: "ETA requerida (AUS eTA)", en: "ETA required (AUS eTA)" } },
  AR_NZ: { status: "visa_free", maxDays: 90 },
  AR_ZA: { status: "visa_free", maxDays: 30 },
  AR_TR: { status: "visa_free", maxDays: 90 },
  AR_TH: { status: "visa_on_arrival", maxDays: 30 },
  AR_AE: { status: "visa_free", maxDays: 90 },
  AR_MA: { status: "visa_free", maxDays: 90 },

  // ── US passport (US) ─────────────────────────────────────────────────────
  US_MX: { status: "visa_free", maxDays: 180 },
  US_CA: { status: "visa_free", maxDays: 180 },
  US_BR: { status: "visa_free", maxDays: 90 },
  US_AR: { status: "visa_free", maxDays: 90 },
  US_CL: { status: "visa_free", maxDays: 90 },
  US_PE: { status: "visa_free", maxDays: 183 },
  US_CO: { status: "visa_free", maxDays: 90 },
  US_UY: { status: "visa_free", maxDays: 90 },
  US_GB: { status: "visa_free", maxDays: 180 },
  US_FR: { status: "visa_free", maxDays: 90, notes: { es: "Espacio Schengen", en: "Schengen area" } },
  US_ES: { status: "visa_free", maxDays: 90, notes: { es: "Espacio Schengen", en: "Schengen area" } },
  US_IT: { status: "visa_free", maxDays: 90, notes: { es: "Espacio Schengen", en: "Schengen area" } },
  US_DE: { status: "visa_free", maxDays: 90, notes: { es: "Espacio Schengen", en: "Schengen area" } },
  US_PT: { status: "visa_free", maxDays: 90, notes: { es: "Espacio Schengen", en: "Schengen area" } },
  US_JP: { status: "visa_free", maxDays: 90 },
  US_AU: { status: "eta_required", notes: { es: "ETA requerida (AUS eTA)", en: "ETA required (AUS eTA)" } },
  US_NZ: { status: "visa_free", maxDays: 90 },
  US_TH: { status: "visa_on_arrival", maxDays: 30 },
  US_AE: { status: "visa_free", maxDays: 90 },
  US_IN: { status: "visa_required", notes: { es: "Requiere visa de turista", en: "Tourist visa required" } },
  US_CN: { status: "visa_free", maxDays: 15, notes: { es: "Transit sin visa hasta 15 días", en: "Visa-free up to 15 days (2024)" } },

  // ── Brazilian passport (BR) ───────────────────────────────────────────────
  BR_AR: { status: "visa_free", maxDays: 90 },
  BR_US: { status: "visa_free", maxDays: 90, notes: { es: "Acuerdo de reciprocidad 2024", en: "Reciprocity agreement 2024" } },
  BR_MX: { status: "visa_free", maxDays: 180 },
  BR_CL: { status: "visa_free", maxDays: 90 },
  BR_PE: { status: "visa_free", maxDays: 90 },
  BR_CO: { status: "visa_free", maxDays: 90 },
  BR_UY: { status: "visa_free", maxDays: 90 },
  BR_PY: { status: "visa_free", maxDays: 90 },
  BR_GB: { status: "visa_required", notes: { es: "Requiere visa de turista", en: "Tourist visa required" } },
  BR_FR: { status: "visa_free", maxDays: 90, notes: { es: "Espacio Schengen", en: "Schengen area" } },
  BR_ES: { status: "visa_free", maxDays: 90, notes: { es: "Espacio Schengen", en: "Schengen area" } },
  BR_PT: { status: "visa_free", maxDays: 90, notes: { es: "Espacio Schengen", en: "Schengen area" } },
  BR_JP: { status: "visa_free", maxDays: 15 },
  BR_AU: { status: "visa_required", notes: { es: "Requiere visa de turista", en: "Tourist visa required" } },
  BR_TH: { status: "visa_on_arrival", maxDays: 30 },
  BR_AE: { status: "visa_free", maxDays: 30 },

  // ── Mexican passport (MX) ─────────────────────────────────────────────────
  MX_US: { status: "visa_required", notes: { es: "Requiere visa B1/B2", en: "B1/B2 visa required" } },
  MX_CA: { status: "visa_required", notes: { es: "Requiere visa de turista", en: "Tourist visa required" } },
  MX_AR: { status: "visa_free", maxDays: 180 },
  MX_BR: { status: "visa_free", maxDays: 90 },
  MX_CL: { status: "visa_free", maxDays: 90 },
  MX_CO: { status: "visa_free", maxDays: 90 },
  MX_PE: { status: "visa_free", maxDays: 183 },
  MX_GB: { status: "visa_free", maxDays: 180 },
  MX_ES: { status: "visa_free", maxDays: 90, notes: { es: "Espacio Schengen", en: "Schengen area" } },
  MX_FR: { status: "visa_free", maxDays: 90, notes: { es: "Espacio Schengen", en: "Schengen area" } },
  MX_IT: { status: "visa_free", maxDays: 90, notes: { es: "Espacio Schengen", en: "Schengen area" } },
  MX_JP: { status: "visa_free", maxDays: 90 },
  MX_AE: { status: "visa_free", maxDays: 30 },
  MX_TH: { status: "visa_on_arrival", maxDays: 30 },

  // ── Colombian passport (CO) ───────────────────────────────────────────────
  CO_US: { status: "visa_required", notes: { es: "Requiere visa B1/B2", en: "B1/B2 visa required" } },
  CO_CA: { status: "visa_required", notes: { es: "Requiere visa de turista", en: "Tourist visa required" } },
  CO_AR: { status: "visa_free", maxDays: 90 },
  CO_BR: { status: "visa_free", maxDays: 90 },
  CO_MX: { status: "visa_free", maxDays: 180 },
  CO_CL: { status: "visa_free", maxDays: 90 },
  CO_PE: { status: "visa_free", maxDays: 183 },
  CO_EC: { status: "visa_free", maxDays: 90 },
  CO_PA: { status: "visa_free", maxDays: 90 },
  CO_ES: { status: "visa_free", maxDays: 90, notes: { es: "Espacio Schengen", en: "Schengen area" } },
  CO_FR: { status: "visa_free", maxDays: 90, notes: { es: "Espacio Schengen", en: "Schengen area" } },
  CO_GB: { status: "visa_required", notes: { es: "Requiere visa de turista", en: "Tourist visa required" } },
  CO_TH: { status: "visa_on_arrival", maxDays: 30 },
  CO_AE: { status: "visa_free", maxDays: 30 },

  // ── Chilean passport (CL) ─────────────────────────────────────────────────
  CL_US: { status: "visa_free", maxDays: 90 },
  CL_CA: { status: "visa_free", maxDays: 180 },
  CL_AR: { status: "visa_free", maxDays: 90 },
  CL_BR: { status: "visa_free", maxDays: 90 },
  CL_MX: { status: "visa_free", maxDays: 180 },
  CL_CO: { status: "visa_free", maxDays: 90 },
  CL_PE: { status: "visa_free", maxDays: 183 },
  CL_UY: { status: "visa_free", maxDays: 90 },
  CL_GB: { status: "visa_free", maxDays: 180 },
  CL_ES: { status: "visa_free", maxDays: 90, notes: { es: "Espacio Schengen", en: "Schengen area" } },
  CL_FR: { status: "visa_free", maxDays: 90, notes: { es: "Espacio Schengen", en: "Schengen area" } },
  CL_JP: { status: "visa_free", maxDays: 90 },
  CL_AU: { status: "visa_free", maxDays: 90 },
  CL_TH: { status: "visa_on_arrival", maxDays: 30 },

  // ── Peruvian passport (PE) ────────────────────────────────────────────────
  PE_US: { status: "visa_required", notes: { es: "Requiere visa B1/B2", en: "B1/B2 visa required" } },
  PE_CA: { status: "visa_required", notes: { es: "Requiere visa de turista", en: "Tourist visa required" } },
  PE_AR: { status: "visa_free", maxDays: 183 },
  PE_BR: { status: "visa_free", maxDays: 90 },
  PE_MX: { status: "visa_free", maxDays: 180 },
  PE_CL: { status: "visa_free", maxDays: 183 },
  PE_CO: { status: "visa_free", maxDays: 183 },
  PE_EC: { status: "visa_free", maxDays: 90 },
  PE_PA: { status: "visa_free", maxDays: 90 },
  PE_ES: { status: "visa_free", maxDays: 90, notes: { es: "Espacio Schengen", en: "Schengen area" } },
  PE_FR: { status: "visa_free", maxDays: 90, notes: { es: "Espacio Schengen", en: "Schengen area" } },
  PE_GB: { status: "visa_required", notes: { es: "Requiere visa de turista", en: "Tourist visa required" } },
  PE_TH: { status: "visa_on_arrival", maxDays: 30 },

  // ── Spanish passport (ES) ─────────────────────────────────────────────────
  ES_US: { status: "visa_free", maxDays: 90, notes: { es: "Programa ESTA requerido", en: "ESTA required" } },
  ES_CA: { status: "visa_free", maxDays: 180 },
  ES_AR: { status: "visa_free", maxDays: 90 },
  ES_BR: { status: "visa_free", maxDays: 90 },
  ES_MX: { status: "visa_free", maxDays: 180 },
  ES_CO: { status: "visa_free", maxDays: 90 },
  ES_CL: { status: "visa_free", maxDays: 90 },
  ES_PE: { status: "visa_free", maxDays: 183 },
  ES_JP: { status: "visa_free", maxDays: 90 },
  ES_AU: { status: "eta_required", notes: { es: "ETA requerida (AUS eTA)", en: "ETA required (AUS eTA)" } },
  ES_NZ: { status: "visa_free", maxDays: 90 },
  ES_TH: { status: "visa_on_arrival", maxDays: 30 },
  ES_AE: { status: "visa_free", maxDays: 90 },
  ES_IN: { status: "visa_required", notes: { es: "Requiere visa de turista", en: "Tourist visa required" } },
};

// ── Country name → ISO 3166-1 alpha-2 mapping ─────────────────────────────
// Maps the full country names used in AIRPORTS to ISO codes

const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  // Americas
  "United States": "US",
  "USA":           "US",
  "Canada":        "CA",
  "Argentina":     "AR",
  "Brazil":        "BR",
  "Mexico":        "MX",
  "Colombia":      "CO",
  "Chile":         "CL",
  "Peru":          "PE",
  "Uruguay":       "UY",
  "Paraguay":      "PY",
  "Bolivia":       "BO",
  "Ecuador":       "EC",
  "Venezuela":     "VE",
  "Panama":        "PA",
  "Costa Rica":    "CR",
  "Guatemala":     "GT",
  "El Salvador":   "SV",
  "Dominican Republic": "DO",
  "Cuba":          "CU",
  "Jamaica":       "JM",
  "Bahamas":       "BS",
  "Barbados":      "BB",
  "Trinidad & Tobago": "TT",
  "Cayman Islands":"KY",
  "Puerto Rico":   "PR",
  "Curaçao":       "CW",
  "Aruba":         "AW",
  "Antigua":       "AG",
  // Europe
  "United Kingdom":"GB",
  "France":        "FR",
  "Spain":         "ES",
  "Italy":         "IT",
  "Germany":       "DE",
  "Portugal":      "PT",
  "Netherlands":   "NL",
  "Belgium":       "BE",
  "Austria":       "AT",
  "Switzerland":   "CH",
  "Sweden":        "SE",
  "Norway":        "NO",
  "Denmark":       "DK",
  "Finland":       "FI",
  "Ireland":       "IE",
  "Greece":        "GR",
  "Poland":        "PL",
  "Czech Republic":"CZ",
  "Hungary":       "HU",
  "Romania":       "RO",
  "Ukraine":       "UA",
  "Turkey":        "TR",
  // Asia-Pacific
  "Japan":         "JP",
  "South Korea":   "KR",
  "China":         "CN",
  "Hong Kong":     "HK",
  "Taiwan":        "TW",
  "Singapore":     "SG",
  "Malaysia":      "MY",
  "Thailand":      "TH",
  "Indonesia":     "ID",
  "Vietnam":       "VN",
  "Philippines":   "PH",
  "India":         "IN",
  "Australia":     "AU",
  "New Zealand":   "NZ",
  // Middle East
  "UAE":           "AE",
  "Qatar":         "QA",
  "Saudi Arabia":  "SA",
  "Bahrain":       "BH",
  "Kuwait":        "KW",
  "Oman":          "OM",
  "Jordan":        "JO",
  "Lebanon":       "LB",
  "Israel":        "IL",
  "Egypt":         "EG",
  // Africa
  "South Africa":  "ZA",
  "Kenya":         "KE",
  "Ethiopia":      "ET",
  "Morocco":       "MA",
  "Ghana":         "GH",
};

// ── Public helpers ─────────────────────────────────────────────────────────

/**
 * Look up visa requirements for a passport/destination pair.
 * Returns null if the combination is not in the database.
 */
export function checkVisa(
  passportCountry: string,
  destinationCountry: string,
): VisaInfo | null {
  const key = `${passportCountry.toUpperCase()}_${destinationCountry.toUpperCase()}`;
  return VISA_DB[key] ?? null;
}

/**
 * Resolve an IATA airport code to an ISO 3166-1 alpha-2 country code.
 * Returns null if the airport is unknown or no ISO mapping exists.
 */
export function getCountryFromAirport(iataCode: string): string | null {
  const airport = AIRPORTS[iataCode.toUpperCase()];
  if (!airport) return null;
  // US airports have no `country` field — they default to USA
  const countryName = airport.country ?? "United States";
  return COUNTRY_NAME_TO_ISO[countryName] ?? null;
}
