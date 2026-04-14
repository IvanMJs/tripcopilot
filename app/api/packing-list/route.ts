import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { generatePackingList, PackingItem } from "@/lib/packingList";

const BodySchema = z.object({
  destination: z.string().min(1).max(100),
  durationDays: z.number().int().min(1).max(365),
  tempC: z.number().min(-60).max(60),
  activities: z.array(z.string().max(50)).max(10).optional().default([]),
  locale: z.enum(["es", "en"]),
  tripId: z.string().min(1).max(100),
});

export type PackingListResponse = {
  items: PackingItem[];
  aiEnhanced: boolean;
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 10 requests per hour per user
  if (!(await checkUserRateLimit(supabase, user.id, "packing-list", 10))) {
    return rateLimitResponse();
  }

  const raw = await req.json();
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { destination, durationDays, tempC, activities, locale, tripId: _tripId } =
    parsed.data;

  // Start with rule-based list as fallback
  const ruleItems = generatePackingList(destination, durationDays, tempC, activities);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json<PackingListResponse>({
      items: ruleItems,
      aiEnhanced: false,
    });
  }

  const prompt =
    locale === "es"
      ? `Eres un asistente de viajes experto. El usuario viaja a "${destination}" por ${durationDays} días con temperatura aproximada de ${tempC}°C. Actividades planeadas: ${activities.length > 0 ? activities.join(", ") : "turismo general"}.

Ya tiene esta lista base de equipaje (no repitas estos items):
${ruleItems.map((i) => `- ${i.label} (${i.category})`).join("\n")}

Agrega SOLO items específicos que falten para este destino/clima/actividades que no estén ya en la lista. Máximo 8 items adicionales. Devuelve SOLO JSON válido sin markdown:
[{"id": string, "label": string, "category": "documents"|"clothes"|"toiletries"|"electronics"|"destination", "essential": boolean}]`
      : `You are an expert travel assistant. The user is traveling to "${destination}" for ${durationDays} days with approximate temperature of ${tempC}°C. Planned activities: ${activities.length > 0 ? activities.join(", ") : "general tourism"}.

They already have this base packing list (do not repeat these):
${ruleItems.map((i) => `- ${i.label} (${i.category})`).join("\n")}

Add ONLY specific items missing for this destination/climate/activities not already in the list. Maximum 8 additional items. Return ONLY valid JSON without markdown:
[{"id": string, "label": string, "category": "documents"|"clothes"|"toiletries"|"electronics"|"destination", "essential": boolean}]`;

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
        max_tokens: 800,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      Sentry.captureException(
        new Error(`Anthropic upstream error: ${response.status}`),
      );
      return NextResponse.json<PackingListResponse>({
        items: ruleItems,
        aiEnhanced: false,
      });
    }

    const apiRaw = (await response.json()) as {
      content: { type: string; text: string }[];
    };
    const text =
      apiRaw.content?.find((c) => c.type === "text")?.text?.trim() ?? "";

    // Parse AI additions
    const jsonText = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const aiRaw: unknown = JSON.parse(jsonText);

    if (!Array.isArray(aiRaw)) {
      return NextResponse.json<PackingListResponse>({
        items: ruleItems,
        aiEnhanced: false,
      });
    }

    const VALID_CATEGORIES = new Set([
      "documents",
      "clothes",
      "toiletries",
      "electronics",
      "destination",
    ]);

    const aiItems: PackingItem[] = [];
    for (const raw of aiRaw) {
      if (
        typeof raw === "object" &&
        raw !== null &&
        typeof (raw as Record<string, unknown>).label === "string" &&
        typeof (raw as Record<string, unknown>).category === "string" &&
        VALID_CATEGORIES.has((raw as Record<string, unknown>).category as string)
      ) {
        const r = raw as Record<string, unknown>;
        const label = (r.label as string).slice(0, 80);
        const category = r.category as PackingItem["category"];
        const essential = r.essential === true;
        aiItems.push({
          id: `ai:${category}:${label.toLowerCase().replace(/\s+/g, "-")}`,
          label,
          category,
          essential,
        });
      }
    }

    // Merge: rule-based first, then AI additions (deduplicated by label)
    const ruleLabels = new Set(ruleItems.map((i) => i.label.toLowerCase()));
    const uniqueAiItems = aiItems
      .filter((i) => !ruleLabels.has(i.label.toLowerCase()))
      .slice(0, 8);

    return NextResponse.json<PackingListResponse>({
      items: [...ruleItems, ...uniqueAiItems],
      aiEnhanced: uniqueAiItems.length > 0,
    });
  } catch (err) {
    Sentry.captureException(err);
    // Fallback: return rule-based list
    return NextResponse.json<PackingListResponse>({
      items: ruleItems,
      aiEnhanced: false,
    });
  }
}
