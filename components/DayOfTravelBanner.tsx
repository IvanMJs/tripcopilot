"use client";

import { useEffect, useState } from "react";
import { Phone, ExternalLink, MapPin, Plane, Radio } from "lucide-react";

interface DayOfTravelBannerProps {
  flightNum: string;
  airline: string;
  originCode: string;
  destinationCode: string;
  departureTime: string; // "HH:MM"
  flightUrl: string;
  airlineCode: string;
  locale: "es" | "en";
}

const AIRLINE_PHONES: Record<string, { number: string; display: string }> = {
  AA: { number: "18004337300", display: "1-800-433-7300" },
  DL: { number: "18002211212", display: "1-800-221-1212" },
  B6: { number: "18005385696", display: "1-800-538-2583" },
  UA: { number: "18005643322", display: "1-800-864-8331" },
  WN: { number: "18004359792", display: "1-800-435-9792" },
  LA: { number: "18662357772", display: "1-866-435-9526" },
  AR: { number: "08102228627", display: "0810-222-AERO" },
};

const TERMINAL_MAPS: Record<string, string> = {
  EZE: "https://www.google.com/maps/search/Terminal+A+EZE+Buenos+Aires",
  MIA: "https://www.google.com/maps/search/Miami+International+Airport+Terminal",
  JFK: "https://www.google.com/maps/search/JFK+Airport+Terminal",
  GCM: "https://www.google.com/maps/search/Owen+Roberts+International+Airport+Cayman",
};

function parseDepartureMs(isoDate: string, timeHHMM: string): number {
  const [h, m] = timeHHMM.split(":").map(Number);
  const d = new Date(isoDate + "T00:00:00");
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

function useCountdown(targetMs: number) {
  const [diff, setDiff] = useState(targetMs - Date.now());
  useEffect(() => {
    const id = setInterval(() => setDiff(targetMs - Date.now()), 1000);
    return () => clearInterval(id);
  }, [targetMs]);
  return diff;
}

function formatCountdown(ms: number, locale: "es" | "en"): string {
  if (ms <= 0) return locale === "es" ? "Despegó" : "Departed";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

// Get today's ISO date string
function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function DayOfTravelBanner({
  flightNum,
  airline,
  originCode,
  destinationCode,
  departureTime,
  flightUrl,
  airlineCode,
  locale,
}: DayOfTravelBannerProps) {
  const departureMs = parseDepartureMs(todayIso(), departureTime);
  // Board ~40 min before departure
  const boardingMs = departureMs - 40 * 60 * 1000;
  const countdownMs = useCountdown(departureMs);
  const departed = countdownMs <= 0;

  const phone = AIRLINE_PHONES[airlineCode];
  const mapUrl = TERMINAL_MAPS[originCode];

  return (
    <div className="rounded-2xl overflow-hidden border border-red-700/60 animate-fade-in-up"
      style={{ background: "linear-gradient(140deg, rgba(60,8,8,0.97) 0%, rgba(16,4,4,0.99) 100%)" }}
    >
      {/* Top pulse bar */}
      <div className="h-1 w-full bg-gradient-to-r from-red-700 via-orange-500 to-red-700 animate-pulse" />

      <div className="px-4 pt-4 pb-4 space-y-4">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-red-400 bg-red-900/40 border border-red-700/50 rounded-full px-2.5 py-0.5">
                <Radio className="h-2.5 w-2.5 animate-pulse" />
                {locale === "es" ? "Modo viaje activo" : "Travel day — live"}
              </span>
            </div>
            <h2 className="text-2xl font-black text-white leading-tight">
              {flightNum}
            </h2>
            <p className="text-sm text-gray-300 mt-0.5">
              {airline} · {originCode} → {destinationCode}
            </p>
          </div>
          <Plane className="h-8 w-8 text-red-500/60 shrink-0 mt-1" />
        </div>

        {/* Countdown */}
        <div className="rounded-xl border border-red-800/50 bg-red-950/50 px-4 py-3 text-center">
          {departed ? (
            <p className="text-lg font-black text-gray-400">
              {locale === "es" ? "Vuelo despegado" : "Flight departed"}
            </p>
          ) : (
            <>
              <p className="text-xs font-bold uppercase tracking-widest text-red-400/70 mb-1">
                {locale === "es" ? "Tiempo hasta despegue" : "Time to departure"}
              </p>
              <p className="text-4xl font-black text-white tabular leading-none">
                {formatCountdown(countdownMs, locale)}
              </p>
              <p className="text-[11px] text-red-400/60 mt-1.5">
                {locale === "es"
                  ? `Salida a las ${departureTime} · Embarque ~${new Date(boardingMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                  : `Departs ${departureTime} · Board ~${new Date(boardingMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
              </p>
            </>
          )}
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2">
          {/* Live status */}
          <a
            href={flightUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl border border-blue-700/50 bg-blue-900/20 px-3 py-3 text-xs font-bold text-blue-300 hover:bg-blue-900/40 transition-colors tap-scale"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            {locale === "es" ? "Estado en vivo" : "Live status"}
          </a>

          {/* Terminal map */}
          {mapUrl && (
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border border-emerald-700/50 bg-emerald-900/20 px-3 py-3 text-xs font-bold text-emerald-300 hover:bg-emerald-900/40 transition-colors tap-scale"
            >
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {locale === "es" ? "Ver terminal" : "Terminal map"}
            </a>
          )}

          {/* Airline phone */}
          {phone && (
            <a
              href={`tel:+${phone.number}`}
              className="col-span-2 flex items-center justify-center gap-2 rounded-xl border border-orange-700/50 bg-orange-900/20 px-3 py-3 text-xs font-bold text-orange-300 hover:bg-orange-900/40 transition-colors tap-scale"
            >
              <Phone className="h-3.5 w-3.5 shrink-0" />
              {locale === "es" ? "Llamar a " : "Call "}{airline} · {phone.display}
            </a>
          )}
        </div>

      </div>
    </div>
  );
}
