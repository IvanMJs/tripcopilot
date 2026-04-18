import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { TripSocialProfile } from "@/components/TripSocialProfile";
import { AIRPORTS } from "@/lib/airports";
import type { PublicProfileData } from "@/lib/friends";

export const dynamic = "force-dynamic";

interface SocialSettings {
  profileVisible?: "friends" | "nobody";
  showMap?: boolean;
  showStats?: boolean;
  showTrips?: boolean;
  showPersona?: boolean;
  showCurrentLocation?: boolean;
  acceptRequests?: boolean;
}

interface VisitedPlace {
  code?: string;
  countryCode?: string;
}

interface UserProfileRow {
  id: string;
  username: string;
  display_name: string | null;
  social_settings: SocialSettings | null;
  visited_places: VisitedPlace[] | null;
}

interface TripRow {
  id: string;
  destination_code: string | null;
  destination_name: string | null;
  iso_date: string | null;
  cover_photo_url: string | null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return {
    title: `@${username} · TripSocial`,
    description: `Perfil de viajero de @${username} en TripCopilot`,
  };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Fetch user profile
  const { data: profileData, error: profileError } = await admin
    .from("user_profiles")
    .select("id, username, display_name, social_settings, visited_places")
    .ilike("username", username)
    .maybeSingle();

  if (profileError) {
    console.error("[/u/[username]] Supabase error:", profileError.message, "username:", username);
  }

  if (!profileData) {
    console.error("[/u/[username]] Profile not found for username:", username);
    notFound();
  }

  const profile = profileData as UserProfileRow;
  const settings: SocialSettings = profile.social_settings ?? {};

  if (settings.profileVisible === "nobody") {
    notFound();
  }

  const showStats = settings.showStats ?? true;
  const showMap = settings.showMap ?? true;
  const showTrips = settings.showTrips ?? true;

  let trips: TripRow[] | undefined;
  if (showStats || showMap || showTrips) {
    const { data: tripData } = await admin
      .from("trips")
      .select("id, destination_code, destination_name, iso_date, cover_photo_url")
      .eq("user_id", profile.id)
      .order("iso_date", { ascending: false })
      .limit(20);

    trips = (tripData ?? []) as TripRow[];
  }

  // Build visitedCountries
  let visitedCountries: string[] | undefined;
  if (showMap) {
    const countrySet = new Set<string>();

    if (profile.visited_places && profile.visited_places.length > 0) {
      for (const place of profile.visited_places) {
        if (place.countryCode) {
          countrySet.add(place.countryCode);
        } else if (place.code) {
          const airport = AIRPORTS[place.code];
          if (airport) countrySet.add(airport.country ?? "US");
        }
      }
    }

    if (countrySet.size === 0 && trips) {
      for (const trip of trips) {
        if (trip.destination_code) {
          const airport = AIRPORTS[trip.destination_code];
          if (airport) countrySet.add(airport.country ?? "US");
        }
      }
    }

    visitedCountries = Array.from(countrySet);
  }

  // Build stats
  let stats: PublicProfileData["stats"] | undefined;
  if (showStats && trips !== undefined) {
    const airportSet = new Set<string>();
    const countrySetForStats = new Set<string>();

    if (profile.visited_places && profile.visited_places.length > 0) {
      for (const place of profile.visited_places) {
        if (place.code) {
          airportSet.add(place.code);
          const airport = AIRPORTS[place.code];
          if (airport) countrySetForStats.add(airport.country ?? "US");
        }
        if (place.countryCode) {
          countrySetForStats.add(place.countryCode);
        }
      }
    } else if (trips) {
      for (const trip of trips) {
        if (trip.destination_code) {
          airportSet.add(trip.destination_code);
          const airport = AIRPORTS[trip.destination_code];
          if (airport) countrySetForStats.add(airport.country ?? "US");
        }
      }
    }

    stats = {
      tripCount: trips.length,
      countryCount: countrySetForStats.size,
      airportCount: airportSet.size,
    };
  }

  // Build the PublicProfileData object
  const profileResponse: PublicProfileData = {
    userId: profile.id,
    username: profile.username,
    displayName: profile.display_name,
    social_settings: {
      profileVisible: settings.profileVisible ?? "friends",
      showMap: settings.showMap,
      showStats: settings.showStats,
      showTrips: settings.showTrips,
      showPersona: settings.showPersona,
      showCurrentLocation: settings.showCurrentLocation,
      acceptRequests: settings.acceptRequests,
    },
    trips: showTrips && trips
      ? trips.map((t) => ({
          id: t.id,
          destinationCode: t.destination_code ?? "",
          destinationName: t.destination_name,
          isoDate: t.iso_date ?? "",
          coverPhotoUrl: t.cover_photo_url,
        }))
      : undefined,
    visitedCountries,
    stats,
  };

  // Get current user (may be null for unauthenticated visitors)
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-[#060610] p-4 max-w-lg mx-auto">
      <TripSocialProfile
        profile={profileResponse}
        currentUserId={user?.id ?? null}
      />
    </main>
  );
}
