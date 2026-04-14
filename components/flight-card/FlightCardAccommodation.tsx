"use client";

import { useState } from "react";
import { Hotel } from "lucide-react";
import { Accommodation } from "@/lib/types";
import { AccommodationInline, AddAccommodationInlineForm, estimateArrivalDate } from "@/components/AccommodationCard";
import { TripPanelLabels } from "@/components/TripPanelLabels";

export interface FlightCardAccommodationProps {
  accommodation: Accommodation | null | undefined;
  flightIsoDate: string;
  flightDepartureTime: string;
  flightArrivalBuffer: number;
  nextDate: string | undefined;
  destName: string;
  locale: "es" | "en";
  L: TripPanelLabels;
  onAddAccommodation?: (data: { name: string; checkInTime?: string; checkOutTime?: string; confirmationCode?: string; address?: string }) => void;
  onRemoveAccommodation?: () => void;
  onEditAccommodation?: (name: string, checkInTime?: string, checkOutTime?: string, confirmationCode?: string, address?: string) => void;
}

export function FlightCardAccommodation({
  accommodation,
  flightIsoDate,
  flightDepartureTime,
  flightArrivalBuffer,
  nextDate,
  destName,
  locale,
  L,
  onAddAccommodation,
  onRemoveAccommodation,
  onEditAccommodation,
}: FlightCardAccommodationProps) {
  const [showHotelForm, setShowHotelForm] = useState(false);
  const checkInDate = estimateArrivalDate(flightIsoDate, flightDepartureTime, flightArrivalBuffer);

  if (!accommodation && !nextDate) return null;

  return (
    <div className="px-4 pb-4">
      {accommodation ? (
        <AccommodationInline
          acc={accommodation}
          checkInDate={checkInDate}
          checkOutDate={nextDate}
          locale={locale}
          L={L}
          onRemove={onRemoveAccommodation}
          onEdit={onEditAccommodation}
        />
      ) : showHotelForm && onAddAccommodation ? (
        <AddAccommodationInlineForm
          destCity={destName}
          locale={locale}
          L={L}
          onAdd={onAddAccommodation}
          onClose={() => setShowHotelForm(false)}
        />
      ) : onAddAccommodation ? (
        <button
          onClick={() => setShowHotelForm(true)}
          className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/[0.08] py-2 text-[11px] text-gray-600 hover:text-gray-400 hover:border-white/[0.15] transition-colors"
        >
          <Hotel className="h-3 w-3" />
          {locale === "es" ? `+ Hotel en ${destName}` : `+ Hotel in ${destName}`}
        </button>
      ) : null}
    </div>
  );
}
