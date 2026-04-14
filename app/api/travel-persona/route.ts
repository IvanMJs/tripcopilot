import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/rateLimit";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const BodySchema = z.object({
  totalFlights: z.number().int().min(0),
  countries: z.number().int().min(0),
  totalKm: z.number().min(0),
  avgTripDays: z.number().min(0),
  topAirlines: z.array(z.string()).max(5),
  cabinClasses: z.array(z.string()).max(4),
  domesticRatio: z.number().min(0).max(1),
  locale: z.enum(["es", "en"]),
});

const PersonaResultSchema = z.object({
  title: z.string().min(1).max(40),
  emoji: z.string().min(1).max(4),
  description: z.string().min(1).max(200),
  traits: z.array(z.string().min(1).max(30)).length(3),
});

export type TravelPersonaResult = z.infer<typeof PersonaResultSchema>;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit: 5 persona requests per hour per user
  if (!(await checkUserRateLimit(supabase, user.id, "travel-persona", 5))) {
    return rateLimitResponse();
  }

  const raw = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const {
    totalFlights,
    countries,
    totalKm,
    avgTripDays,
    topAirlines,
    cabinClasses,
    domesticRatio,
    locale,
  } = parsed.data;

  const isEs = locale === "es";

  const systemPrompt = isEs
    ? `Eres TripCopilot, un asistente de viajes creativo. Analizá las estadísticas de viaje del usuario y generá un tipo de personalidad de viajero divertido y único.

Devolvé SOLO JSON válido en este formato exacto (sin markdown):
{
  "title": "Título de 2-3 palabras",
  "emoji": "un emoji representativo",
  "description": "Una oración que capture la esencia del viajero",
  "traits": ["rasgo1", "rasgo2", "rasgo3"]
}

Ejemplos de títulos: "Guerrero de fin de semana", "Globe-Trotter ejecutivo", "Explorador aventurero", "Viajero urbano", "Cazador de conexiones"
Sé creativo, positivo y específico según las stats. Máximo 40 caracteres por título, 200 por descripción, 30 por rasgo.`
    : `You are TripCopilot, a creative travel assistant. Analyze the user's travel stats and generate a fun, unique traveler personality type.

Return ONLY valid JSON in this exact shape (no markdown):
{
  "title": "2-3 word title",
  "emoji": "one representative emoji",
  "description": "One sentence capturing the traveler's essence",
  "traits": ["trait1", "trait2", "trait3"]
}

Example titles: "Weekend Warrior", "Business Globe-Trotter", "Adventure Seeker", "Urban Explorer", "Connection Hunter"
Be creative, positive, and specific to the stats. Max 40 chars per title, 200 per description, 30 per trait.`;

  const airlineList = topAirlines.length > 0 ? topAirlines.join(", ") : (isEs ? "variadas" : "various");
  const cabinList   = cabinClasses.length > 0 ? cabinClasses.join(", ") : "economy";
  const intlRatio   = Math.round((1 - domesticRatio) * 100);

  const userMessage = isEs
    ? `Estadísticas del viajero:
- Vuelos totales: ${totalFlights}
- Países visitados: ${countries}
- Kilómetros volados: ${Math.round(totalKm).toLocaleString()}
- Duración promedio de viaje: ${Math.round(avgTripDays)} días
- Aerolíneas favoritas: ${airlineList}
- Cabinas usadas: ${cabinList}
- Vuelos internacionales: ${intlRatio}%`
    : `Traveler stats:
- Total flights: ${totalFlights}
- Countries visited: ${countries}
- Kilometres flown: ${Math.round(totalKm).toLocaleString()}
- Average trip length: ${Math.round(avgTripDays)} days
- Top airlines: ${airlineList}
- Cabin classes: ${cabinList}
- International flights: ${intlRatio}%`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = response.content.find((c) => c.type === "text");
    const text = textBlock?.type === "text" ? textBlock.text : "";

    const start = text.indexOf("{");
    const end   = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      return NextResponse.json({ error: "AI unavailable" }, { status: 500 });
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(text.slice(start, end + 1));
    } catch {
      return NextResponse.json({ error: "AI unavailable" }, { status: 500 });
    }

    const validation = PersonaResultSchema.safeParse(parsedJson);
    if (!validation.success) {
      return NextResponse.json({ error: "AI unavailable" }, { status: 500 });
    }

    return NextResponse.json({ data: validation.data });
  } catch {
    return NextResponse.json({ error: "AI unavailable" }, { status: 500 });
  }
}
