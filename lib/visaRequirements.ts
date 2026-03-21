// Visa requirements for Argentine passport holders (AR)
// Source: official government / Timatic data (approximate, verify before travel)

const IATA_TO_COUNTRY: Record<string, string> = {
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
  // Other
  YYZ: "CA", YVR: "CA", YUL: "CA",
  SYD: "AU", MEL: "AU",
  NRT: "JP", KIX: "JP",
  DXB: "AE", AUH: "AE",
  IST: "TR",
  SIN: "SG",
  BKK: "TH",
  KUL: "MY",
  ICN: "KR",
  PEK: "CN", PVG: "CN",
  JNB: "ZA",
  CAI: "EG",
  CMN: "MA",
};

const VISA_REQUIREMENTS: Record<string, { required: boolean; notes: string }> = {
  // Requires visa / pre-travel authorization
  "AR→US": { required: true,  notes: "ESTA obligatorio — tramitar en esta.cbp.dhs.gov" },
  "AR→GB": { required: true,  notes: "ETA UK requerida — gov.uk/check-uk-visa" },
  "AR→AU": { required: true,  notes: "ETA requerida — immi.homeaffairs.gov.au" },
  "AR→CA": { required: true,  notes: "eTA requerida — canada.ca" },
  "AR→CN": { required: true,  notes: "Visa requerida — solicitar con anticipación" },
  "AR→KR": { required: true,  notes: "K-ETA requerida — k-eta.go.kr" },
  "AR→EG": { required: true,  notes: "Visa on arrival disponible" },
  "AR→MA": { required: true,  notes: "Visa requerida — consulado marroquí" },

  // Visa-free / easy access
  "AR→JP": { required: false, notes: "Sin visa hasta 90 días" },
  "AR→AE": { required: false, notes: "Sin visa hasta 30 días" },
  "AR→TR": { required: false, notes: "Sin visa hasta 90 días" },
  "AR→SG": { required: false, notes: "Sin visa hasta 90 días" },
  "AR→TH": { required: false, notes: "Sin visa hasta 30 días" },
  "AR→MY": { required: false, notes: "Sin visa hasta 90 días" },
  "AR→ZA": { required: false, notes: "Sin visa hasta 30 días" },

  // Latam (all visa-free for AR)
  "AR→BR": { required: false, notes: "Sin visa — ingreso libre" },
  "AR→CL": { required: false, notes: "Sin visa — ingreso libre" },
  "AR→PE": { required: false, notes: "Sin visa hasta 183 días" },
  "AR→CO": { required: false, notes: "Sin visa hasta 90 días" },
  "AR→MX": { required: false, notes: "Sin visa hasta 180 días" },
  "AR→EC": { required: false, notes: "Sin visa hasta 90 días" },
  "AR→UY": { required: false, notes: "Sin visa — ingreso libre" },
  "AR→PY": { required: false, notes: "Sin visa — ingreso libre" },
  "AR→BO": { required: false, notes: "Sin visa hasta 90 días" },
  "AR→VE": { required: false, notes: "Sin visa hasta 90 días" },
  "AR→GT": { required: false, notes: "Sin visa hasta 90 días" },
  "AR→SV": { required: false, notes: "Sin visa hasta 90 días" },
  "AR→HN": { required: false, notes: "Sin visa hasta 90 días" },
  "AR→NI": { required: false, notes: "Sin visa hasta 90 días" },
  "AR→CR": { required: false, notes: "Sin visa hasta 90 días" },
  "AR→PA": { required: false, notes: "Sin visa hasta 180 días" },

  // Caribbean
  "AR→JM": { required: false, notes: "Sin visa hasta 90 días" },
  "AR→DO": { required: false, notes: "Sin visa hasta 30 días" },
  "AR→CU": { required: false, notes: "Sin visa hasta 30 días" },
  "AR→BS": { required: false, notes: "Sin visa hasta 8 meses" },
  "AR→KY": { required: false, notes: "Sin visa hasta 30 días" },

  // Schengen (all visa-free for AR up to 90 days)
  "AR→ES": { required: false, notes: "Sin visa Schengen hasta 90 días" },
  "AR→FR": { required: false, notes: "Sin visa Schengen hasta 90 días" },
  "AR→IT": { required: false, notes: "Sin visa Schengen hasta 90 días" },
  "AR→DE": { required: false, notes: "Sin visa Schengen hasta 90 días" },
  "AR→NL": { required: false, notes: "Sin visa Schengen hasta 90 días" },
  "AR→PT": { required: false, notes: "Sin visa Schengen hasta 90 días" },
  "AR→AT": { required: false, notes: "Sin visa Schengen hasta 90 días" },
  "AR→BE": { required: false, notes: "Sin visa Schengen hasta 90 días" },
  "AR→DK": { required: false, notes: "Sin visa Schengen hasta 90 días" },
  "AR→SE": { required: false, notes: "Sin visa Schengen hasta 90 días" },
  "AR→FI": { required: false, notes: "Sin visa Schengen hasta 90 días" },
  "AR→NO": { required: false, notes: "Sin visa Schengen hasta 90 días" },
  "AR→PL": { required: false, notes: "Sin visa Schengen hasta 90 días" },
  "AR→CZ": { required: false, notes: "Sin visa Schengen hasta 90 días" },
  "AR→HU": { required: false, notes: "Sin visa Schengen hasta 90 días" },
  "AR→GR": { required: false, notes: "Sin visa Schengen hasta 90 días" },
  "AR→CH": { required: false, notes: "Sin visa hasta 90 días" },
};

// Argentine airport IATA codes — used to skip domestic/origin-side display
const ARGENTINA_IATA = new Set([
  "EZE", "AEP", "MDZ", "COR", "BRC", "IGR", "SLA", "TUC",
  "ROS", "NQN", "CRD", "USH", "PMY", "RGL", "FTE",
]);

export function getVisaRequirement(
  destinationCode: string,
): { required: boolean; notes: string } | null {
  // Skip Argentine airports (no visa needed for Argentina→Argentina)
  if (ARGENTINA_IATA.has(destinationCode)) return null;

  const country = IATA_TO_COUNTRY[destinationCode];
  if (!country) return null;

  return VISA_REQUIREMENTS[`AR→${country}`] ?? null;
}

export function isArgentineAirport(iataCode: string): boolean {
  return ARGENTINA_IATA.has(iataCode);
}
