import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PreApproval } from "mercadopago";
import crypto from "crypto";
import { getMP } from "@/lib/mercadopago";

export const dynamic = "force-dynamic";

function verifyMPSignature(
  req: NextRequest,
  rawBody: string,
  secret: string,
): boolean {
  const xSignature = req.headers.get("x-signature") ?? "";
  const xRequestId = req.headers.get("x-request-id") ?? "";

  const parts = Object.fromEntries(
    xSignature.split(",").map((p) => {
      const idx = p.indexOf("=");
      return [p.slice(0, idx), p.slice(idx + 1)] as [string, string];
    }),
  );
  const ts = parts["ts"];
  const v1 = parts["v1"];

  if (!ts || !v1) return false;

  let dataId = "";
  try {
    const body = JSON.parse(rawBody) as { data?: { id?: string } };
    dataId = body.data?.id ?? "";
  } catch {
    return false;
  }

  const template = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const hash = crypto
    .createHmac("sha256", secret)
    .update(template)
    .digest("hex");

  return hash === v1;
}

// POST /api/mercadopago/webhook
// Handles MercadoPago IPN notifications for subscriptions.
export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text();

  const secret = process.env.MP_WEBHOOK_SECRET;
  if (secret) {
    if (!verifyMPSignature(req, rawBody, secret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  } else if (process.env.NODE_ENV === "production") {
    console.warn("[mp-webhook] MP_WEBHOOK_SECRET is not set in production — accepting all requests");
  }

  let body: { type?: string; data?: { id?: string } };
  try {
    body = JSON.parse(rawBody) as { type?: string; data?: { id?: string } };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Acknowledge non-subscription events
  if (body.type !== "subscription_preapproval") {
    return NextResponse.json({ received: true });
  }

  const preapprovalId = body.data?.id;
  if (!preapprovalId) {
    return NextResponse.json({ error: "Missing data.id" }, { status: 400 });
  }

  const preapproval = await new PreApproval(getMP()).get({ id: preapprovalId });

  const rawRef = preapproval.external_reference ?? "";
  const colonIdx = rawRef.indexOf(":");
  const userId = colonIdx !== -1 ? rawRef.slice(0, colonIdx) : rawRef;
  const purchasedPlanId = colonIdx !== -1 ? rawRef.slice(colonIdx + 1) : "pilot";
  const status = preapproval.status;

  if (!userId) {
    return NextResponse.json({ received: true });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const plan = status === "authorized" ? purchasedPlanId : "free";

  const { error } = await supabase
    .from("user_profiles")
    .update({
      plan,
      ...(preapproval.payer_id ? { mp_payer_id: String(preapproval.payer_id) } : {}),
    })
    .eq("user_id", userId);

  if (error) {
    // Log server-side only — do not expose to caller
    void error;
  }

  return NextResponse.json({ received: true });
}
