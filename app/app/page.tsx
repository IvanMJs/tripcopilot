"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Toaster } from "react-hot-toast";
import { RefreshCw, Plane, Pencil, X, Plus, Bell, HelpCircle, MapPin, Search, Map, LogOut, ChevronRight } from "lucide-react";
import { useAirportStatus } from "@/hooks/useAirportStatus";
import { AirportCard } from "@/components/AirportCard";
import { AirportSearch } from "@/components/AirportSearch";
import { GlobalStatusBar } from "@/components/GlobalStatusBar";
import { RefreshCountdown } from "@/components/RefreshCountdown";
import { MyFlightsPanel } from "@/components/MyFlightsPanel";
import { FlightSearch } from "@/components/FlightSearch";
import { TripPanel } from "@/components/TripPanel";
import { TripListView } from "@/components/TripListView";
import { HelpPanel } from "@/components/HelpPanel";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DelayStatus, TripFlight, TripTab } from "@/lib/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { Locale } from "@/lib/i18n";
import { useWeather } from "@/hooks/useWeather";
import { useMetar } from "@/hooks/useMetar";
import { useServiceWorker } from "@/hooks/useServiceWorker";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useWatchedAirports } from "@/hooks/useWatchedAirports";
import { useUserTrips } from "@/hooks/useUserTrips";
import { NotificationSetupSheet } from "@/components/NotificationSetupSheet";
import { createClient } from "@/utils/supabase/client";

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

// Always include these airports for weather regardless of watchedAirports
const FLIGHT_AIRPORTS = ["EZE", "MIA", "GCM", "JFK"];

export default function HomePage() {
  const { t, locale, setLocale } = useLanguage();
  const { showSwNotification } = useServiceWorker();
  const isOnline = useOnlineStatus();
  const router = useRouter();
  const [showNotifSheet, setShowNotifSheet] = useState(false);

  const [activeTab, setActiveTab] = useState<string>("flights");
  const [refreshInterval, setRefreshInterval] = useState(5);
  const [mounted, setMounted] = useState(false);

  // DB-backed state
  const { airports: watchedAirports, add: addAirportDB, remove: removeAirportDB } = useWatchedAirports();
  const {
    trips: userTrips,
    createTrip: createTripDB,
    deleteTrip: deleteTripDB,
    renameTrip: renameTripDB,
    addFlight:  addFlightDB,
    removeFlight: removeFlightDB,
  } = useUserTrips();

  // Tab rename state
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  // Create trip modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTripName, setNewTripName] = useState("");
  const createModalInputRef = useRef<HTMLInputElement>(null);

  // Draft trip tracking (pure UI state, no DB needed)
  const [draftTripIds, setDraftTripIds] = useState<Set<string>>(new Set());

  // Mobile trip picker popup
  const [showTripPicker, setShowTripPicker] = useState(false);

  useEffect(() => { setMounted(true); }, []);

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

      const notifTitle = locale === "en"
        ? `✈ Check-in open · ${f.code}`
        : `✈ Check-in disponible · ${f.code}`;
      const notifBody = locale === "en"
        ? `Your flight ${f.route} departs tomorrow at ${f.time}`
        : `Tu vuelo ${f.route} sale mañana a las ${f.time}`;
      showSwNotification(notifTitle, { body: notifBody, tag: key });
      localStorage.setItem(key, "1");
    }
  }, [mounted, locale, userTrips]);

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
  } = useAirportStatus(refreshInterval, locale, showSwNotification);

  // Aggregate airports for weather: watched + hardcoded flight airports + all user trip airports
  const tripAirports = userTrips.flatMap((t) =>
    t.flights.flatMap((f) => [f.originCode, f.destinationCode])
  );
  const allAirportsForWeather = Array.from(
    new Set([...watchedAirports, ...FLIGHT_AIRPORTS, ...tripAirports])
  );
  const weatherMap = useWeather(allAirportsForWeather, locale);
  const metarMap   = useMetar(watchedAirports);

  // ── Logout ────────────────────────────────────────────────────────────────

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  // ── Watched airports ──────────────────────────────────────────────────────

  function addAirport(iata: string) { addAirportDB(iata); }
  function removeAirport(iata: string) { removeAirportDB(iata); }

  const sortedAirports = [...watchedAirports].sort((a, b) => {
    const sa = statusMap[a]?.status ?? "ok";
    const sb = statusMap[b]?.status ?? "ok";
    return (SEVERITY_ORDER[sa] ?? 7) - (SEVERITY_ORDER[sb] ?? 7);
  });

  // ── Trip management ───────────────────────────────────────────────────────

  function openCreateTripModal() {
    setNewTripName("");
    setShowCreateModal(true);
    setTimeout(() => createModalInputRef.current?.focus(), 60);
  }

  async function confirmCreateTrip() {
    const tripName =
      newTripName.trim() ||
      (locale === "en" ? `Trip ${userTrips.length + 1}` : `Viaje ${userTrips.length + 1}`);
    const id = await createTripDB(tripName);
    if (id) {
      setActiveTab(id);
      setDraftTripIds((prev) => new Set(prev).add(id));
    }
    setShowCreateModal(false);
  }

  function handleSaveTrip(id: string) {
    setDraftTripIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function renameTrip(id: string, newName: string) { renameTripDB(id, newName); }

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
    ) return;
    deleteTripDB(id);
    handleSaveTrip(id); // remove from drafts if present
    if (activeTab === id) setActiveTab("trips");
  }

  function addFlightToTrip(tripId: string, flight: TripFlight) { addFlightDB(tripId, flight); }
  function removeFlightFromTrip(tripId: string, flightId: string) { removeFlightDB(tripId, flightId); }

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

      {/* Notification setup sheet — iOS-aware */}
      <NotificationSetupSheet
        open={showNotifSheet}
        onClose={() => {
          setShowNotifSheet(false);
          // Re-check permission state after sheet closes
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            requestNotifications();
          }
        }}
        locale={locale}
      />

      {/* Create trip modal */}
      {showCreateModal && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none">
            <div
              className="w-full max-w-sm pointer-events-auto rounded-2xl border border-white/[0.08] shadow-2xl p-5 space-y-4"
              style={{ background: "linear-gradient(160deg, rgba(18,18,32,0.99) 0%, rgba(10,10,20,1) 100%)" }}
            >
              <div>
                <h3 className="text-base font-black text-white">
                  {locale === "es" ? "Nuevo viaje" : "New trip"}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {locale === "es" ? "Podés renombrarlo después" : "You can rename it later"}
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  {locale === "es" ? "Nombre del viaje" : "Trip name"}
                </label>
                <input
                  ref={createModalInputRef}
                  value={newTripName}
                  onChange={(e) => setNewTripName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") confirmCreateTrip();
                    if (e.key === "Escape") setShowCreateModal(false);
                  }}
                  placeholder={locale === "es" ? "Ej: Vacaciones Miami 2026" : "E.g. Miami Trip 2026"}
                  maxLength={40}
                  autoFocus
                  className="w-full rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 text-sm font-semibold text-gray-400 hover:text-white transition-colors"
                >
                  {locale === "es" ? "Cancelar" : "Cancel"}
                </button>
                <button
                  onClick={confirmCreateTrip}
                  className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 py-2.5 text-sm font-semibold text-white transition-colors tap-scale"
                >
                  {locale === "es" ? "Crear viaje" : "Create trip"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Offline banner */}
      {mounted && !isOnline && (
        <div className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2 bg-yellow-900/95 border-b border-yellow-700/60 px-4 py-2.5 backdrop-blur-sm"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 10px)" }}
        >
          <span className="text-sm">📡</span>
          <p className="text-xs font-semibold text-yellow-200">
            {locale === "es"
              ? "Sin conexión — mostrando último estado conocido"
              : "Offline — showing last known status"}
          </p>
          {lastUpdated && (
            <span className="text-[10px] text-yellow-400/70">
              · {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
      )}

      <div className="min-h-screen bg-gray-950 px-4 pb-nav md:pb-6 md:py-6"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}
      >
        <div className="mx-auto max-w-6xl space-y-4 md:space-y-6">

          {/* ── Header ── */}
          <div className="flex items-center justify-between gap-3">

            {/* Title */}
            <div className="min-w-0">
              {/* Mobile: TripCopilot PNG only — brand seal, no text */}
              <div className="flex md:hidden items-center">
                <img
                  src="/tripcopliot-avatar.svg"
                  alt="TripCopilot"
                  className="h-10 w-auto"
                />
              </div>
              {/* Desktop: PNG + title text */}
              <h1 className="hidden md:flex items-center gap-3 text-3xl font-black tracking-tight text-white">
                <img
                  src="/tripcopliot-avatar.svg"
                  alt="TripCopilot"
                  className="h-10 w-auto shrink-0"
                />
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

              {/* Notification bell — always visible, handles iOS/Android/desktop */}
              {mounted && (
                <button
                  onClick={() => {
                    if (notificationsEnabled) {
                      disableNotifications();
                    } else {
                      setShowNotifSheet(true);
                    }
                  }}
                  title={
                    notificationsEnabled
                      ? (locale === "en" ? "Notifications ON — tap to disable" : "Alertas activas — tap para desactivar")
                      : (locale === "en" ? "Enable notifications" : "Activar alertas")
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

              {/* Mobile logout — icon-only, visible on mobile */}
              <button
                onClick={handleLogout}
                className="flex items-center rounded-md border border-gray-700 bg-gray-900 p-1.5 text-gray-500 hover:text-red-400 hover:border-red-800/60 transition-colors md:hidden"
                title={locale === "en" ? "Sign out" : "Cerrar sesión"}
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>

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
                onClick={() => setActiveTab(activeTab === "help" ? "airports" : "help")}
                title={locale === "en" ? "Help & documentation" : "Ayuda y documentación"}
                className={`hidden md:flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                  activeTab === "help"
                    ? "border-blue-700/60 bg-blue-900/20 text-blue-400"
                    : "border-gray-700 bg-gray-900 text-gray-500 hover:text-gray-300"
                }`}
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>

              {/* Logout — desktop only */}
              <button
                onClick={handleLogout}
                title={locale === "en" ? "Sign out" : "Cerrar sesión"}
                className="hidden md:flex items-center gap-1.5 rounded-md border border-gray-700 bg-gray-900 px-2.5 py-1.5 text-xs text-gray-500 hover:border-red-800/60 hover:text-red-400 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
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

          {/* Global Status Bar — hidden on flights tab (TripSummaryHero covers it) */}
          {activeTab !== "flights" && (
            <GlobalStatusBar statusMap={statusMap} watchedAirports={watchedAirports} />
          )}

          {/* Error banner */}
          {error && (
            <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-400">
              ⚠️ {t.errorFAA} {error}
            </div>
          )}

          {/* ── Tab bar — desktop only; mobile uses bottom nav ── */}
          <div className="hidden md:block border-b border-gray-800">
            <div className="flex gap-1 overflow-x-auto overflow-y-hidden">

              {/* Static tabs — order: Aeropuertos | Mi viaje | Vuelos */}
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
                onClick={openCreateTripModal}
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

            {activeTab === "trips" && (
              <TripListView
                trips={userTrips}
                statusMap={statusMap}
                locale={locale}
                onSelect={(id) => setActiveTab(id)}
                onCreateTrip={openCreateTripModal}
                onDeleteTrip={deleteTrip}
              />
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
                  isDraft={draftTripIds.has(trip.id)}
                  onSave={() => handleSaveTrip(trip.id)}
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
          <div className="relative">

          {/* Trip picker popup — slides up above bottom nav when multiple trips */}
          {showTripPicker && userTrips.length > 1 && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowTripPicker(false)}
              />
              {/* Picker panel */}
              <div
                className="absolute bottom-full left-0 right-0 z-50 mx-3 mb-2 rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden"
                style={{ background: "linear-gradient(160deg, rgba(18,18,32,0.99) 0%, rgba(10,10,20,1) 100%)" }}
              >
                <div className="px-4 py-3 border-b border-white/[0.06]">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    {locale === "es" ? "Mis viajes" : "My trips"}
                  </p>
                </div>
                {userTrips.map((trip) => (
                  <button
                    key={trip.id}
                    onClick={() => {
                      setActiveTab(trip.id);
                      setShowTripPicker(false);
                    }}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.04] active:bg-white/[0.07] ${
                      activeTab === trip.id ? "bg-white/[0.04]" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold truncate ${activeTab === trip.id ? "text-blue-400" : "text-white"}`}>
                        {trip.name}
                        {draftTripIds.has(trip.id) && (
                          <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-yellow-500 border border-yellow-700/50 rounded px-1 py-0.5">
                            {locale === "es" ? "Borrador" : "Draft"}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {trip.flights.length === 0
                          ? (locale === "es" ? "Sin vuelos" : "No flights")
                          : locale === "es"
                          ? `${trip.flights.length} vuelo${trip.flights.length !== 1 ? "s" : ""}`
                          : `${trip.flights.length} flight${trip.flights.length !== 1 ? "s" : ""}`}
                      </p>
                    </div>
                    <ChevronRight className={`h-4 w-4 shrink-0 ${activeTab === trip.id ? "text-blue-400" : "text-gray-600"}`} />
                  </button>
                ))}
                <div className="px-4 py-3 border-t border-white/[0.06]">
                  <button
                    onClick={() => {
                      setActiveTab("trips");
                      setShowTripPicker(false);
                    }}
                    className="w-full text-xs text-gray-500 hover:text-gray-300 transition-colors text-center py-1"
                  >
                    {locale === "es" ? "Ver todos los viajes" : "View all trips"}
                  </button>
                </div>
              </div>
            </>
          )}

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

            {/* Trips tab — smart nav: 0→list, 1→direct, 2+→picker */}
            {(() => {
              const tripsActive =
                activeTab === "trips" || userTrips.some((t) => t.id === activeTab);
              return (
                <button
                  onClick={() => {
                    if (userTrips.length === 0) {
                      setActiveTab("trips");
                    } else if (userTrips.length === 1) {
                      setActiveTab(userTrips[0].id);
                    } else {
                      setShowTripPicker((v) => !v);
                    }
                  }}
                  className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative tap-scale transition-colors ${
                    tripsActive ? "text-blue-400" : "text-gray-500"
                  }`}
                >
                  {tripsActive && (
                    <span className="absolute top-0 inset-x-0 flex justify-center">
                      <span className="h-0.5 w-8 rounded-full bg-blue-400" />
                    </span>
                  )}
                  <div className="relative">
                    <Map className="h-[22px] w-[22px]" />
                    {userTrips.length > 0 && (
                      <span className="absolute -top-1.5 -right-2.5 h-4 min-w-[16px] bg-blue-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                        {userTrips.length}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-semibold leading-none">
                    {locale === "es" ? "Viajes" : "Trips"}
                  </span>
                </button>
              );
            })()}
          </div>

          </div>
        </nav>
      )}
    </>
  );
}
