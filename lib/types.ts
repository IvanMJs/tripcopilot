export type DelayStatus =
  | "ok"
  | "delay_minor"    // delays ≤15 min
  | "delay_moderate" // delays 16-45 min
  | "delay_severe"   // delays >45 min
  | "ground_stop"    // ground stop activo
  | "ground_delay"   // ground delay program
  | "closure"        // aeropuerto cerrado
  | "unknown";

export interface DelayInfo {
  reason: string;
  minMinutes?: number;
  maxMinutes?: number;
  trend?: "Increasing" | "Decreasing" | "Holding" | string;
  type: "departure" | "arrival" | "both";
}

export interface AirportStatus {
  iata: string;
  name: string;
  city: string;
  state: string;
  status: DelayStatus;
  delays?: DelayInfo;
  groundStop?: { reason: string; endTime?: string };
  groundDelay?: { reason: string; avgMinutes: number; maxTime: string };
  closure?: { reason: string };
  lastChecked: Date;
}

export type AirportStatusMap = Record<string, AirportStatus>;

export interface MyFlight {
  date: string;
  flightNum: string;
  airline: string;
  origin: string;
  originCode: string;
  destination: string;
  destinationCode: string;
  departureTime: string;
  trackingUrl: string;
}

export interface TripFlight {
  id: string;
  flightCode: string;       // raw input uppercase, e.g. "AA900"
  airlineCode: string;      // "AA"
  airlineName: string;      // "American Airlines"
  airlineIcao: string;      // "AAL"
  flightNumber: string;     // "900"
  originCode: string;       // "EZE"
  destinationCode: string;  // "MIA"
  isoDate: string;          // "2026-03-29"
  departureTime: string;    // "20:30"
  arrivalBuffer: number;    // hours: 1, 1.5, 2, 2.5, 3
}

export interface Accommodation {
  id: string;
  tripId: string;
  flightId?: string;
  name: string;
  checkInDate?: string;
  checkInTime?: string;
  checkOutDate?: string;
  checkOutTime?: string;
  confirmationCode?: string;
  address?: string;
}

export interface TripTab {
  id: string;
  name: string;
  flights: TripFlight[];
  accommodations: Accommodation[];
}
