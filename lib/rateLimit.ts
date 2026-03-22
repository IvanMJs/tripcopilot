import { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * Check per-user rate limit using the existing check_rate_limit RPC.
 * Returns true if the request is allowed, false if rate limited.
 */
export async function checkUserRateLimit(
  supabase: SupabaseClient,
  userId: string,
  endpoint: string,
  maxPerHour: number,
): Promise<boolean> {
  const { data: allowed } = await supabase.rpc("check_rate_limit", {
    p_user_id: userId,
    p_endpoint: endpoint,
    p_max_per_hour: maxPerHour,
  });
  return allowed === true;
}

export function rateLimitResponse(): NextResponse {
  return NextResponse.json(
    { error: "Rate limit exceeded. Try again later." },
    { status: 429, headers: { "Retry-After": "3600" } },
  );
}
