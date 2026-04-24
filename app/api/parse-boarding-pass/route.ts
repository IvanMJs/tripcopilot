import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import * as Sentry from "@sentry/nextjs";

const BodySchema = z.object({
  imageBase64: z.string().max(5_000_000),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
  locale: z.enum(["es", "en"]).default("en"),
});

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

const SYSTEM_PROMPT = `You are a boarding pass data extractor. Given a photo of a physical or digital airline boarding pass, extract all visible information.

Return ONLY valid JSON in this exact format (no markdown, no explanation):
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
  "gate": "B22",
  "terminal": "T2",
  "boardingTime": "19:45",
  "boardingGroup": "3",
  "confidence": "high",
  "missing": []
}

Rules:
- flightCode: airline IATA code + flight number, no spaces (e.g. "AA900")
- airlineCode: 2-letter IATA code (e.g. "AA", "UA", "DL", "LA", "AR")
- airlineName: full airline name in English
- flightNumber: digits only (e.g. "900")
- originCode: 3-letter IATA airport code, uppercase
- destinationCode: 3-letter IATA airport code, uppercase
- isoDate: departure date "YYYY-MM-DD"
- departureTime: 24h format "HH:MM". Convert from 12h if needed.
- arrivalDate: arrival date "YYYY-MM-DD" or ""
- arrivalTime: arrival time "HH:MM" or ""
- cabinClass: "economy", "premium_economy", "business", "first" or ""
- seatNumber: e.g. "12A" or ""
- bookingCode: PNR/confirmation code (6-char alphanumeric) or ""
- gate: gate number/letter e.g. "B22", "42", "C5" or ""
- terminal: terminal name/number e.g. "T2", "Terminal 1", "International" or ""
- boardingTime: 24h boarding time "HH:MM" or ""
- boardingGroup: boarding zone/group number or letter, e.g. "1", "A", "Zone 3" or ""
- confidence: "high" if all required fields found, "medium" if minor fields missing, "low" if airports or date missing
- missing: array of field names not found

Handle Spanish, English, and Portuguese boarding passes.
If a field is not visible or not present, leave as "" and add to missing array.`;

const BoardingPassSchema = z.object({
  flightCode:      z.string().catch(""),
  airlineCode:     z.string().regex(/^[A-Z]{2}$/).catch(""),
  airlineName:     z.string().max(100).catch(""),
  flightNumber:    z.string().catch(""),
  originCode:      z.string().regex(/^[A-Z]{3}$/).catch(""),
  destinationCode: z.string().regex(/^[A-Z]{3}$/).catch(""),
  isoDate:         z.string().regex(/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/).catch(""),
  departureTime:   z.string().regex(/^\d{2}:\d{2}$/).or(z.literal("")).catch(""),
  arrivalDate:     z.string().regex(/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/).or(z.literal("")).catch(""),
  arrivalTime:     z.string().regex(/^\d{2}:\d{2}$/).or(z.literal("")).catch(""),
  cabinClass:      z.enum(["economy", "premium_economy", "business", "first"]).or(z.literal("")).catch(""),
  seatNumber:      z.string().max(10).catch(""),
  bookingCode:     z.string().max(20).catch(""),
  gate:            z.string().max(10).catch(""),
  terminal:        z.string().max(30).catch(""),
  boardingTime:    z.string().regex(/^\d{2}:\d{2}$/).or(z.literal("")).catch(""),
  boardingGroup:   z.string().max(20).catch(""),
  confidence:      z.enum(["high", "medium", "low"]).catch("medium"),
  missing:         z.array(z.string()).catch([]),
});

export type ParsedBoardingPass = z.infer<typeof BoardingPassSchema>;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = getAnthropicClient();
  if (!client) return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });

  const allowed = await checkUserRateLimit(supabase, user.id, "parse-boarding-pass", 20);
  if (!allowed) return rateLimitResponse();

  try {
    const raw = await req.json();
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const { imageBase64, mimeType } = parsed.data;

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp", data: imageBase64 },
          },
          { type: "text", text: "Extract all data from this boarding pass. Return JSON only." },
        ],
      }],
    });

    const responseText = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "Could not parse boarding pass" }, { status: 422 });

    const result = BoardingPassSchema.parse(JSON.parse(jsonMatch[0]));
    return NextResponse.json(result);
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json({ error: "Failed to parse boarding pass" }, { status: 500 });
  }
}
