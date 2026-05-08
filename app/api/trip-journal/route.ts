import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const FlightSchema = z.object({
  originCode: z.string().max(4),
  destinationCode: z.string().max(4),
  isoDate: z.string().max(20),
  airline: z.string().max(60).optional(),
  flightNumber: z.string().max(10).optional(),
});

const BodySchema = z.object({
  tripId: z.string().uuid(),
  tripName: z.string().max(120),
  flights: z.array(FlightSchema).max(30),
  locale: z.enum(["es", "en"]),
});

function buildPrompt(
  tripName: string,
  flights: z.infer<typeof FlightSchema>[],
  locale: "es" | "en",
): string {
  const flightLines = flights
    .map(
      (f) =>
        `- ${f.isoDate}: ${f.originCode} → ${f.destinationCode}${
          f.airline
            ? ` (${f.airline}${f.flightNumber ? " " + f.flightNumber : ""})`
            : ""
        }`,
    )
    .join("\n");

  if (locale === "es") {
    return `Eres un escritor de viajes inspirador. Escribe una entrada de diario de viaje personal en primera persona para el itinerario llamado "${tripName}". El texto debe ser cálido, evocador y reflexivo, como si el viajero lo hubiera vivido. Usa aproximadamente 200 palabras. No uses encabezados, listas ni formato markdown. Solo texto continuo y fluido en prosa.\n\nVuelos:\n${flightLines}`;
  }
  return `You are an inspiring travel writer. Write a personal, first-person travel journal entry for the itinerary called "${tripName}". The text should be warm, evocative and reflective, as if the traveler lived it. Use approximately 200 words. No headings, lists, or markdown formatting. Just continuous flowing prose.\n\nFlights:\n${flightLines}`;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 10 generations per hour per user
  if (!(await checkUserRateLimit(supabase, user.id, "trip-journal", 10))) {
    return rateLimitResponse();
  }

  let body: z.infer<typeof BodySchema>;
  try {
    const raw = await req.json();
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { tripName, flights, locale } = body;
  const prompt = buildPrompt(tripName, flights, locale);

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find((c) => c.type === "text");
    const journal = textBlock?.type === "text" ? textBlock.text.trim() : "";

    return NextResponse.json({ journal });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: "trip-journal", phase: "anthropic-call" },
    });
    return NextResponse.json(
      { error: "Failed to generate journal" },
      { status: 502 },
    );
  }
}
