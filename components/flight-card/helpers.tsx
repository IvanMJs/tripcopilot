"use client";

import { useExchangeRate } from "@/hooks/useExchangeRate";
import { TripPanelLabels } from "@/components/TripPanelLabels";

export function getTzAbbr(timezone: string, isoDate: string): string {
  try {
    const d = new Date(`${isoDate}T12:00:00`);
    return (
      new Intl.DateTimeFormat("en-US", { timeZone: timezone, timeZoneName: "short" })
        .formatToParts(d)
        .find((p) => p.type === "timeZoneName")?.value ?? ""
    );
  } catch {
    return "";
  }
}

export function getDaysUntil(isoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const flight = new Date(isoDate + "T00:00:00");
  return Math.ceil((flight.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function DaysCountdown({ days, L }: { days: number; L: TripPanelLabels }) {
  if (days < 0) {
    return (
      <span className="text-xs font-medium px-2 py-0.5 rounded-full border border-white/6 bg-white/4 text-gray-500">
        {L.completed}
      </span>
    );
  }
  if (days === 0) {
    return (
      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-900/60 border border-red-700/50 text-red-300 animate-pulse">
        {L.today}
      </span>
    );
  }
  const cls = days <= 7
    ? "bg-yellow-900/40 border-yellow-700/40 text-yellow-300"
    : "bg-emerald-900/30 border-emerald-700/30 text-emerald-300";
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cls}`}>
      {L.days(days)}
    </span>
  );
}

export function ExchangeRateRow({ destinationCode }: { destinationCode: string }) {
  const result = useExchangeRate(destinationCode);
  if (!result || result.loading || result.error || result.rate === null) return null;

  const formatted = result.rate < 0.001
    ? result.rate.toFixed(6)
    : result.rate < 0.01
    ? result.rate.toFixed(5)
    : result.rate < 0.1
    ? result.rate.toFixed(4)
    : result.rate.toFixed(4);

  return (
    <span className="text-xs text-gray-500">
      1 ARS = {formatted} {result.currency}
    </span>
  );
}
