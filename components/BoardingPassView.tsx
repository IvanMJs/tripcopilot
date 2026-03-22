"use client";

import { X, Plane } from "lucide-react";
import { TripFlight } from "@/lib/types";
import { AIRPORTS } from "@/lib/airports";

interface BoardingPassViewProps {
  flight: TripFlight;
  gate?: string;
  onClose: () => void;
}

export function BoardingPassView({ flight, gate, onClose }: BoardingPassViewProps) {
  const originInfo = AIRPORTS[flight.originCode];
  const destInfo   = AIRPORTS[flight.destinationCode];
  const originCity = originInfo?.city ?? flight.originCode;
  const destCity   = destInfo?.city   ?? flight.destinationCode;

  const dateLabel = flight.isoDate
    ? new Date(flight.isoDate + "T00:00:00").toLocaleDateString("es-AR", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "linear-gradient(160deg, #1e0a3c 0%, #0f172a 100%)",
          border: "1px solid rgba(139,92,246,0.25)",
        }}
      >
        {/* D7: Star background */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          {Array.from({length: 30}).map((_, i) => (
            <div key={i} className="absolute rounded-full bg-white"
              style={{
                width: i % 3 === 0 ? '2px' : '1px',
                height: i % 3 === 0 ? '2px' : '1px',
                opacity: 0.1 + (i % 5) * 0.05,
                left: `${(i * 37) % 100}%`,
                top: `${(i * 23) % 100}%`,
              }}
            />
          ))}
        </div>

        {/* Header */}
        <div className="relative px-6 pt-6 pb-4">
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4 text-white" />
          </button>

          {/* Airline + flight number */}
          <p className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-1">
            {flight.airlineName}
          </p>
          <p className="text-6xl font-black text-white tracking-tight leading-none">
            {flight.flightCode.replace(/\s+/g, "")}
          </p>
          <p className="text-xs text-gray-500 mt-1">{dateLabel}</p>
        </div>

        {/* Route */}
        <div className="px-6 py-4 flex items-center justify-between gap-3">
          <div className="text-center">
            <p className="text-4xl font-black text-white">{flight.originCode}</p>
            <p className="text-xs text-gray-400 mt-1 truncate max-w-[90px]">{originCity}</p>
          </div>
          <div className="flex flex-col items-center gap-1 flex-1">
            <Plane className="h-5 w-5 text-violet-400 rotate-0" />
            <div className="h-px w-full bg-violet-800/50" />
          </div>
          <div className="text-center">
            <p className="text-4xl font-black text-white">{flight.destinationCode}</p>
            <p className="text-xs text-gray-400 mt-1 truncate max-w-[90px]">{destCity}</p>
          </div>
        </div>

        {/* Details row */}
        <div className="px-6 pb-4 grid grid-cols-3 gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-0.5">Salida</p>
            <p className="text-lg font-black text-white">
              {flight.departureTime ?? "--:--"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-0.5">Clase</p>
            <p className="text-lg font-black text-white">ECO</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-0.5">
              {gate ? "Puerta" : "Terminal"}
            </p>
            <p className={`text-lg font-black ${gate ? "text-emerald-400" : "text-gray-600"}`}>
              {gate ?? "--"}
            </p>
          </div>
        </div>

        {/* Tear line */}
        <div className="relative flex items-center px-3 py-1">
          <div className="absolute -left-3 h-6 w-6 rounded-full bg-black/80" />
          <div
            className="flex-1 h-px"
            style={{
              backgroundImage: "repeating-linear-gradient(90deg, rgba(139,92,246,0.3) 0, rgba(139,92,246,0.3) 6px, transparent 6px, transparent 12px)",
            }}
          />
          <div className="absolute -right-3 h-6 w-6 rounded-full bg-black/80" />
        </div>

        {/* QR placeholder */}
        <div className="px-6 py-5 flex flex-col items-center gap-2">
          <div className="h-24 w-24 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            {/* Decorative QR-like grid */}
            <div className="grid grid-cols-5 gap-0.5">
              {Array.from({ length: 25 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-3.5 w-3.5 rounded-sm ${
                    [0,1,5,6,10,4,9,14,20,21,24,19,23,12,7,17].includes(i)
                      ? "bg-white/60"
                      : "bg-white/10"
                  }`}
                />
              ))}
            </div>
          </div>
          <p className="text-xs uppercase tracking-widest text-gray-600">
            Scan at gate
          </p>
        </div>
      </div>
    </div>
  );
}
