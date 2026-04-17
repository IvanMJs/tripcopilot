// Shared flight utilities used by FlightSearch and TripPanel

export const AIRLINES: Record<string, { name: string; icao: string }> = {
  // US Majors
  AA:  { name: "American Airlines",      icao: "AAL" }, AAL: { name: "American Airlines",      icao: "AAL" },
  DL:  { name: "Delta Air Lines",        icao: "DAL" }, DAL: { name: "Delta Air Lines",        icao: "DAL" },
  UA:  { name: "United Airlines",        icao: "UAL" }, UAL: { name: "United Airlines",        icao: "UAL" },
  B6:  { name: "JetBlue Airways",        icao: "JBU" }, JBU: { name: "JetBlue Airways",        icao: "JBU" },
  WN:  { name: "Southwest Airlines",     icao: "SWA" }, SWA: { name: "Southwest Airlines",     icao: "SWA" },
  AS:  { name: "Alaska Airlines",        icao: "ASA" }, ASA: { name: "Alaska Airlines",        icao: "ASA" },
  NK:  { name: "Spirit Airlines",        icao: "NKS" }, NKS: { name: "Spirit Airlines",        icao: "NKS" },
  F9:  { name: "Frontier Airlines",      icao: "FFT" }, FFT: { name: "Frontier Airlines",      icao: "FFT" },
  HA:  { name: "Hawaiian Airlines",      icao: "HAL" }, HAL: { name: "Hawaiian Airlines",      icao: "HAL" },
  G4:  { name: "Allegiant Air",          icao: "AAY" }, AAY: { name: "Allegiant Air",          icao: "AAY" },
  // US Regionals
  "9E": { name: "Endeavor Air",          icao: "EDV" }, EDV: { name: "Endeavor Air",           icao: "EDV" },
  OH:  { name: "PSA Airlines",           icao: "JIA" }, JIA: { name: "PSA Airlines",           icao: "JIA" },
  YX:  { name: "Republic Airways",       icao: "RPA" }, RPA: { name: "Republic Airways",       icao: "RPA" },
  MQ:  { name: "Envoy Air",              icao: "ENY" }, ENY: { name: "Envoy Air",              icao: "ENY" },
  OO:  { name: "SkyWest Airlines",       icao: "SKW" }, SKW: { name: "SkyWest Airlines",       icao: "SKW" },
  YV:  { name: "Mesa Airlines",          icao: "ASH" }, ASH: { name: "Mesa Airlines",          icao: "ASH" },
  CP:  { name: "Compass Airlines",       icao: "CPZ" }, CPZ: { name: "Compass Airlines",       icao: "CPZ" },
  // Latin America
  AC:  { name: "Air Canada",             icao: "ACA" }, ACA: { name: "Air Canada",             icao: "ACA" },
  AM:  { name: "Aeroméxico",             icao: "AMX" }, AMX: { name: "Aeroméxico",             icao: "AMX" },
  AR:  { name: "Aerolíneas Argentinas",  icao: "ARG" }, ARG: { name: "Aerolíneas Argentinas",  icao: "ARG" },
  LA:  { name: "LATAM Airlines",         icao: "LAN" }, LAN: { name: "LATAM Airlines",         icao: "LAN" },
  CM:  { name: "Copa Airlines",          icao: "CMP" }, CMP: { name: "Copa Airlines",          icao: "CMP" },
  AV:  { name: "Avianca",                icao: "AVA" }, AVA: { name: "Avianca",                icao: "AVA" },
  // Europe
  IB:  { name: "Iberia",                 icao: "IBE" }, IBE: { name: "Iberia",                 icao: "IBE" },
  BA:  { name: "British Airways",        icao: "BAW" }, BAW: { name: "British Airways",        icao: "BAW" },
  LH:  { name: "Lufthansa",              icao: "DLH" }, DLH: { name: "Lufthansa",              icao: "DLH" },
  AF:  { name: "Air France",             icao: "AFR" }, AFR: { name: "Air France",             icao: "AFR" },
  KL:  { name: "KLM",                    icao: "KLM" },
  // Middle East
  EK:  { name: "Emirates",                    icao: "UAE" }, UAE: { name: "Emirates",                    icao: "UAE" },
  QR:  { name: "Qatar Airways",               icao: "QTR" }, QTR: { name: "Qatar Airways",               icao: "QTR" },
  TK:  { name: "Turkish Airlines",            icao: "THY" }, THY: { name: "Turkish Airlines",            icao: "THY" },
  EY:  { name: "Etihad Airways",              icao: "ETD" }, ETD: { name: "Etihad Airways",              icao: "ETD" },
  FZ:  { name: "flydubai",                    icao: "FDB" }, FDB: { name: "flydubai",                    icao: "FDB" },
  G9:  { name: "Air Arabia",                  icao: "ABY" }, ABY: { name: "Air Arabia",                  icao: "ABY" },
  SV:  { name: "Saudia",                      icao: "SVA" }, SVA: { name: "Saudia",                      icao: "SVA" },
  GF:  { name: "Gulf Air",                    icao: "GFA" }, GFA: { name: "Gulf Air",                    icao: "GFA" },
  RJ:  { name: "Royal Jordanian",             icao: "RJA" }, RJA: { name: "Royal Jordanian",             icao: "RJA" },
  ME:  { name: "Middle East Airlines",        icao: "MEA" }, MEA: { name: "Middle East Airlines",        icao: "MEA" },
  WY:  { name: "Oman Air",                    icao: "OMA" }, OMA: { name: "Oman Air",                    icao: "OMA" },
  // Europe — Full service
  LX:  { name: "Swiss International Air Lines", icao: "SWR" }, SWR: { name: "Swiss International Air Lines", icao: "SWR" },
  OS:  { name: "Austrian Airlines",           icao: "AUA" }, AUA: { name: "Austrian Airlines",           icao: "AUA" },
  SK:  { name: "Scandinavian Airlines",       icao: "SAS" }, SAS: { name: "Scandinavian Airlines",       icao: "SAS" },
  AY:  { name: "Finnair",                     icao: "FIN" }, FIN: { name: "Finnair",                     icao: "FIN" },
  EI:  { name: "Aer Lingus",                  icao: "EIN" }, EIN: { name: "Aer Lingus",                  icao: "EIN" },
  TP:  { name: "TAP Air Portugal",            icao: "TAP" }, TAP: { name: "TAP Air Portugal",            icao: "TAP" },
  AZ:  { name: "ITA Airways",                 icao: "ITY" }, ITY: { name: "ITA Airways",                 icao: "ITY" },
  SN:  { name: "Brussels Airlines",           icao: "BEL" }, BEL: { name: "Brussels Airlines",           icao: "BEL" },
  LO:  { name: "LOT Polish Airlines",         icao: "LOT" }, LOT: { name: "LOT Polish Airlines",         icao: "LOT" },
  OK:  { name: "Czech Airlines",              icao: "CSA" }, CSA: { name: "Czech Airlines",              icao: "CSA" },
  // Europe — LCC
  FR:  { name: "Ryanair",                     icao: "RYR" }, RYR: { name: "Ryanair",                     icao: "RYR" },
  U2:  { name: "easyJet",                     icao: "EZY" }, EZY: { name: "easyJet",                     icao: "EZY" },
  VY:  { name: "Vueling",                     icao: "VLG" }, VLG: { name: "Vueling",                     icao: "VLG" },
  W6:  { name: "Wizz Air",                    icao: "WZZ" }, WZZ: { name: "Wizz Air",                    icao: "WZZ" },
  PC:  { name: "Pegasus Airlines",            icao: "PGT" }, PGT: { name: "Pegasus Airlines",            icao: "PGT" },
  HV:  { name: "Transavia",                   icao: "TRA" }, TRA: { name: "Transavia",                   icao: "TRA" },
  TO:  { name: "Transavia France",            icao: "TVF" }, TVF: { name: "Transavia France",            icao: "TVF" },
  // Asia
  SQ:  { name: "Singapore Airlines",          icao: "SIA" }, SIA: { name: "Singapore Airlines",          icao: "SIA" },
  CX:  { name: "Cathay Pacific",              icao: "CPA" }, CPA: { name: "Cathay Pacific",              icao: "CPA" },
  JL:  { name: "Japan Airlines",              icao: "JAL" }, JAL: { name: "Japan Airlines",              icao: "JAL" },
  NH:  { name: "All Nippon Airways",          icao: "ANA" }, ANA: { name: "All Nippon Airways",          icao: "ANA" },
  KE:  { name: "Korean Air",                  icao: "KAL" }, KAL: { name: "Korean Air",                  icao: "KAL" },
  OZ:  { name: "Asiana Airlines",             icao: "AAR" }, AAR: { name: "Asiana Airlines",             icao: "AAR" },
  CI:  { name: "China Airlines",              icao: "CAL" }, CAL: { name: "China Airlines",              icao: "CAL" },
  BR:  { name: "EVA Air",                     icao: "EVA" }, EVA: { name: "EVA Air",                     icao: "EVA" },
  MH:  { name: "Malaysia Airlines",           icao: "MAS" }, MAS: { name: "Malaysia Airlines",           icao: "MAS" },
  TG:  { name: "Thai Airways",                icao: "THA" }, THA: { name: "Thai Airways",                icao: "THA" },
  VN:  { name: "Vietnam Airlines",            icao: "HVN" }, HVN: { name: "Vietnam Airlines",            icao: "HVN" },
  PR:  { name: "Philippine Airlines",         icao: "PAL" }, PAL: { name: "Philippine Airlines",         icao: "PAL" },
  GA:  { name: "Garuda Indonesia",            icao: "GIA" }, GIA: { name: "Garuda Indonesia",            icao: "GIA" },
  QF:  { name: "Qantas",                      icao: "QFA" }, QFA: { name: "Qantas",                      icao: "QFA" },
  VA:  { name: "Virgin Australia",            icao: "VOZ" }, VOZ: { name: "Virgin Australia",            icao: "VOZ" },
  NZ:  { name: "Air New Zealand",             icao: "ANZ" }, ANZ: { name: "Air New Zealand",             icao: "ANZ" },
  AI:  { name: "Air India",                   icao: "AIC" }, AIC: { name: "Air India",                   icao: "AIC" },
  "6E": { name: "IndiGo",                     icao: "IGO" }, IGO: { name: "IndiGo",                      icao: "IGO" },
  // Africa
  ET:  { name: "Ethiopian Airlines",          icao: "ETH" }, ETH: { name: "Ethiopian Airlines",          icao: "ETH" },
  SA:  { name: "South African Airways",       icao: "SAA" }, SAA: { name: "South African Airways",       icao: "SAA" },
  MS:  { name: "EgyptAir",                    icao: "MSR" }, MSR: { name: "EgyptAir",                    icao: "MSR" },
  AT:  { name: "Royal Air Maroc",             icao: "RAM" }, RAM: { name: "Royal Air Maroc",             icao: "RAM" },
  // More Latin America
  G3:  { name: "Gol Linhas Aéreas",           icao: "GLO" }, GLO: { name: "Gol Linhas Aéreas",           icao: "GLO" },
  AD:  { name: "Azul Brazilian Airlines",     icao: "AZU" }, AZU: { name: "Azul Brazilian Airlines",     icao: "AZU" },
  JJ:  { name: "LATAM Brasil",                icao: "TAM" }, TAM: { name: "LATAM Brasil",                icao: "TAM" },
  H2:  { name: "Sky Airline",                 icao: "SKU" }, SKU: { name: "Sky Airline",                 icao: "SKU" },
  P9:  { name: "Wingo",                       icao: "WGO" }, WGO: { name: "Wingo",                       icao: "WGO" },
  LP:  { name: "LATAM Perú",                  icao: "LPE" }, LPE: { name: "LATAM Perú",                  icao: "LPE" },
  XL:  { name: "LATAM Ecuador",               icao: "LNE" }, LNE: { name: "LATAM Ecuador",               icao: "LNE" },
  PZ:  { name: "LATAM Paraguay",              icao: "LAP" }, LAP: { name: "LATAM Paraguay",              icao: "LAP" },
  OB:  { name: "Boliviana de Aviación",       icao: "BOV" }, BOV: { name: "Boliviana de Aviación",       icao: "BOV" },
  // Canada
  WS:  { name: "WestJet",                     icao: "WJA" }, WJA: { name: "WestJet",                     icao: "WJA" },
};

export interface ParsedFlight {
  airlineCode: string;
  airlineName: string;
  airlineIcao: string;
  flightNumber: string;
  fullCode: string;        // "AA 900"
  flightAwareUrl: string;
}

export function parseFlightCode(input: string): ParsedFlight | null {
  const clean = input.trim().toUpperCase().replace(/\s+/g, "");

  // Try ICAO 3-letter first (EDV5068), then IATA 2-char (AA900, B6766, 9E5068)
  const match =
    clean.match(/^([A-Z]{3})(\d{1,5})$/) ||
    clean.match(/^([A-Z0-9]{2})(\d{1,5})$/);
  if (!match) return null;

  const [, airlineCode, num] = match;
  const airline = AIRLINES[airlineCode];
  if (!airline) return null;

  return {
    airlineCode,
    airlineName: airline.name,
    airlineIcao: airline.icao,
    flightNumber: num,
    fullCode: `${airlineCode} ${num}`,
    flightAwareUrl: `https://www.flightaware.com/live/flight/${airline.icao}${num}`,
  };
}

/**
 * Subtract decimal hours from an HH:MM string.
 * subtractHours("20:30", 3)   → "17:30"
 * subtractHours("12:55", 1.5) → "11:25"
 * Handles crossing midnight (modular arithmetic).
 */
export function subtractHours(timeStr: string, hours: number): string {
  const [h, m] = timeStr.split(":").map(Number);
  const totalMins = h * 60 + m - Math.round(hours * 60);
  const adjusted = ((totalMins % 1440) + 1440) % 1440;
  return `${Math.floor(adjusted / 60).toString().padStart(2, "0")}:${(adjusted % 60).toString().padStart(2, "0")}`;
}

/**
 * Human-readable arrival buffer note.
 * buildArrivalNote(1.5, "es") → "1.5 hs antes"
 * buildArrivalNote(3, "en")   → "3 hrs before"
 */
export function buildArrivalNote(buffer: number, locale: "es" | "en"): string {
  const str = Number.isInteger(buffer) ? `${buffer}` : `${buffer}`;
  return locale === "es" ? `${str} hs antes` : `${str} hrs before`;
}

/**
 * Estimate flight duration from great-circle distance between two airports.
 * Returns a string like "13h 15min" or "1h 50min", or null if coords unavailable.
 */
export function estimateFlightDuration(
  originLat: number, originLng: number,
  destLat: number, destLng: number,
): string {
  const R = 6371;
  const dLat = (destLat - originLat) * (Math.PI / 180);
  const dLon = (destLng - originLng) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(originLat * (Math.PI / 180)) *
    Math.cos(destLat * (Math.PI / 180)) *
    Math.sin(dLon / 2) ** 2;
  const distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  // 850 km/h effective speed (accounts for climb/descent and average headwinds)
  const totalMins = Math.round((distanceKm / 850) * 60);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}
