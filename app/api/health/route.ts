import { createClient } from "@supabase/supabase-js";

/**
 * GET /api/health
 *
 * Lightweight health check for Vercel uptime monitoring.
 * - Supabase: runs a minimal SELECT to confirm DB connectivity.
 * - Anthropic: only checks that the API key env var is present
 *   (avoids burning tokens on every health poll).
 *
 * Always returns HTTP 200 so uptime monitors see a response.
 * Callers should inspect `services` for individual component health.
 */
export async function GET() {
  const timestamp = new Date().toISOString();

  // Supabase connectivity check
  let supabaseStatus: "ok" | "error" = "error";
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { error } = await supabase
      .from("trips")
      .select("id", { count: "exact", head: true })
      .limit(1);

    supabaseStatus = error ? "error" : "ok";
  } catch {
    supabaseStatus = "error";
  }

  // Anthropic key presence check (no real API call)
  const anthropicStatus: "ok" | "unknown" = process.env.ANTHROPIC_API_KEY
    ? "ok"
    : "unknown";

  return Response.json({
    status: "ok",
    version: "1.0.0",
    timestamp,
    services: {
      supabase: supabaseStatus,
      anthropic: anthropicStatus,
    },
  });
}
