import { NextRequest, NextResponse } from "next/server";
import { TripAdviceResult } from "@/lib/types/tripAdvice";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/rateLimit";

const StaySchema = z.object({
  code:          z.string().length(3),
  city:          z.string().max(100),
  nights:        z.number().int().min(0).max(365),
  arrivalDate:   z.string().max(10),
  departureDate: z.string().max(10),
  tempMin:       z.number(),
  tempMax:       z.number(),
  climate:       z.string().max(200),
});

const BodySchema = z.object({
  stays:      z.array(StaySchema).min(1).max(15),
  locale:     z.enum(["es", "en"]),
  activities: z.array(z.string().max(50)).max(10).optional(),
});

const SCHEMA_HINT = `{
  "summary": "2-3 sentence overview of the trip",
  "packing": [
    { "item": "item name", "reason": "why it's needed for this specific trip", "priority": "essential|recommended|optional" }
  ],
  "destination_tips": [
    { "code": "IATA", "city": "city name", "tips": ["tip 1", "tip 2", "tip 3"] }
  ],
  "by_leg": [
    { "from": "ORIGIN", "to": "DEST", "note": "only if there is genuinely useful connection/transit info" }
  ]
}`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  // Rate limit: 5 advice requests per hour per user (more expensive than parse-flight)
  if (!(await checkUserRateLimit(supabase, user.id, "trip-advice", 5))) {
    return rateLimitResponse();
  }

  const raw = await req.json();
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { stays, locale, activities } = parsed.data;

  const staysText = stays
    .map((s) =>
      locale === "es"
        ? `• ${s.city} (${s.code}): ${s.nights} noches, ${s.arrivalDate}→${s.departureDate}, ${s.tempMin}–${s.tempMax}°C, ${s.climate}`
        : `• ${s.city} (${s.code}): ${s.nights} nights, ${s.arrivalDate}→${s.departureDate}, ${s.tempMin}–${s.tempMax}°C, ${s.climate}`,
    )
    .join("\n");

  const activitiesLine = activities && activities.length > 0
    ? locale === "es"
      ? `\nActividades del usuario: ${activities.join(", ")}. Personaliza el packing list y los tips según estas actividades.`
      : `\nUser activities: ${activities.join(", ")}. Customize the packing list and tips based on these activities.`
    : "";

  const prompt =
    locale === "es"
      ? `Analiza este itinerario y devuelve SOLO JSON válido.

Itinerario:
${staysText}${activitiesLine}

Contexto: viajero argentino con vuelos internacionales, mezcla de climas (tropical → primavera fría).

Reglas para destination_tips:
- Máximo 3 tips por destino
- PROHIBIDO: consejos genéricos de turista ("visita los museos", "come comida local", "sé puntual"), advertencias de seguridad genéricas, info que aparece en cualquier guía
- REQUERIDO: tips prácticos y específicos para ESTE viaje concreto (época del año, aeropuerto de conexión, duración de estadía, origen argentino del viajero)
- Ejemplos de tip bueno: "Con 2 noches en Miami, priorizá Wynwood de tarde-noche cuando baja el calor", "En GCM el alquiler de auto es necesario si querés ir más allá de Seven Mile Beach"

Reglas para packing: máximo 7 items, priorizados por el contraste de climas.
Reglas para by_leg: solo si hay info útil de conexión o tránsito (terminal, tiempo mínimo, nota importante). Si no hay nada relevante, omitir el campo.
Reglas para summary: 2-3 oraciones que capturen la esencia del viaje, no una descripción obvia.

JSON (sin texto extra, sin markdown):
${SCHEMA_HINT}`
      : `Analyze this itinerary and return ONLY valid JSON.

Itinerary:
${staysText}${activitiesLine}

Context: Argentine traveler, international flights, mixed climates (tropical → cool spring).

Rules for destination_tips:
- Max 3 tips per destination
- FORBIDDEN: generic tourist advice ("visit the museums", "eat local food", "be punctual"), generic safety warnings, info from any travel guide
- REQUIRED: practical tips specific to THIS trip (time of year, connection airport, length of stay, Argentine traveler origin)
- Good tip example: "With only 2 nights in Miami, prioritize Wynwood in the evening when the heat drops", "In GCM renting a car is necessary if you want to go beyond Seven Mile Beach"

Rules for packing: max 7 items, prioritized by climate contrast.
Rules for by_leg: only include if there is genuinely useful connection/transit info (terminal, minimum time, important note). If nothing relevant, omit the field.
Rules for summary: 2-3 sentences capturing the essence of the trip, not an obvious description.

JSON (no extra text, no markdown):
${SCHEMA_HINT}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1800,
      system: locale === "es"
        ? "Eres un asistente de viaje. DEBES responder ÚNICAMENTE con JSON válido en español. Sin explicaciones, sin markdown, sin texto fuera del objeto JSON."
        : "You are a travel assistant. You MUST respond with ONLY valid JSON in English. No explanations, no markdown, no text outside the JSON object.",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { error?: { message?: string; type?: string } };
    const type = err.error?.type ?? "";
    const friendly =
      type === "authentication_error"  ? "API key inválida"
      : type === "permission_error"    ? "Sin permisos en la API"
      : response.status === 529        ? "API con sobrecarga, reintentá en unos segundos"
      : "No se pudo generar el análisis AI";
    return NextResponse.json({ error: friendly }, { status: 500 });
  }

  const apiRaw = await response.json() as { content: { type: string; text: string }[] };
  const text = apiRaw.content?.find((c: { type: string; text: string }) => c.type === "text")?.text ?? "";

  // Extract JSON robustly — find first { to last }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return NextResponse.json({ error: "No se pudo generar el análisis AI" }, { status: 502 });
  }
  const cleaned = text.slice(start, end + 1);

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(cleaned);
  } catch {
    return NextResponse.json({ error: "No se pudo generar el análisis AI" }, { status: 502 });
  }

  const TripAdviceSchema = z.object({
    summary: z.string().min(1).max(1000),
    packing: z.array(z.object({
      item:     z.string().min(1).max(200),
      reason:   z.string().min(1).max(500),
      priority: z.enum(["essential", "recommended", "optional"]),
    })).min(1).max(15),
    destination_tips: z.array(z.object({
      code: z.string().max(3),
      city: z.string().max(100),
      tips: z.array(z.string().max(500)).min(1).max(5),
    })).max(10).default([]),
    by_leg: z.array(z.object({
      from: z.string().max(3),
      to:   z.string().max(3),
      note: z.string().max(500),
    })).max(20).optional(),
  });

  const validation = TripAdviceSchema.safeParse(parsedJson);
  if (!validation.success) {
    return NextResponse.json({ error: "Incomplete response from model" }, { status: 502 });
  }

  return NextResponse.json({ data: validation.data as TripAdviceResult });
}
