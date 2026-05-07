import type { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { TEST_USER, isTestMode } from "@/lib/testUser";

export async function getAuthUser(): Promise<User | null> {
  if (isTestMode()) return TEST_USER as unknown as User;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Returns true if the given email is in the ADMIN_EMAILS environment variable.
 * ADMIN_EMAILS should be a comma-separated list of admin email addresses.
 * Example: ADMIN_EMAILS=alice@example.com,bob@example.com
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const raw = process.env.ADMIN_EMAILS ?? "";
  if (!raw.trim()) return false;
  const admins = raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return admins.includes(email.toLowerCase());
}
