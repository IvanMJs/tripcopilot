// ── Common flight route lookup ────────────────────────────────────────────────
// Hardcoded map of popular flight numbers to their typical route data.
// Keys are uppercase flight codes (e.g., "AA900").
// This is a best-effort heuristic — users can always edit manually.

export interface CommonFlightInfo {
  origin: string;       // IATA origin code
  destination: string;  // IATA destination code
  departureTime: string; // "HH:MM" local at origin
  arrivalTime: string;   // "HH:MM" local at destination
}

export const COMMON_FLIGHTS: Record<string, CommonFlightInfo> = {
  // American Airlines
  "AA900":  { origin: "MIA", destination: "EZE", departureTime: "23:55", arrivalTime: "12:30" },
  "AA901":  { origin: "EZE", destination: "MIA", departureTime: "09:25", arrivalTime: "19:45" },
  "AA930":  { origin: "MIA", destination: "SCL", departureTime: "22:30", arrivalTime: "09:15" },
  "AA200":  { origin: "JFK", destination: "LAX", departureTime: "07:00", arrivalTime: "10:20" },
  "AA100":  { origin: "JFK", destination: "LHR", departureTime: "22:05", arrivalTime: "10:20" },

  // LATAM
  "LA504":  { origin: "SCL", destination: "EZE", departureTime: "08:00", arrivalTime: "10:15" },
  "LA505":  { origin: "EZE", destination: "SCL", departureTime: "11:00", arrivalTime: "12:45" },
  "LA8070": { origin: "GRU", destination: "MIA", departureTime: "23:00", arrivalTime: "07:20" },
  "LA2490": { origin: "SCL", destination: "MIA", departureTime: "22:55", arrivalTime: "07:05" },
  "LA500":  { origin: "SCL", destination: "LIM", departureTime: "08:30", arrivalTime: "11:45" },

  // Aerolíneas Argentinas
  "AR1130": { origin: "EZE", destination: "GRU", departureTime: "08:30", arrivalTime: "11:45" },
  "AR1131": { origin: "GRU", destination: "EZE", departureTime: "13:00", arrivalTime: "16:30" },
  "AR1340": { origin: "EZE", destination: "MIA", departureTime: "22:45", arrivalTime: "08:00" },
  "AR1341": { origin: "MIA", destination: "EZE", departureTime: "10:00", arrivalTime: "22:15" },
  "AR1302": { origin: "EZE", destination: "SCL", departureTime: "08:00", arrivalTime: "09:45" },

  // Copa Airlines
  "CM243":  { origin: "EZE", destination: "PTY", departureTime: "03:45", arrivalTime: "09:10" },
  "CM242":  { origin: "PTY", destination: "EZE", departureTime: "14:30", arrivalTime: "22:40" },

  // Avianca
  "AV206":  { origin: "BOG", destination: "MIA", departureTime: "07:15", arrivalTime: "11:35" },
  "AV207":  { origin: "MIA", destination: "BOG", departureTime: "12:45", arrivalTime: "15:30" },

  // United
  "UA841":  { origin: "EWR", destination: "GRU", departureTime: "21:10", arrivalTime: "09:35" },
  "UA845":  { origin: "IAH", destination: "EZE", departureTime: "21:50", arrivalTime: "12:00" },
  "UA100":  { origin: "EWR", destination: "LHR", departureTime: "18:45", arrivalTime: "06:50" },

  // Delta
  "DL401":  { origin: "JFK", destination: "CDG", departureTime: "18:55", arrivalTime: "08:40" },
  "DL402":  { origin: "CDG", destination: "JFK", departureTime: "10:25", arrivalTime: "12:45" },
  "DL100":  { origin: "ATL", destination: "GRU", departureTime: "22:40", arrivalTime: "11:30" },

  // British Airways
  "BA245":  { origin: "LHR", destination: "EZE", departureTime: "12:35", arrivalTime: "03:30" },
  "BA246":  { origin: "EZE", destination: "LHR", departureTime: "20:00", arrivalTime: "14:15" },

  // Iberia
  "IB6845": { origin: "EZE", destination: "MAD", departureTime: "21:30", arrivalTime: "15:35" },
  "IB6844": { origin: "MAD", destination: "EZE", departureTime: "12:40", arrivalTime: "00:45" },

  // Air France
  "AF228":  { origin: "CDG", destination: "EZE", departureTime: "13:25", arrivalTime: "04:25" },
  "AF229":  { origin: "EZE", destination: "CDG", departureTime: "21:05", arrivalTime: "15:10" },

  // Lufthansa
  "LH500":  { origin: "FRA", destination: "JFK", departureTime: "11:30", arrivalTime: "14:15" },
  "LH501":  { origin: "JFK", destination: "FRA", departureTime: "18:25", arrivalTime: "08:05" },

  // Emirates
  "EK203":  { origin: "DXB", destination: "GRU", departureTime: "02:00", arrivalTime: "07:10" },
  "EK500":  { origin: "DXB", destination: "LHR", departureTime: "08:00", arrivalTime: "12:20" },

  // JetBlue
  "B6200":  { origin: "JFK", destination: "FLL", departureTime: "07:30", arrivalTime: "10:45" },
  "B6201":  { origin: "FLL", destination: "JFK", departureTime: "11:30", arrivalTime: "14:30" },

  // Gol
  "G31421": { origin: "GRU", destination: "GIG", departureTime: "06:30", arrivalTime: "07:40" },
  "G31420": { origin: "GIG", destination: "GRU", departureTime: "08:30", arrivalTime: "09:45" },

  // Ryanair
  "FR100":  { origin: "DUB", destination: "STN", departureTime: "06:45", arrivalTime: "08:20" },
  "FR101":  { origin: "STN", destination: "DUB", departureTime: "09:00", arrivalTime: "10:30" },

  // Turkish Airlines
  "TK1":    { origin: "IST", destination: "JFK", departureTime: "20:05", arrivalTime: "00:15" },
  "TK2":    { origin: "JFK", destination: "IST", departureTime: "09:50", arrivalTime: "05:15" },
};

/**
 * Look up flight info by flight code (e.g., "AA900", "IB6845").
 * Returns null if not found in the hardcoded map.
 */
export function lookupCommonFlight(flightCode: string): CommonFlightInfo | null {
  const key = flightCode.trim().toUpperCase().replace(/\s+/g, "");
  return COMMON_FLIGHTS[key] ?? null;
}
