"use client";

import { useState } from "react";
import { Leaf, ChevronDown } from "lucide-react";
import { TripFlight } from "@/lib/types";
import { calculateTripCO2 } from "@/lib/carbon";
import { AIRPORTS } from "@/lib/airports";

const CABIN_OPTIONS: {
  value: TripFlight["cabinClass"];
  labelEs: string;
  labelEn: string;
}[] = [
  { value: "economy",         labelEs: "Económica",        labelEn: "Economy"        },
  { value: "premium_economy", labelEs: "Prem. económica",  labelEn: "Premium Economy" },
  { value: "business",        labelEs: "Business",         labelEn: "Business"       },
  { value: "first",           labelEs: "Primera clase",    labelEn: "First Class"    },
];

interface CarbonFootprintProps {
  flights: TripFlight[];
  locale: "es" | "en";
  onUpdateCabinClass?: (flightId: string, cabin: TripFlight["cabinClass"]) => void;
}

export function CarbonFootprint({
  flights,
  locale,
  onUpdateCabinClass,
}: CarbonFootprintProps) {
  const [expanded, setExpanded] = useState(false);
  const [localCabins, setLocalCabins] = useState<
    Record<string, TripFlight["cabinClass"]>
  >({});

  const flightsWithCabin = flights.map((f) => ({
    ...f,
    cabinClass: localCabins[f.id] ?? f.cabinClass ?? "economy",
  }));

  const { totalCo2Kg, perFlight } = calculateTripCO2(flightsWithCabin);

  function formatCO2(kg: number): string {
    if (kg >= 1000) {
      return `${(kg / 1000).toFixed(2)} t CO₂`;
    }
    return `${kg} kg CO₂`;
  }

  function carDays(kg: number): number {
    // 1 day of avg car use ≈ 8.5 kg CO₂
    return Math.round(kg / 8.5);
  }

  function handleCabinChange(
    flightId: string,
    cabin: TripFlight["cabinClass"],
  ) {
    setLocalCabins((prev) => ({ ...prev, [flightId]: cabin }));
    onUpdateCabinClass?.(flightId, cabin);
  }

  if (flights.length === 0) return null;

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Leaf className="h-4 w-4 text-green-400 shrink-0" />
          <span className="text-sm font-semibold text-white">
            {locale === "es" ? "Huella de carbono" : "Carbon footprint"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-green-400">
            {formatCO2(totalCo2Kg)}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-gray-500 transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/[0.06]">
          {/* Equivalence */}
          <p className="text-xs text-gray-400 pt-3">
            {locale === "es"
              ? `Equivale a ${carDays(totalCo2Kg)} días de uso de un auto promedio`
              : `Equivalent to ${carDays(totalCo2Kg)} days of average car use`}
          </p>

          {/* Per-flight breakdown */}
          <div className="space-y-2">
            {flightsWithCabin.map((flight, idx) => {
              const entry = perFlight[idx];
              const originCity  = AIRPORTS[flight.originCode]?.city  ?? flight.originCode;
              const destCity    = AIRPORTS[flight.destinationCode]?.city ?? flight.destinationCode;
              const currentCabin = localCabins[flight.id] ?? flight.cabinClass ?? "economy";

              return (
                <div
                  key={flight.id}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-white truncate">
                      {flight.flightCode} · {originCity} → {destCity}
                    </span>
                    <span className="text-xs text-green-400 font-mono shrink-0">
                      {entry.co2Kg > 0 ? formatCO2(entry.co2Kg) : "—"}
                    </span>
                  </div>
                  {entry.distanceKm > 0 && (
                    <p className="text-[11px] text-gray-500">
                      {entry.distanceKm.toLocaleString()} km
                    </p>
                  )}
                  {/* Cabin class selector */}
                  <select
                    value={currentCabin}
                    onChange={(e) =>
                      handleCabinChange(
                        flight.id,
                        e.target.value as TripFlight["cabinClass"],
                      )
                    }
                    className="w-full rounded-md border border-white/[0.08] bg-gray-900 px-2 py-1 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-green-600"
                  >
                    {CABIN_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {locale === "es" ? opt.labelEs : opt.labelEn}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
