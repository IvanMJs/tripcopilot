import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/rateLimit";

const BodySchema = z.object({
  city: z.string().min(1).max(100),
  country: z.string().min(1).max(100),
  locale: z.enum(["es", "en"]),
});

const TipSchema = z.object({
  icon: z.string(),
  title: z.string(),
  tip: z.string(),
});

const TipsArraySchema = z.array(TipSchema).length(4);

export type DestinationTip = z.infer<typeof TipSchema>;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 20 requests per hour per user
  if (!(await checkUserRateLimit(supabase, user.id, "destination-tips", 20))) {
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
  const { city, country, locale } = parsed.data;

  const prompt =
    locale === "es"
      ? `Da 4 consejos esenciales para viajeros que visitan ${city}, ${country}. Cubrí: moneda y pagos, cultura de propinas, seguridad, y una costumbre local única. Devuelve SOLO un JSON array válido (sin markdown, sin bloques de código): [{"icon": string (emoji), "title": string, "tip": string}]`
      : `Give 4 essential tips for travelers visiting ${city}, ${country}. Cover: currency & payment, tipping culture, safety, and one unique local custom. Return ONLY a valid JSON array (no markdown, no code blocks): [{"icon": string (emoji), "title": string, "tip": string}]`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    Sentry.captureException(new Error(`Anthropic upstream error: ${response.status}`));
    return NextResponse.json({ error: "Failed to generate tips" }, { status: 500 });
  }

  const apiRaw = await response.json() as { content: { type: string; text: string }[] };
  const text = apiRaw.content?.find((c) => c.type === "text")?.text?.trim() ?? "";

  let tips: DestinationTip[];
  try {
    const jsonText = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const jsonParsed: unknown = JSON.parse(jsonText);
    const validated = TipsArraySchema.safeParse(jsonParsed);
    if (!validated.success) {
      Sentry.captureException(new Error("Destination tips schema validation failed"));
      return NextResponse.json({ error: "Invalid tips format" }, { status: 500 });
    }
    tips = validated.data;
  } catch {
    Sentry.captureException(new Error("Destination tips JSON parse failed"));
    return NextResponse.json({ error: "Failed to parse tips" }, { status: 500 });
  }

  return NextResponse.json({ tips });
}
