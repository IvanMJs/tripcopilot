import { TripFlight } from "@/lib/types";
import { AIRPORTS } from "@/lib/airports";

/**
 * Converts a flight's departure date + local time into a UTC ISO string,
 * accounting for the origin airport's timezone.
 *
 * Returns an empty string when the flight has no departure time.
 * Falls back to a naive ISO string on any timezone calculation error.
 */
export function flightDepartureISO(flight: TripFlight): string {
  if (!flight.departureTime) return "";
  const airport = AIRPORTS[flight.originCode];
  const tz = airport?.timezone ?? "UTC";
  try {
    const [h, m] = flight.departureTime.split(":").map(Number);
    const refMs = Date.UTC(
      parseInt(flight.isoDate.slice(0, 4)),
      parseInt(flight.isoDate.slice(5, 7)) - 1,
      parseInt(flight.isoDate.slice(8, 10)),
      h, m, 0,
    );
    const tzParts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric", month: "numeric", day: "numeric",
      hour: "numeric", minute: "numeric", second: "numeric",
      hour12: false,
    }).formatToParts(new Date(refMs));
    const get = (type: string) =>
      parseInt(tzParts.find((p) => p.type === type)?.value ?? "0");
    const tzHour = get("hour") % 24;
    const tzMin  = get("minute");
    const offsetMin = (h * 60 + m) - (tzHour * 60 + tzMin);
    const midnightUTC = Date.UTC(
      parseInt(flight.isoDate.slice(0, 4)),
      parseInt(flight.isoDate.slice(5, 7)) - 1,
      parseInt(flight.isoDate.slice(8, 10)),
    );
    const depMs = midnightUTC + (h * 60 + m + offsetMin) * 60000;
    return new Date(depMs).toISOString();
  } catch {
    return `${flight.isoDate}T${flight.departureTime}:00`;
  }
}

/**
 * Returns the number of minutes from now until the given UTC ISO datetime.
 * Returns Infinity for an empty string.
 */
export function minutesUntilISO(iso: string): number {
  if (!iso) return Infinity;
  return (new Date(iso).getTime() - Date.now()) / 60000;
}
