import { TripTab, TripFlight, TripExpense } from "./types";
import { AIRPORTS } from "./airports";

export type { TripExpense };

export interface BudgetCategory {
  label: string;
  estimatedUSD: number;
  actualUSD: number;
  icon: string;
}

export interface TripBudget {
  totalEstimatedUSD: number;
  totalActualUSD: number;
  categories: BudgetCategory[];
  remainingUSD: number;   // estimated - actual
  overBudget: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Returns true if the route crosses a country border (international flight). */
function isInternational(flight: TripFlight): boolean {
  const originCountry = AIRPORTS[flight.originCode]?.country ?? "United States";
  const destCountry   = AIRPORTS[flight.destinationCode]?.country ?? "United States";
  return originCountry !== destCountry;
}

/**
 * Computes the trip duration in days.
 * Uses the span from the earliest departure date to the latest arrival / departure date.
 */
function tripDurationDays(flights: TripFlight[]): number {
  if (flights.length === 0) return 0;

  const dates = flights.flatMap((f) => {
    const out: string[] = [f.isoDate];
    if (f.arrivalDate) out.push(f.arrivalDate);
    return out;
  });

  const earliest = dates.reduce((a, b) => (a < b ? a : b));
  const latest   = dates.reduce((a, b) => (a > b ? a : b));

  const msPerDay = 24 * 60 * 60 * 1000;
  const days = Math.round(
    (new Date(latest).getTime() - new Date(earliest).getTime()) / msPerDay,
  );

  // Minimum 1 day even for same-day trips
  return Math.max(1, days);
}

// ── Main function ──────────────────────────────────────────────────────────

/**
 * Estimates a trip budget from trip data and sums actual expenses per category.
 *
 * Estimation rules (clearly marked as rough averages):
 *   - Flights:    $150/leg domestic · $600/leg international
 *   - Hotel:      $80/night × nights in accommodations (or trip duration - 1)
 *   - Food:       $50/day × trip duration
 *   - Transport:  $30/day × trip duration
 *   - Activities: $50/day × trip duration
 */
export function estimateTripBudget(
  trip: TripTab,
  expenses: TripExpense[],
): TripBudget {
  const { flights, accommodations } = trip;
  const days = tripDurationDays(flights);

  // ── Estimated values ──────────────────────────────────────────────────

  // Flights: sum per leg
  const estimatedFlights = flights.reduce((sum, f) => {
    return sum + (isInternational(f) ? 600 : 150);
  }, 0);

  // Hotel: prefer accommodations count, else (days - 1)
  const nights = accommodations.length > 0
    ? accommodations.reduce((sum, acc) => {
        if (!acc.checkInDate || !acc.checkOutDate) return sum + 1;
        const msPerDay = 24 * 60 * 60 * 1000;
        const n = Math.round(
          (new Date(acc.checkOutDate).getTime() - new Date(acc.checkInDate).getTime()) / msPerDay,
        );
        return sum + Math.max(1, n);
      }, 0)
    : Math.max(0, days - 1);
  const estimatedHotel = nights * 80;

  const estimatedFood      = days * 50;
  const estimatedTransport = days * 30;
  const estimatedActivities = days * 50;

  // ── Actual values — summed from expenses per category ─────────────────

  function actualFor(cat: TripExpense["category"]): number {
    return expenses
      .filter((e) => e.category === cat)
      .reduce((s, e) => s + e.amount, 0);
  }

  const categories: BudgetCategory[] = [
    {
      label:        "Vuelos / Flights",
      estimatedUSD: estimatedFlights,
      actualUSD:    actualFor("flight"),
      icon:         "✈️",
    },
    {
      label:        "Alojamiento / Hotel",
      estimatedUSD: estimatedHotel,
      actualUSD:    actualFor("hotel"),
      icon:         "🏨",
    },
    {
      label:        "Comida / Food",
      estimatedUSD: estimatedFood,
      actualUSD:    actualFor("food"),
      icon:         "🍽️",
    },
    {
      label:        "Transporte / Transport",
      estimatedUSD: estimatedTransport,
      actualUSD:    actualFor("transport"),
      icon:         "🚌",
    },
    {
      label:        "Actividades / Activities",
      estimatedUSD: estimatedActivities,
      actualUSD:    actualFor("activity"),
      icon:         "🎭",
    },
  ];

  const totalEstimatedUSD = categories.reduce((s, c) => s + c.estimatedUSD, 0);
  const totalActualUSD    = expenses.reduce((s, e) => s + e.amount, 0);
  const remainingUSD      = totalEstimatedUSD - totalActualUSD;

  return {
    totalEstimatedUSD,
    totalActualUSD,
    categories,
    remainingUSD,
    overBudget: totalActualUSD > totalEstimatedUSD,
  };
}
