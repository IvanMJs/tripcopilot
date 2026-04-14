"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Map, PlaneTakeoff, CloudSun, DollarSign, Filter } from "lucide-react";
import { AIRPORTS } from "@/lib/airports";
import { useWeather } from "@/hooks/useWeather";

// ── Destination catalogue ──────────────────────────────────────────────────────

type DestinationCategory = "beach" | "city" | "nature" | "culture";

interface ExploreDestination {
  iata: string;
  nameEs: string;
  nameEn: string;
  countryFlag: string;
  categories: DestinationCategory[];
  gradient: string;
  emoji: string;
}

const EXPLORE_DESTINATIONS: ExploreDestination[] = [
  // Beach
  { iata: "CUN", nameEs: "Cancún",        nameEn: "Cancún",       countryFlag: "🇲🇽", categories: ["beach"],              gradient: "from-teal-600/50 to-emerald-800/50",  emoji: "🌴" },
  { iata: "PUJ", nameEs: "Punta Cana",    nameEn: "Punta Cana",   countryFlag: "🇩🇴", categories: ["beach"],              gradient: "from-teal-500/50 to-cyan-800/50",     emoji: "🏝️" },
  { iata: "MIA", nameEs: "Miami",         nameEn: "Miami",        countryFlag: "🇺🇸", categories: ["beach", "city"],      gradient: "from-cyan-600/50 to-blue-800/50",     emoji: "🏖️" },
  { iata: "BCN", nameEs: "Barcelona",     nameEn: "Barcelona",    countryFlag: "🇪🇸", categories: ["beach", "culture"],   gradient: "from-yellow-600/50 to-red-800/50",    emoji: "🎨" },
  { iata: "PMI", nameEs: "Mallorca",      nameEn: "Mallorca",     countryFlag: "🇪🇸", categories: ["beach"],              gradient: "from-cyan-500/50 to-blue-700/50",     emoji: "🏄" },
  { iata: "HNL", nameEs: "Honolulú",      nameEn: "Honolulu",     countryFlag: "🇺🇸", categories: ["beach", "nature"],    gradient: "from-sky-500/50 to-teal-700/50",      emoji: "🌺" },
  // City
  { iata: "JFK", nameEs: "Nueva York",    nameEn: "New York",     countryFlag: "🇺🇸", categories: ["city"],               gradient: "from-indigo-700/50 to-gray-900/50",   emoji: "🗽" },
  { iata: "CDG", nameEs: "París",         nameEn: "Paris",        countryFlag: "🇫🇷", categories: ["city", "culture"],    gradient: "from-blue-600/50 to-purple-800/50",   emoji: "🗼" },
  { iata: "LHR", nameEs: "Londres",       nameEn: "London",       countryFlag: "🇬🇧", categories: ["city", "culture"],    gradient: "from-gray-600/50 to-blue-900/50",     emoji: "🎡" },
  { iata: "GRU", nameEs: "São Paulo",     nameEn: "São Paulo",    countryFlag: "🇧🇷", categories: ["city"],               gradient: "from-green-600/50 to-yellow-800/50",  emoji: "🌆" },
  { iata: "EZE", nameEs: "Buenos Aires",  nameEn: "Buenos Aires", countryFlag: "🇦🇷", categories: ["city", "culture"],    gradient: "from-blue-700/50 to-indigo-900/50",   emoji: "💃" },
  { iata: "MAD", nameEs: "Madrid",        nameEn: "Madrid",       countryFlag: "🇪🇸", categories: ["city", "culture"],    gradient: "from-red-700/50 to-yellow-800/50",    emoji: "🏰" },
  // Nature
  { iata: "SJO", nameEs: "San José",      nameEn: "San José",     countryFlag: "🇨🇷", categories: ["nature"],             gradient: "from-green-700/50 to-teal-900/50",    emoji: "🦋" },
  { iata: "BOG", nameEs: "Bogotá",        nameEn: "Bogotá",       countryFlag: "🇨🇴", categories: ["nature", "culture"],  gradient: "from-green-700/50 to-emerald-900/50", emoji: "🌿" },
  { iata: "LIM", nameEs: "Lima",          nameEn: "Lima",         countryFlag: "🇵🇪", categories: ["nature", "culture"],  gradient: "from-yellow-700/50 to-orange-900/50", emoji: "🏛️" },
  { iata: "SCL", nameEs: "Santiago",      nameEn: "Santiago",     countryFlag: "🇨🇱", categories: ["nature"],             gradient: "from-amber-700/50 to-red-900/50",     emoji: "⛰️" },
  // Culture
  { iata: "FCO", nameEs: "Roma",          nameEn: "Rome",         countryFlag: "🇮🇹", categories: ["culture"],            gradient: "from-amber-600/50 to-red-800/50",     emoji: "🏛️" },
  { iata: "ATH", nameEs: "Atenas",        nameEn: "Athens",       countryFlag: "🇬🇷", categories: ["culture"],            gradient: "from-blue-500/50 to-sky-800/50",      emoji: "⚱️" },
  { iata: "IST", nameEs: "Estambul",      nameEn: "Istanbul",     countryFlag: "🇹🇷", categories: ["culture"],            gradient: "from-red-600/50 to-orange-800/50",    emoji: "🕌" },
  { iata: "CAI", nameEs: "El Cairo",      nameEn: "Cairo",        countryFlag: "🇪🇬", categories: ["culture"],            gradient: "from-yellow-600/50 to-amber-800/50",  emoji: "🐪" },
];

// ── Haversine distance ─────────────────────────────────────────────────────────

function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function priceIndicator(distKm: number): "$" | "$$" | "$$$" {
  if (distKm < 2000) return "$";
  if (distKm < 6000) return "$$";
  return "$$$";
}

function estimatedPrice(distKm: number): number {
  if (distKm < 2000) return 300;
  if (distKm < 6000) return 800;
  return 1500;
}

function flightTimeLabel(distKm: number, locale: "es" | "en"): string {
  const hours = distKm / 800;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return locale === "es" ? `${m}min` : `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

// ── Filter chips config ────────────────────────────────────────────────────────

const FILTER_CHIPS: Array<{ key: DestinationCategory | "all"; labelEs: string; labelEn: string }> = [
  { key: "all",     labelEs: "Todos",       labelEn: "All"       },
  { key: "beach",   labelEs: "Playa",       labelEn: "Beach"     },
  { key: "city",    labelEs: "Ciudad",      labelEn: "City"      },
  { key: "nature",  labelEs: "Naturaleza",  labelEn: "Nature"    },
  { key: "culture", labelEs: "Cultura",     labelEn: "Culture"   },
];

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  defaultOrigin?: string;
  locale: "es" | "en";
  onCreateTrip?: (destIata: string, destName: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ExploreMap({ defaultOrigin = "EZE", locale, onCreateTrip }: Props) {
  const [origin, setOrigin] = useState(defaultOrigin.toUpperCase());
  const [budget, setBudget] = useState(3000);
  const [activeFilter, setActiveFilter] = useState<DestinationCategory | "all">("all");

  // Derive display name for the current origin
  const originAirport = AIRPORTS[origin];
  const originCity = originAirport?.city ?? origin;

  // Build scored destination list
  const scored = useMemo(() => {
    const originInfo = AIRPORTS[origin];
    if (!originInfo) return [];

    return EXPLORE_DESTINATIONS
      .filter((d) => d.iata !== origin)
      .map((d) => {
        const destInfo = AIRPORTS[d.iata];
        if (!destInfo) return null;
        const distKm = Math.round(haversineKm(originInfo.lat, originInfo.lng, destInfo.lat, destInfo.lng));
        const price = priceIndicator(distKm);
        // Value rank: higher = closer AND cheaper
        const valueScore = 10000 / (distKm + 1);
        return { dest: d, distKm, price, valueScore, destInfo };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.valueScore - a.valueScore);
  }, [origin]);

  // Filtered by category and budget
  const filtered = useMemo(() => {
    const base =
      activeFilter === "all"
        ? scored
        : scored.filter((s) => s.dest.categories.includes(activeFilter as DestinationCategory));
    return base
      .filter((s) => estimatedPrice(s.distKm) <= budget)
      .slice(0, 20);
  }, [scored, activeFilter, budget]);

  // Fetch weather for visible destinations
  const destCodes = useMemo(() => filtered.map((s) => s.dest.iata), [filtered]);
  const weatherMap = useWeather(destCodes, locale);

  const WMO_SIMPLE: Record<number, string> = {
    0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️",
    45: "🌫️", 48: "🌫️",
    51: "🌦️", 53: "🌦️", 55: "🌧️",
    61: "🌧️", 63: "🌧️", 65: "🌧️",
    71: "🌨️", 73: "🌨️", 75: "❄️",
    80: "🌦️", 81: "🌧️", 82: "⛈️",
    95: "⛈️", 96: "⛈️", 99: "⛈️",
  };

  function getWeatherIcon(code: number): string {
    return WMO_SIMPLE[code] ?? "🌡️";
  }

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500/20 shrink-0">
          <Map className="w-4.5 h-4.5 text-blue-400" style={{ width: 18, height: 18 }} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">
            {locale === "es" ? "¿A dónde querés ir?" : "Where do you want to go?"}
          </h3>
          <p className="text-xs text-gray-500">
            {locale === "es"
              ? `Desde ${originCity} · presupuesto max. US$${budget.toLocaleString()}`
              : `From ${originCity} · max budget US$${budget.toLocaleString()}`}
          </p>
        </div>
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap gap-3 items-end">
        {/* Origin picker */}
        <div className="flex-1 min-w-[120px] space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            {locale === "es" ? "Origen" : "Origin"}
          </label>
          <input
            type="text"
            value={origin}
            onChange={(e) => setOrigin(e.target.value.toUpperCase().slice(0, 3))}
            placeholder="EZE"
            maxLength={3}
            className="w-full rounded-xl bg-white/[0.06] border border-white/[0.08] px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/60 transition-colors uppercase"
          />
        </div>

        {/* Budget slider */}
        <div className="flex-1 min-w-[160px] space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            {locale === "es" ? `Presupuesto: US$${budget.toLocaleString()}` : `Budget: US$${budget.toLocaleString()}`}
          </label>
          <input
            type="range"
            min={500}
            max={10000}
            step={500}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="w-full accent-blue-500"
          />
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {FILTER_CHIPS.map((chip) => (
          <button
            key={chip.key}
            onClick={() => setActiveFilter(chip.key)}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
              activeFilter === chip.key
                ? "bg-blue-600 border-blue-500 text-white"
                : "border-white/10 bg-white/[0.04] text-gray-400 hover:text-white hover:border-white/20"
            }`}
          >
            <Filter className="w-2.5 h-2.5" />
            {locale === "es" ? chip.labelEs : chip.labelEn}
          </button>
        ))}
      </div>

      {/* Destination grid */}
      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">
          {locale === "es" ? "No hay destinos para ese filtro." : "No destinations for that filter."}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((item, i) => {
            const weather = weatherMap[item.dest.iata];
            const distLabel =
              item.distKm >= 1000
                ? `${(item.distKm / 1000).toFixed(1)}k km`
                : `${item.distKm} km`;
            const flightTime = flightTimeLabel(item.distKm, locale);
            const name = locale === "es" ? item.dest.nameEs : item.dest.nameEn;

            return (
              <motion.div
                key={item.dest.iata}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
                className="relative rounded-2xl border border-white/[0.06] overflow-hidden group"
              >
                {/* Gradient background */}
                <div
                  className={`h-20 bg-gradient-to-br ${item.dest.gradient} flex items-center justify-center transition-opacity duration-300 group-hover:opacity-80`}
                >
                  <span className="text-4xl drop-shadow-lg select-none" aria-hidden>
                    {item.dest.emoji}
                  </span>
                </div>

                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                {/* Bottom content */}
                <div className="absolute inset-0 flex flex-col justify-end p-3 pointer-events-none">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-sm font-bold text-white truncate">{name}</span>
                        <span className="text-base leading-none" aria-hidden>{item.dest.countryFlag}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap text-[11px] text-gray-300">
                        <span className="flex items-center gap-0.5">
                          <PlaneTakeoff className="w-2.5 h-2.5" />
                          {flightTime}
                        </span>
                        <span>{distLabel}</span>
                        {weather && (
                          <span className="flex items-center gap-0.5">
                            <CloudSun className="w-2.5 h-2.5" />
                            {getWeatherIcon(weather.weatherCode)} {weather.temperature}°C
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Price pill */}
                    <span className="shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black/40 border border-white/10 text-[11px] font-bold text-emerald-300">
                      <DollarSign className="w-2.5 h-2.5" />
                      {item.price}
                    </span>
                  </div>
                </div>

                {/* CTA button — pointer-events above the pointer-events-none overlay */}
                <div className="px-3 pb-3 pt-1">
                  <button
                    onClick={() => onCreateTrip?.(item.dest.iata, name)}
                    className="w-full rounded-xl bg-blue-600/90 hover:bg-blue-500 active:scale-[0.98] text-white text-xs font-semibold py-2 transition-all pointer-events-auto"
                  >
                    {locale === "es" ? "Crear viaje" : "Create trip"}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
