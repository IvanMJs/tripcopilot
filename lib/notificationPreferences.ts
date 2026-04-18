import type { SupabaseClient } from "@supabase/supabase-js";

export interface NotificationPreferences {
  userId: string;
  flightDelays: boolean;
  gateChanges: boolean;
  checkInReminders: boolean;
  weatherAlerts: boolean;
  priceDrops: boolean;
  weeklyDigest: boolean;
  morningBriefing: boolean;
  weeklyRecap: boolean;
  reEngagement: boolean;
  friendRequests: boolean;
  newFollower: boolean;
}

export const DEFAULT_PREFS: Omit<NotificationPreferences, "userId"> = {
  flightDelays: true,
  gateChanges: true,
  checkInReminders: true,
  weatherAlerts: false,
  priceDrops: true,
  weeklyDigest: false,
  morningBriefing: true,
  weeklyRecap: true,
  reEngagement: true,
  friendRequests: true,
  newFollower: true,
};

export async function getNotificationPrefs(
  supabase: SupabaseClient,
  userId: string,
): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("notification_prefs")
    .eq("id", userId)
    .single();

  if (error || !data) {
    return { userId, ...DEFAULT_PREFS };
  }

  const stored = (data as { notification_prefs?: Partial<Omit<NotificationPreferences, "userId">> | null })
    .notification_prefs;

  if (!stored || typeof stored !== "object") {
    return { userId, ...DEFAULT_PREFS };
  }

  return {
    userId,
    flightDelays:      typeof stored.flightDelays      === "boolean" ? stored.flightDelays      : DEFAULT_PREFS.flightDelays,
    gateChanges:       typeof stored.gateChanges       === "boolean" ? stored.gateChanges       : DEFAULT_PREFS.gateChanges,
    checkInReminders:  typeof stored.checkInReminders  === "boolean" ? stored.checkInReminders  : DEFAULT_PREFS.checkInReminders,
    weatherAlerts:     typeof stored.weatherAlerts     === "boolean" ? stored.weatherAlerts     : DEFAULT_PREFS.weatherAlerts,
    priceDrops:        typeof stored.priceDrops        === "boolean" ? stored.priceDrops        : DEFAULT_PREFS.priceDrops,
    weeklyDigest:      typeof stored.weeklyDigest      === "boolean" ? stored.weeklyDigest      : DEFAULT_PREFS.weeklyDigest,
    morningBriefing:   typeof stored.morningBriefing   === "boolean" ? stored.morningBriefing   : DEFAULT_PREFS.morningBriefing,
    weeklyRecap:       typeof stored.weeklyRecap       === "boolean" ? stored.weeklyRecap       : DEFAULT_PREFS.weeklyRecap,
    reEngagement:      typeof stored.reEngagement      === "boolean" ? stored.reEngagement      : DEFAULT_PREFS.reEngagement,
    friendRequests:    typeof stored.friendRequests    === "boolean" ? stored.friendRequests    : DEFAULT_PREFS.friendRequests,
    newFollower:       typeof stored.newFollower       === "boolean" ? stored.newFollower       : DEFAULT_PREFS.newFollower,
  };
}

export async function saveNotificationPrefs(
  supabase: SupabaseClient,
  prefs: NotificationPreferences,
): Promise<void> {
  const { userId, ...rest } = prefs;

  const { error } = await supabase
    .from("user_profiles")
    .update({ notification_prefs: rest })
    .eq("id", userId);

  if (error) {
    throw new Error(error.message);
  }
}
