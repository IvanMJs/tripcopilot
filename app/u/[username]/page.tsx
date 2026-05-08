import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { TripSocialProfile } from "@/components/TripSocialProfile";
import { AIRPORTS } from "@/lib/airports";
import type { PublicProfileData } from "@/lib/friends";

// Keep force-dynamic so the viewer's session cookie is always read fresh.
// The expensive public-profile DB queries are cached via unstable_cache below.
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

/** Cached public profile data — does not include viewer-specific fields. */
interface PublicProfileCache {
  profile: UserProfileRow & { _visitedPlacesCountries: string[] };
  trips: TripRow[];
  flights: FlightRow[];
  followerCount: number;
  followingCount: number;
}

/**
 * Fetch public, non-viewer-specific profile data from Supabase.
 * Cached for 5 minutes per username via unstable_cache to reduce DB load
 * and limit the impact of bot scraping.
 */
function getPublicProfileData(username: string) {
  return unstable_cache(
    async (): Promise<PublicProfileCache | null> => {
      const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
      );

      const { data: profileData, error: profileError } = await admin
        .from("user_profiles")
        .select("id, username, display_name, social_settings")
        .ilike("username", username)
        .maybeSingle();

      if (profileError) {
        console.error(
          "[/u/[username]] Supabase error:",
          profileError.message,
          "username:",
          username,
        );
      }

      if (!profileData) return null;

      const profile = profileData as UserProfileRow;
      const settings: SocialSettings = profile.social_settings ?? {};
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

      // Supplement countries from visited_places table (needed for country counts)
      let visitedPlacesCountries: string[] = [];
      if (showMap || showStats) {
        const { data: vpData } = await admin
          .from("visited_places")
          .select("country")
          .eq("user_id", profile.id);
        visitedPlacesCountries = (vpData ?? [])
          .map((row) => (row as { country: string }).country)
          .filter((c) => c && /^[A-Za-z]{2}$/.test(c))
          .map((c) => c.toUpperCase());
      }

      // Follower / following counts — these are public and cheap to cache
      const [{ count: followerCount }, { count: followingCount }] = await Promise.all([
        admin
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("following_id", profile.id),
        admin
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", profile.id),
      ]);

      return {
        profile: { ...profile, _visitedPlacesCountries: visitedPlacesCountries },
        trips,
        flights,
        followerCount: followerCount ?? 0,
        followingCount: followingCount ?? 0,
      };
    },
    [`public-profile:${username.toLowerCase()}`],
    { revalidate: 300 }, // 5-minute cache
  )();
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

  // Load cached public data (5-minute TTL, shared across all visitors)
  const cached = await getPublicProfileData(username);

  if (!cached) {
    console.error("[/u/[username]] Profile not found for username:", username);
    notFound();
  }

  const { trips, flights, followerCount, followingCount, profile } = cached;
  const settings: SocialSettings = profile.social_settings ?? {};

  if (settings.profileVisible === "nobody") {
    notFound();
  }

  const showStats = settings.showStats ?? true;
  const showMap = settings.showMap ?? true;
  const showTrips = settings.showTrips ?? true;

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
      if (!airport) continue;
      // Non-US airports: state = ISO country code (AR, NL, GB…)
      // US airports: no country field → use "US"
      const isoCode = airport.country ? (airport.state ?? null) : "US";
      if (isoCode) countrySet.add(isoCode);
    }
  }

  // Supplement countries from cached visited_places data
  for (const c of profile._visitedPlacesCountries) {
    countrySet.add(c);
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
  const deduped = new Set<string>();
  const publicTrips: PublicProfileData["trips"] = showTrips
    ? trips
        .map((trip) => {
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
        .filter((trip) => {
          const key = `${trip.destinationCode}|${trip.isoDate}`;
          if (deduped.has(key)) return false;
          deduped.add(key);
          return true;
        })
    : undefined;

  // Get current user (may be null for unauthenticated visitors).
  // This is always fresh — never cached — because it reads the session cookie.
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Viewer-specific queries: these are uncached because they depend on the
  // logged-in user's identity and must not leak across sessions.
  let viewerFollows = false;
  let friendData: PublicProfileData["friendData"] | undefined;

  if (user && user.id !== profile.id) {
    // Admin client used only for viewer-specific lookups (not cached).
    const adminForViewer = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Check whether the viewer follows this profile
    const { count: viewerFollowsCount } = await adminForViewer
      .from("follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("follower_id", user.id)
      .eq("following_id", profile.id);
    viewerFollows = viewerFollowsCount != null && viewerFollowsCount > 0;

    // Check friendship and build friend-specific data
    const { data: fs } = await adminForViewer
      .from("friendships")
      .select("id")
      .or(
        `and(requester_id.eq.${user.id},addressee_id.eq.${profile.id}),and(requester_id.eq.${profile.id},addressee_id.eq.${user.id})`
      )
      .eq("status", "accepted")
      .maybeSingle();

    if (fs) {
      // 1. Fetch viewer's trips
      const { data: viewerTripData } = await adminForViewer
        .from("trips")
        .select("id")
        .eq("user_id", user.id);
      const viewerTripIds = ((viewerTripData ?? []) as { id: string }[]).map((t) => t.id);

      // 2. Fetch viewer's flights
      let viewerFlights: FlightRow[] = [];
      if (viewerTripIds.length > 0) {
        const { data: vfData } = await adminForViewer
          .from("flights")
          .select("trip_id, destination_code, origin_code, iso_date")
          .in("trip_id", viewerTripIds);
        viewerFlights = (vfData ?? []) as FlightRow[];
      }

      // 3. Build viewer's country set (same logic as profile owner)
      const viewerCountrySet = new Set<string>();
      for (const f of viewerFlights) {
        for (const code of [f.destination_code, f.origin_code]) {
          if (!code) continue;
          const airport = AIRPORTS[code];
          if (!airport) continue;
          const isoCode = airport.country ? (airport.state ?? null) : "US";
          if (isoCode) viewerCountrySet.add(isoCode);
        }
      }
      const { data: viewerVP } = await adminForViewer
        .from("visited_places")
        .select("country")
        .eq("user_id", user.id);
      for (const row of (viewerVP ?? []) as { country: string }[]) {
        const c = row.country;
        if (c && /^[A-Za-z]{2}$/.test(c)) viewerCountrySet.add(c.toUpperCase());
      }

      // 4. Shared destinations (intersection of destination codes)
      const profileDestCodes = new Set(
        flights.filter((f) => f.destination_code).map((f) => f.destination_code)
      );
      const viewerDestCodes = new Set(
        viewerFlights.filter((f) => f.destination_code).map((f) => f.destination_code)
      );
      const sharedDestinations = Array.from(profileDestCodes)
        .filter((code) => viewerDestCodes.has(code))
        .map((code) => ({
          destinationCode: code,
          destinationName: AIRPORTS[code]?.city ?? null,
        }));

      // 5. Countries profile visited but viewer didn't
      const onlyTheirCountries = Array.from(countrySet).filter(
        (c) => !viewerCountrySet.has(c)
      );

      // 6. Upcoming destinations (profile owner's future flights)
      const today = new Date().toISOString().slice(0, 10);
      const profileTripIds = trips.map((t) => t.id);
      let upcomingDestinations: Array<{
        destinationCode: string;
        destinationName: string | null;
        isoDate: string;
      }> = [];
      if (profileTripIds.length > 0) {
        const { data: upcomingData } = await adminForViewer
          .from("flights")
          .select("destination_code, iso_date")
          .in("trip_id", profileTripIds)
          .gt("iso_date", today)
          .order("iso_date", { ascending: true })
          .limit(10);
        upcomingDestinations = (
          (upcomingData ?? []) as { destination_code: string; iso_date: string }[]
        ).map((f) => ({
          destinationCode: f.destination_code ?? "",
          destinationName: AIRPORTS[f.destination_code ?? ""]?.city ?? null,
          isoDate: f.iso_date ?? "",
        }));
      }

      // 7. Reaction counts for profile's trips
      type TripReactionEntry = NonNullable<PublicProfileData["friendData"]>["tripReactions"][number];
      let tripReactions: TripReactionEntry[] = [];
      if (profileTripIds.length > 0) {
        const { data: reactData } = await adminForViewer
          .from("trip_social_reactions")
          .select("trip_id, emoji")
          .in("trip_id", profileTripIds);
        const reactionMap = new Map<string, Map<string, number>>();
        for (const r of (reactData ?? []) as { trip_id: string; emoji: string }[]) {
          if (!reactionMap.has(r.trip_id)) reactionMap.set(r.trip_id, new Map());
          const emojiMap = reactionMap.get(r.trip_id)!;
          emojiMap.set(r.emoji, (emojiMap.get(r.emoji) ?? 0) + 1);
        }
        tripReactions = Array.from(reactionMap.entries()).map(([tripId, emojiMap]) => ({
          tripId,
          reactions: Array.from(emojiMap.entries()).map(([emoji, count]) => ({ emoji, count })),
        }));
      }

      friendData = {
        sharedDestinations,
        onlyTheirCountries,
        upcomingDestinations,
        tripReactions,
        viewerCountries: Array.from(viewerCountrySet),
      };
    }
  }

  const profileResponse: PublicProfileData = {
    userId: profile.id,
    username: profile.username,
    displayName: profile.display_name,
    followerCount,
    followingCount,
    viewerFollows,
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
    friendData,
  };

  return (
    <main className="min-h-screen bg-[#060610] p-4 max-w-lg mx-auto">
      <TripSocialProfile
        profile={profileResponse}
        currentUserId={user?.id ?? null}
      />
    </main>
  );
}
