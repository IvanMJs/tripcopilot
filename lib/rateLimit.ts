import { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

/**
 * Check per-user rate limit using the check_rate_limit RPC.
 * Returns true if the request is allowed, false if rate limited.
 * By default it fails closed if the RPC errors.
 */
export async function checkUserRateLimit(
  supabase: SupabaseClient,
  userId: string,
  endpoint: string,
  maxPerHour: number,
  options?: { failOpen?: boolean },
): Promise<boolean> {
  const { data: allowed, error } = await supabase.rpc("check_rate_limit", {
    p_user_id: userId,
    p_endpoint: endpoint,
    p_max_per_hour: maxPerHour,
  });

  if (error) {
    const failOpen = options?.failOpen === true;
    console.error(`[checkUserRateLimit] RPC error — failing ${failOpen ? "open" : "closed"}:`, error);
    Sentry.captureException(error, {
      extra: { userId, endpoint, maxPerHour, failOpen },
    });
    return failOpen;
  }

  if (allowed === false) return false;
  return true;
}

export function rateLimitResponse(): NextResponse {
  return NextResponse.json(
    { error: "Rate limit exceeded. Try again later." },
    { status: 429, headers: { "Retry-After": "3600" } },
  );
}
