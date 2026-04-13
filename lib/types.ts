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
  arrivalDate?: string;     // "2026-03-30" (may differ for overnight flights)
  arrivalTime?: string;     // "06:45" local at destination
  arrivalBuffer: number;    // hours: 1, 1.5, 2, 2.5, 3
  boardingPassUrl?: string; // Supabase Storage path, e.g. "{userId}/{flightId}.jpg"
  wantsUpgrade?: boolean;   // user opted in for upgrade reminder notification
  cabinClass?: "economy" | "premium_economy" | "business" | "first";
  bookingCode?: string;    // PNR / confirmation code, e.g. "QDLHPV"
  seatNumber?: string;     // seat assignment, e.g. "12A", "23F"
  terminal?: string;       // departure terminal, e.g. "T2", "International"
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

export interface Passenger {
  id: string;
  name: string;
  email?: string;
}

export type CollaboratorRole = "viewer" | "editor";

export interface TripCollaborator {
  id: string;
  tripId: string;
  inviterEmail?: string;
  inviteeEmail: string;
  inviteeId?: string | null;
  role: CollaboratorRole;
  status: "pending" | "accepted" | "declined";
  inviteToken: string;
  invitedAt: string;
  acceptedAt?: string | null;
}

export interface TripExpense {
  id: string;
  tripId: string;
  amount: number;
  currency: string;
  category: "flight" | "hotel" | "food" | "transport" | "activity" | "other";
  description?: string;
  expenseDate?: string;
}

export interface TripTab {
  id: string;
  name: string;
  flights: TripFlight[];
  accommodations: Accommodation[];
  passengers?: Passenger[];
}

// ── FAA XML types ─────────────────────────────────────────────────────
export interface FAADelayType {
  Name?: string;
  Ground_Delay_List?: { Ground_Delay: FAAGroundDelay | FAAGroundDelay[] };
  Ground_Stop_List?: { Ground_Stop: FAAGroundStop | FAAGroundStop[] };
  Arrival_Departure_Delay_List?: { Delay: FAADelay | FAADelay[] };
  Airport_Closure_List?: { Airport: FAAClosureEntry | FAAClosureEntry[] };
}
export interface FAAGroundDelay { ARPT?: string; Avg?: string | number; Max?: string; Reason?: string; }
export interface FAAGroundStop  { ARPT?: string; Reason?: string; Stop_End_Time?: string; EndTime?: string; }
export interface FAADelay       { ARPT?: string; Reason?: string; Arrival_Departure?: FAAAdEntry | FAAAdEntry[]; }
export interface FAAAdEntry     { "@_Type"?: string; Min?: string | number; Max?: string | number; Trend?: string; }
export interface FAAClosureEntry { ARPT?: string; Reason?: string; }

// ── Cron route types ──────────────────────────────────────────────────
export type FlightRow = {
  id: string;
  trip_id: string;
  flight_code: string;
  airline_code: string;
  airline_name: string;
  airline_icao: string;
  flight_number: string;
  origin_code: string;
  destination_code: string;
  iso_date: string;
  departure_time: string | null;
  arrival_date: string | null;
  arrival_time: string | null;
  arrival_buffer: number;
  gate: string | null;
  wants_upgrade: boolean | null;
  trips: { user_id: string };
};

export type AccommodationRow = {
  id: string;
  name: string;
  check_in_date: string;
  check_out_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  trips: { user_id: string };
};

export type PushSubRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type AeroDataBoxFlightLeg = {
  status?: string;
  departure?: {
    delay?: number;
    gate?: string | null;
    actualTime?: { local?: string };
    scheduledTime?: { local?: string };
  };
  arrival?: {
    actualTime?: { local?: string };
    scheduledTime?: { local?: string };
  };
};
