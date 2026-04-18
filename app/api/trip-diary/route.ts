import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/rateLimit";

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

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await checkUserRateLimit(supabase, user.id, "trip-diary", 5))) {
    return rateLimitResponse();
  }

  const raw = await req.json();
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { tripName, flights, locale } = parsed.data;

  const flightLines = flights
    .map((f) => `- ${f.isoDate}: ${f.originCode} → ${f.destinationCode}${f.airline ? ` (${f.airline}${f.flightNumber ? " " + f.flightNumber : ""})` : ""}`)
    .join("\n");

  const prompt = locale === "es"
    ? `Eres un escritor de viajes inspirador. Escribe un diario de viaje en primera persona para el siguiente itinerario llamado "${tripName}". El texto debe ser cálido, evocador y personal, como si el viajero lo hubiera vivido. Usa entre 150 y 250 palabras. No uses encabezados ni listas. Solo texto continuo y fluido.\n\nVuelos:\n${flightLines}`
    : `You are an inspiring travel writer. Write a first-person travel diary for the following itinerary called "${tripName}". The text should be warm, evocative and personal, as if the traveler lived it. Use between 150 and 250 words. No headings or lists. Just continuous flowing prose.\n\nFlights:\n${flightLines}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: "AI unavailable" }, { status: 502 });
  }

  const apiRaw = await response.json() as { content: { type: string; text: string }[] };
  const text = apiRaw.content?.find((c) => c.type === "text")?.text ?? "";

  return NextResponse.json({ diary: text.trim() });
}
