import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import * as Sentry from "@sentry/nextjs";

const BodySchema = z
  .object({
    text:        z.string().max(10_000).optional(),
    imageBase64: z.string().max(5_000_000).optional(), // ~3.7 MB image
    mimeType:    z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]).optional(),
    locale:      z.enum(["es", "en"]).default("en"),
  })
  .refine((d) => d.text || d.imageBase64, {
    message: "Either text or imageBase64 is required",
  })
  .refine((d) => !d.imageBase64 || !!d.mimeType, {
    message: "mimeType is required when imageBase64 is provided",
    path: ["mimeType"],
  });

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

const SYSTEM_PROMPT = `You are a travel itinerary data extractor. Given an airline booking confirmation (email, screenshot, or travel document), extract ALL flight segments.

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "flights": [
    {
      "flightCode": "AA900",
      "airlineCode": "AA",
      "airlineName": "American Airlines",
      "flightNumber": "900",
      "originCode": "EZE",
      "destinationCode": "MIA",
      "isoDate": "2026-03-29",
      "departureTime": "20:30",
      "arrivalDate": "2026-03-30",
      "arrivalTime": "06:45",
      "cabinClass": "economy",
      "seatNumber": "12A",
      "bookingCode": "QDLHPV",
      "confidence": "high",
      "missing": []
    }
  ],
  "rawExtraction": "Brief reasoning: found 2 flights in a round-trip AA confirmation..."
}

Rules:
- flightCode: airline IATA code + flight number, no spaces (e.g. "AA900", "UA456")
- airlineCode: 2-letter IATA code (e.g. "AA", "UA", "DL", "LA", "AR")
- airlineName: full airline name in English
- flightNumber: just the digits (e.g. "900")
- originCode: IATA airport code, 3 uppercase letters
- destinationCode: IATA airport code, 3 uppercase letters
- isoDate: departure date, format "YYYY-MM-DD"
- departureTime: 24h format "HH:MM", or "" if not found. Convert 12h to 24h (e.g. "8:30 PM" → "20:30").
- arrivalDate: arrival date, format "YYYY-MM-DD". May differ from isoDate for overnight flights. Leave "" if not found.
- arrivalTime: arrival time in local time at destination, 24h format "HH:MM". Leave "" if not found.
- cabinClass: one of "economy", "premium_economy", "business", "first". Leave "" if not found.
- seatNumber: assigned seat, row + letter (e.g. "12A", "23F", "4C"). Leave "" if not assigned.
- bookingCode: PNR/confirmation/reservation code. Formats: 6-char alphanumeric (e.g. "QDLHPV") OR 6-10 digit numeric. Shared across all flights in the same booking. Leave "" if not found.
- confidence: "high" if all required fields found, "medium" if 1-2 minor fields missing, "low" if key fields like airports or date are missing
- missing: array of field names that could not be found, e.g. ["departureTime"] or []
- rawExtraction: 1-2 sentence summary of what you found and any ambiguities

Handle Spanish, English, and Portuguese input naturally.
Extract ALL flight segments in chronological order.
If a field is missing or uncertain, leave it as empty string "" and add the field name to "missing".
`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = getAnthropicClient();
  if (!client) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const allowed = await checkUserRateLimit(supabase, user.id, "parse-itinerary", 20);
  if (!allowed) return rateLimitResponse();

  try {
    const raw = await req.json();
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { text, imageBase64, mimeType } = parsed.data;

    const userContent: Anthropic.MessageParam["content"] = [];

    if (imageBase64 && mimeType) {
      userContent.push({
        type: "image",
        source: {
          type:       "base64",
          media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
          data:       imageBase64,
        },
      });
      userContent.push({
        type: "text",
        text: "Extract all flight segments from this image. Return JSON only.",
      });
    } else {
      userContent.push({
        type: "text",
        text: `Extract all flight segments from this travel document:\n\n${text}\n\nReturn JSON only.`,
      });
    }

    const message = await client.messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: "user", content: userContent }],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ flights: [], rawExtraction: "" });
    }

    const jsonParsed = JSON.parse(jsonMatch[0]) as {
      flights?: unknown[];
      rawExtraction?: string;
    };

    const FlightSchema = z.object({
      flightCode:      z.string().regex(/^[A-Z0-9]{2,3}\d{1,4}$/).catch(""),
      airlineCode:     z.string().regex(/^[A-Z]{2}$/).catch(""),
      airlineName:     z.string().max(100).catch(""),
      flightNumber:    z.string().regex(/^\d{1,4}$/).catch(""),
      originCode:      z.string().regex(/^[A-Z]{3}$/).catch(""),
      destinationCode: z.string().regex(/^[A-Z]{3}$/).catch(""),
      isoDate:         z
        .string()
        .regex(/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/)
        .catch(""),
      departureTime: z
        .string()
        .regex(/^\d{2}:\d{2}$/)
        .or(z.literal(""))
        .catch(""),
      arrivalDate: z
        .string()
        .regex(/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/)
        .or(z.literal(""))
        .catch(""),
      arrivalTime: z
        .string()
        .regex(/^\d{2}:\d{2}$/)
        .or(z.literal(""))
        .catch(""),
      cabinClass:  z
        .enum(["economy", "premium_economy", "business", "first"])
        .or(z.literal(""))
        .catch(""),
      seatNumber:  z.string().max(10).catch(""),
      bookingCode: z.string().max(20).catch(""),
      confidence:  z.enum(["high", "medium", "low"]).catch("medium"),
      missing:     z.array(z.string()).catch([]),
    });

    const flights = z
      .array(FlightSchema)
      .max(20)
      .catch([])
      .parse(jsonParsed.flights ?? []);

    const rawExtraction =
      typeof jsonParsed.rawExtraction === "string"
        ? jsonParsed.rawExtraction.slice(0, 500)
        : "";

    return NextResponse.json({ flights, rawExtraction });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json({ error: "Failed to parse" }, { status: 500 });
  }
}
