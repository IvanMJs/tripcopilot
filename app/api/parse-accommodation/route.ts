import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";

const BodySchema = z.object({
  text:        z.string().max(20_000).optional(),
  imageBase64: z.string().max(1_500_000).optional(),
  mimeType:    z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]).optional(),
  tripContext: z.string().max(200).optional(), // e.g. "trip from 2026-04-08 to 2026-04-15"
});

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildSystemPrompt(today: string) {
  return `You are an accommodation booking data extractor. Given a hotel or accommodation booking confirmation (email, screenshot, WhatsApp message, Airbnb/Booking.com confirmation, or natural language description), extract the booking details.

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "name": "Hotel Marriott Buenos Aires",
  "check_in_date": "2026-04-10",
  "check_in_time": "15:00",
  "check_out_date": "2026-04-13",
  "check_out_time": "12:00",
  "confirmation_code": "MRR-48291",
  "address": "Av. del Libertador 123, Buenos Aires"
}

Rules:
- name: hotel or accommodation name. Required. Never null.
- check_in_date: ISO format "YYYY-MM-DD". Null if not found. Resolve relative dates ("next Thursday", "el jueves", "this weekend") using today's date.
- check_in_time: 24h format "HH:MM". Null if not found. Convert 12h to 24h (e.g. "3pm" → "15:00").
- check_out_date: ISO format "YYYY-MM-DD". Null if not found.
- check_out_time: 24h format "HH:MM". Null if not found.
- confirmation_code: booking/reservation/confirmation number or code. Null if not found.
- address: full address if mentioned. Null if not found.
- Handle Spanish, English, and Portuguese input naturally.
- Today's date: ${today}`;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: allowed } = await supabase.rpc("check_rate_limit", {
    p_user_id:      user.id,
    p_endpoint:     "parse-accommodation",
    p_max_per_hour: 20,
  });
  if (!allowed) {
    return NextResponse.json({ error: "Rate limit exceeded — try again later" }, { status: 429 });
  }

  try {
    const raw = await req.json();
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { text, imageBase64, mimeType, tripContext } = parsed.data;

    if (!text && !imageBase64) {
      return NextResponse.json({ error: "text or imageBase64 required" }, { status: 400 });
    }

    const today = new Date().toISOString().slice(0, 10);
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
        text: `Extract the accommodation booking details from this image.${tripContext ? ` Trip context: ${tripContext}.` : ""} Return JSON only.`,
      });
    } else {
      userContent.push({
        type: "text",
        text: `Extract the accommodation booking details from this text:\n\n${text}${tripContext ? `\n\nTrip context: ${tripContext}.` : ""}\n\nReturn JSON only.`,
      });
    }

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: buildSystemPrompt(today),
      messages: [{ role: "user", content: userContent }],
    });

    const responseText = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Could not parse accommodation details" }, { status: 422 });
    }

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json({
      name:              result.name ?? null,
      check_in_date:     result.check_in_date ?? null,
      check_in_time:     result.check_in_time ?? null,
      check_out_date:    result.check_out_date ?? null,
      check_out_time:    result.check_out_time ?? null,
      confirmation_code: result.confirmation_code ?? null,
      address:           result.address ?? null,
    });
  } catch (err) {
    console.error("[parse-accommodation]", err);
    return NextResponse.json({ error: "Failed to parse" }, { status: 500 });
  }
}
