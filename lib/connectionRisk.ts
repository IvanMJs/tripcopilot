import { TripFlight } from "./types";
import { AirportStatusMap } from "./types";

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
};

const MCT_DEFAULT = { domestic: 60, international: 90 };

// US domestic airport codes (FAA-covered)
const US_AIRPORTS = new Set([
  "ATL","LAX","ORD","DFW","DEN","JFK","SFO","SEA","LAS","MCO","MIA","CLT",
  "EWR","PHX","IAH","BOS","MSP","DTW","FLL","LGA","BWI","SLC","PHL","DCA",
  "IAD","HNL","MDW","SAN","TPA","PDX",
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

/** Parse "HH:MM" + ISO date into total minutes from epoch */
function parseToMinutes(isoDate: string, time: string): number | null {
  if (!time) return null;
  const parts = time.split(":").map(Number);
  if (parts.length < 2) return null;
  const [h, m] = parts;
  const date = new Date(isoDate + "T00:00:00");
  // Use day-offset so multi-day trips work (minutes from date midnight)
  const dayOffsetMs = date.getTime();
  return dayOffsetMs / 60000 + h * 60 + m;
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

  const depAMin = parseToMinutes(flightA.isoDate, flightA.departureTime);
  const depBMin = parseToMinutes(flightB.isoDate, flightB.departureTime);
  if (depAMin === null || depBMin === null) return null;

  const estimatedDuration = estimateFlightDuration(flightA.originCode, flightA.destinationCode);
  const estimatedArrivalA = depAMin + estimatedDuration;
  const scheduledBufferMinutes = depBMin - estimatedArrivalA;

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
