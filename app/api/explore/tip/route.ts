import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/rateLimit";

const BodySchema = z.object({
  city: z.string().min(1).max(100),
  country: z.string().min(1).max(100),
  locale: z.enum(["es", "en"]),
});

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
    return NextResponse.json({ tip: null }, { status: 200 });
  }

  const raw = await req.json();
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ tip: null }, { status: 200 });
  }
  const { city, country, locale } = parsed.data;

  const prompt =
    locale === "es"
      ? `dame un tip útil, concreto y local para alguien que acaba de llegar a ${city}, ${country}. Una sola frase, sin saludos, sin markdown, máximo 20 palabras.`
      : `give one useful, concrete, local tip for someone who just arrived in ${city}, ${country}. One sentence, no greetings, no markdown, max 20 words.`;

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
        max_tokens: 150,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ tip: null }, { status: 200 });
    }

    const apiRaw = await response.json() as { content: { type: string; text: string }[] };
    const tip = apiRaw.content?.find((c) => c.type === "text")?.text?.trim() ?? null;

    return NextResponse.json({ tip });
  } catch {
    return NextResponse.json({ tip: null }, { status: 200 });
  }
}
