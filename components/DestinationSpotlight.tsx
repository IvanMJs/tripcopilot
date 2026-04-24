"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Check } from "lucide-react";
import { countryFlag } from "@/lib/countryFlags";
import { reverseGeocode, GeoPlace } from "@/lib/reverseGeocode";
import { fetchDBPlaces, addDetectedPlace, VisitedPlace } from "@/lib/visitedPlaces";
import { createClient } from "@/utils/supabase/client";
import { ExploreData } from "@/app/api/explore/tip/route";
import { CountryCelebration } from "@/components/CountryCelebration";

// ── WMO weather code → emoji ──────────────────────────────────────────────────

function wmoIcon(code: number): string {
  if (code === 0) return "☀️";
  if (code >= 1 && code <= 3) return "⛅";
  if (code >= 45 && code <= 48) return "🌫️";
  if (code >= 51 && code <= 67) return "🌧️";
  if (code >= 71 && code <= 77) return "❄️";
  if (code >= 80 && code <= 82) return "🌦️";
  if (code >= 95 && code <= 99) return "⛈️";
  return "🌤️";
}

// ── Explore cache ──────────────────────────────────────────────────────────────

function exploreCacheKey(citySlug: string): string {
  return `tc-explore-${citySlug}`;
}

function citySlug(city: string): string {
  return city.toLowerCase().replace(/[^a-z0-9]/g, "-");
}

interface ExploreCacheEntry {
  data: ExploreData;
  ts: number;
}

const EXPLORE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const CARD_STYLE = {
  background: "linear-gradient(135deg,#fdf8f0 0%,#f5ede0 50%,#faf4ec 100%)",
  border: "2px dashed #7c3aed",
  boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
} as const;

function readExploreCache(city: string): ExploreData | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const key = exploreCacheKey(citySlug(city));
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry: ExploreCacheEntry = JSON.parse(raw) as ExploreCacheEntry;
    if (Date.now() - entry.ts > EXPLORE_CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function writeExploreCache(city: string, data: ExploreData): void {
  if (typeof localStorage === "undefined") return;
  try {
    const entry: ExploreCacheEntry = { data, ts: Date.now() };
    localStorage.setItem(exploreCacheKey(citySlug(city)), JSON.stringify(entry));
  } catch {
    // ignore quota errors
  }
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface DestinationSpotlightProps {
  position: { lat: number; lng: number } | null;
  locale: "es" | "en";
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DestinationSpotlight({ position, locale, onClose }: DestinationSpotlightProps) {
  const [geoPlace, setGeoPlace] = useState<GeoPlace | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState(false);

  const [weatherIcon, setWeatherIcon] = useState<string | null>(null);
  const [weatherTemp, setWeatherTemp] = useState<number | null>(null);

  const [exploreData, setExploreData] = useState<ExploreData | null>(null);
  const [exploreLoading, setExploreLoading] = useState(false);

  const [visitedPlaces, setVisitedPlaces] = useState<VisitedPlace[]>([]);
  const [showVisitedBanner, setShowVisitedBanner] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [addingPlace, setAddingPlace] = useState(false);
  const [placeAdded, setPlaceAdded] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Fetch visited places from DB
  useEffect(() => {
    const supabase = createClient();
    fetchDBPlaces(supabase).then(setVisitedPlaces).catch(() => {});
  }, []);

  // Geocode on position
  useEffect(() => {
    if (!position) return;
    setGeoLoading(true);
    setGeoError(false);
    reverseGeocode(position.lat, position.lng)
      .then((place) => {
        if (place) {
          setGeoPlace(place);
        } else {
          setGeoError(true);
        }
      })
      .catch(() => setGeoError(true))
      .finally(() => setGeoLoading(false));
  }, [position]);

  // Fetch weather when position is available
  useEffect(() => {
    if (!position) return;
    const { lat, lng } = position;
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&timezone=auto`,
      { signal: AbortSignal.timeout(8000) },
    )
      .then(async (res) => {
        if (!res.ok) return;
        const json = await res.json() as {
          current?: { temperature_2m?: number; weather_code?: number };
        };
        const temp = json.current?.temperature_2m;
        const code = json.current?.weather_code;
        if (typeof temp === "number") setWeatherTemp(Math.round(temp));
        if (typeof code === "number") setWeatherIcon(wmoIcon(code));
      })
      .catch(() => {});
  }, [position]);

  // Fetch explore data when geoPlace is resolved
  useEffect(() => {
    if (!geoPlace) return;
    const cached = readExploreCache(geoPlace.city);
    if (cached) {
      setExploreData(cached);
      return;
    }
    setExploreLoading(true);
    fetch("/api/explore/tip", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ city: geoPlace.city, country: geoPlace.country, locale }),
    })
      .then(async (res) => {
        const json = await res.json() as { data?: ExploreData | null };
        const fetched = json.data ?? null;
        if (fetched) {
          setExploreData(fetched);
          writeExploreCache(geoPlace.city, fetched);
        }
      })
      .catch(() => {})
      .finally(() => setExploreLoading(false));
  }, [geoPlace, locale]);

  // Show visited banner if country not in visited places
  useEffect(() => {
    if (!geoPlace || visitedPlaces.length === 0) return;
    const alreadyVisited = visitedPlaces.some(
      (p) => p.country.toLowerCase() === geoPlace.country.toLowerCase(),
    );
    if (!alreadyVisited && !bannerDismissed) {
      setShowVisitedBanner(true);
    }
  }, [geoPlace, visitedPlaces, bannerDismissed]);

  async function handleConfirmVisited() {
    if (!geoPlace) return;
    setAddingPlace(true);
    const supabase = createClient();
    const today = new Date().toISOString().slice(0, 10);
    await addDetectedPlace(supabase, {
      city: geoPlace.city,
      country: geoPlace.country,
      dateVisited: today,
    });
    setAddingPlace(false);
    setPlaceAdded(true);
    setShowCelebration(true);
    setShowVisitedBanner(false);
  }

  function handleDismissBanner() {
    setBannerDismissed(true);
    setShowVisitedBanner(false);
  }

  // ── No position state ─────────────────────────────────────────────────────

  if (!position) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center px-6 bg-black/60 backdrop-blur-sm">
        <div className="relative w-full max-w-sm rounded-2xl p-6 text-center" style={CARD_STYLE}>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 flex items-center justify-center h-7 w-7 rounded-full bg-black/[0.08] hover:bg-black/[0.15] transition-colors"
          >
            <X className="h-3.5 w-3.5 text-gray-600" />
          </button>
          <p className="text-sm text-gray-500 mt-4">
            {locale === "es"
              ? "Activá la ubicación para ver tu destino"
              : "Enable location to see your destination"}
          </p>
        </div>
      </div>
    );
  }

  // ── Loading state ─────────────────────────────────────────────────────────

  if (geoLoading) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center px-6 bg-black/60 backdrop-blur-sm">
        <div className="relative w-full max-w-sm rounded-2xl p-6" style={CARD_STYLE}>
          <div className="space-y-3 animate-pulse">
            <div className="h-4 bg-[rgba(255,184,0,0.12)] rounded w-1/2 mx-auto" />
            <div className="h-10 bg-[rgba(255,184,0,0.12)] rounded w-1/3 mx-auto" />
            <div className="h-3 bg-gray-200/60 rounded w-2/3 mx-auto" />
            <div className="h-px bg-[rgba(255,184,0,0.12)] my-2" />
            <div className="h-3 bg-gray-200/40 rounded w-1/2 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  // ── Geocoding error ───────────────────────────────────────────────────────

  if (geoError || !geoPlace) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center px-6 bg-black/60 backdrop-blur-sm">
        <div className="relative w-full max-w-sm rounded-2xl p-6 text-center" style={CARD_STYLE}>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 flex items-center justify-center h-7 w-7 rounded-full bg-black/[0.08] hover:bg-black/[0.15] transition-colors"
          >
            <X className="h-3.5 w-3.5 text-gray-600" />
          </button>
          <p className="text-sm text-gray-500 mt-4">
            {locale === "es"
              ? "No pudimos detectar tu ciudad"
              : "Could not detect your city"}
          </p>
        </div>
      </div>
    );
  }

  // ── Main card ─────────────────────────────────────────────────────────────

  const flag = countryFlag(geoPlace.country);
  const celebrationTotal = visitedPlaces.length + 1;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-6 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <motion.div
          initial={{ opacity: 0, scale: 0.85, rotate: -4 }}
          animate={{ opacity: 1, scale: 1, rotate: -1.5 }}
          exit={{ opacity: 0, scale: 0.8, rotate: 3 }}
          transition={{ type: "spring", stiffness: 360, damping: 22 }}
          className="relative w-full rounded-2xl overflow-hidden"
          style={{
            ...CARD_STYLE,
            boxShadow: "0 8px 32px rgba(0,0,0,0.25), inset 0 0 0 1px rgba(124,58,237,0.12)",
            filter: "sepia(0.06)",
          }}
        >
          {/* Watermark */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
            aria-hidden
          >
            <span
              className="text-[72px] font-black text-[#FFB800]/10 tracking-widest"
              style={{ transform: "rotate(-20deg)", fontFamily: "serif" }}
            >
              DESTINO
            </span>
          </div>

          <div className="relative z-10 px-6 pt-5 pb-4">
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 flex items-center justify-center h-7 w-7 rounded-full bg-black/[0.08] hover:bg-black/[0.15] transition-colors"
            >
              <X className="h-3.5 w-3.5 text-gray-600" />
            </button>

            {/* Header */}
            <p className="text-[10px] font-black tracking-[0.25em] text-[#FFB800] uppercase text-center mb-4">
              {locale === "es" ? "✨ Destino Actual" : "✨ Current Destination"}
            </p>

            {/* Flag + city + country */}
            <div className="flex flex-col items-center gap-1 mb-4">
              <span className="text-5xl leading-none" role="img" aria-label={geoPlace.country}>
                {flag}
              </span>
              <p className="text-2xl font-black text-gray-800 text-center leading-tight mt-1">
                {geoPlace.city}
              </p>
              <p className="text-sm text-gray-500 text-center tracking-wide">
                {geoPlace.country}
              </p>
            </div>

            {/* Divider */}
            <div className="border-t border-dashed border-[rgba(255,184,0,0.35)] my-3" />

            {/* Weather */}
            {(weatherIcon !== null || weatherTemp !== null) && (
              <p className="text-center text-sm text-gray-600 mb-3">
                {weatherIcon !== null && (
                  <span className="mr-1">{weatherIcon}</span>
                )}
                {weatherTemp !== null && (
                  <span>{weatherTemp}°C</span>
                )}
              </p>
            )}

            {/* Explore info tiles */}
            <div className="mb-4">
              {exploreLoading ? (
                <div className="grid grid-cols-2 gap-2 animate-pulse">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-14 bg-gray-200/40 rounded-xl" />
                  ))}
                  <div className="col-span-2 h-10 bg-gray-200/40 rounded-xl" />
                </div>
              ) : exploreData ? (
                <div className="grid grid-cols-2 gap-2">
                  {/* Currency */}
                  <div className="rounded-xl bg-white/50 border border-[rgba(255,184,0,0.35)] px-3 py-2">
                    <p className="text-[9px] font-semibold uppercase tracking-widest text-[#FFB800] mb-0.5">
                      💰 {locale === "es" ? "Moneda" : "Currency"}
                    </p>
                    <p className="text-sm font-medium text-gray-700 leading-snug">{exploreData.currency}</p>
                  </div>
                  {/* Key phrase */}
                  <div className="rounded-xl bg-white/50 border border-[rgba(255,184,0,0.35)] px-3 py-2">
                    <p className="text-[9px] font-semibold uppercase tracking-widest text-[#FFB800] mb-0.5">
                      🗣️ {locale === "es" ? "Frase clave" : "Key phrase"}
                    </p>
                    <p className="text-sm font-medium text-gray-700 leading-snug">{exploreData.phrase}</p>
                  </div>
                  {/* Must try */}
                  <div className="rounded-xl bg-white/50 border border-[rgba(255,184,0,0.35)] px-3 py-2">
                    <p className="text-[9px] font-semibold uppercase tracking-widest text-[#FFB800] mb-0.5">
                      🍽️ {locale === "es" ? "Imperdible" : "Must try"}
                    </p>
                    <p className="text-sm font-medium text-gray-700 leading-snug">{exploreData.mustTry}</p>
                  </div>
                  {/* Watch out */}
                  <div className="rounded-xl bg-white/50 border border-[rgba(255,184,0,0.35)] px-3 py-2">
                    <p className="text-[9px] font-semibold uppercase tracking-widest text-[#FFB800] mb-0.5">
                      ⚠️ {locale === "es" ? "Ojo con" : "Watch out"}
                    </p>
                    <p className="text-sm font-medium text-gray-700 leading-snug">{exploreData.watchOut}</p>
                  </div>
                  {/* Vibe — full width */}
                  <div className="col-span-2 rounded-xl bg-[rgba(255,184,0,0.12)] border border-[rgba(255,184,0,0.25)] px-3 py-2 text-center">
                    <p className="text-[9px] font-semibold uppercase tracking-widest text-[#FFB800] mb-0.5">✨ Vibe</p>
                    <p className="text-sm font-medium text-gray-700 italic leading-snug">&ldquo;{exploreData.vibe}&rdquo;</p>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Visited banner */}
            {showVisitedBanner && !placeAdded && (
              <div className="mt-1 rounded-xl border border-[rgba(255,184,0,0.25)] bg-[rgba(255,184,0,0.12)] px-3 py-2.5">
                <p className="text-xs text-[#FFB800] text-center mb-2">
                  {locale === "es"
                    ? `Parece que estás en ${geoPlace.country} ${flag} — ¿Marcarlo como visitado?`
                    : `Looks like you're in ${geoPlace.country} ${flag} — Mark it as visited?`}
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => void handleConfirmVisited()}
                    disabled={addingPlace}
                    className="flex items-center gap-1 rounded-lg bg-[#FFB800] hover:bg-[#FFC933] disabled:opacity-60 text-[#07070d] text-xs font-semibold px-3 py-1.5 transition-colors"
                  >
                    <Check className="h-3 w-3" />
                    {locale === "es" ? "Confirmar" : "Confirm"}
                  </button>
                  <button
                    onClick={handleDismissBanner}
                    className="rounded-lg border border-gray-300 bg-white/70 hover:bg-white text-gray-500 text-xs px-3 py-1.5 transition-colors"
                  >
                    {locale === "es" ? "Descartar" : "Dismiss"}
                  </button>
                </div>
              </div>
            )}

            {placeAdded && (
              <p className="text-xs text-[#FFB800] text-center font-semibold mt-1">
                {locale === "es" ? `✓ ${geoPlace.country} marcado como visitado` : `✓ ${geoPlace.country} marked as visited`}
              </p>
            )}
          </div>
        </motion.div>
      </div>
      {showCelebration && geoPlace && (
        <CountryCelebration
          country={geoPlace.country}
          flag={countryFlag(geoPlace.country)}
          totalCountries={celebrationTotal}
          locale={locale}
          onDone={() => setShowCelebration(false)}
        />
      )}
    </div>
  );
}
