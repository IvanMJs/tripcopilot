import { TripTab, TripFlight } from "./types";

export interface CheckInReminder {
  userId: string;
  flight: TripFlight;
  tripName: string;
  departureDateTime: string; // ISO 8601 — approximate UTC (calendar-date-based)
}

/**
 * Returns flights across all trips whose departure date matches `targetDate`
 * (defaults to tomorrow in the caller's local timezone). These flights are
 * within the standard 24-hour check-in window and should receive a reminder
 * notification.
 *
 * "Tomorrow" is computed from the caller's clock — no airport timezone
 * conversion is applied because we only care about the calendar date, not the
 * precise departure minute.
 *
 * @param trips      The full list of trip tabs to scan.
 * @param userId     The owner of the trips (propagated to each reminder).
 * @param targetDate Optional YYYY-MM-DD override (defaults to tomorrow UTC).
 */
export function getCheckInReminders(
  trips: TripTab[],
  userId: string,
  targetDate?: string,
): CheckInReminder[] {
  const now = new Date();

  const resolvedTarget: string =
    targetDate ??
    new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const reminders: CheckInReminder[] = [];

  for (const trip of trips) {
    for (const flight of trip.flights) {
      if (flight.isoDate !== resolvedTarget) continue;

      // Build an approximate ISO departure timestamp using the calendar date
      // plus local departure time treated as UTC. This is a best-effort
      // estimate — good enough for reminder scheduling without per-airport TZ.
      let departureDateTime: string = `${flight.isoDate}T00:00:00.000Z`;
      if (flight.departureTime) {
        const [h, m] = flight.departureTime.split(":").map(Number);
        const depMs = Date.UTC(
          parseInt(flight.isoDate.slice(0, 4)),
          parseInt(flight.isoDate.slice(5, 7)) - 1,
          parseInt(flight.isoDate.slice(8, 10)),
          h,
          m,
        );
        departureDateTime = new Date(depMs).toISOString();
      }

      reminders.push({
        userId,
        flight,
        tripName: trip.name,
        departureDateTime,
      });
    }
  }

  return reminders.sort((a, b) =>
    a.flight.departureTime.localeCompare(b.flight.departureTime),
  );
}
