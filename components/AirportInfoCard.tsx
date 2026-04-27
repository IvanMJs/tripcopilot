"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Wifi, ExternalLink, MapPin } from "lucide-react";
import { AIRPORTS } from "@/lib/airports";
import { hasAirportWifi, getAirportWebsite } from "@/lib/airportWifi";

interface AirportInfoCardProps {
  iata: string;
  locale: "es" | "en";
  terminal?: string | null;
}

export function AirportInfoCard({ iata, locale, terminal }: AirportInfoCardProps) {
  const [open, setOpen] = useState(false);

  const info = AIRPORTS[iata];
  if (!info) return null;

  const airportName = info.name;
  const city = info.city;
  const country = info.country ?? "USA";
  const wifi = hasAirportWifi(iata);
  const website = getAirportWebsite(iata);
  const mapQuery = encodeURIComponent(`${airportName} airport`);
  const mapUrl = `https://maps.google.com/?q=${mapQuery}`;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-400 transition-colors"
        aria-label={locale === "es" ? "Información del aeropuerto" : "Airport info"}
      >
        <MapPin className="h-3 w-3 shrink-0" />
        <span>{locale === "es" ? "Info del aeropuerto" : "Airport info"}</span>
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {open && (
        <div className="mt-1.5 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 space-y-1.5">
          {/* Name + city + country */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-200 truncate">{airportName}</p>
              <p className="text-[11px] text-gray-500">
                {city}
                {country !== city && ` · ${country}`}
              </p>
            </div>
            {terminal && (
              <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-700/50 bg-blue-900/30 text-blue-300">
                T{terminal}
              </span>
            )}
          </div>

          {/* Indicators row */}
          <div className="flex items-center gap-3 flex-wrap">
            {wifi && (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                <Wifi className="h-3 w-3" />
                {locale === "es" ? "WiFi gratis" : "Free WiFi"}
              </span>
            )}
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-blue-400/80 hover:text-blue-300 transition-colors"
            >
              <MapPin className="h-3 w-3" />
              {locale === "es" ? "Ver en mapa" : "View on map"}
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
            {website && (
              <a
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-400 transition-colors"
              >
                <ExternalLink className="h-2.5 w-2.5" />
                {locale === "es" ? "Sitio oficial" : "Official site"}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}