import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { z } from "zod";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { Resend } from "resend";
import type { User } from "@supabase/auth-js";

const PostBodySchema = z
  .object({
    email: z.string().email().optional(),
    username: z.string().min(3).max(20).optional(),
  })
  .refine((d) => d.email || d.username, { message: "email or username required" })
  .refine((d) => !(d.email && d.username), { message: "provide only one of email or username" });

const APP_URL = "https://tripcopilot.app";

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 10 friend requests per hour
  if (!(await checkUserRateLimit(supabase, user.id, "friends-request", 10))) {
    return rateLimitResponse();
  }

  const raw = await req.json().catch(() => null);
  const parsed = PostBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { email, username } = parsed.data;

  let addresseeId: string;

  if (username && !email) {
    // Username path: look up via user_profiles using service-role client
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: profile } = await admin
      .from("user_profiles")
      .select("id")
      .ilike("username", username)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    addresseeId = profile.id;

    // Prevent self-request
    if (addresseeId === user.id) {
      return NextResponse.json(
        { error: "No podés enviarte una solicitud a vos mismo" },
        { status: 400 },
      );
    }
  } else {
    // Email path: keep existing GoTrue Admin REST API lookup unchanged
    const targetEmail = email!;

    // Prevent self-request
    if (user.email && user.email.toLowerCase() === targetEmail.toLowerCase()) {
      return NextResponse.json(
        { error: "No podés enviarte una solicitud a vos mismo" },
        { status: 400 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const lookupRes = await fetch(
      `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(targetEmail)}`,
      {
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
        },
      },
    ).catch(() => null);

    let addressee: User | null = null;
    if (lookupRes?.ok) {
      const body = (await lookupRes.json().catch(() => null)) as {
        users?: User[];
      } | null;
      addressee = body?.users?.[0] ?? null;
    }

    if (!addressee) {
      return NextResponse.json(
        { error: "No existe ningún usuario con ese email" },
        { status: 404 },
      );
    }

    addresseeId = addressee.id;
  }

  // Prevent duplicate: check if friendship already exists (non-declined)
  const { data: existing } = await supabase
    .from("friendships")
    .select("id, status")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${user.id})`,
    )
    .neq("status", "declined")
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "Ya existe una solicitud de amistad con este usuario" },
      { status: 409 },
    );
  }

  // Insert friendship row
  const { data: friendship, error: insertErr } = await supabase
    .from("friendships")
    .insert({
      requester_id: user.id,
      addressee_id: addresseeId,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertErr || !friendship) {
    return NextResponse.json({ error: "No se pudo crear la solicitud" }, { status: 500 });
  }

  // Send invitation email (non-blocking, only when addressee was found by email)
  if (process.env.RESEND_API_KEY && email) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const requesterName = user.email ?? "Tu amigo/a";
    const connectUrl = `${APP_URL}/app?tab=social`;

    await resend.emails
      .send({
        from: "TripCopilot <hola@tripcopilot.app>",
        to: email,
        subject: `${requesterName} te invitó a conectar en TripCopilot ✈️`,
        html: buildFriendRequestEmail({ requesterName, connectUrl }),
      })
      .catch(() => {
        // Non-blocking — friendship is created regardless
      });
  }

  return NextResponse.json({ ok: true, friendshipId: friendship.id }, { status: 201 });
}

function buildFriendRequestEmail({
  requesterName,
  connectUrl,
}: {
  requesterName: string;
  connectUrl: string;
}) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Solicitud de conexión — TripCopilot</title>
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

              <p style="margin:0 0 8px;font-size:22px;font-weight:800;color:#ffffff;line-height:1.2;">
                Tu amigo te invitó a conectar 🌍
              </p>
              <p style="margin:0 0 28px;font-size:15px;color:#9ca3af;line-height:1.5;">
                <strong style="color:#e5e7eb;">${requesterName}</strong>
                quiere conectar con vos en TripCopilot para compartir sus viajes.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:#7c3aed;border-radius:12px;">
                    <a href="${connectUrl}"
                       style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.2px;">
                      Ver solicitud →
                    </a>
                  </td>
                </tr>
              </table>

              <hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:0 0 20px;" />

              <p style="margin:0 0 6px;font-size:12px;color:#6b7280;">
                Si el botón no funciona, copiá este enlace:
              </p>
              <p style="margin:0;font-size:12px;">
                <a href="${connectUrl}" style="color:#818cf8;word-break:break-all;">${connectUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#4b5563;">
                TripCopilot · Si no esperabas esta solicitud, podés ignorar este correo.
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
