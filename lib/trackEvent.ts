import { createClient } from "@/utils/supabase/client";

export async function trackEvent(
  event: string,
  properties: Record<string, unknown> = {},
): Promise<void> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("analytics_events").insert({
      user_id: user.id,
      event,
      properties,
    });
  } catch {
    // fail silently — analytics must never break the app
  }
}
