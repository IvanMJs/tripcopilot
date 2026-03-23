import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export interface LiveFlightData {
  flightNumber: string;
  status: "scheduled" | "delayed" | "departed" | "landed" | "cancelled" | "unknown";
  departureGate: string | null;
  arrivalGate: string | null;
  scheduledDeparture: string | null; // ISO
  actualDeparture: string | null;    // ISO
  scheduledArrival: string | null;   // ISO
  actualArrival: string | null;      // ISO
  delayMinutes: number;
  terminal: string | null;
}

type AeroDataBoxFlight = {
  status?: string;
  departure?: {
    scheduledTimeLocal?: string;
    actualTimeLocal?: string;
    scheduledTimeUtc?: string;
    actualTimeUtc?: string;
    gate?: string;
    terminal?: { name?: string };
  };
  arrival?: {
    scheduledTimeLocal?: string;
    estimatedTimeLocal?: string;
    scheduledTimeUtc?: string;
    estimatedTimeUtc?: string;
    actualTimeUtc?: string;
    gate?: string;
  };
};

function normalizeStatus(raw: string | undefined): LiveFlightData["status"] {
  if (!raw) return "unknown";
  const s = raw.toLowerCase();
  if (s === "enroute" || s === "en route") return "departed";
  if (s === "landed") return "landed";
  if (s === "cancelled" || s === "canceled") return "cancelled";
  if (s === "scheduled") return "scheduled";
  if (s === "delayed") return "delayed";
  return "unknown";
}

function computeDelayMinutes(flight: AeroDataBoxFlight): number {
  const scheduledUtc = flight.departure?.scheduledTimeUtc;
  const actualUtc = flight.departure?.actualTimeUtc;
  if (!scheduledUtc || !actualUtc) return 0;
  const diff = Math.round(
    (new Date(actualUtc).getTime() - new Date(scheduledUtc).getTime()) / 60000,
  );
  return diff > 0 ? diff : 0;
}

function toIso(local: string | undefined): string | null {
  if (!local) return null;
  // AeroDataBox returns "2026-03-29 14:30+00:00" — convert to ISO 8601
  return local.replace(" ", "T");
}

const EMPTY_RESPONSE = (flightNumber: string): LiveFlightData => ({
  flightNumber,
  status: "unknown",
  departureGate: null,
  arrivalGate: null,
  scheduledDeparture: null,
  actualDeparture: null,
  scheduledArrival: null,
  actualArrival: null,
  delayMinutes: 0,
  terminal: null,
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await checkUserRateLimit(supabase, user.id, "flight-live", 20))) {
    return rateLimitResponse();
  }

  const { searchParams } = new URL(request.url);
  // Support both ?flight= (new) and ?code= (legacy)
  const flight = searchParams.get("flight") ?? searchParams.get("code");
  const date = searchParams.get("date");

  if (!flight || !date) {
    return NextResponse.json(
      { error: "Missing flight or date" },
      { status: 400 },
    );
  }

  const apiKey = process.env.AERODATABOX_RAPIDAPI_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AERODATABOX_RAPIDAPI_KEY not configured" },
      { status: 500 },
    );
  }

  try {
    const url = `https://aerodatabox.p.rapidapi.com/flights/number/${encodeURIComponent(flight)}/${encodeURIComponent(date)}`;
    const res = await fetch(url, {
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "aerodatabox.p.rapidapi.com",
      },
      next: { revalidate: 180 }, // 3-minute cache
    });

    if (!res.ok) {
      return NextResponse.json<LiveFlightData>(EMPTY_RESPONSE(flight), { status: 200 });
    }

    const raw: unknown = await res.json();
    const flights = Array.isArray(raw) ? raw : [];
    const flightData = flights[0] as AeroDataBoxFlight | undefined;

    if (!flightData) {
      return NextResponse.json<LiveFlightData>(EMPTY_RESPONSE(flight));
    }

    const rawStatus = normalizeStatus(flightData.status);
    const delayMinutes = computeDelayMinutes(flightData);

    // If delay > 0 and status is still scheduled, promote to delayed
    const status: LiveFlightData["status"] =
      rawStatus === "scheduled" && delayMinutes > 0 ? "delayed" : rawStatus;

    const scheduledDeparture = toIso(flightData.departure?.scheduledTimeUtc);
    const actualDeparture = toIso(flightData.departure?.actualTimeUtc);
    const scheduledArrival = toIso(flightData.arrival?.scheduledTimeUtc);
    const actualArrival = toIso(flightData.arrival?.actualTimeUtc ?? flightData.arrival?.estimatedTimeUtc);

    return NextResponse.json<LiveFlightData>({
      flightNumber: flight,
      status,
      departureGate: flightData.departure?.gate ?? null,
      arrivalGate: flightData.arrival?.gate ?? null,
      scheduledDeparture,
      actualDeparture,
      scheduledArrival,
      actualArrival,
      delayMinutes,
      terminal: flightData.departure?.terminal?.name ?? null,
    });
  } catch {
    return NextResponse.json<LiveFlightData>(EMPTY_RESPONSE(flight));
  }
}
