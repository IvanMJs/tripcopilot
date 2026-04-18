import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const BodySchema = z.object({
  tripId: z.string().uuid(),
  locale: z.enum(["es", "en"]),
});

const HealthCheckItemSchema = z.object({
  emoji: z.string(),
  title: z.string(),
  body: z.string(),
  level: z.enum(["ok", "warning", "tip"]),
});

const HealthCheckResultSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  scoreLabel: z.string(),
  items: z.array(HealthCheckItemSchema).min(1).max(10),
  aiTip: z.string(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { tripId, locale } = parsed.data;

  // Verify trip belongs to user
  const { data: trip } = await supabase
    .from("trips")
    .select("id, name")
    .eq("id", tripId)
    .eq("user_id", user.id)
    .single();
  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: flights } = await supabase
    .from("flights")
    .select("flight_code, origin_code, destination_code, iso_date, departure_time")
    .eq("trip_id", tripId)
    .order("iso_date", { ascending: true });

  const flightsSummary =
    flights
      ?.map((f) => `${f.flight_code} ${f.origin_code}→${f.destination_code} ${f.iso_date}`)
      .join(", ") ?? "No flights found";

  const systemPrompt = `You are TripCopilot, a smart travel assistant. Analyze the trip and return a JSON health check.

Return ONLY valid JSON in this exact shape (no markdown):
{
  "overallScore": 85,
  "scoreLabel": "${locale === "es" ? "Buen estado" : "Good shape"}",
  "items": [
    { "emoji": "⛅", "title": "${locale === "es" ? "Clima en destino" : "Weather at destination"}", "body": "...", "level": "ok" },
    { "emoji": "🛂", "title": "${locale === "es" ? "Documentación" : "Documentation"}", "body": "...", "level": "warning" },
    { "emoji": "💱", "title": "${locale === "es" ? "Moneda local" : "Local currency"}", "body": "...", "level": "tip" },
    { "emoji": "🔌", "title": "${locale === "es" ? "Adaptador" : "Power adapter"}", "body": "...", "level": "tip" },
    { "emoji": "📱", "title": "${locale === "es" ? "Apps recomendadas" : "Recommended apps"}", "body": "...", "level": "tip" },
    { "emoji": "🧳", "title": "${locale === "es" ? "Qué llevar" : "What to pack"}", "body": "...", "level": "tip" }
  ],
  "aiTip": "One sharp personalized tip about this specific trip in 1 sentence."
}
Keep each body under 60 characters. Use ${locale === "es" ? "Spanish" : "English"}.`;

  const userMessage = `Trip: ${trip.name}\nFlights: ${flightsSummary}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = response.content.find((c) => c.type === "text");
    const text = textBlock?.type === "text" ? textBlock.text : "";

    // Extract JSON robustly — find first { to last }
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      return NextResponse.json({ error: "AI unavailable" }, { status: 500 });
    }
    const cleaned = text.slice(start, end + 1);

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(cleaned);
    } catch (err) {
      Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
      return NextResponse.json({ error: "AI unavailable" }, { status: 500 });
    }

    const validation = HealthCheckResultSchema.safeParse(parsedJson);
    if (!validation.success) {
      return NextResponse.json({ error: "AI unavailable" }, { status: 500 });
    }

    return NextResponse.json({ data: validation.data });
  } catch (err) {
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json({ error: "AI unavailable" }, { status: 500 });
  }
}
