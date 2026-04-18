"use client";

import { useState } from "react";
import { Search, Compass, MapPin } from "lucide-react";
import { AIRPORTS } from "@/lib/airports";
import { TripTab } from "@/lib/types";
import { ExploreMap } from "@/components/ExploreMap";
import { SmartTripSuggestions } from "@/components/SmartTripSuggestions";
import { DreamTripPlanner } from "@/components/DreamTripPlanner";
import { TripSocialView } from "@/components/TripSocialView";

// Gradient + emoji visuals keyed by IATA code
const DESTINATION_VISUALS: Record<string, { gradient: string; emoji: string }> = {
  MIA: { gradient: "from-cyan-600/40 to-blue-800/40",     emoji: "🏖️" },
  CUN: { gradient: "from-teal-600/40 to-emerald-800/40",  emoji: "🌴" },
  SCL: { gradient: "from-amber-700/40 to-red-900/40",     emoji: "⛰️" },
  BOG: { gradient: "from-green-700/40 to-emerald-900/40", emoji: "🌿" },
  LIM: { gradient: "from-yellow-700/40 to-orange-900/40", emoji: "🏛️" },
  GRU: { gradient: "from-green-600/40 to-yellow-800/40",  emoji: "🌆" },
  JFK: { gradient: "from-indigo-700/40 to-gray-900/40",   emoji: "🗽" },
  MAD: { gradient: "from-red-700/40 to-yellow-800/40",    emoji: "🏰" },
  FCO: { gradient: "from-amber-600/40 to-red-800/40",     emoji: "🏛️" },
  LHR: { gradient: "from-gray-600/40 to-blue-900/40",     emoji: "🎡" },
  CDG: { gradient: "from-blue-600/40 to-purple-800/40",   emoji: "🗼" },
  BRC: { gradient: "from-sky-600/40 to-indigo-800/40",    emoji: "⛷️" },
  USH: { gradient: "from-cyan-800/40 to-blue-900/40",     emoji: "🧊" },
  MVD: { gradient: "from-blue-600/40 to-indigo-800/40",   emoji: "🌊" },
  PUJ: { gradient: "from-teal-500/40 to-cyan-800/40",     emoji: "🏝️" },
  CTG: { gradient: "from-orange-600/40 to-red-800/40",    emoji: "🏰" },
  MDZ: { gradient: "from-violet-700/40 to-red-900/40",    emoji: "🍷" },
  EZE: { gradient: "from-blue-700/40 to-indigo-900/40",   emoji: "💃" },
  PMI: { gradient: "from-cyan-500/40 to-blue-700/40",     emoji: "🏄" },
  BCN: { gradient: "from-yellow-600/40 to-red-800/40",    emoji: "🎨" },
  NAT: { gradient: "from-amber-500/40 to-orange-700/40",  emoji: "🌊" },
  NRT: { gradient: "from-pink-600/40 to-red-900/40",      emoji: "⛩️" },
  BKK: { gradient: "from-yellow-500/40 to-orange-800/40", emoji: "🛕" },
  SYD: { gradient: "from-sky-500/40 to-blue-800/40",      emoji: "🦘" },
  DXB: { gradient: "from-amber-400/40 to-yellow-900/40",  emoji: "🏙️" },
};

const DEFAULT_VISUAL = { gradient: "from-violet-700/40 to-gray-900/40", emoji: "✈️" };

function getVisual(iata: string): { gradient: string; emoji: string } {
  return DESTINATION_VISUALS[iata] ?? DEFAULT_VISUAL;
}

// Popular destinations
const POPULAR_DESTINATIONS: {
  iata: string;
  city: string;
  country: string;
}[] = [
  { iata: "MIA", city: "Miami",     country: "Estados Unidos" },
  { iata: "JFK", city: "Nueva York", country: "Estados Unidos" },
  { iata: "CUN", city: "Cancún",    country: "México"         },
  { iata: "LHR", city: "Londres",   country: "Reino Unido"    },
  { iata: "CDG", city: "París",     country: "Francia"        },
  { iata: "NRT", city: "Tokio",     country: "Japón"          },
  { iata: "DXB", city: "Dubái",     country: "Emiratos Árabes" },
  { iata: "BKK", city: "Bangkok",   country: "Tailandia"      },
  { iata: "SYD", city: "Sídney",    country: "Australia"      },
  { iata: "SCL", city: "Santiago",  country: "Chile"          },
  { iata: "GRU", city: "São Paulo", country: "Brasil"         },
  { iata: "LIM", city: "Lima",      country: "Perú"           },
];

interface SeasonalIdea {
  iata: string;
  city: string;
  tag: string;
  description: string;
}

interface SeasonConfig {
  labelEs: string;
  labelEn: string;
  ideas: SeasonalIdea[];
}

const SEASONS: Record<string, SeasonConfig> = {
  summer: {
    labelEs: "Verano",
    labelEn: "Summer",
    ideas: [
      {
        iata: "PMI",
        city: "Mallorca",
        tag: "Verano / Summer",
        description: "Playas cristalinas, calas secretas y vida mediterránea.",
      },
      {
        iata: "CUN",
        city: "Cancún",
        tag: "Verano / Summer",
        description: "Mar Caribe turquesa, cenotes y resorts de primer nivel.",
      },
      {
        iata: "DXB",
        city: "Dubái",
        tag: "Verano / Summer",
        description: "Rascacielos icónicos, desierto y lujo asiático en 24hs de vuelo.",
      },
      {
        iata: "BKK",
        city: "Bangkok",
        tag: "Verano / Summer",
        description: "Templos dorados, street food legendaria y playas de ensueño.",
      },
    ],
  },
  easter: {
    labelEs: "Semana Santa",
    labelEn: "Easter",
    ideas: [
      {
        iata: "MDZ",
        city: "Mendoza",
        tag: "Semana Santa",
        description: "Bodegas, montañas y los mejores vinos del mundo.",
      },
      {
        iata: "EZE",
        city: "Buenos Aires",
        tag: "Semana Santa",
        description: "Teatro, tango y gastronomía porteña sin igual.",
      },
      {
        iata: "MVD",
        city: "Montevideo",
        tag: "Semana Santa",
        description: "Playa, carnaval fuera de temporada y tranquilidad.",
      },
      {
        iata: "CTG",
        city: "Cartagena",
        tag: "Semana Santa",
        description: "Ciudad amurallada, playas caribeñas y calor tropical.",
      },
    ],
  },
  fall: {
    labelEs: "Otoño",
    labelEn: "Fall",
    ideas: [
      {
        iata: "SCL",
        city: "Santiago",
        tag: "Otoño / Fall",
        description: "Valle del vino, Andes nevados y gastronomía chilena.",
      },
      {
        iata: "GRU",
        city: "São Paulo",
        tag: "Otoño / Fall",
        description: "Metrópolis vibrante, arte, gastronomía y cultura.",
      },
      {
        iata: "LIM",
        city: "Lima",
        tag: "Otoño / Fall",
        description: "Capital gastronómica de América, historia y mar.",
      },
      {
        iata: "USH",
        city: "Ushuaia",
        tag: "Otoño / Fall",
        description: "Fin del mundo, glaciares y auroras australes.",
      },
    ],
  },
  winter: {
    labelEs: "Invierno",
    labelEn: "Winter",
    ideas: [
      {
        iata: "BRC",
        city: "Bariloche",
        tag: "Invierno / Winter",
        description: "Esquí de clase mundial, chocolate y lagos patagónicos.",
      },
      {
        iata: "NRT",
        city: "Tokio",
        tag: "Invierno / Winter",
        description: "Nieve en el Monte Fuji, neon de Shibuya y gastronomía única.",
      },
      {
        iata: "SYD",
        city: "Sídney",
        tag: "Invierno / Winter",
        description: "Verano austral, Opera House y playas de ensueño.",
      },
      {
        iata: "LHR",
        city: "Londres",
        tag: "Invierno / Winter",
        description: "Navidades en el West End, mercados y museos de clase mundial.",
      },
    ],
  },
  spring: {
    labelEs: "Primavera",
    labelEn: "Spring",
    ideas: [
      {
        iata: "BCN",
        city: "Barcelona",
        tag: "Primavera / Spring",
        description: "Gaudí, playas, tapas y el mejor clima del año.",
      },
      {
        iata: "NAT",
        city: "Natal",
        tag: "Primavera / Spring",
        description: "Dunas, lagoas e praias paradísíacas do Nordeste.",
      },
      {
        iata: "BOG",
        city: "Bogotá",
        tag: "Primavera / Spring",
        description: "Ciudad eterna de primavera, café y arte urbano.",
      },
      {
        iata: "MVD",
        city: "Montevideo",
        tag: "Primavera / Spring",
        description: "Rambla, playa y la ciudad más tranquila del Río de la Plata.",
      },
    ],
  },
};

/** Returns Easter Sunday for a given year using the Anonymous Gregorian algorithm. */
function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-indexed
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

/** Returns the seasonal config based on current date (for Argentine travelers). */
function getSeasonalContent(): SeasonConfig {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed
  const year = now.getFullYear();

  // Check if we're within 10 days before or after Easter (Mar–Apr window)
  if (month === 2 || month === 3) {
    const easter = getEasterDate(year);
    const diffMs = easter.getTime() - now.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays >= -3 && diffDays <= 10) {
      return SEASONS.easter;
    }
    return SEASONS.fall;
  }

  // Dec, Jan, Feb — southern hemisphere summer
  if (month === 11 || month === 0 || month === 1) {
    return SEASONS.summer;
  }

  // Apr, May — southern hemisphere autumn
  if (month === 4) {
    return SEASONS.fall;
  }

  // Jun, Jul, Aug — winter
  if (month >= 5 && month <= 7) {
    return SEASONS.winter;
  }

  // Sep, Oct, Nov — spring
  return SEASONS.spring;
}

const CABIN_OPTIONS = [
  { value: "e", label: "Económica" },
  { value: "p", label: "Premium Economy" },
  { value: "b", label: "Business" },
  { value: "f", label: "Primera clase" },
];

// Map cabin value to Google Flights cabin code
const CABIN_MAP: Record<string, string> = {
  e: "e",
  p: "p",
  b: "b",
  f: "f",
};

interface Props {
  trips: TripTab[];
  locale: "es" | "en";
  onCreateTrip?: (destIata: string, destName: string) => void;
  userPlan?: string | null;
  onUpgrade?: () => void;
  userId?: string | null;
}

export function DiscoverView({ trips, locale, onCreateTrip, userPlan, onUpgrade, userId }: Props) {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [cabin, setCabin] = useState("e");

  const seasonal = getSeasonalContent();

  // Derive user's most recent departure airport from their trips
  const recentOrigin: string = (() => {
    const allFlights = trips.flatMap((t) => t.flights);
    if (allFlights.length === 0) return "EZE";
    const sorted = [...allFlights].sort((a, b) =>
      b.isoDate.localeCompare(a.isoDate),
    );
    return sorted[0].originCode;
  })();

  const recentCity = AIRPORTS[recentOrigin]?.city ?? recentOrigin;

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!origin || !destination || !date) return;
    const cabinCode = CABIN_MAP[cabin] ?? "e";
    const url = `https://www.google.com/flights?hl=es#flt=${origin}.${destination}.${date};c:${cabinCode};e:1`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function openDestination(iata: string) {
    if (!date) {
      // Prefill destination and scroll to form
      setDestination(iata);
      document.getElementById("discover-form")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    const cabinCode = CABIN_MAP[cabin] ?? "e";
    const src = origin || recentOrigin;
    const url = `https://www.google.com/flights?hl=es#flt=${src}.${iata}.${date};c:${cabinCode};e:1`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // All IATA codes for datalist
  const allIataCodes = Object.keys(AIRPORTS);

  return (
    <div className="space-y-8 pb-6">

      {/* TripSocial — traveler network */}
      <TripSocialView locale={locale} userId={userId ?? null} />

      {/* Dream Trip Planner — AI travel planning */}
      <DreamTripPlanner
        trips={trips}
        locale={locale}
        onCreateTrip={onCreateTrip}
      />

      {/* "Para vos" / "For you" section — AI-powered suggestions */}
      {trips.length > 0 && (
        <SmartTripSuggestions
          trips={trips}
          locale={locale}
          userPlan={userPlan ?? undefined}
          onUpgrade={onUpgrade}
          onCreateTrip={onCreateTrip}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-violet-500/20">
          <Compass className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">
            {locale === "es" ? "Explorar vuelos" : "Explore flights"}
          </h2>
          <p className="text-xs text-gray-500">
            {locale === "es"
              ? "Buscá destinos y abrí en Google Flights"
              : "Search destinations and open in Google Flights"}
          </p>
        </div>
      </div>

      {/* Explore destinations section */}
      <ExploreMap
        defaultOrigin={recentOrigin}
        locale={locale}
        onCreateTrip={onCreateTrip}
      />

      {/* Search form */}
      <form
        id="discover-form"
        onSubmit={handleSearch}
        className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-4"
      >
        {/* Datalist for airport autocomplete */}
        <datalist id="airports-list">
          {allIataCodes.map((code) => (
            <option key={code} value={code}>
              {AIRPORTS[code].city} — {AIRPORTS[code].name}
            </option>
          ))}
        </datalist>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Origin */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {locale === "es" ? "Origen" : "Origin"}
            </label>
            <input
              type="text"
              list="airports-list"
              value={origin}
              onChange={(e) => setOrigin(e.target.value.toUpperCase())}
              placeholder={`${recentOrigin} (${recentCity})`}
              maxLength={3}
              className="w-full rounded-xl bg-white/[0.06] border border-white/[0.08] px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-violet-500/60 focus:border-violet-500/60 transition-colors"
            />
          </div>

          {/* Destination */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {locale === "es" ? "Destino" : "Destination"}
            </label>
            <input
              type="text"
              list="airports-list"
              value={destination}
              onChange={(e) => setDestination(e.target.value.toUpperCase())}
              placeholder="MIA, JFK, BCN..."
              maxLength={3}
              className="w-full rounded-xl bg-white/[0.06] border border-white/[0.08] px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-violet-500/60 focus:border-violet-500/60 transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Date */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {locale === "es" ? "Fecha de salida" : "Departure date"}
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className="w-full rounded-xl bg-white/[0.06] border border-white/[0.08] px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500/60 focus:border-violet-500/60 transition-colors [color-scheme:dark]"
            />
          </div>

          {/* Cabin class */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {locale === "es" ? "Cabina" : "Cabin class"}
            </label>
            <select
              value={cabin}
              onChange={(e) => setCabin(e.target.value)}
              className="w-full rounded-xl bg-white/[0.06] border border-white/[0.08] px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500/60 focus:border-violet-500/60 transition-colors"
            >
              {CABIN_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-gray-900">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={!origin || !destination || !date}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-3 text-sm transition-colors"
        >
          <Search className="w-4 h-4" />
          {locale === "es" ? "Buscar vuelos" : "Search flights"}
        </button>
      </form>

      {/* Popular destinations */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-violet-400" />
          <h3 className="text-sm font-bold text-white">
            {locale === "es"
              ? `Destinos populares desde ${recentCity}`
              : `Popular destinations from ${recentCity}`}
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {POPULAR_DESTINATIONS.map((dest) => {
            const visual = getVisual(dest.iata);
            return (
              <button
                key={dest.iata}
                onClick={() => openDestination(dest.iata)}
                className="group relative rounded-2xl overflow-hidden aspect-[4/3] text-left focus:outline-none focus:ring-2 focus:ring-violet-500/60 border border-white/[0.06] transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${visual.gradient} transition-opacity duration-300 group-hover:opacity-80`}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-5xl drop-shadow-lg select-none" aria-hidden>
                    {visual.emoji}
                  </span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-sm font-bold text-white leading-tight">{dest.city}</p>
                  <p className="text-xs text-gray-300 leading-tight">
                    {dest.iata} · {dest.country}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Seasonal inspiration */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-base">✈</span>
          <h3 className="text-sm font-bold text-white">
            {locale === "es" ? "¿A dónde vas?" : "Where are you going?"}
          </h3>
          <span className="text-xs font-semibold text-amber-500 border border-amber-700/50 rounded px-1.5 py-0.5 ml-1">
            {locale === "es" ? seasonal.labelEs : seasonal.labelEn}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {seasonal.ideas.map((idea) => {
            const visual = getVisual(idea.iata);
            return (
              <button
                key={idea.iata}
                onClick={() => openDestination(idea.iata)}
                className="group relative rounded-2xl overflow-hidden text-left focus:outline-none focus:ring-2 focus:ring-violet-500/60 border border-white/[0.06] transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
              >
                <div
                  className={`h-32 bg-gradient-to-br ${visual.gradient} flex items-center justify-center transition-opacity duration-300 group-hover:opacity-80`}
                >
                  <span className="text-5xl drop-shadow-lg select-none" aria-hidden>
                    {visual.emoji}
                  </span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className="text-sm font-bold text-white">{idea.city}</p>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-amber-400 border border-amber-700/40 rounded px-1 py-0.5">
                      {idea.tag}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 leading-snug">{idea.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
