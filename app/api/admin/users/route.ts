import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { z } from "zod";
import { isAdminEmail } from "@/lib/auth";

async function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function checkAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();
  return isAdminEmail(user?.email);
}

// GET /api/admin/users — paginated user list with optional search
export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search")?.toLowerCase().trim() ?? "";
  const page = Math.max(0, Number(searchParams.get("page") ?? "0"));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "50")));

  const admin = await getAdminClient();

  const [{ data: profiles }, { data: authData }] = await Promise.all([
    admin
      .from("user_profiles")
      .select("user_id, plan, admin_override, admin_notes, created_at, last_seen_at, username, display_name")
      .order("created_at", { ascending: false }),
    admin.auth.admin.listUsers({ perPage: 1000, page: 1 }),
  ]);

  const authMap = Object.fromEntries(
    (authData?.users ?? []).map((u) => [
      u.id,
      {
        email: u.email ?? null,
        auth_name: (u.user_metadata?.full_name as string | undefined)
          || (u.user_metadata?.name as string | undefined)
          || null,
        last_sign_in_at: u.last_sign_in_at ?? null,
      },
    ]),
  );

  let users = (profiles ?? []).map((p) => ({
    ...p,
    email: authMap[p.user_id ?? ""]?.email ?? null,
    auth_name: authMap[p.user_id ?? ""]?.auth_name ?? null,
    last_sign_in_at: authMap[p.user_id ?? ""]?.last_sign_in_at ?? null,
  }));

  if (search) {
    users = users.filter(
      (u) =>
        u.email?.toLowerCase().includes(search) ||
        u.display_name?.toLowerCase().includes(search) ||
        u.username?.toLowerCase().includes(search),
    );
  }

  const total = users.length;
  const paginated = users.slice(page * limit, (page + 1) * limit);

  return NextResponse.json({ users: paginated, total });
}

const PatchSchema = z.object({
  userId: z.string().uuid(),
  plan: z.enum(["free", "explorer", "pilot"]).optional(),
  adminOverride: z.boolean().optional(),
  adminNotes: z.string().max(500).optional(),
  displayName: z.string().max(40).optional(),
  username: z.string().regex(/^[a-z0-9_]{3,20}$/).optional(),
});

// PATCH /api/admin/users — update plan, adminOverride, adminNotes, displayName or username
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const { userId, plan, adminOverride, adminNotes, displayName, username } = parsed.data;
  const updates: Record<string, unknown> = {};
  if (plan !== undefined) updates.plan = plan;
  if (adminOverride !== undefined) updates.admin_override = adminOverride;
  if (adminNotes !== undefined) updates.admin_notes = adminNotes;
  if (displayName !== undefined) updates.display_name = displayName.trim() || null;
  if (username !== undefined) updates.username = username.toLowerCase();

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const admin = await getAdminClient();

  const { data, error } = await admin
    .from("user_profiles")
    .update(updates)
    .eq("user_id", userId)
    .select("user_id, plan, admin_override, admin_notes, created_at, last_seen_at, username, display_name")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: authUser } = await admin.auth.admin.getUserById(userId);

  return NextResponse.json({
    success: true,
    user: { ...data, email: authUser?.user?.email ?? null },
  });
}
