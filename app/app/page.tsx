"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Toaster } from "react-hot-toast";
import { RefreshCw, Bell, HelpCircle, LogOut } from "lucide-react";
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
import { CreateTripModal } from "@/components/CreateTripModal";
import { DeleteTripModal } from "@/components/DeleteTripModal";
import { DraftLeaveModal } from "@/components/DraftLeaveModal";
import { TripTabBar } from "@/components/TripTabBar";
import { BottomNav } from "@/components/BottomNav";
import { TripPanelSkeleton } from "@/components/TripPanelSkeleton";
import { AirportStatusMap, DelayStatus, TripFlight, Accommodation } from "@/lib/types";
import { AIRPORTS } from "@/lib/airports";
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
const FLIGHT_AIRPORTS = ["EZE", "MIA", "GCM", "JFK"];
const DRAFT_ID = "__draft__";

export default function HomePage() {
  const { t, locale, setLocale } = useLanguage();
  const { showSwNotification, subscribeToPush } = useServiceWorker();
  const isOnline = useOnlineStatus();
  const router = useRouter();
  const [showNotifSheet, setShowNotifSheet] = useState(false);

  const [activeTab, setActiveTab] = useState<string>("airports");
  const [refreshInterval, setRefreshInterval] = useState(5);
  const [mounted, setMounted] = useState(false);

  // DB-backed state
  const { airports: watchedAirports, add: addAirportDB, remove: removeAirportDB } = useWatchedAirports();
  const {
    trips: userTrips,
    loading: tripsLoading,
    createTrip: createTripDB,
    deleteTrip: deleteTripDB,
    renameTrip: renameTripDB,
    addFlight:  addFlightDB,
    removeFlight: removeFlightDB,
    addAccommodation: addAccommodationDB,
    removeAccommodation: removeAccommodationDB,
    updateAccommodation: updateAccommodationDB,
    duplicateTrip: duplicateTripDB,
  } = useUserTrips();

  // Create trip modal
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Draft trip — local only, not persisted until "Guardar viaje"
  const [draftTrip, setDraftTrip] = useState<{ name: string; flights: TripFlight[]; accommodations: Accommodation[] } | null>(null);

  // Delete confirmation modal
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string; flightCount: number } | null>(null);

  // Draft leave confirmation (shown when navigating away from unsaved draft)
  const [draftLeaveConfirm, setDraftLeaveConfirm] = useState<{ targetTab: string } | null>(null);

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

  // Aggregate trip airports
  const tripAirports = userTrips.flatMap((t) =>
    t.flights.flatMap((f) => [f.originCode, f.destinationCode])
  );

  const {
    statusMap: faaStatusMap,
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

  // International airport status (AeroDataBox)
  const [intlStatusMap, setIntlStatusMap] = useState<AirportStatusMap>({});

  useEffect(() => {
    const intlAirports = Array.from(
      new Set([...watchedAirports, ...tripAirports])
    ).filter((iata) => AIRPORTS[iata]?.isFAA === false);

    if (intlAirports.length === 0) return;

    fetch(`/api/intl-status?airports=${intlAirports.join(",")}&locale=${locale}`)
      .then((r) => r.ok ? r.json() : {})
      .then((data: Record<string, unknown>) => {
        if (data.quotaExceeded) return;
        const map: AirportStatusMap = {};
        for (const [iata, status] of Object.entries(data as AirportStatusMap)) {
          map[iata] = { ...status, lastChecked: new Date() };
        }
        setIntlStatusMap(map);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userTrips, watchedAirports, locale, lastUpdated]);

  const statusMap: AirportStatusMap = { ...intlStatusMap, ...faaStatusMap };

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

  const sortedAirports = [...watchedAirports].sort((a, b) => {
    const sa = statusMap[a]?.status ?? "ok";
    const sb = statusMap[b]?.status ?? "ok";
    return (SEVERITY_ORDER[sa] ?? 7) - (SEVERITY_ORDER[sb] ?? 7);
  });

  // ── Trip management ───────────────────────────────────────────────────────

  function openCreateTripModal() {
    if (draftTrip) { setActiveTab(DRAFT_ID); return; }
    setShowCreateModal(true);
  }

  function confirmCreateTrip(name: string) {
    setDraftTrip({ name, flights: [], accommodations: [] });
    setActiveTab(DRAFT_ID);
    setShowCreateModal(false);
  }

  async function saveDraftTrip() {
    if (!draftTrip) return;
    const id = await createTripDB(draftTrip.name);
    if (id) {
      const flightIdMap: Record<string, string> = {};
      for (const flight of draftTrip.flights) {
        const realId = await addFlightDB(id, flight);
        if (realId) flightIdMap[flight.id] = realId;
      }
      for (const acc of draftTrip.accommodations) {
        const { id: _id, tripId: _tid, ...accData } = acc;
        const realFlightId = accData.flightId ? flightIdMap[accData.flightId] : undefined;
        await addAccommodationDB(id, { ...accData, flightId: realFlightId });
      }
      setDraftTrip(null);
      setActiveTab(id);
    }
  }

  function discardDraft() {
    setDraftTrip(null);
    setActiveTab("trips");
  }

  function addFlightToDraft(_tripId: string, flight: TripFlight) {
    setDraftTrip((prev) => prev ? { ...prev, flights: [...prev.flights, flight] } : prev);
  }

  function removeFlightFromDraft(_tripId: string, flightId: string) {
    setDraftTrip((prev) => prev ? { ...prev, flights: prev.flights.filter((f) => f.id !== flightId) } : prev);
  }

  function addAccommodationToDraft(_tripId: string, acc: Omit<Accommodation, "id" | "tripId">) {
    const newAcc: Accommodation = { ...acc, id: `draft-acc-${Date.now()}`, tripId: DRAFT_ID };
    setDraftTrip((prev) => prev ? {
      ...prev,
      accommodations: [...prev.accommodations, newAcc].sort((a, b) => (a.checkInDate ?? "").localeCompare(b.checkInDate ?? "")),
    } : prev);
  }

  function removeAccommodationFromDraft(_tripId: string, accId: string) {
    setDraftTrip((prev) => prev ? { ...prev, accommodations: prev.accommodations.filter((a) => a.id !== accId) } : prev);
  }

  function renameTripFromPanel(id: string, newName: string) {
    if (id === DRAFT_ID) {
      const trimmed = newName.trim();
      if (trimmed) setDraftTrip((prev) => prev ? { ...prev, name: trimmed } : prev);
    } else {
      renameTripDB(id, newName);
    }
  }

  function deleteTrip(id: string) {
    const trip = userTrips.find((t) => t.id === id);
    if (!trip) return;
    setDeleteConfirm({ id, name: trip.name, flightCount: trip.flights.length });
  }

  function confirmDeleteTrip() {
    if (!deleteConfirm) return;
    deleteTripDB(deleteConfirm.id);
    if (activeTab === deleteConfirm.id) setActiveTab("trips");
    setDeleteConfirm(null);
  }

  async function handleDuplicateTrip(tripId: string) {
    const newId = await duplicateTripDB(tripId);
    if (newId) setActiveTab(newId);
  }

  function navigateAway(targetTab: string) {
    if (activeTab === DRAFT_ID && draftTrip) {
      setDraftLeaveConfirm({ targetTab });
    } else {
      setActiveTab(targetTab);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: "#1f2937", color: "#f3f4f6", border: "1px solid #374151" },
        }}
      />

      <NotificationSetupSheet
        open={showNotifSheet}
        onClose={() => {
          setShowNotifSheet(false);
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            requestNotifications();
            subscribeToPush();
          }
        }}
        locale={locale}
      />

      {showCreateModal && (
        <CreateTripModal
          locale={locale}
          tripCount={userTrips.length}
          onClose={() => setShowCreateModal(false)}
          onConfirm={confirmCreateTrip}
        />
      )}

      {deleteConfirm && (
        <DeleteTripModal
          locale={locale}
          tripName={deleteConfirm.name}
          flightCount={deleteConfirm.flightCount}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={confirmDeleteTrip}
        />
      )}

      {draftLeaveConfirm && draftTrip && (
        <DraftLeaveModal
          locale={locale}
          draftName={draftTrip.name}
          targetTab={draftLeaveConfirm.targetTab}
          onSave={saveDraftTrip}
          onDiscard={discardDraft}
          onCancel={() => setDraftLeaveConfirm(null)}
          onNavigate={(tab) => { setActiveTab(tab); setDraftLeaveConfirm(null); }}
        />
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
            <div className="min-w-0">
              <div className="flex md:hidden items-center">
                <img src="/tripcopliot-avatar.svg" alt="TripCopilot" className="h-10 w-auto" />
              </div>
              <h1 className="hidden md:flex items-center gap-3 text-3xl font-black tracking-tight text-white">
                <img src="/tripcopliot-avatar.svg" alt="TripCopilot" className="h-10 w-auto shrink-0" />
                <span className="truncate">{t.appTitle}</span>
              </h1>
              <p className="hidden md:block mt-1 text-sm text-gray-400 font-medium">{t.appSubtitle}</p>
            </div>

            <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
              {/* Language toggle */}
              <div className="flex rounded-lg border border-gray-700 overflow-hidden text-xs font-semibold">
                {(["es", "en"] as Locale[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLocale(l)}
                    className={`px-2.5 py-1.5 md:px-3 transition-colors ${
                      locale === l ? "bg-blue-600 text-white" : "bg-gray-900 text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Notification bell */}
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

              {/* Mobile logout */}
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

          {activeTab !== "flights" && (
            <GlobalStatusBar statusMap={statusMap} watchedAirports={watchedAirports} />
          )}

          {error && (
            <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-400">
              ⚠️ {t.errorFAA} {error}
            </div>
          )}

          {/* ── Desktop tab bar ── */}
          <TripTabBar
            locale={locale}
            activeTab={activeTab}
            userTrips={userTrips}
            draftTrip={draftTrip}
            draftId={DRAFT_ID}
            tabLabels={{ airports: t.tabAirports, search: t.tabSearch }}
            onTabChange={setActiveTab}
            onRenameTrip={renameTripDB}
            onDeleteTrip={deleteTrip}
            onDiscardDraft={discardDraft}
            onNewTrip={openCreateTripModal}
          />

          {/* ── Tab content ── */}
          <ErrorBoundary>
            {activeTab === "airports" && (
              <div>
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
                        onRemove={() => removeAirportDB(iata)}
                        weather={weatherMap[iata]}
                        metar={metarMap[iata]}
                        highlight={changedAirports.has(iata)}
                      />
                    </div>
                  ))}
                  <AirportSearch watchedAirports={watchedAirports} onAdd={(iata) => addAirportDB(iata)} />
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

            {/* Trip loading skeleton */}
            {tripsLoading && (activeTab === "trips" || userTrips.some((t) => t.id === activeTab) || activeTab === DRAFT_ID) && (
              <TripPanelSkeleton />
            )}

            {/* Draft trip panel */}
            {!tripsLoading && draftTrip && activeTab === DRAFT_ID && (
              <TripPanel
                key={DRAFT_ID}
                trip={{ id: DRAFT_ID, name: draftTrip.name, flights: draftTrip.flights, accommodations: draftTrip.accommodations }}
                statusMap={statusMap}
                weatherMap={weatherMap}
                onAddFlight={addFlightToDraft}
                onRemoveFlight={removeFlightFromDraft}
                onAddAccommodation={addAccommodationToDraft}
                onRemoveAccommodation={removeAccommodationFromDraft}
                onUpdateAccommodation={() => {}}
                onDeleteTrip={discardDraft}
                onRenameTrip={(name) => renameTripFromPanel(DRAFT_ID, name)}
                isDraft={true}
                onSave={saveDraftTrip}
              />
            )}

            {/* Saved trip panels */}
            {!tripsLoading && userTrips.map((trip) =>
              activeTab === trip.id ? (
                <TripPanel
                  key={trip.id}
                  trip={trip}
                  statusMap={statusMap}
                  weatherMap={weatherMap}
                  onAddFlight={(_, flight) => addFlightDB(trip.id, flight)}
                  onRemoveFlight={(_, flightId) => removeFlightDB(trip.id, flightId)}
                  onAddAccommodation={(_, acc) => addAccommodationDB(trip.id, acc)}
                  onRemoveAccommodation={(_, accId) => removeAccommodationDB(trip.id, accId)}
                  onUpdateAccommodation={(_, accId, updates) => updateAccommodationDB(trip.id, accId, updates)}
                  onDuplicateTrip={() => handleDuplicateTrip(trip.id)}
                  onDeleteTrip={() => deleteTrip(trip.id)}
                  onRenameTrip={(name) => renameTripFromPanel(trip.id, name)}
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

      {/* ── Mobile bottom navigation ── */}
      {mounted && (
        <BottomNav
          locale={locale}
          activeTab={activeTab}
          userTrips={userTrips}
          draftTrip={draftTrip}
          draftId={DRAFT_ID}
          tabLabels={{ airports: t.tabAirports, search: t.tabSearch }}
          onNavigate={navigateAway}
          onNewTrip={openCreateTripModal}
          onDiscardDraft={discardDraft}
          onDeleteTrip={deleteTrip}
          onRenameTrip={renameTripDB}
          onRenameDraft={(name) => setDraftTrip((prev) => prev ? { ...prev, name } : prev)}
        />
      )}
    </>
  );
}
