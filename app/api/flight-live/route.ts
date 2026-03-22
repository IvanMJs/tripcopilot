import { NextResponse } from "next/server";

export interface LiveFlightData {
  status: "scheduled" | "enroute" | "landed" | "canceled" | "unknown";
  progress: number | null;
  departedAt: string | null;
  estimatedArrival: string | null;
  delayMinutes: number | null;
  aircraft: string | null;
}

type AeroDataBoxFlight = {
  status?: string;
  departure?: {
    scheduledTimeLocal?: string;
    actualTimeLocal?: string;
    scheduledTimeUtc?: string;
    actualTimeUtc?: string;
  };
  arrival?: {
    scheduledTimeLocal?: string;
    estimatedTimeLocal?: string;
    scheduledTimeUtc?: string;
    estimatedTimeUtc?: string;
  };
  aircraft?: {
    reg?: string;
    model?: { text?: string };
  };
};

function normalizeStatus(raw: string | undefined): LiveFlightData["status"] {
  if (!raw) return "unknown";
  const s = raw.toLowerCase();
  if (s === "enroute" || s === "en route") return "enroute";
  if (s === "landed") return "landed";
  if (s === "cancelled" || s === "canceled") return "canceled";
  if (s === "scheduled") return "scheduled";
  return "unknown";
}

function computeProgress(flight: AeroDataBoxFlight): number | null {
  const depUtc = flight.departure?.actualTimeUtc ?? flight.departure?.scheduledTimeUtc;
  const arrUtc = flight.arrival?.estimatedTimeUtc ?? flight.arrival?.scheduledTimeUtc;
  if (!depUtc || !arrUtc) return null;
  const dep = new Date(depUtc).getTime();
  const arr = new Date(arrUtc).getTime();
  const now = Date.now();
  if (dep >= arr) return null;
  const raw = Math.round(((now - dep) / (arr - dep)) * 100);
  return Math.max(0, Math.min(100, raw));
}

function computeDelayMinutes(flight: AeroDataBoxFlight): number | null {
  const scheduledUtc = flight.departure?.scheduledTimeUtc;
  const actualUtc = flight.departure?.actualTimeUtc;
  if (!scheduledUtc || !actualUtc) return null;
  const diff = Math.round(
    (new Date(actualUtc).getTime() - new Date(scheduledUtc).getTime()) / 60000,
  );
  return diff > 0 ? diff : null;
}

function extractLocalTime(iso: string | undefined): string | null {
  if (!iso) return null;
  // AeroDataBox returns local times like "2026-03-29 14:30+00:00"
  // Extract the HH:MM portion
  const match = iso.match(/\d{2}:\d{2}/);
  return match ? match[0] : null;
}

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const date = searchParams.get("date");

  if (!code || !date) {
    return NextResponse.json(
      { error: "Missing code or date" },
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
    const url = `https://aerodatabox.p.rapidapi.com/flights/number/${encodeURIComponent(code)}/${encodeURIComponent(date)}`;
    const res = await fetch(url, {
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "aerodatabox.p.rapidapi.com",
      },
      // No cache — we want live data
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json<LiveFlightData>({
        status: "unknown",
        progress: null,
        departedAt: null,
        estimatedArrival: null,
        delayMinutes: null,
        aircraft: null,
      });
    }

    const raw: unknown = await res.json();
    // AeroDataBox returns an array of flights
    const flights = Array.isArray(raw) ? raw : [];
    const flight = flights[0] as AeroDataBoxFlight | undefined;

    if (!flight) {
      return NextResponse.json<LiveFlightData>({
        status: "unknown",
        progress: null,
        departedAt: null,
        estimatedArrival: null,
        delayMinutes: null,
        aircraft: null,
      });
    }

    const status = normalizeStatus(flight.status);
    const progress = status === "enroute" ? computeProgress(flight) : null;
    const departedAt = extractLocalTime(
      flight.departure?.actualTimeLocal ?? flight.departure?.scheduledTimeLocal,
    );
    const estimatedArrival = extractLocalTime(
      flight.arrival?.estimatedTimeLocal ?? flight.arrival?.scheduledTimeLocal,
    );
    const delayMinutes = computeDelayMinutes(flight);
    const aircraft =
      flight.aircraft?.reg ?? flight.aircraft?.model?.text ?? null;

    return NextResponse.json<LiveFlightData>({
      status,
      progress,
      departedAt,
      estimatedArrival,
      delayMinutes,
      aircraft,
    });
  } catch {
    return NextResponse.json<LiveFlightData>({
      status: "unknown",
      progress: null,
      departedAt: null,
      estimatedArrival: null,
      delayMinutes: null,
      aircraft: null,
    });
  }
}
