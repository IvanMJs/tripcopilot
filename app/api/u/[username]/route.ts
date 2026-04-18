import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { AIRPORTS } from "@/lib/airports";
import type { PublicProfileData } from "@/lib/friends";

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
  [key: string]: unknown;
}

interface TripRow {
  id: string;
  destination_code: string | null;
  destination_name: string | null;
  iso_date: string | null;
  cover_photo_url: string | null;
}

interface UserProfileRow {
  id: string;
  username: string;
  display_name: string | null;
  social_settings: SocialSettings | null;
  visited_places: VisitedPlace[] | null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: profileData } = await admin
    .from("user_profiles")
    .select("id, username, display_name, social_settings, visited_places")
    .ilike("username", username)
    .maybeSingle();

  if (!profileData) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const profile = profileData as UserProfileRow;
  const settings: SocialSettings = profile.social_settings ?? {};

  if (settings.profileVisible === "nobody") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const showStats = settings.showStats ?? true;
  const showMap = settings.showMap ?? true;
  const showTrips = settings.showTrips !== false;

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

  const response: Omit<Partial<PublicProfileData>, "social_settings"> & {
    userId: string;
    username: string;
    displayName: string | null;
    social_settings: unknown;
  } = {
    userId: profile.id,
    username: profile.username,
    displayName: profile.display_name,
    social_settings: settings,
  };

  if (showMap && trips !== undefined) {
    const countrySet = new Set<string>();

    // Try visited_places JSONB first
    if (profile.visited_places && profile.visited_places.length > 0) {
      for (const place of profile.visited_places) {
        if (place.countryCode) {
          countrySet.add(place.countryCode);
        } else if (place.code) {
          const airport = AIRPORTS[place.code];
          if (airport) {
            countrySet.add(airport.country ?? "US");
          }
        }
      }
    }

    // Fall back to deriving from trips destination codes
    if (countrySet.size === 0 && trips) {
      for (const trip of trips) {
        if (trip.destination_code) {
          const airport = AIRPORTS[trip.destination_code];
          if (airport) {
            countrySet.add(airport.country ?? "US");
          }
        }
      }
    }

    response.visitedCountries = Array.from(countrySet);

    // Only expose raw trip rows when showTrips is enabled
    if (showTrips) {
      response.trips = trips.map((t) => ({
        id: t.id,
        destinationCode: t.destination_code ?? "",
        destinationName: t.destination_name,
        isoDate: t.iso_date ?? "",
        coverPhotoUrl: t.cover_photo_url,
      }));
    }
  }

  if (showStats && trips !== undefined) {
    const airportSet = new Set<string>();
    const countrySetForStats = new Set<string>();

    if (profile.visited_places && profile.visited_places.length > 0) {
      for (const place of profile.visited_places) {
        if (place.code) {
          airportSet.add(place.code);
          const airport = AIRPORTS[place.code];
          if (airport) {
            countrySetForStats.add(airport.country ?? "US");
          }
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
          if (airport) {
            countrySetForStats.add(airport.country ?? "US");
          }
        }
      }
    }

    response.stats = {
      tripCount: trips?.length ?? 0,
      countryCount: countrySetForStats.size,
      airportCount: airportSet.size,
    };
  }

  // If showTrips is enabled but showMap is false, still expose trips directly
  if (showTrips && !showMap && trips !== undefined) {
    response.trips = trips.map((t) => ({
      id: t.id,
      destinationCode: t.destination_code ?? "",
      destinationName: t.destination_name,
      isoDate: t.iso_date ?? "",
      coverPhotoUrl: t.cover_photo_url,
    }));
  }

  return NextResponse.json(response);
}
