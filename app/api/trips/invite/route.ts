import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { Resend } from "resend";

const PostBodySchema = z.object({
  tripId: z.string().uuid(),
  email: z.string().email().max(254),
  role: z.enum(["viewer", "editor"]),
});

const APP_URL = "https://tripcopilot.app";

// POST: invite a collaborator to a trip
export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 20 invitations per hour per user
  if (!(await checkUserRateLimit(supabase, user.id, "trips-invite", 20))) {
    return rateLimitResponse();
  }

  const raw = await req.json().catch(() => null);
  const parsed = PostBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { tripId, email, role } = parsed.data;

  // Prevent self-invitation
  if (user.email && user.email.toLowerCase() === email.toLowerCase()) {
    return NextResponse.json({ error: "No podés invitarte a vos mismo" }, { status: 400 });
  }

  // Verify the trip belongs to the requesting user + get trip name
  const { data: tripRow, error: tripErr } = await supabase
    .from("trips")
    .select("id, name")
    .eq("id", tripId)
    .single();

  if (tripErr || !tripRow) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  // Check if there's already a pending/accepted invite for this email+trip
  const { data: existing } = await supabase
    .from("trip_collaborators")
    .select("id, status")
    .eq("trip_id", tripId)
    .eq("invitee_email", email)
    .in("status", ["pending", "accepted"])
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "An active invite already exists for this email" },
      { status: 409 },
    );
  }

  const inviteToken = crypto.randomUUID();

  const { data: collaborator, error: insertErr } = await supabase
    .from("trip_collaborators")
    .insert({
      trip_id: tripId,
      inviter_id: user.id,
      invitee_email: email,
      role,
      invite_token: inviteToken,
    })
    .select("id, invite_token")
    .single();

  if (insertErr || !collaborator) {
    return NextResponse.json({ error: "Could not create invitation" }, { status: 500 });
  }

  // Send invitation email
  if (process.env.RESEND_API_KEY) {
    const inviteUrl    = `${APP_URL}/invite?token=${collaborator.invite_token}`;
    const inviterName  = user.email ?? "Tu compañero/a";
    const tripName     = tripRow.name ?? "un viaje";
    const roleLabel    = role === "editor" ? "editar" : "ver";

    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: "TripCopilot <hola@tripcopilot.app>",
      to: email,
      subject: `${inviterName} te invitó a ${tripName} ✈️`,
      html: buildInviteEmail({ inviterName, tripName, inviteUrl, roleLabel }),
    }).catch((err) => {
      // Log but don't block the response — invite is created in DB regardless
      console.error("[invite] Resend error:", err);
    });
  }

  return NextResponse.json({ token: collaborator.invite_token }, { status: 201 });
}

function buildInviteEmail({
  inviterName,
  tripName,
  inviteUrl,
  roleLabel,
}: {
  inviterName: string;
  tripName: string;
  inviteUrl: string;
  roleLabel: string;
}) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invitación a viaje — TripCopilot</title>
</head>
<body style="margin:0;padding:0;background:#0a0a14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a14;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <!-- Logo -->
          <tr>
            <td style="padding-bottom:32px;text-align:center;">
              <span style="font-size:24px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">
                ✈ TripCopilot
              </span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:linear-gradient(160deg,#12121f,#0d0d1a);border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:36px 32px;">

              <!-- Headline -->
              <p style="margin:0 0 8px;font-size:22px;font-weight:800;color:#ffffff;line-height:1.2;">
                Te invitaron a un viaje ✈️
              </p>
              <p style="margin:0 0 28px;font-size:15px;color:#9ca3af;line-height:1.5;">
                <strong style="color:#e5e7eb;">${inviterName}</strong>
                te invitó a ${roleLabel}
                <strong style="color:#e5e7eb;">${tripName}</strong>
                en TripCopilot.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:#4f46e5;border-radius:12px;">
                    <a href="${inviteUrl}"
                       style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.2px;">
                      Ver el viaje →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:0 0 20px;" />

              <!-- Link fallback -->
              <p style="margin:0 0 6px;font-size:12px;color:#6b7280;">
                Si el botón no funciona, copiá este enlace:
              </p>
              <p style="margin:0;font-size:12px;">
                <a href="${inviteUrl}" style="color:#818cf8;word-break:break-all;">${inviteUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#4b5563;">
                TripCopilot · Si no esperabas esta invitación, podés ignorar este correo.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
