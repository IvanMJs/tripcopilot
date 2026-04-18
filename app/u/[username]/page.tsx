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

interface UserProfileRow {
  id: string;
  username: string;
  display_name: string | null;
  social_settings: SocialSettings | null;
}

interface TripRow {
  id: string;
  name: string;
}

interface FlightRow {
  trip_id: string;
  destination_code: string;
  origin_code: string;
  iso_date: string;
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
    .select("id, username, display_name, social_settings")
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

  let trips: TripRow[] = [];
  let flights: FlightRow[] = [];

  if (showStats || showMap || showTrips) {
    const { data: tripData } = await admin
      .from("trips")
      .select("id, name")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(20);

    trips = (tripData ?? []) as TripRow[];

    if (trips.length > 0) {
      const tripIds = trips.map((t) => t.id);
      const { data: flightData } = await admin
        .from("flights")
        .select("trip_id, destination_code, origin_code, iso_date")
        .in("trip_id", tripIds)
        .order("iso_date", { ascending: true });

      flights = (flightData ?? []) as FlightRow[];
    }
  }

  // Group flights by trip → last destination + first date per trip
  const flightsByTrip = new Map<string, FlightRow[]>();
  for (const f of flights) {
    if (!flightsByTrip.has(f.trip_id)) flightsByTrip.set(f.trip_id, []);
    flightsByTrip.get(f.trip_id)!.push(f);
  }

  // Build visited countries + airports from flights
  const airportSet = new Set<string>();
  const countrySet = new Set<string>();

  for (const f of flights) {
    for (const code of [f.destination_code, f.origin_code]) {
      if (!code) continue;
      airportSet.add(code);
      const airport = AIRPORTS[code];
      if (airport?.country) countrySet.add(airport.country);
    }
  }

  // Supplement countries from visited_places table
  if (showMap || showStats) {
    const { data: vpData } = await admin
      .from("visited_places")
      .select("country")
      .eq("user_id", profile.id);
    for (const row of vpData ?? []) {
      if ((row as { country: string }).country) {
        countrySet.add((row as { country: string }).country);
      }
    }
  }

  const stats: PublicProfileData["stats"] | undefined = showStats
    ? {
        tripCount: trips.length,
        countryCount: countrySet.size,
        airportCount: airportSet.size,
      }
    : undefined;

  const visitedCountries: string[] | undefined = showMap
    ? Array.from(countrySet)
    : undefined;

  // Build trip list for display (last destination + first date of each trip)
  const publicTrips: PublicProfileData["trips"] = showTrips
    ? trips.map((trip) => {
        const tripFlights = flightsByTrip.get(trip.id) ?? [];
        const lastFlight = tripFlights[tripFlights.length - 1];
        const firstFlight = tripFlights[0];
        const destCode = lastFlight?.destination_code ?? "";
        const airport = destCode ? AIRPORTS[destCode] : null;
        return {
          id: trip.id,
          destinationCode: destCode,
          destinationName: airport?.city ?? trip.name ?? null,
          isoDate: firstFlight?.iso_date ?? "",
          coverPhotoUrl: null,
        };
      })
    : undefined;

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
    trips: publicTrips,
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
