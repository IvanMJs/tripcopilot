import { TripFlight } from "./types";
import { AirportStatusMap } from "./types";
import { AIRPORTS } from "./airports";

// ── Minimum Connection Times (minutes) ────────────────────────────────────────
// Based on published MCT data from major carriers and airport guides.
// "domestic": both origin & destination are USA airports
// "international": at least one leg crosses into/out of USA
const MCT: Record<string, { domestic: number; international: number }> = {
  ATL: { domestic: 45,  international: 60  },
  ORD: { domestic: 60,  international: 90  },
  DFW: { domestic: 50,  international: 75  },
  JFK: { domestic: 90,  international: 120 },  // JFK notoriously long
  MIA: { domestic: 45,  international: 90  },
  LAX: { domestic: 60,  international: 90  },
  EWR: { domestic: 60,  international: 90  },
  LGA: { domestic: 45,  international: 60  },
  SFO: { domestic: 60,  international: 90  },
  BOS: { domestic: 45,  international: 75  },
  CLT: { domestic: 45,  international: 60  },
  IAH: { domestic: 45,  international: 75  },
  SEA: { domestic: 60,  international: 90  },
  DTW: { domestic: 45,  international: 75  },
  MSP: { domestic: 45,  international: 60  },
  DEN: { domestic: 45,  international: 60  },
  PHX: { domestic: 45,  international: 60  },
  MCO: { domestic: 40,  international: 60  },
  FLL: { domestic: 40,  international: 60  },
  // International hubs with longer MCT
  GRU: { domestic: 60,  international: 90  },  // São Paulo
  PTY: { domestic: 60,  international: 90  },  // Panama (major LATAM hub)
  BOG: { domestic: 60,  international: 75  },
  LIM: { domestic: 60,  international: 90  },
  SCL: { domestic: 45,  international: 75  },
  // Europe
  LHR: { domestic: 60,  international: 90  },  // London Heathrow
  LGW: { domestic: 45,  international: 60  },  // London Gatwick
  CDG: { domestic: 60,  international: 90  },  // Paris Charles de Gaulle
  ORY: { domestic: 45,  international: 60  },  // Paris Orly
  AMS: { domestic: 45,  international: 75  },  // Amsterdam Schiphol
  FRA: { domestic: 45,  international: 75  },  // Frankfurt
  MUC: { domestic: 45,  international: 60  },  // Munich
  MAD: { domestic: 45,  international: 75  },  // Madrid Barajas
  BCN: { domestic: 45,  international: 60  },  // Barcelona El Prat
  FCO: { domestic: 60,  international: 90  },  // Rome Fiumicino
  MXP: { domestic: 45,  international: 60  },  // Milan Malpensa
  ZRH: { domestic: 45,  international: 75  },  // Zurich
  VIE: { domestic: 45,  international: 75  },  // Vienna
  BRU: { domestic: 45,  international: 75  },  // Brussels
  CPH: { domestic: 45,  international: 75  },  // Copenhagen
  ARN: { domestic: 45,  international: 60  },  // Stockholm Arlanda
  HEL: { domestic: 45,  international: 60  },  // Helsinki
  LIS: { domestic: 45,  international: 60  },  // Lisbon
  DUB: { domestic: 45,  international: 60  },  // Dublin
  MAN: { domestic: 45,  international: 60  },  // Manchester
  OSL: { domestic: 45,  international: 60  },  // Oslo
  WAW: { domestic: 45,  international: 60  },  // Warsaw
  // Middle East & Africa
  IST: { domestic: 60,  international: 90  },  // Istanbul
  SAW: { domestic: 45,  international: 60  },  // Istanbul Sabiha
  DXB: { domestic: 90,  international: 90  },  // Dubai
  DOH: { domestic: 60,  international: 90  },  // Doha
  AUH: { domestic: 60,  international: 90  },  // Abu Dhabi
  CAI: { domestic: 60,  international: 90  },  // Cairo
  JNB: { domestic: 60,  international: 90  },  // Johannesburg
  NBO: { domestic: 60,  international: 75  },  // Nairobi
  ADD: { domestic: 60,  international: 75  },  // Addis Ababa
  CMN: { domestic: 60,  international: 75  },  // Casablanca
  // Asia-Pacific
  SIN: { domestic: 60,  international: 90  },  // Singapore Changi
  BKK: { domestic: 60,  international: 90  },  // Bangkok Suvarnabhumi
  HKG: { domestic: 60,  international: 90  },  // Hong Kong
  NRT: { domestic: 90,  international: 90  },  // Tokyo Narita
  HND: { domestic: 60,  international: 75  },  // Tokyo Haneda
  ICN: { domestic: 60,  international: 90  },  // Seoul Incheon
  PVG: { domestic: 60,  international: 90  },  // Shanghai Pudong
  PEK: { domestic: 90,  international: 90  },  // Beijing Capital
  SYD: { domestic: 60,  international: 90  },  // Sydney
  MEL: { domestic: 45,  international: 60  },  // Melbourne
  AKL: { domestic: 45,  international: 75  },  // Auckland
  KUL: { domestic: 60,  international: 90  },  // Kuala Lumpur
  MNL: { domestic: 60,  international: 90  },  // Manila
  CGK: { domestic: 60,  international: 90  },  // Jakarta
  DEL: { domestic: 60,  international: 90  },  // Delhi
  BOM: { domestic: 60,  international: 90  },  // Mumbai
  // Canada
  YYZ: { domestic: 45,  international: 75  },  // Toronto Pearson
  YVR: { domestic: 45,  international: 75  },  // Vancouver
  YUL: { domestic: 45,  international: 75  },  // Montreal
  // Latin America (additional)
  MEX: { domestic: 60,  international: 90  },  // Mexico City
  CUN: { domestic: 45,  international: 60  },  // Cancun
  GDL: { domestic: 45,  international: 60  },  // Guadalajara
  MDE: { domestic: 45,  international: 60  },  // Medellin
  UIO: { domestic: 60,  international: 75  },  // Quito
  GIG: { domestic: 60,  international: 90  },  // Rio de Janeiro
  SSA: { domestic: 45,  international: 60  },  // Salvador
  EZE: { domestic: 60,  international: 90  },  // Buenos Aires Ezeiza
  AEP: { domestic: 30,  international: 60  },  // Buenos Aires Aeroparque
  MVD: { domestic: 45,  international: 75  },  // Montevideo
  ASU: { domestic: 45,  international: 60  },  // Asuncion
};

const MCT_DEFAULT = { domestic: 60, international: 90 };

// IATA definition: connection < 24h; stopover ≥ 24h.
// Gaps of 24h+ are intentional stopovers — not analyzed as connections.
const MAX_CONNECTION_MINUTES = 24 * 60; // 1440

// US domestic airport codes (FAA-covered)
const US_AIRPORTS = new Set([
  "ATL","LAX","ORD","DFW","DEN","JFK","SFO","SEA","LAS","MCO","MIA","CLT",
  "EWR","PHX","IAH","BOS","MSP","DTW","FLL","LGA","BWI","SLC","PHL","DCA",
  "IAD","HNL","MDW","SAN","TPA","PDX",
  "AUS","BNA","BUF","CLE","CMH","CVG","DAL","DAY","ELP","GRR","HOU","IND",
  "JAX","MCI","MEM","MKE","MSY","OAK","OKC","OMA","ONT","ORF","PBI","PIT",
  "RDU","RIC","RSW","SJC","SNA","STL","TUS",
]);

function isUSAirport(code: string): boolean {
  return US_AIRPORTS.has(code);
}

export type ConnectionRisk = "safe" | "tight" | "at_risk" | "missed";

export interface ConnectionAnalysis {
  risk: ConnectionRisk;
  connectionAirport: string;
  /** Minutes between estimated arrival and next departure (before delay) */
  scheduledBufferMinutes: number;
  /** Delay minutes added by FAA status at connection airport */
  delayAddedMinutes: number;
  /** Effective buffer after accounting for delay */
  effectiveBufferMinutes: number;
  /** Minimum required connection time for this airport/route */
  mctMinutes: number;
}

// Average flight duration estimates (minutes) per distance category
function estimateFlightDuration(originCode: string, destCode: string): number {
  const originUS = isUSAirport(originCode);
  const destUS   = isUSAirport(destCode);

  if (originUS && destUS)  return 165; // avg US domestic: ~2h 45m
  if (!originUS || !destUS) return 240; // avg international: ~4h
  return 180;
}

/**
 * Convert a local departure time (HH:MM in the airport's named timezone) to
 * UTC minutes from epoch. Uses Intl.DateTimeFormat without external libraries.
 * Falls back to treating as UTC if the timezone is unknown or Intl fails.
 */
function localToUTCMinutes(isoDate: string, timeHHMM: string, timezone: string): number | null {
  if (!timeHHMM) return null;
  const parts = timeHHMM.split(":").map(Number);
  if (parts.length < 2) return null;
  const [h, m] = parts;

  try {
    // Treat the local time as UTC to get a reference Date
    const refMs = Date.UTC(
      parseInt(isoDate.slice(0, 4)),
      parseInt(isoDate.slice(5, 7)) - 1,
      parseInt(isoDate.slice(8, 10)),
      h, m, 0,
    );

    // Find what that UTC moment looks like in the target timezone
    const tzParts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric", month: "numeric", day: "numeric",
      hour: "numeric", minute: "numeric", second: "numeric",
      hour12: false,
    }).formatToParts(new Date(refMs));

    const get = (type: string) =>
      parseInt(tzParts.find((p) => p.type === type)?.value ?? "0");

    // offset (minutes) = what we pretended (h:m) minus what the tz shows
    const tzHour = get("hour") % 24; // Intl may return 24 for midnight
    const tzMin  = get("minute");
    const offsetMin = (h * 60 + m) - (tzHour * 60 + tzMin);

    // True UTC minutes = midnight UTC of isoDate + local HH:MM + offset
    const midnightUTC = Date.UTC(
      parseInt(isoDate.slice(0, 4)),
      parseInt(isoDate.slice(5, 7)) - 1,
      parseInt(isoDate.slice(8, 10)),
    ) / 60000;

    return midnightUTC + h * 60 + m + offsetMin;
  } catch {
    // Fallback: treat time as UTC (original behavior)
    const midnightUTC = Date.UTC(
      parseInt(isoDate.slice(0, 4)),
      parseInt(isoDate.slice(5, 7)) - 1,
      parseInt(isoDate.slice(8, 10)),
    ) / 60000;
    return midnightUTC + h * 60 + m;
  }
}

/**
 * Analyze the connection risk between two consecutive flights.
 * Returns null if the flights don't form a connection (different airports)
 * or if there isn't enough data to analyze.
 */
export function analyzeConnection(
  flightA: TripFlight,
  flightB: TripFlight,
  statusMap: AirportStatusMap,
): ConnectionAnalysis | null {
  if (flightA.destinationCode !== flightB.originCode) return null;
  if (!flightA.departureTime || !flightB.departureTime) return null;

  const connectionAirport = flightB.originCode;

  // Use airport timezones for accurate UTC-based comparison across time zones
  const tzA = AIRPORTS[flightA.originCode]?.timezone ?? "UTC";
  const tzB = AIRPORTS[flightB.originCode]?.timezone ?? "UTC";

  const depAMin = localToUTCMinutes(flightA.isoDate, flightA.departureTime, tzA);
  const depBMin = localToUTCMinutes(flightB.isoDate, flightB.departureTime, tzB);
  if (depAMin === null || depBMin === null) return null;

  const estimatedDuration = estimateFlightDuration(flightA.originCode, flightA.destinationCode);
  const estimatedArrivalA = depAMin + estimatedDuration;
  const scheduledBufferMinutes = depBMin - estimatedArrivalA;

  // Gaps ≥ 24h are planned stopovers, not connections — skip analysis.
  if (scheduledBufferMinutes >= MAX_CONNECTION_MINUTES) return null;

  // ── Delay from FAA ──────────────────────────────────────────────────────────
  const connStatus = statusMap[connectionAirport];
  let delayAddedMinutes = 0;
  if (connStatus) {
    if (connStatus.groundStop) {
      delayAddedMinutes = 90; // worst case: ground stop = assume max hold
    } else if (connStatus.groundDelay) {
      delayAddedMinutes = connStatus.groundDelay.avgMinutes;
    } else if (connStatus.delays?.maxMinutes) {
      delayAddedMinutes = connStatus.delays.maxMinutes;
    }
  }

  const effectiveBufferMinutes = scheduledBufferMinutes - delayAddedMinutes;

  // ── MCT calculation ─────────────────────────────────────────────────────────
  const isIntl =
    !isUSAirport(flightA.originCode) ||
    !isUSAirport(flightB.destinationCode) ||
    !isUSAirport(connectionAirport);
  const mctConfig = MCT[connectionAirport] ?? MCT_DEFAULT;
  const mctMinutes = isIntl ? mctConfig.international : mctConfig.domestic;

  // ── Risk level ──────────────────────────────────────────────────────────────
  let risk: ConnectionRisk;
  if (effectiveBufferMinutes < 0) {
    risk = "missed";
  } else if (effectiveBufferMinutes < mctMinutes) {
    risk = "at_risk";
  } else if (effectiveBufferMinutes < mctMinutes * 1.6) {
    risk = "tight";
  } else {
    risk = "safe";
  }

  return {
    risk,
    connectionAirport,
    scheduledBufferMinutes,
    delayAddedMinutes,
    effectiveBufferMinutes,
    mctMinutes,
  };
}

/** Analyze all connections in a sorted flight list */
export function analyzeAllConnections(
  flights: TripFlight[],
  statusMap: AirportStatusMap,
): Map<string, ConnectionAnalysis> {
  const sorted = [...flights].sort((a, b) => {
    const d = a.isoDate.localeCompare(b.isoDate);
    return d !== 0 ? d : a.departureTime.localeCompare(b.departureTime);
  });

  const result = new Map<string, ConnectionAnalysis>();
  for (let i = 0; i < sorted.length - 1; i++) {
    const analysis = analyzeConnection(sorted[i], sorted[i + 1], statusMap);
    if (analysis) {
      // Key: "flightA.id → flightB.id"
      result.set(`${sorted[i].id}→${sorted[i + 1].id}`, analysis);
    }
  }
  return result;
}
