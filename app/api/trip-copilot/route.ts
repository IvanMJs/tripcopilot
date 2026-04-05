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
    flights:        z.array(TripFlightSchema).max(50),
    tripName:       z.string().max(200),
    userLocalTime:  z.string().max(50).optional(),
    userTimezone:   z.string().max(100).optional(),
    airportContext: z.string().max(2000).optional(),
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

  // Current time context — use what the client sends (device local time + timezone),
  // falling back to UTC server time if not provided.
  const userTimezone  = tripContext.userTimezone ?? "UTC";
  const userLocalTime = tripContext.userLocalTime
    ?? new Date().toLocaleString("sv-SE", { timeZone: userTimezone });

  const flightsText = tripContext.flights.length > 0
    ? tripContext.flights.map((f) => {
        const parts = [`${f.flightCode || "vuelo"} · ${f.originCode}→${f.destinationCode} · ${f.isoDate}`];
        if (f.departureTime) parts.push(`sale ${f.departureTime}`);
        if (f.arrivalTime) parts.push(`llega ${f.arrivalTime}${f.arrivalDate && f.arrivalDate !== f.isoDate ? " (" + f.arrivalDate + ")" : ""}`);
        if (f.airlineName) parts.push(f.airlineName);
        return "• " + parts.join(" · ");
      }).join("\n")
    : "Sin vuelos registrados";

  // Identify next flight relative to user's local time
  const localDateStr = userLocalTime.slice(0, 10); // "YYYY-MM-DD"
  const nextFlight = tripContext.flights.find((f) => f.isoDate >= localDateStr) ?? null;
  const nextFlightNote = nextFlight
    ? `Próximo vuelo según la hora del usuario: ${nextFlight.flightCode || "vuelo"} ${nextFlight.originCode}→${nextFlight.destinationCode} el ${nextFlight.isoDate}${nextFlight.departureTime ? " a las " + nextFlight.departureTime : ""}.`
    : "No hay vuelos futuros en el itinerario.";

  const tripSummary = `Viaje: "${tripContext.tripName}"\nVuelos:\n${flightsText}`;

  const airportSection = tripContext.airportContext
    ? `\nESTADO ACTUAL DE AEROPUERTOS (datos en tiempo real):\n${tripContext.airportContext}`
    : "";

  const systemPrompt = `Sos un asistente de viaje conciso y práctico.

HORA ACTUAL DEL USUARIO: ${userLocalTime} (zona horaria: ${userTimezone})
Usá SIEMPRE esta hora como referencia para determinar qué vuelos son pasados, presentes o futuros. Nunca asumas que la hora UTC del servidor es la hora del usuario.

${nextFlightNote}
${airportSection}

El usuario tiene el siguiente itinerario:
${tripSummary}

Respondé de forma concisa (máximo 3-4 oraciones). Si la pregunta no tiene que ver con viajes, redirigí amablemente al tema.`;

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
