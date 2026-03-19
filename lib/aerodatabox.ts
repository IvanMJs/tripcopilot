import { AirportStatus, DelayStatus } from "./types";
import { AIRPORTS } from "./airports";

type AeroDataBoxDeparture = {
  status?: string;
  movement?: {
    scheduledTime?: { utc?: string };
    actualTime?: { utc?: string };
  };
};

type AeroDataBoxResponse = {
  departures?: AeroDataBoxDeparture[];
};

function classifyDelay(avgMinutes: number): DelayStatus {
  if (avgMinutes <= 5) return "ok";
  if (avgMinutes <= 15) return "delay_minor";
  if (avgMinutes <= 45) return "delay_moderate";
  return "delay_severe";
}

export function parseAeroDataBox(
  iata: string,
  data: AeroDataBoxResponse,
  locale: "es" | "en" = "es",
): AirportStatus | null {
  const airport = AIRPORTS[iata];
  if (!airport) return null;

  const departures: AeroDataBoxDeparture[] = data?.departures ?? [];

  if (departures.length === 0) {
    return {
      iata,
      name: airport.name,
      city: airport.city,
      state: airport.state,
      status: "ok",
      lastChecked: new Date(),
    };
  }

  // Cancellation rate
  const cancelled = departures.filter((d) => d.status === "Cancelled").length;
  const cancellationRate = cancelled / departures.length;

  // Average delay from flights that have both scheduled + actual time
  let totalDelay = 0;
  let delayedCount = 0;

  for (const dep of departures) {
    const scheduled = dep.movement?.scheduledTime?.utc;
    const actual = dep.movement?.actualTime?.utc;
    if (!scheduled || !actual) continue;

    const diffMin =
      (new Date(actual).getTime() - new Date(scheduled).getTime()) / 60000;
    if (diffMin > 0) {
      totalDelay += diffMin;
      delayedCount++;
    }
  }

  const avgDelay = delayedCount > 0 ? totalDelay / delayedCount : 0;

  // High cancellation rate → treat as closure
  if (cancellationRate > 0.5 && departures.length >= 5) {
    return {
      iata,
      name: airport.name,
      city: airport.city,
      state: airport.state,
      status: "closure",
      closure: {
        reason:
          locale === "es"
            ? "Alta tasa de cancelaciones"
            : "High cancellation rate",
      },
      lastChecked: new Date(),
    };
  }

  const status = classifyDelay(avgDelay);

  return {
    iata,
    name: airport.name,
    city: airport.city,
    state: airport.state,
    status,
    delays:
      avgDelay > 5
        ? {
            reason:
              locale === "es"
                ? `Demora promedio en salidas: ${Math.round(avgDelay)} min`
                : `Avg departure delay: ${Math.round(avgDelay)} min`,
            minMinutes: Math.round(avgDelay * 0.7),
            maxMinutes: Math.round(avgDelay * 1.4),
            type: "departure",
          }
        : undefined,
    lastChecked: new Date(),
  };
}
