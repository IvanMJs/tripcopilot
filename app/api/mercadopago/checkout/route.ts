import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getMP, PLANS } from "@/lib/mercadopago";
import { createClient } from "@/utils/supabase/server";
import { PreApproval } from "mercadopago";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  planId: z.enum(["explorer", "pilot"]).default("pilot"),
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

  const { successUrl, cancelUrl, planId } = parsed.data;
  const plan = PLANS[planId];

  let preapproval;
  try {
    preapproval = await new PreApproval(getMP()).create({
      body: {
        reason: `TripCopilot ${PLANS[planId].name}`,
        payer_email: user.email ?? "",
        external_reference: `${user.id}:${planId}`,
        back_url: cancelUrl,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: plan.mpAmount,
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
