import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export interface Lounge {
  name: string;
  access: string;
  location: string;
  hours?: string;
  hasShower?: boolean;
}

export interface LoungeResponse {
  lounges: Lounge[];
}

const BodySchema = z.object({
  airportIata: z.string().min(3).max(4).toUpperCase(),
  airlineCode: z.string().min(2).max(3).toUpperCase(),
  locale: z.enum(["es", "en"]),
});

const LoungeArraySchema = z.array(
  z.object({
    name: z.string().min(1).max(200),
    access: z.string().min(1).max(300),
    location: z.string().min(1).max(300),
    hours: z.string().max(100).optional(),
    hasShower: z.boolean().optional(),
  }),
).max(10);

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

  if (!(await checkUserRateLimit(supabase, user.id, "lounge", 10))) {
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

  const { airportIata, airlineCode, locale } = parsed.data;

  const prompt =
    locale === "es"
      ? `Dame info de los lounges disponibles en el aeropuerto ${airportIata} para pasajeros de la aerolínea ${airlineCode}.
Incluí: nombre del lounge, acceso (business class, tarjeta, Priority Pass), ubicación en el terminal, horario, si tiene ducha.
Responde SOLO con JSON válido: un array de lounges. Si no tenés info confiable, devolvé un array vacío [].
Formato (sin texto extra, sin markdown):
[
  {
    "name": "nombre del lounge",
    "access": "cómo acceder",
    "location": "terminal y ubicación",
    "hours": "horario (opcional)",
    "hasShower": true
  }
]`
      : `Give me info about lounges available at airport ${airportIata} for passengers of airline ${airlineCode}.
Include: lounge name, access (business class, card, Priority Pass), terminal location, hours, whether it has a shower.
Respond ONLY with valid JSON: an array of lounges. If you don't have reliable info, return an empty array [].
Format (no extra text, no markdown):
[
  {
    "name": "lounge name",
    "access": "how to access",
    "location": "terminal and location",
    "hours": "hours (optional)",
    "hasShower": true
  }
]`;

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
      system:
        locale === "es"
          ? "Eres un asistente de viaje experto en aeropuertos. Responde ÚNICAMENTE con JSON válido (array). Sin explicaciones, sin markdown."
          : "You are a travel assistant expert in airports. Respond ONLY with valid JSON (array). No explanations, no markdown.",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    return NextResponse.json<LoungeResponse>({ lounges: [] });
  }

  const apiRaw = await response.json() as { content: { type: string; text: string }[] };
  const text =
    apiRaw.content?.find((c) => c.type === "text")?.text ?? "";

  // Extract JSON array
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) {
    return NextResponse.json<LoungeResponse>({ lounges: [] });
  }
  const cleaned = text.slice(start, end + 1);

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(cleaned);
  } catch {
    return NextResponse.json<LoungeResponse>({ lounges: [] });
  }

  const validation = LoungeArraySchema.safeParse(parsedJson);
  if (!validation.success) {
    return NextResponse.json<LoungeResponse>({ lounges: [] });
  }

  return NextResponse.json<LoungeResponse>({ lounges: validation.data });
}
