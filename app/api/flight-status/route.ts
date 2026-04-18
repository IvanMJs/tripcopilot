export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { getFlightData } from "@/lib/flightDataFetcher";
import type { FlightData } from "@/lib/flightDataProvider";

// Shape that useFlightStatus expects from /api/flight-status
interface LegacyFlightResponse {
  data: LegacyFlightRecord[];
}

interface LegacyFlightRecord {
  flight_status: string;
  flight: { iata: string };
  departure: {
    terminal: string | null;
    gate: string | null;
    delay: number | null;
    scheduled: string | null;
    estimated: string | null;
    actual: string | null;
  };
  arrival: {
    terminal: string | null;
    gate: string | null;
    baggage: string | null;
    delay: number | null;
    estimated: string | null;
  };
  aircraft: { iata: string | null; registration: string | null } | null;
}

function toLegacyRecord(fd: FlightData): LegacyFlightRecord {
  return {
    flight_status: fd.status,
    flight: { iata: fd.flightCode },
    departure: {
      terminal: fd.departure.terminal ?? null,
      gate: fd.departure.gate ?? null,
      delay: fd.departure.delay ?? null,
      scheduled: fd.departure.scheduledTime ?? null,
      estimated: fd.departure.estimatedTime ?? null,
      actual: fd.departure.actualTime ?? null,
    },
    arrival: {
      terminal: fd.arrival.terminal ?? null,
      gate: fd.arrival.gate ?? null,
      baggage: null, // not provided by any current provider
      delay: fd.arrival.delay ?? null,
      estimated: fd.arrival.estimatedTime ?? null,
    },
    aircraft: fd.aircraft ? { iata: fd.aircraft, registration: null } : null,
  };
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user && !(await checkUserRateLimit(supabase, user.id, "flight-status", 20))) {
    return rateLimitResponse();
  }

  const url = new URL(req.url);
  const flightIata = url.searchParams.get("flight_iata") ?? "";
  const flightDate = url.searchParams.get("flight_date") ?? "";

  if (!flightIata.trim()) {
    return Response.json({ error: "flight_iata required" }, { status: 400 });
  }

  const result = await getFlightData(flightIata, flightDate);

  if (!result.success) {
    const isUnconfigured = result.error.includes("not configured");
    return Response.json(
      { error: result.error },
      { status: isUnconfigured ? 503 : 502 },
    );
  }

  const body: LegacyFlightResponse = {
    data: [toLegacyRecord(result.data)],
  };

  return Response.json(body, {
    headers: { "Cache-Control": "public, max-age=300, s-maxage=300" },
  });
}
