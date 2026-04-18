import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { buildWelcomeEmail } from "@/lib/welcomeEmail";

const TEST_RECIPIENTS = [
  "ivanmeyer1991@gmail.com",
  "micaela.brarda@gmail.com",
];

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 500 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const results: { email: string; ok: boolean; error?: string }[] = [];

  for (const email of TEST_RECIPIENTS) {
    const name = email.split("@")[0].replace(/[<>&"]/g, c => ({"<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;"}[c]!));
    const { error } = await resend.emails.send({
      from: "TripCopilot <hola@tripcopilot.app>",
      to: email,
      subject: "Bienvenido a TripCopilot ✈️",
      html: buildWelcomeEmail(name),
    });
    results.push({ email, ok: !error, error: error?.message });
  }

  return NextResponse.json({ results });
}
