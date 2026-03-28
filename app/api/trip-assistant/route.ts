import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/rateLimit";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const FlightContextSchema = z.object({
  flightCode: z.string(),
  origin: z.string(),
  destination: z.string(),
  isoDate: z.string(),
  departureTime: z.string(),
  arrivalTime: z.string().optional(),
  status: z.string().optional(),
});

const AirportStatusSchema = z.object({
  status: z.string(),
  delay: z.number().optional(),
});

type AirportStatusEntry = z.infer<typeof AirportStatusSchema>;

const TripContextSchema = z.object({
  tripName: z.string().max(200),
  flights: z.array(FlightContextSchema).max(50),
  currentDateTime: z.string(),
  userTimezone: z.string(),
  airportStatuses: z.record(z.string(), AirportStatusSchema).optional(),
  userLocation: z.object({ lat: z.number(), lng: z.number() }).nullable().optional(),
  currentWeather: z.object({ temperature: z.number(), description: z.string() }).nullable().optional(),
});

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(4000),
});

const BodySchema = z.object({
  message: z.string().min(1).max(2000),
  tripContext: TripContextSchema,
  history: z.array(MessageSchema).max(20).optional(),
});

function buildSystemPrompt(context: z.infer<typeof TripContextSchema>): string {
  const flightLines = context.flights
    .map((f) => {
      const arrival = f.arrivalTime ? ` → arrives ${f.arrivalTime}` : "";
      const status = f.status && f.status !== "ok" ? ` [${f.status.toUpperCase()}]` : "";
      return `  • ${f.flightCode}: ${f.origin} → ${f.destination} on ${f.isoDate} at ${f.departureTime}${arrival}${status}`;
    })
    .join("\n");

  const airportLines =
    context.airportStatuses && Object.keys(context.airportStatuses).length > 0
      ? (Object.entries(context.airportStatuses) as [string, AirportStatusEntry][])
          .map(([iata, s]) => {
            const delayPart = s.delay != null ? ` (~${s.delay} min delay)` : "";
            return `  • ${iata}: ${s.status}${delayPart}`;
          })
          .join("\n")
      : "  • No known delays";

  return `You are TripCopilot AI, an expert travel assistant integrated into the TripCopilot flight monitoring app. You have complete real-time context about the user's active trip.

## Active Trip: ${context.tripName}

### Flights
${flightLines || "  • No flights added yet"}

### Airport Status (real-time FAA/NOTAM data)
${airportLines}

### Current Date & Time
${context.currentDateTime} (user timezone: ${context.userTimezone})

### User's Current Location
${context.userLocation
  ? `Lat ${context.userLocation.lat.toFixed(4)}, Lng ${context.userLocation.lng.toFixed(4)}${context.currentWeather ? ` — Currently: ${context.currentWeather.description}, ${context.currentWeather.temperature}°C` : ""}`
  : "Location not available"}

## Your capabilities
- Calculate connection times between flights and warn if they are too tight
- Alert about active FAA delays, ground stops, or closures at relevant airports
- Suggest when the user should leave for the airport (recommend arriving 2h domestic, 3h international before departure)
- Answer questions about flight routes, airports, and travel logistics
- Compute layover duration, total travel time, and next-day arrival situations
- Suggest places to visit, restaurants, or activities based on the user's current location and weather
- Give local tips for the city they are currently in

## Response guidelines
- Respond in the same language as the user's message (detect Spanish vs English automatically)
- Keep answers concise and actionable — no more than 3-4 short paragraphs
- Use emojis when they add clarity (✈, ⚠️, ✅, ⏱, 🛫, 🛬, 🌐)
- If a flight has a delay status, proactively mention the impact
- For connection time questions, compute the buffer in minutes and compare to minimum connection times (45-90 min depending on airport and route type)
- When asked "am I going to make my connection?", give a clear YES/NO/RISKY answer first, then explain
- If there's no data to answer, say so honestly rather than guessing`;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Rate limit: 30 messages per hour per user
  if (!(await checkUserRateLimit(supabase, user.id, "trip-assistant", 30))) {
    return rateLimitResponse();
  }

  let body: z.infer<typeof BodySchema>;
  try {
    const raw = await req.json();
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    body = parsed.data;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { message, tripContext, history = [] } = body;
  const systemPrompt = buildSystemPrompt(tripContext);

  // Build message history for multi-turn conversation
  const messages: Anthropic.MessageParam[] = [
    ...history.map((h) => ({
      role: h.role,
      content: h.content,
    })),
    { role: "user" as const, content: message },
  ];

  try {
    const stream = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
      stream: true,
    });

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
        } catch {
          controller.error(new Error("Stream error"));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "X-Accel-Buffering": "no",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Failed to get AI response" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
