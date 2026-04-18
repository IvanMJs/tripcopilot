export interface Friendship {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
  // enriched fields (from join)
  otherUserEmail?: string;
  otherUserId?: string;
}

export interface FriendWithLocation {
  friendshipId: string;
  userId: string;
  email: string;
  username?: string | null;
  displayName?: string | null;
  // current location — null if not actively traveling
  currentLocation: {
    city: string;
    country: string;
    lat: number;
    lng: number;
  } | null;
}

export interface TravelerSearchResult {
  userId: string;
  username: string;
  displayName: string | null;
}

export interface PublicProfileData {
  userId: string;
  username: string;
  displayName: string | null;
  social_settings: {
    profileVisible: "friends" | "nobody";
    showMap?: boolean | undefined;
    showStats?: boolean | undefined;
    showTrips?: boolean | undefined;
    showPersona?: boolean | undefined;
    showCurrentLocation?: boolean | undefined;
    acceptRequests?: boolean | undefined;
  };
  trips?: Array<{
    id: string;
    destinationCode: string;
    destinationName: string | null;
    isoDate: string;
    coverPhotoUrl: string | null;
  }>;
  visitedCountries?: string[];
  stats?: {
    tripCount: number;
    countryCount: number;
    airportCount: number;
  };
}
