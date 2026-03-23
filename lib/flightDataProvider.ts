export interface FlightData {
  flightCode: string;
  status:
    | "scheduled"
    | "active"
    | "landed"
    | "cancelled"
    | "diverted"
    | "unknown";
  departure: {
    iataCode: string;
    scheduledTime?: string;
    estimatedTime?: string;
    actualTime?: string;
    gate?: string;
    terminal?: string;
    delay?: number;
  };
  arrival: {
    iataCode: string;
    scheduledTime?: string;
    estimatedTime?: string;
    actualTime?: string;
    gate?: string;
    terminal?: string;
    delay?: number;
  };
  aircraft?: string;
  provider: "aviationstack" | "opensky" | "cache";
}

export type FlightDataResult =
  | { success: true; data: FlightData }
  | { success: false; error: string; provider?: string };
