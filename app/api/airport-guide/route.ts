import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { AIRPORTS } from "@/lib/airports";

const BodySchema = z.object({
  airportIata: z.string().min(3).max(4).toUpperCase(),
  locale: z.enum(["es", "en"]),
});

const FoodItemSchema = z.object({
  name: z.string(),
  terminal: z.string(),
  type: z.string(),
});

const TransportOptionSchema = z.object({
  method: z.string(),
  cost: z.string(),
  time: z.string(),
});

const AirportGuideSchema = z.object({
  terminals: z.string(),
  food: z.array(FoodItemSchema),
  transport: z.array(TransportOptionSchema),
  lounges: z.string(),
  wifi: z.string(),
  insiderTip: z.string(),
});

export type AirportGuideData = z.infer<typeof AirportGuideSchema>;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 20 requests per hour per user
  if (!(await checkUserRateLimit(supabase, user.id, "airport-guide", 20))) {
    return rateLimitResponse();
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const raw = await req.json();
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { airportIata, locale } = parsed.data;

  const airport = AIRPORTS[airportIata];
  const airportName = airport?.name ?? airportIata;
  const city = airport?.city ?? airportIata;

  const prompt =
    locale === "es"
      ? `Genera una guía práctica del aeropuerto ${airportIata} (${airportName}, ${city}). Incluye: resumen de terminales, mejores opciones de comida (3-4 lugares con terminal y tipo de cocina), transporte hacia/desde el centro de la ciudad (opciones + costo estimado + tiempo), consejos de acceso a salas VIP, info de WiFi, y un tip de experto. Devuelve SOLO JSON válido (sin markdown, sin bloques de código): { "terminals": string, "food": [{"name": string, "terminal": string, "type": string}], "transport": [{"method": string, "cost": string, "time": string}], "lounges": string, "wifi": string, "insiderTip": string }`
      : `Generate a practical airport guide for ${airportIata} (${airportName}, ${city}). Include: terminal overview, best food options (3-4 spots with terminal location and cuisine type), transport to/from city center (options + estimated cost + time), lounge access tips, WiFi info, and one insider tip. Return ONLY valid JSON (no markdown, no code blocks): { "terminals": string, "food": [{"name": string, "terminal": string, "type": string}], "transport": [{"method": string, "cost": string, "time": string}], "lounges": string, "wifi": string, "insiderTip": string }`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    Sentry.captureException(new Error(`Anthropic upstream error: ${response.status}`));
    return NextResponse.json({ error: "Failed to generate airport guide" }, { status: 500 });
  }

  const apiRaw = await response.json() as { content: { type: string; text: string }[] };
  const text = apiRaw.content?.find((c) => c.type === "text")?.text?.trim() ?? "";

  let guideData: AirportGuideData;
  try {
    const jsonText = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const jsonParsed: unknown = JSON.parse(jsonText);
    const validated = AirportGuideSchema.safeParse(jsonParsed);
    if (!validated.success) {
      Sentry.captureException(new Error("Airport guide schema validation failed"));
      return NextResponse.json({ error: "Invalid guide format" }, { status: 500 });
    }
    guideData = validated.data;
  } catch {
    Sentry.captureException(new Error("Airport guide JSON parse failed"));
    return NextResponse.json({ error: "Failed to parse guide" }, { status: 500 });
  }

  return NextResponse.json({ guide: guideData });
}
