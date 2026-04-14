import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { generateReferralCode } from "@/lib/referral";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch or create profile
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("referral_code, referral_count, referral_bonus_trips")
    .eq("id", user.id)
    .maybeSingle();

  let referralCode = profile?.referral_code as string | null | undefined;

  // Generate and save code if missing, retrying up to 3 times on collision
  if (!referralCode) {
    referralCode = generateReferralCode(user.id);
    let saved = false;
    for (let attempt = 0; attempt < 3 && !saved; attempt++) {
      const candidate: string =
        attempt === 0
          ? (referralCode as string)
          : (referralCode as string) +
            Math.random().toString(36).slice(2, 4).toUpperCase();
      const { error: upsertError } = await supabase
        .from("user_profiles")
        .upsert({ id: user.id, referral_code: candidate });
      if (!upsertError) {
        referralCode = candidate;
        saved = true;
      }
    }
  }

  return NextResponse.json({
    referralCode,
    referralCount: profile?.referral_count ?? 0,
    bonusTrips: profile?.referral_bonus_trips ?? 0,
  });
}
