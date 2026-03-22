import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/rateLimit";

const TripFlightSchema = z.object({
  flightCode:      z.string().max(10),
  originCode:      z.string().max(3),
  destinationCode: z.string().max(3),
  isoDate:         z.string().max(10),
  departureTime:   z.string().max(5).optional(),
  arrivalTime:     z.string().max(5).optional(),
  arrivalDate:     z.string().max(10).optional(),
  airlineName:     z.string().max(100).optional(),
});

const BodySchema = z.object({
  question:    z.string().min(1).max(500),
  tripContext: z.object({
    flights:  z.array(TripFlightSchema).max(50),
    tripName: z.string().max(200),
  }),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  // Rate limit: 20 chat requests per hour per user
  if (!(await checkUserRateLimit(supabase, user.id, "trip-copilot", 20))) {
    return rateLimitResponse();
  }

  const raw = await req.json();
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { question, tripContext } = parsed.data;

  const flightsText = tripContext.flights.length > 0
    ? tripContext.flights.map((f) => {
        const parts = [`${f.flightCode} · ${f.originCode}→${f.destinationCode} · ${f.isoDate}`];
        if (f.departureTime) parts.push(`sale ${f.departureTime}`);
        if (f.arrivalTime) parts.push(`llega ${f.arrivalTime}${f.arrivalDate && f.arrivalDate !== f.isoDate ? " (" + f.arrivalDate + ")" : ""}`);
        if (f.airlineName) parts.push(f.airlineName);
        return "• " + parts.join(" · ");
      }).join("\n")
    : "Sin vuelos registrados";

  const tripSummary = `Viaje: "${tripContext.tripName}"\nVuelos:\n${flightsText}`;

  const systemPrompt = `Sos un asistente de viaje conciso y práctico. El usuario tiene el siguiente itinerario:\n\n${tripSummary}\n\nRespondé sus preguntas de forma concisa (máximo 3-4 oraciones). Si la pregunta no tiene que ver con viajes, redirigí amablemente al tema.`;

  const anthropic = new Anthropic({ apiKey });

  const encoder = new TextEncoder();

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        const stream = anthropic.messages.stream({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 512,
          system: systemPrompt,
          messages: [{ role: "user", content: question }],
        });

        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(readableStream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
