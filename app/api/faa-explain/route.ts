import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "edge";

const BodySchema = z.object({
  airportCode: z.string().length(3),
  status:      z.string().max(100),
  rawDetails:  z.string().max(2_000),
  locale:      z.enum(["es", "en"]),
});

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const raw = await req.json();
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { airportCode, status, rawDetails, locale } = parsed.data;

  const prompt =
    locale === "es"
      ? `Soy un pasajero con vuelo en el aeropuerto ${airportCode}. La FAA reporta esta situación:

Estado: ${status}
Detalle: ${rawDetails}

Explicame en 1-2 oraciones simples qué significa esto para mi vuelo y qué debería hacer. Sin tecnicismos, sin mencionar la FAA, como si me lo explicara un amigo.`
      : `I'm a passenger with a flight at ${airportCode} airport. The FAA is reporting this situation:

Status: ${status}
Details: ${rawDetails}

Explain in 1-2 simple sentences what this means for my flight and what I should do. No jargon, no mention of the FAA, as if a friend were explaining it to me.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 150,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: "No se pudo generar la explicación" }, { status: 500 });
  }

  const apiRaw = await response.json() as { content: { type: string; text: string }[] };
  const explanation = apiRaw.content?.find((c: { type: string; text: string }) => c.type === "text")?.text?.trim() ?? "";

  return NextResponse.json({ explanation });
}
