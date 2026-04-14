import type { SupabaseClient } from "@supabase/supabase-js";

// ── Code generation ────────────────────────────────────────────────────────────

/**
 * Generate a deterministic 8-char referral code from a userId.
 * btoa(userId) → keep only alphanumeric → uppercase → first 8 chars.
 */
export function generateReferralCode(userId: string): string {
  const encoded = btoa(userId).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  // Ensure at least 8 chars by appending a hash of the original string
  let base = encoded;
  if (base.length < 8) {
    // Pad using a simple hash derived from userId char codes
    let extra = "";
    for (let i = 0; extra.length < 8 - base.length; i++) {
      extra += (userId.charCodeAt(i % userId.length) % 36).toString(36).toUpperCase();
    }
    base = base + extra;
  }
  return base.slice(0, 8);
}

// ── Apply referral ─────────────────────────────────────────────────────────────

export type ApplyReferralResult =
  | "ok"
  | "not_found"
  | "self_referral"
  | "already_used";

/**
 * Apply a referral code for a new user.
 * - Finds the code owner in user_profiles
 * - Rejects self-referral
 * - Rejects if already used
 * - Increments referral_bonus_trips for both users
 */
export async function applyReferral(
  supabase: SupabaseClient,
  code: string,
  newUserId: string,
): Promise<ApplyReferralResult> {
  // Find the owner of this referral code
  const { data: owner } = await supabase
    .from("user_profiles")
    .select("id, referral_bonus_trips, referral_count")
    .eq("referral_code", code.toUpperCase())
    .maybeSingle();

  if (!owner) return "not_found";

  if (owner.id === newUserId) return "self_referral";

  // Atomic conditional update: flip referral_applied = TRUE only if it is still FALSE.
  // The WHERE clause (eq referral_applied false) means the UPDATE is a no-op when
  // another concurrent request already claimed the referral, and .select() returns
  // an empty array in that case — giving us safe "affected row count" semantics
  // without a separate read step.
  const { data: claimed } = await supabase
    .from("user_profiles")
    .update({ referral_applied: true })
    .eq("id", newUserId)
    .eq("referral_applied", false)
    .select("id, referral_bonus_trips");

  // Empty result → another request beat us; the referral was already applied.
  if (!claimed || claimed.length === 0) return "already_used";

  const newUserCurrentBonus =
    (claimed[0] as { referral_bonus_trips?: number | null }).referral_bonus_trips ?? 0;

  // Give the new user a bonus trip
  await supabase
    .from("user_profiles")
    .update({ referral_bonus_trips: newUserCurrentBonus + 1 })
    .eq("id", newUserId);

  // Increment the owner's bonus trips and referral_count
  await supabase
    .from("user_profiles")
    .update({
      referral_bonus_trips: (owner.referral_bonus_trips ?? 0) + 1,
      referral_count: (owner.referral_count ?? 0) + 1,
    })
    .eq("id", owner.id);

  return "ok";
}
