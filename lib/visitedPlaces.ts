import { TripTab } from "@/lib/types";
import { AIRPORTS } from "@/lib/airports";

export interface VisitedPlace {
  id: string;           // city+country slug (inferred) or uuid (manual)
  city: string;
  country: string;
  dateVisited: string;  // "YYYY-MM-DD"
  source: "inferred" | "manual";
}

const STORAGE_KEY = "tripcopilot-visited-places";

export function inferVisitedPlaces(trips: TripTab[]): VisitedPlace[] {
  // Flatten + sort flights chronologically by isoDate+departureTime
  const flights = trips
    .flatMap((t) => t.flights)
    .sort((a, b) => {
      const at = `${a.isoDate}T${a.departureTime}`;
      const bt = `${b.isoDate}T${b.departureTime}`;
      return at < bt ? -1 : at > bt ? 1 : 0;
    });

  // earliest visit per city+country key
  const earliest: Record<string, string> = {};

  for (let i = 0; i < flights.length - 1; i++) {
    const curr = flights[i];
    const next = flights[i + 1];
    if (curr.destinationCode !== next.originCode) continue;

    // Build arrival timestamp for curr flight
    const arrDate = curr.arrivalDate ?? curr.isoDate;
    const arrTime = curr.arrivalTime ?? null;
    if (!arrTime) continue; // skip if no arrival time

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
