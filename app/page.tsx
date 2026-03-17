"use client";

import { useState, useEffect, useRef } from "react";
import { Toaster } from "react-hot-toast";
import { RefreshCw, Plane, Pencil, X, Plus, Bell, HelpCircle, MapPin, Search, Map } from "lucide-react";
import { useAirportStatus } from "@/hooks/useAirportStatus";
import { AirportCard } from "@/components/AirportCard";
import { AirportSearch } from "@/components/AirportSearch";
import { GlobalStatusBar } from "@/components/GlobalStatusBar";
import { RefreshCountdown } from "@/components/RefreshCountdown";
import { MyFlightsPanel } from "@/components/MyFlightsPanel";
import { FlightSearch } from "@/components/FlightSearch";
import { TripPanel } from "@/components/TripPanel";
import { HelpPanel } from "@/components/HelpPanel";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DEFAULT_AIRPORTS } from "@/lib/airports";
import { DelayStatus, TripFlight, TripTab } from "@/lib/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { Locale } from "@/lib/i18n";
import { useWeather } from "@/hooks/useWeather";
import { useMetar } from "@/hooks/useMetar";

const SEVERITY_ORDER: Record<DelayStatus, number> = {
  closure:        0,
  ground_stop:    1,
  ground_delay:   2,
  delay_severe:   3,
  delay_moderate: 4,
  delay_minor:    5,
  ok:             6,
  unknown:        7,
};

const REFRESH_OPTIONS = [5, 10, 15, 30];

const STORAGE_KEY       = "airport-monitor-watched";
const TRIPS_STORAGE_KEY = "airport-monitor-trips";

// Always include these airports for weather regardless of watchedAirports
const FLIGHT_AIRPORTS = ["EZE", "MIA", "GCM", "JFK"];

function loadWatched(): string[] {
  if (typeof window === "undefined") return DEFAULT_AIRPORTS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_AIRPORTS;
  } catch {
    return DEFAULT_AIRPORTS;
  }
}

function loadTrips(): TripTab[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(TRIPS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export default function HomePage() {
  const { t, locale, setLocale } = useLanguage();

  const [activeTab, setActiveTab] = useState<string>("flights");
  const [refreshInterval, setRefreshInterval] = useState(5);
  const [watchedAirports, setWatchedAirports] = useState<string[]>(DEFAULT_AIRPORTS);
  const [userTrips, setUserTrips] = useState<TripTab[]>([]);
  const [mounted, setMounted] = useState(false);

  // Tab rename state
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    setWatchedAirports(loadWatched());
    setUserTrips(loadTrips());
    setMounted(true);
  }, []);

  // Persist watched airports
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(watchedAirports));
    }
  }, [watchedAirports, mounted]);

  // Check-in push notifications
  useEffect(() => {
    if (!mounted) return;
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const MY_FLIGHT_DATES = [
      { code: "AA 900",  isoDate: "2026-03-29", route: "EZE→MIA",  time: "20:30" },
      { code: "AA 956",  isoDate: "2026-03-31", route: "MIA→GCM",  time: "12:55" },
      { code: "B6 766",  isoDate: "2026-04-05", route: "GCM→JFK",  time: "15:40" },
      { code: "DL 1514", isoDate: "2026-04-11", route: "JFK→MIA",  time: "11:10" },
      { code: "AA 931",  isoDate: "2026-04-11", route: "MIA→EZE",  time: "21:15" },
    ];

    const allFlights = [
      ...MY_FLIGHT_DATES,
      ...userTrips.flatMap(t => t.flights.map(f => ({
        code: f.flightCode,
        isoDate: f.isoDate,
        route: `${f.originCode}→${f.destinationCode}`,
        time: f.departureTime ?? "",
      }))),
    ];

    for (const f of allFlights) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const flightDay = new Date(f.isoDate + "T00:00:00");
      const diff = Math.ceil((flightDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diff !== 1) continue;

      const key = `checkin-notified-${f.code}-${f.isoDate}`;
      if (localStorage.getItem(key)) continue;

      new Notification(
        locale === "en" ? `✈ Check-in open · ${f.code}` : `✈ Check-in disponible · ${f.code}`,
        {
          body: locale === "en"
            ? `Your flight ${f.route} departs tomorrow at ${f.time}`
            : `Tu vuelo ${f.route} sale mañana a las ${f.time}`,
          tag: key,
        }
      );
      localStorage.setItem(key, "1");
    }
  }, [mounted, locale, userTrips]);

  // Persist user trips
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(userTrips));
    }
  }, [userTrips, mounted]);

  const {
    statusMap,
    loading,
    error,
    lastUpdated,
    secondsUntilRefresh,
    totalSeconds,
    refresh,
    changedAirports,
    isStale,
    notificationsEnabled,
    requestNotifications,
    disableNotifications,
  } = useAirportStatus(refreshInterval, locale);

  // Aggregate airports for weather: watched + hardcoded flight airports + all user trip airports
  const tripAirports = userTrips.flatMap((t) =>
    t.flights.flatMap((f) => [f.originCode, f.destinationCode])
  );
  const allAirportsForWeather = Array.from(
    new Set([...watchedAirports, ...FLIGHT_AIRPORTS, ...tripAirports])
  );
  const weatherMap = useWeather(allAirportsForWeather, locale);
  const metarMap   = useMetar(watchedAirports);

  // ── Watched airports ──────────────────────────────────────────────────────

  function addAirport(iata: string) {
    setWatchedAirports((prev) => [...prev, iata]);
  }

  function removeAirport(iata: string) {
    setWatchedAirports((prev) => prev.filter((a) => a !== iata));
  }

  const sortedAirports = [...watchedAirports].sort((a, b) => {
    const sa = statusMap[a]?.status ?? "ok";
    const sb = statusMap[b]?.status ?? "ok";
    return (SEVERITY_ORDER[sa] ?? 7) - (SEVERITY_ORDER[sb] ?? 7);
  });

  // ── Trip management ───────────────────────────────────────────────────────

  function createTrip() {
    const id = `trip_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
    const name = locale === "en"
      ? `Trip ${userTrips.length + 1}`
      : `Viaje ${userTrips.length + 1}`;
    setUserTrips((prev) => [...prev, { id, name, flights: [] }]);
    setActiveTab(id);
  }

  function renameTrip(id: string, newName: string) {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setUserTrips((prev) =>
      prev.map((t) => (t.id === id ? { ...t, name: trimmed } : t))
    );
  }

  function deleteTrip(id: string) {
    const trip = userTrips.find((t) => t.id === id);
    if (!trip) return;
    if (
      trip.flights.length > 0 &&
      !window.confirm(
        locale === "en"
          ? `Delete trip "${trip.name}" and its ${trip.flights.length} flight(s)?`
          : `¿Eliminar el viaje "${trip.name}" con ${trip.flights.length} vuelo(s)?`
      )
    ) {
      return;
    }
    setUserTrips((prev) => prev.filter((t) => t.id !== id));
    if (activeTab === id) setActiveTab("flights");
  }

  function addFlightToTrip(tripId: string, flight: TripFlight) {
    setUserTrips((prev) =>
      prev.map((t) =>
        t.id === tripId ? { ...t, flights: [...t.flights, flight] } : t
      )
    );
  }

  function removeFlightFromTrip(tripId: string, flightId: string) {
    setUserTrips((prev) =>
      prev.map((t) =>
        t.id === tripId
          ? { ...t, flights: t.flights.filter((f) => f.id !== flightId) }
          : t
      )
    );
  }

  // ── Tab rename helpers ────────────────────────────────────────────────────

  function startRename(trip: TripTab) {
    setEditingTabId(trip.id);
    setEditingName(trip.name);
    setTimeout(() => editInputRef.current?.focus(), 0);
  }

  function saveRename() {
    if (editingTabId) {
      renameTrip(editingTabId, editingName);
      setEditingTabId(null);
    }
  }

  // ── Tab bar styles ────────────────────────────────────────────────────────

  const tabBase =
    "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap";
  const tabActive   = "border-blue-500 text-blue-400";
  const tabInactive = "border-transparent text-gray-400 hover:text-gray-200";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1f2937",
            color: "#f3f4f6",
            border: "1px solid #374151",
          },
        }}
      />

      <div className="min-h-screen bg-gray-950 px-4 py-4 md:py-6 pb-nav md:pb-6">
        <div className="mx-auto max-w-6xl space-y-4 md:space-y-6">

          {/* ── Header ── */}
          <div className="flex items-center justify-between gap-3">

            {/* Title — large on desktop, compact on mobile */}
            <div className="min-w-0">
              <h1 className="flex items-center gap-2 md:gap-3 text-xl md:text-3xl font-black tracking-tight text-white">
                <Plane className="h-5 w-5 md:h-8 md:w-8 text-blue-400 shrink-0" />
                <span className="truncate">{t.appTitle}</span>
              </h1>
              <p className="hidden md:block mt-1 text-sm text-gray-400 font-medium">{t.appSubtitle}</p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1.5 md:gap-2 shrink-0">

              {/* Language toggle */}
              <div className="flex rounded-lg border border-gray-700 overflow-hidden text-xs font-semibold">
                {(["es", "en"] as Locale[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLocale(l)}
                    className={`px-2.5 py-1.5 md:px-3 transition-colors ${
                      locale === l
                        ? "bg-blue-600 text-white"
                        : "bg-gray-900 text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Notification bell */}
              {mounted && typeof window !== "undefined" && "Notification" in window && (
                <button
                  onClick={notificationsEnabled ? disableNotifications : requestNotifications}
                  title={
                    notificationsEnabled
                      ? (locale === "en" ? "Notifications ON — click to disable" : "Notificaciones activas — click para desactivar")
                      : (locale === "en" ? "Enable notifications" : "Activar notificaciones")
                  }
                  className={`flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs transition-colors ${
                    notificationsEnabled
                      ? "border-blue-700/60 bg-blue-900/20 text-blue-400"
                      : "border-gray-700 bg-gray-900 text-gray-500 hover:text-gray-300"
                  }`}
                >
                  <Bell className={`h-3.5 w-3.5 ${notificationsEnabled ? "text-blue-400" : ""}`} />
                  {notificationsEnabled && <span className="text-[10px] font-semibold hidden sm:inline">ON</span>}
                </button>
              )}

              {/* Refresh interval — hidden on mobile */}
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="hidden sm:block rounded-md border border-gray-700 bg-gray-900 px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {REFRESH_OPTIONS.map((min) => (
                  <option key={min} value={min}>{min}m</option>
                ))}
              </select>

              {/* Refresh button */}
              <button
                onClick={refresh}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-md border border-gray-700 bg-gray-900 px-2.5 py-1.5 text-xs text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">{loading ? t.updating : t.update}</span>
              </button>

              {/* Help — desktop only */}
              <button
                onClick={() => setActiveTab(activeTab === "help" ? "flights" : "help")}
                title={locale === "en" ? "Help & documentation" : "Ayuda y documentación"}
                className={`hidden md:flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                  activeTab === "help"
                    ? "border-blue-700/60 bg-blue-900/20 text-blue-400"
                    : "border-gray-700 bg-gray-900 text-gray-500 hover:text-gray-300"
                }`}
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* RefreshCountdown — desktop only */}
          <div className="hidden sm:block -mt-2">
            <RefreshCountdown
              secondsUntilRefresh={secondsUntilRefresh}
              totalSeconds={totalSeconds}
              lastUpdated={lastUpdated}
              isStale={isStale}
            />
          </div>

          {/* Global Status Bar */}
          <GlobalStatusBar statusMap={statusMap} watchedAirports={watchedAirports} />

          {/* Error banner */}
          {error && (
            <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-400">
              ⚠️ {t.errorFAA} {error}
            </div>
          )}

          {/* ── Tab bar — desktop only; mobile uses bottom nav ── */}
          <div className="hidden md:block border-b border-gray-800">
            <div className="flex gap-1 overflow-x-auto overflow-y-hidden">

              {/* Static tabs — order: Mi viaje | Aeropuertos | Vuelos */}
              {([
                { id: "flights",  label: t.tabFlights  },
                { id: "airports", label: t.tabAirports },
                { id: "search",   label: t.tabSearch   },
              ] as const).map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`${tabBase} ${activeTab === id ? tabActive : tabInactive}`}
                >
                  {label}
                </button>
              ))}

              {/* Dynamic user trip tabs */}
              {userTrips.map((trip) => {
                const isActive  = activeTab === trip.id;
                const isEditing = editingTabId === trip.id;

                return (
                  <div key={trip.id} className="flex items-center -mb-px">
                    {/* Tab button / inline rename input */}
                    {isEditing ? (
                      <div className={`${tabBase} ${tabActive} flex items-center`}>
                        <input
                          ref={editInputRef}
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={saveRename}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveRename();
                            if (e.key === "Escape") setEditingTabId(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          maxLength={30}
                          className="bg-transparent border-b border-blue-400 outline-none text-blue-300 w-28 text-sm"
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => setActiveTab(trip.id)}
                        className={`${tabBase} ${isActive ? tabActive : tabInactive}`}
                      >
                        {trip.name}
                      </button>
                    )}

                    {/* Pencil (rename) — only on active, non-editing tab */}
                    {isActive && !isEditing && (
                      <button
                        onClick={(e) => { e.stopPropagation(); startRename(trip); }}
                        className="p-1 text-gray-600 hover:text-gray-300 transition-colors -mb-px"
                        title={locale === "en" ? "Rename trip" : "Renombrar viaje"}
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}

                    {/* Delete (×) */}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteTrip(trip.id); }}
                      className="p-1 text-gray-700 hover:text-red-400 transition-colors -mb-px"
                      title={locale === "en" ? "Delete trip" : "Eliminar viaje"}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}

              {/* New trip button */}
              <button
                onClick={createTrip}
                className={`${tabBase} ${tabInactive} flex items-center gap-1 px-3`}
                title={locale === "en" ? "New trip" : "Nuevo viaje"}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>

            </div>
          </div>

          {/* ── Tab content ── */}
          <ErrorBoundary>
            {activeTab === "airports" && (
              <div>
                {/* Legend — shown before cards so users understand the scale */}
                <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
                  {t.legendTitle && (
                    <span className="text-gray-500 font-medium mr-1">{t.legendTitle}</span>
                  )}
                  {t.legend.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {sortedAirports.map((iata, idx) => (
                    <div key={iata} className="animate-fade-in-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                      <AirportCard
                        iata={iata}
                        status={statusMap[iata]}
                        onRemove={() => removeAirport(iata)}
                        weather={weatherMap[iata]}
                        metar={metarMap[iata]}
                        highlight={changedAirports.has(iata)}
                      />
                    </div>
                  ))}
                  <AirportSearch
                    watchedAirports={watchedAirports}
                    onAdd={addAirport}
                  />
                </div>
              </div>
            )}

            {activeTab === "flights" && (
              <MyFlightsPanel statusMap={statusMap} weatherMap={weatherMap} />
            )}

            {activeTab === "search" && (
              <FlightSearch statusMap={statusMap} />
            )}

            {activeTab === "help" && (
              <HelpPanel />
            )}

            {userTrips.map((trip) =>
              activeTab === trip.id ? (
                <TripPanel
                  key={trip.id}
                  trip={trip}
                  statusMap={statusMap}
                  weatherMap={weatherMap}
                  onAddFlight={addFlightToTrip}
                  onRemoveFlight={removeFlightFromTrip}
                />
              ) : null
            )}
          </ErrorBoundary>

          {/* Footer — desktop only */}
          <div className="hidden md:block pt-4 border-t border-gray-900 text-center text-xs text-gray-700">
            {t.footer}
          </div>
        </div>
      </div>

      {/* ── Mobile bottom navigation ─────────────────────────────────────────── */}
      {mounted && (
        <nav
          className="fixed bottom-0 inset-x-0 z-50 md:hidden bottom-nav-bg"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="flex h-[60px]">

            {/* Static tabs */}
            {([
              { id: "flights",  Icon: Plane,   label: t.tabFlights  },
              { id: "airports", Icon: MapPin,  label: t.tabAirports },
              { id: "search",   Icon: Search,  label: t.tabSearch   },
            ] as const).map(({ id, Icon, label }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative tap-scale transition-colors ${
                    isActive ? "text-blue-400" : "text-gray-500"
                  }`}
                >
                  {isActive && (
                    <span className="absolute top-0 inset-x-0 flex justify-center">
                      <span className="h-0.5 w-8 rounded-full bg-blue-400" />
                    </span>
                  )}
                  <Icon className="h-[22px] w-[22px]" />
                  <span className="text-[10px] font-semibold leading-none">{label}</span>
                </button>
              );
            })}

            {/* Trips / New trip button */}
            {(() => {
              const hasTrips = userTrips.length > 0;
              const tripActive = userTrips.some((t) => t.id === activeTab);
              return (
                <button
                  onClick={() => {
                    if (!hasTrips) {
                      createTrip();
                    } else {
                      const stillActive = userTrips.find((t) => t.id === activeTab);
                      setActiveTab(stillActive ? activeTab : userTrips[0].id);
                    }
                  }}
                  className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative tap-scale transition-colors ${
                    tripActive ? "text-blue-400" : "text-gray-500"
                  }`}
                >
                  {tripActive && (
                    <span className="absolute top-0 inset-x-0 flex justify-center">
                      <span className="h-0.5 w-8 rounded-full bg-blue-400" />
                    </span>
                  )}
                  <div className="relative">
                    {hasTrips ? (
                      <>
                        <Map className="h-[22px] w-[22px]" />
                        <span className="absolute -top-1.5 -right-2.5 h-4 min-w-[16px] bg-blue-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                          {userTrips.length}
                        </span>
                      </>
                    ) : (
                      <Plus className="h-[22px] w-[22px]" />
                    )}
                  </div>
                  <span className="text-[10px] font-semibold leading-none">
                    {hasTrips ? (locale === "es" ? "Viajes" : "Trips") : (locale === "es" ? "Nuevo" : "New")}
                  </span>
                </button>
              );
            })()}
          </div>
        </nav>
      )}
    </>
  );
}
