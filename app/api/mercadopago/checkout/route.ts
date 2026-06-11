import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getMP, PLANS } from "@/lib/mercadopago";
import { createClient } from "@/utils/supabase/server";
import { PreApproval } from "mercadopago";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url(),
  planId: z.enum(["explorer", "pilot"]).default("pilot"),
  annual: z.boolean().default(false),
});

// POST /api/mercadopago/checkout
// Creates a MercadoPago PreApproval (subscription) and returns the init_point URL.
export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { successUrl, cancelUrl, planId, annual } = parsed.data;
  // Use successUrl as the redirect target so users land on /app?plan=success
  // after subscribing. Fall back to cancelUrl if successUrl is not provided.
  const backUrl = successUrl ?? cancelUrl;
  const plan = PLANS[planId];

  // Annual billing: charge once every 12 months at the discounted annual price.
  // Monthly billing: charge every month at the regular monthly price.
  const transactionAmount = annual ? plan.mpAnnualAmount : plan.mpAmount;
  const billingFrequency = annual ? 12 : 1;

  let preapproval;
  try {
    preapproval = await new PreApproval(getMP()).create({
      body: {
        reason: `TripCopilot ${PLANS[planId].name}${annual ? " (anual)" : ""}`,
        payer_email: user.email ?? "",
        external_reference: `${user.id}:${planId}`,
        back_url: backUrl,
        auto_recurring: {
          frequency: billingFrequency,
          frequency_type: "months",
          transaction_amount: transactionAmount,
          currency_id: plan.mpCurrencyId,
        },
        status: "pending",
      },
    });
  } catch (err) {
    console.error("[mp-checkout] PreApproval creation failed:", err);
    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 },
    );
  }

  const url = preapproval.init_point;
  if (!url) {
    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 },
    );
  }

  return NextResponse.json({ url });
}
