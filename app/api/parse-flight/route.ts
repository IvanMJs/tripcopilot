import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";

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
- isoDate: format "YYYY-MM-DD"
- departureTime: 24h format "HH:MM", or "" if not found
- missing: array of field names you could not find, e.g. ["departureTime"] or []

If a field is missing or uncertain, leave it as empty string "" and add the field name to "missing".
Extract ALL flight segments in the document, in chronological order.
`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
      return NextResponse.json({ flights: [] });
    }

    const jsonParsed = JSON.parse(jsonMatch[0]) as { flights?: unknown[] };
    return NextResponse.json({ flights: jsonParsed.flights ?? [] });
  } catch (err) {
    console.error("[parse-flight]", err);
    return NextResponse.json({ error: "Failed to parse" }, { status: 500 });
  }
}
