import type { SupabaseClient } from "@supabase/supabase-js";
import { TripTab } from "@/lib/types";
import { AIRPORTS } from "@/lib/airports";

export interface VisitedPlace {
  id: string;           // uuid from DB (manual) or city+country slug (inferred)
  city: string;
  country: string;
  dateVisited: string;  // "YYYY-MM-DD"
  source: "inferred" | "manual" | "detected";
}

// ── Inference from flights ────────────────────────────────────────────────────

export function inferVisitedPlaces(trips: TripTab[]): VisitedPlace[] {
  const flights = trips
    .flatMap((t) => t.flights)
    .sort((a, b) => {
      const at = `${a.isoDate}T${a.departureTime}`;
      const bt = `${b.isoDate}T${b.departureTime}`;
      return at < bt ? -1 : at > bt ? 1 : 0;
    });

  const earliest: Record<string, string> = {};

  for (let i = 0; i < flights.length - 1; i++) {
    const curr = flights[i];
    const next = flights[i + 1];
    if (curr.destinationCode !== next.originCode) continue;

    const arrDate = curr.arrivalDate ?? curr.isoDate;
    const arrTime = curr.arrivalTime ?? null;
    if (!arrTime) continue;

    const arrivalMs = new Date(`${arrDate}T${arrTime}:00`).getTime();
    const depMs = new Date(`${next.isoDate}T${next.departureTime}:00`).getTime();
    if (isNaN(arrivalMs) || isNaN(depMs)) continue;

    const gapHours = (depMs - arrivalMs) / 3_600_000;
    if (gapHours < 4) continue;

    const airport = AIRPORTS[curr.destinationCode];
    if (!airport) continue;
    const city = airport.city ?? curr.destinationCode;
    const country = airport.country ?? "USA";
    const key = `${city}|${country}`;

    if (!earliest[key] || curr.isoDate < earliest[key]) {
      earliest[key] = curr.isoDate;
    }
  }

  return Object.entries(earliest).map(([key, date]) => {
    const [city, country] = key.split("|");
    return {
      id: key.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      city,
      country,
      dateVisited: date,
      source: "inferred",
    } satisfies VisitedPlace;
  }).sort((a, b) => b.dateVisited.localeCompare(a.dateVisited));
}

// ── Inference from all flight cities (destinations + origins) ─────────────────

export function inferFromAllFlightCities(trips: TripTab[]): VisitedPlace[] {
  const earliest: Record<string, string> = {};

  for (const trip of trips) {
    for (const flight of trip.flights) {
      for (const code of [flight.destinationCode, flight.originCode]) {
        const airport = AIRPORTS[code];
        if (!airport) continue;
        const city = airport.city ?? code;
        const country = airport.country ?? "USA";
        const key = `${city}|${country}`;
        if (!earliest[key] || flight.isoDate < earliest[key]) {
          earliest[key] = flight.isoDate;
        }
      }
    }
  }

  return Object.entries(earliest).map(([key, date]) => {
    const [city, country] = key.split("|");
    return {
      id: key.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      city,
      country,
      dateVisited: date,
      source: "inferred",
    } satisfies VisitedPlace;
  }).sort((a, b) => b.dateVisited.localeCompare(a.dateVisited));
}

// ── Supabase DB helpers ───────────────────────────────────────────────────────

interface DBRow {
  id: string;
  city: string;
  country: string;
  date_visited: string;
  source: string;
}

function rowToPlace(row: DBRow): VisitedPlace {
  const source: VisitedPlace["source"] =
    row.source === "inferred" ? "inferred"
    : row.source === "detected" ? "detected"
    : "manual";
  return {
    id: row.id,
    city: row.city,
    country: row.country,
    dateVisited: row.date_visited,
    source,
  };
}

export async function fetchDBPlaces(supabase: SupabaseClient): Promise<VisitedPlace[]> {
  const { data, error } = await supabase
    .from("visited_places")
    .select("id, city, country, date_visited, source")
    .order("date_visited", { ascending: false });

  if (error || !data) return [];
  return (data as DBRow[]).map(rowToPlace);
}

export async function addDBPlace(
  supabase: SupabaseClient,
  place: { city: string; country: string; dateVisited: string },
): Promise<VisitedPlace | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("visited_places")
    .insert({
      user_id: user.id,
      city: place.city,
      country: place.country,
      date_visited: place.dateVisited,
      source: "manual",
    })
    .select("id, city, country, date_visited, source")
    .single();

  if (error || !data) return null;
  return rowToPlace(data as DBRow);
}

export async function addDetectedPlace(
  supabase: SupabaseClient,
  place: { city: string; country: string; dateVisited: string },
): Promise<VisitedPlace | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("visited_places")
    .insert({
      user_id: user.id,
      city: place.city,
      country: place.country,
      date_visited: place.dateVisited,
      source: "detected",
    })
    .select("id, city, country, date_visited, source")
    .single();

  // Gracefully ignore conflict (unique constraint violation)
  if (error) return null;
  if (!data) return null;
  return rowToPlace(data as DBRow);
}

export async function removeDBPlace(supabase: SupabaseClient, id: string): Promise<void> {
  await supabase.from("visited_places").delete().eq("id", id);
}

// ── localStorage fallback (kept for offline/unauthenticated reads) ────────────

const STORAGE_KEY = "tripcopilot-visited-places";

export function loadManualPlaces(): VisitedPlace[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is VisitedPlace =>
        typeof p?.city === "string" &&
        typeof p?.country === "string" &&
        typeof p?.dateVisited === "string" &&
        (p?.source === "inferred" || p?.source === "manual"),
    );
  } catch {
    return [];
  }
}

export function saveManualPlaces(places: VisitedPlace[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(places));
  } catch {
    // ignore
  }
}
