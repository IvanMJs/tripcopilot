import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/rateLimit";

const BodySchema = z.object({
  city: z.string().min(1).max(100),
  country: z.string().min(1).max(100),
  locale: z.enum(["es", "en"]),
});

export interface ExploreData {
  currency: string;   // e.g. "Euro (€)"
  phrase: string;     // e.g. "Merci = Thank you"
  mustTry: string;    // e.g. "Try a waffle from Maison Dandoy"
  watchOut: string;   // e.g. "Most museums close on Mondays"
  vibe: string;       // e.g. "Medieval charm meets craft beer culture"
}

const FALLBACK: ExploreData = {
  currency: "—",
  phrase: "—",
  mustTry: "—",
  watchOut: "—",
  vibe: "—",
};

function buildPrompt(city: string, country: string, locale: "es" | "en"): string {
  if (locale === "es") {
    return `Eres un experto viajero local. Alguien acaba de llegar a ${city}, ${country}.

Devuelve ÚNICAMENTE un objeto JSON válido con exactamente estos campos (sin markdown, sin explicaciones):
{
  "currency": "<moneda local con símbolo, ej: Euro (€)>",
  "phrase": "<una frase clave local con traducción al español, ej: Dankjewel = Muchas gracias>",
  "mustTry": "<una comida, bebida o experiencia específica e imperdible de ${city}>",
  "watchOut": "<un consejo práctico real que evita un error común de turista en ${city}>",
  "vibe": "<una frase evocadora sobre la personalidad única de ${city}>"
}`;
  }
  return `You are a local travel expert. Someone just arrived in ${city}, ${country}.

Return ONLY a valid JSON object with exactly these fields (no markdown, no explanation):
{
  "currency": "<local currency with symbol, e.g. Euro (€)>",
  "phrase": "<one key local phrase with English translation, e.g. Dankjewel = Thank you very much>",
  "mustTry": "<one specific food, drink, or experience not to miss in ${city}>",
  "watchOut": "<one practical tip that saves tourists from a common mistake in ${city}>",
  "vibe": "<one evocative sentence about ${city}'s unique personality>"
}`;
}

function parseExploreData(text: string): ExploreData | null {
  try {
    // Strip markdown fences if present
    const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const json = JSON.parse(cleaned) as Partial<ExploreData>;
    if (
      typeof json.currency === "string" &&
      typeof json.phrase === "string" &&
      typeof json.mustTry === "string" &&
      typeof json.watchOut === "string" &&
      typeof json.vibe === "string"
    ) {
      return {
        currency: json.currency,
        phrase: json.phrase,
        mustTry: json.mustTry,
        watchOut: json.watchOut,
        vibe: json.vibe,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await checkUserRateLimit(supabase, user.id, "explore-tip", 10))) {
    return rateLimitResponse();
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ data: FALLBACK }, { status: 200 });
  }

  const raw = await req.json();
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ data: FALLBACK }, { status: 200 });
  }
  const { city, country, locale } = parsed.data;

  const prompt = buildPrompt(city, country, locale);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
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
      return NextResponse.json({ data: FALLBACK }, { status: 200 });
    }

    const apiRaw = await response.json() as { content: { type: string; text: string }[] };
    const text = apiRaw.content?.find((c) => c.type === "text")?.text?.trim() ?? "";
    const data = parseExploreData(text) ?? FALLBACK;

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ data: FALLBACK }, { status: 200 });
  }
}
