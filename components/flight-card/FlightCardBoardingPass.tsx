"use client";

import { useState } from "react";
import { Plane } from "lucide-react";
import { TripFlight } from "@/lib/types";
import { BoardingPassView } from "@/components/BoardingPassView";

export interface FlightCardBoardingPassProps {
  flight: TripFlight;
  showButton: boolean;
  locale: "es" | "en";
}

export function FlightCardBoardingPass({
  flight,
  showButton,
  locale,
}: FlightCardBoardingPassProps) {
  const [showBoardingPass, setShowBoardingPass] = useState(false);

  return (
    <>
      {showButton && (
        <div className="px-4 pb-4 pt-2 border-t border-violet-800/20">
          <button
            onClick={() => setShowBoardingPass(true)}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-950/40 border border-violet-700/40 hover:bg-violet-950/60 py-2.5 text-xs font-bold text-violet-300 transition-colors"
          >
            <Plane className="h-3.5 w-3.5" />
            {locale === "es" ? "Ver boarding pass" : "View boarding pass"}
          </button>
        </div>
      )}
      {showBoardingPass && (
        <BoardingPassView
          flight={flight}
          onClose={() => setShowBoardingPass(false)}
        />
      )}
    </>
  );
}
