import { lookupCommonFlight, CommonFlightInfo } from "@/lib/commonFlights";

// POST /api/flight-lookup
// Body: { flightNumber: string; date?: string }
// Returns: { found: true; data: CommonFlightInfo } | { found: false }

interface RequestBody {
  flightNumber: string;
  date?: string;
}

export async function POST(req: Request): Promise<Response> {
  let body: RequestBody;
  try {
    body = await req.json() as RequestBody;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { flightNumber } = body;
  if (!flightNumber || typeof flightNumber !== "string") {
    return new Response(JSON.stringify({ error: "flightNumber required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const result: CommonFlightInfo | null = lookupCommonFlight(flightNumber);

  if (result) {
    return new Response(JSON.stringify({ found: true, data: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ found: false }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
