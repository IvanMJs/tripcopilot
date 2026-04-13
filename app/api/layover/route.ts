import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export interface LayoverTip {
  icon: string;
  text: string;
}

export interface LayoverResponse {
  tips: LayoverTip[];
  canExitAirport: boolean;
  cityTip?: string;
}

const BodySchema = z.object({
  airportIata: z.string().min(3).max(4).toUpperCase(),
  bufferMinutes: z.number().int().min(0).max(2880),
  locale: z.enum(["es", "en"]),
});

const ResponseSchema = z.object({
  tips: z
    .array(
      z.object({
        icon: z.string().min(1).max(10),
        text: z.string().min(1).max(400),
      }),
    )
    .max(8),
  canExitAirport: z.boolean(),
  cityTip: z.string().max(400).optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 },
    );
  }

  if (!(await checkUserRateLimit(supabase, user.id, "layover", 10))) {
    return rateLimitResponse();
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { airportIata, bufferMinutes, locale } = parsed.data;

  if (bufferMinutes <= 180) {
    return NextResponse.json<LayoverResponse>({ tips: [], canExitAirport: false });
  }

  const bufferHours = Math.round(bufferMinutes / 60);
  const canPossiblyExit = bufferMinutes > 300;

  const prompt =
    locale === "es"
      ? `Tengo una escala de ${bufferHours} horas (${bufferMinutes} minutos) en el aeropuerto ${airportIata}.
Dame tips prácticos para aprovecharla. Incluí:
- Qué terminal es mejor para esperar
- Opciones de comida (rangos de precio)
${canPossiblyExit ? "- Si vale salir al city center y qué hacer" : ""}
- Tips específicos de este aeropuerto

Responde SOLO con JSON válido en este formato (sin texto extra, sin markdown):
{
  "tips": [
    { "icon": "🍜", "text": "descripción del tip" }
  ],
  "canExitAirport": ${canPossiblyExit},
  "cityTip": "tip sobre salir a la ciudad (solo si canExitAirport es true)"
}`
      : `I have a ${bufferHours}-hour layover (${bufferMinutes} minutes) at ${airportIata} airport.
Give me practical tips to make the most of it. Include:
- Which terminal is best to wait in
- Food options (price ranges)
${canPossiblyExit ? "- Whether it's worth going to the city center and what to do" : ""}
- Specific tips for this airport

Respond ONLY with valid JSON in this format (no extra text, no markdown):
{
  "tips": [
    { "icon": "🍜", "text": "tip description" }
  ],
  "canExitAirport": ${canPossiblyExit},
  "cityTip": "city exit tip (only if canExitAirport is true)"
}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      system:
        locale === "es"
          ? "Eres un asistente de viaje experto en aeropuertos. Responde ÚNICAMENTE con JSON válido. Sin explicaciones, sin markdown, sin texto fuera del objeto JSON."
          : "You are a travel assistant expert in airports. Respond ONLY with valid JSON. No explanations, no markdown, no text outside the JSON object.",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    Sentry.captureException(new Error(`Anthropic upstream error: ${response.status}`));
    return NextResponse.json<LayoverResponse>({ tips: [], canExitAirport: false });
  }

  const apiRaw = await response.json() as { content: { type: string; text: string }[] };
  const text = apiRaw.content?.find((c) => c.type === "text")?.text ?? "";

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return NextResponse.json<LayoverResponse>({ tips: [], canExitAirport: false });
  }
  const cleaned = text.slice(start, end + 1);

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(cleaned);
  } catch (err) {
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json<LayoverResponse>({ tips: [], canExitAirport: false });
  }

  const validation = ResponseSchema.safeParse(parsedJson);
  if (!validation.success) {
    return NextResponse.json<LayoverResponse>({ tips: [], canExitAirport: false });
  }

  return NextResponse.json<LayoverResponse>(validation.data);
}
