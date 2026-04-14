import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { AIRPORTS } from "@/lib/airports";

const LABELS = {
  es: {
    unauthorized: "No autorizado",
    invalidRequest: "Solicitud inválida",
    serverError: "Error del servidor",
    generateError: "No se pudieron generar sugerencias",
    parseError: "Error al procesar sugerencias",
  },
  en: {
    unauthorized: "Unauthorized",
    invalidRequest: "Invalid request",
    serverError: "Server error",
    generateError: "Failed to generate suggestions",
    parseError: "Failed to parse suggestions",
  },
};

const BodySchema = z.object({
  destinationCodes: z.array(z.string().min(3).max(4).toUpperCase()),
  locale: z.enum(["es", "en"]),
});

interface TripSuggestion {
  iata: string;
  city: string;
  country: string;
  emoji: string;
  reason: string;
}

const SuggestionSchema = z.object({
  iata: z.string(),
  city: z.string(),
  country: z.string(),
  emoji: z.string(),
  reason: z.string(),
});

const SuggestionsResponseSchema = z.object({
  suggestions: z.array(SuggestionSchema),
});

const GENERIC_POPULAR_DESTINATIONS: TripSuggestion[] = [
  { iata: "BCN", city: "Barcelona",  country: "Spain",      emoji: "🏛️",  reason: "Architecture, tapas, and the Mediterranean coast." },
  { iata: "NRT", city: "Tokyo",      country: "Japan",      emoji: "🗼",  reason: "Unique blend of tradition, technology, and exceptional food." },
  { iata: "GRU", city: "São Paulo",  country: "Brazil",     emoji: "🇧🇷", reason: "Vibrant culture, arts scene, and gateway to Brazil." },
  { iata: "DXB", city: "Dubai",      country: "UAE",        emoji: "🏙️",  reason: "Modern marvels, luxury shopping, and desert adventures." },
];

function buildPrompt(destinationCodes: string[], locale: "es" | "en"): string {
  const visitedList = destinationCodes
    .map((code) => {
      const airport = AIRPORTS[code];
      return airport ? `${code} (${airport.city}, ${airport.country ?? "USA"})` : code;
    })
    .join(", ");

  if (locale === "es") {
    return `El usuario ha visitado los siguientes destinos: ${visitedList}.

Basándote en sus viajes anteriores, sugiere 4 destinos que podrían interesarle. Considera patrones como preferencias de región, tipo de destino (ciudad, playa, naturaleza) y variedad cultural.

Devuelve SOLO JSON válido (sin markdown, sin bloques de código):
{
  "suggestions": [
    {
      "iata": "código IATA del aeropuerto principal",
      "city": "nombre de la ciudad",
      "country": "nombre del país",
      "emoji": "un emoji representativo",
      "reason": "frase corta (máx 15 palabras) explicando por qué le podría gustar al usuario"
    }
  ]
}`;
  }

  return `The user has visited the following destinations: ${visitedList}.

Based on their travel history, suggest 4 destinations they might enjoy. Consider patterns such as regional preferences, destination type (city, beach, nature), and cultural variety.

Return ONLY valid JSON (no markdown, no code blocks):
{
  "suggestions": [
    {
      "iata": "main airport IATA code",
      "city": "city name",
      "country": "country name",
      "emoji": "a representative emoji",
      "reason": "short phrase (max 15 words) explaining why the user might enjoy it"
    }
  ]
}`;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: LABELS.en.unauthorized }, { status: 401 });
  }

  // Rate limit: 5 requests per hour per user
  if (!(await checkUserRateLimit(supabase, user.id, "trip-suggestions", 5))) {
    return rateLimitResponse();
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: LABELS.en.serverError }, { status: 500 });
  }

  let locale: "es" | "en" = "en";
  let destinationCodes: string[] = [];

  try {
    const raw: unknown = await req.json();
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: LABELS.en.invalidRequest }, { status: 400 });
    }
    locale = parsed.data.locale;
    destinationCodes = parsed.data.destinationCodes;
  } catch {
    return NextResponse.json({ error: LABELS.en.invalidRequest }, { status: 400 });
  }

  const labels = LABELS[locale];

  // If no past destinations, return generic suggestions
  if (destinationCodes.length === 0) {
    return NextResponse.json({ suggestions: GENERIC_POPULAR_DESTINATIONS });
  }

  try {
    const prompt = buildPrompt(destinationCodes, locale);

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
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      Sentry.captureException(
        new Error(`Anthropic upstream error: ${response.status} on trip-suggestions`),
      );
      return NextResponse.json({ error: labels.generateError }, { status: 500 });
    }

    const apiRaw = await response.json() as { content: { type: string; text: string }[] };
    const text = apiRaw.content?.find((c) => c.type === "text")?.text?.trim() ?? "";

    const jsonText = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const jsonParsed: unknown = JSON.parse(jsonText);
    const validated = SuggestionsResponseSchema.safeParse(jsonParsed);

    if (!validated.success) {
      Sentry.captureException(new Error("Trip suggestions schema validation failed"));
      return NextResponse.json({ suggestions: GENERIC_POPULAR_DESTINATIONS });
    }

    return NextResponse.json({ suggestions: validated.data.suggestions });
  } catch {
    Sentry.captureException(new Error("Trip suggestions generation failed"));
    // Graceful fallback
    return NextResponse.json({ suggestions: GENERIC_POPULAR_DESTINATIONS });
  }
}
