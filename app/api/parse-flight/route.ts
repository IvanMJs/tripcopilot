import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rateLimiter";

const HOUR_MS = 3_600_000;

const BodySchema = z.object({
  text:        z.string().max(20_000).optional(),
  imageBase64: z.string().max(1_500_000).optional(), // ~1MB image
  mimeType:    z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]).optional(),
});

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a flight data extractor. Given an airline booking confirmation email, itinerary screenshot, or any travel document, extract all flight segments.

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
      "missing": []
    }
  ]
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
- arrivalTime: arrival time in local time at destination, 24h format "HH:MM". Leave "" if not found. Convert 12h to 24h.
- missing: array of field names you could not find, e.g. ["departureTime"] or []

If a field is missing or uncertain, leave it as empty string "" and add the field name to "missing".
Extract ALL flight segments in the document, in chronological order.
`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit by IP (20 req/hour) — applied first as a broad guard.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const ipLimit = checkRateLimit({
    windowMs: HOUR_MS,
    maxRequests: 20,
    identifier: `parse-flight:ip:${ip}`,
  });

  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests", resetIn: ipLimit.resetIn },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(ipLimit.resetIn),
          "Retry-After": String(ipLimit.resetIn),
        },
      },
    );
  }

  // Rate limit by userId (50 req/hour for authenticated users).
  const userLimit = checkRateLimit({
    windowMs: HOUR_MS,
    maxRequests: 50,
    identifier: `parse-flight:user:${user.id}`,
  });

  if (!userLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests", resetIn: userLimit.resetIn },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(userLimit.resetIn),
          "Retry-After": String(userLimit.resetIn),
        },
      },
    );
  }

  // Attach rate limit headers to all successful responses further down.
  const rateLimitHeaders = {
    "X-RateLimit-Remaining": String(Math.min(ipLimit.remaining, userLimit.remaining)),
    "X-RateLimit-Reset": String(Math.min(ipLimit.resetIn, userLimit.resetIn)),
  };

  try {
    const raw = await req.json();
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { text, imageBase64, mimeType } = parsed.data;

    if (!text && !imageBase64) {
      return NextResponse.json({ error: "text or imageBase64 required" }, { status: 400 });
    }

    const userContent: Anthropic.MessageParam["content"] = [];

    if (imageBase64 && mimeType) {
      userContent.push({
        type: "image",
        source: {
          type: "base64",
          media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
          data: imageBase64,
        },
      });
      userContent.push({
        type: "text",
        text: "Extract all flight segments from this image. Return JSON only.",
      });
    } else {
      userContent.push({
        type: "text",
        text: `Extract all flight segments from this text:\n\n${text}\n\nReturn JSON only.`,
      });
    }

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });

    const responseText = message.content[0].type === "text" ? message.content[0].text : "";

    // Extract JSON from response (handle cases where model adds extra text)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ flights: [] }, { headers: rateLimitHeaders });
    }

    const jsonParsed = JSON.parse(jsonMatch[0]) as { flights?: unknown[] };

    // Validate and sanitize each flight — replace invalid fields with "" so the
    // import modal can flag them as missing rather than inserting bad data to DB.
    const FlightSchema = z.object({
      flightCode:      z.string().regex(/^[A-Z0-9]{2,3}\d{1,4}$/).catch(""),
      airlineCode:     z.string().regex(/^[A-Z]{2}$/).catch(""),
      airlineName:     z.string().max(100).catch(""),
      flightNumber:    z.string().regex(/^\d{1,4}$/).catch(""),
      originCode:      z.string().regex(/^[A-Z]{3}$/).catch(""),
      destinationCode: z.string().regex(/^[A-Z]{3}$/).catch(""),
      isoDate:         z.string().regex(/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/).catch(""),
      departureTime:   z.string().regex(/^\d{2}:\d{2}$/).or(z.literal("")).catch(""),
      arrivalDate:     z.string().regex(/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/).or(z.literal("")).catch(""),
      arrivalTime:     z.string().regex(/^\d{2}:\d{2}$/).or(z.literal("")).catch(""),
      missing:         z.array(z.string()).catch([]),
    });

    const flights = z.array(FlightSchema).max(20).catch([]).parse(jsonParsed.flights ?? []);
    return NextResponse.json({ flights }, { headers: rateLimitHeaders });
  } catch (err) {
    console.error("[parse-flight]", err);
    return NextResponse.json({ error: "Failed to parse" }, { status: 500 });
  }
}
