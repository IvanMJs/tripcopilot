"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { TripTab } from "@/lib/types";

interface GlobalAlertBarProps {
  trips: TripTab[];
  locale: "es" | "en";
  onSelectTrip: (id: string) => void;
}

interface TodayAlert {
  tripId: string;
  tripName: string;
  flightCode: string;
  departureTime: string;
}

function getTodayAlerts(trips: TripTab[]): TodayAlert[] {
  const today = new Date().toISOString().slice(0, 10);
  const alerts: TodayAlert[] = [];
  for (const trip of trips) {
    for (const flight of trip.flights) {
      if (flight.isoDate === today) {
        alerts.push({
          tripId: trip.id,
          tripName: trip.name,
          flightCode: flight.flightCode,
          departureTime: flight.departureTime ?? "",
        });
      }
    }
  }
  return alerts;
}

export function GlobalAlertBar({ trips, locale, onSelectTrip }: GlobalAlertBarProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const alerts = getTodayAlerts(trips);
  if (alerts.length === 0) return null;

  const first = alerts[0];
  const label = `${first.flightCode}${first.departureTime ? ` · ${first.departureTime}` : ""} — ${first.tripName}`;
  const moreCount = alerts.length - 1;

  return (
    <div className="fixed bottom-[60px] left-0 right-0 z-40 px-3 pb-1.5 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-amber-700/40 bg-amber-950/90 backdrop-blur-sm px-3 py-2.5 shadow-lg">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
        <button
          onClick={() => onSelectTrip(first.tripId)}
          className="flex-1 min-w-0 text-left"
        >
          <span className="text-xs font-semibold text-amber-200 truncate block">
            {locale === "es" ? "Vuelo hoy" : "Flight today"}{" "}
            <span className="font-normal text-amber-300/80">{label}</span>
          </span>
          {moreCount > 0 && (
            <span className="text-[10px] text-amber-400/70">
              {locale === "es" ? `+${moreCount} más hoy` : `+${moreCount} more today`}
            </span>
          )}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 p-1 rounded-md text-amber-500/60 hover:text-amber-300 transition-colors"
          title={locale === "es" ? "Cerrar" : "Dismiss"}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
