"use client";

import { useState, useEffect, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useAirportStatus } from "@/hooks/useAirportStatus";
import { ParsedFlight } from "@/lib/importFlights";
import { GlobalStatusBar } from "@/components/GlobalStatusBar";
import { RefreshCountdown } from "@/components/RefreshCountdown";
import { BottomNav } from "@/components/BottomNav";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { AirportStatusMap } from "@/lib/types";
import { AIRPORTS } from "@/lib/airports";
import { DRAFT_ID } from "@/lib/constants";
import { useLanguage } from "@/contexts/LanguageContext";
import { useWeather } from "@/hooks/useWeather";
import { useMetar } from "@/hooks/useMetar";
import { analytics } from "@/lib/analytics";
import { useTripManagementContext } from "@/contexts/TripManagementContext";
import { useNotificationSetupContext } from "@/contexts/NotificationSetupContext";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { OfflineBanner } from "@/components/OfflineBanner";
import { GlobalAlertBar } from "@/components/GlobalAlertBar";
import { useGeolocation } from "@/hooks/useGeolocation";
import { TimezoneBanner } from "@/components/TimezoneBanner";
import { DestinationSpotlight } from "@/components/DestinationSpotlight";
import { TripTabBar } from "@/components/TripTabBar";
import { useSmartAlerts } from "@/hooks/useSmartAlerts";
import { useConnectionAlerts } from "@/hooks/useConnectionAlerts";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { exportAllTripsJSON } from "@/lib/dataExport";
import { DelayStatus } from "@/lib/types";
import { TripAssistant } from "@/components/TripAssistant";
import { AppHeader } from "@/components/app/AppHeader";
import { TabContent } from "@/components/app/TabContent";
import { AppModals } from "@/components/app/AppModals";

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

const FLIGHT_AIRPORTS = ["EZE", "MIA", "GCM", "JFK"];

export interface AppShellProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  setActiveTabRaw: (tab: string) => void;
  prevTabRef: React.MutableRefObject<string>;
  setTabIdsForSlide: (ids: string[]) => void;
  mounted: boolean;
  userId: string | null;
  userName: string | null;
  userAvatar: string | null;
  userPlan: "free" | "explorer" | "pilot" | null;
  setUserName: (n: string) => void;
  setUserAvatar: (url: string) => void;
  handleLogout: () => Promise<void>;
  watchedAirports: string[];
  addAirportDB: (iata: string) => void;
  removeAirportDB: (iata: string) => void;
  showGlobalSearch: boolean;
  setShowGlobalSearch: (v: boolean) => void;
  showOnboardingTour: boolean;
  setShowOnboardingTour: (v: boolean) => void;
  showKbdHelp: boolean;
  setShowKbdHelp: (v: boolean) => void;
  showDeviceTz: boolean;
  showBanner: boolean;
  deviceTz: string | null;
  handleAcceptDeviceTz: () => void;
  handleDismissBanner: () => void;
  handleToggleDeviceTz: () => void;
  isRelax: boolean;
  locale: "es" | "en";
  t: ReturnType<typeof useLanguage>["t"];
}

export function AppShell({
  activeTab,
  setActiveTab,
  setActiveTabRaw,
  prevTabRef,
  setTabIdsForSlide,
  mounted,
  userId,
  userName,
  userAvatar,
  userPlan,
  setUserName,
  setUserAvatar,
  handleLogout,
  watchedAirports,
  addAirportDB,
  removeAirportDB,
  showGlobalSearch,
  setShowGlobalSearch,
  showOnboardingTour,
  setShowOnboardingTour,
  showKbdHelp,
  setShowKbdHelp,
  showDeviceTz,
  showBanner,
  deviceTz,
  handleAcceptDeviceTz,
  handleDismissBanner,
  handleToggleDeviceTz,
  isRelax,
  locale,
  t,
}: AppShellProps) {
  const {
    showNotifSheet,
    setShowNotifSheet,
    showNotifSettings,
    setShowNotifSettings,
    showNotificationsHub,
    setShowNotificationsHub,
    unreadCount,
    setUnreadCount,
    subscribeToPush,
    unsubscribeFromPush,
    showSwNotification,
  } = useNotificationSetupContext();

  const {
    userTrips, tripsLoading,
    renameTripDB, addFlightDB, removeFlightDB,
    addAccommodationDB, removeAccommodationDB, updateAccommodationDB,
    draftTrip, setDraftTrip,
    showCreateModal, setShowCreateModal,
    showGlobalImport, setShowGlobalImport,
    showUpgradeModal, setShowUpgradeModal,
    deleteConfirm, setDeleteConfirm,
    debriefTrip, setDebriefTrip,
    draftLeaveConfirm, setDraftLeaveConfirm,
    prefillDestination, setPrefillDestination,
    showTripHistory, setShowTripHistory,
    showSpotlight, setShowSpotlight,
    openCreateTripModal, confirmCreateTrip,
    handleGlobalImport, saveDraftTrip, discardDraft,
    addFlightToDraft, removeFlightFromDraft,
    addAccommodationToDraft, removeAccommodationFromDraft,
    renameTripFromPanel, deleteTrip, confirmDeleteTrip,
    handleDuplicateTrip, handleCreateSimilar, navigateAway,
    tripAirports, globalNextFlightId, hasUpcomingFlight, alertTripIds, today,
  } = useTripManagementContext();

  useEffect(() => {
    setTabIdsForSlide(["today", "trips", "discover", "profile", "airports", "flights", ...userTrips.map((trip) => trip.id), DRAFT_ID]);
  }, [userTrips, setTabIdsForSlide]);

  const RELAX_TABS = new Set(["today", "discover", "profile"]);
  useEffect(() => {
    if (isRelax && !RELAX_TABS.has(activeTab) && !activeTab.startsWith("trip-") && !userTrips.some((trip) => trip.id === activeTab) && activeTab !== DRAFT_ID) {
      setActiveTab("today");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRelax]);

  useEffect(() => {
    if (!mounted || tripsLoading || !userId) return;
    const userKey = `tc-onboarded-${userId}`;
    if (userTrips.length === 0 && !localStorage.getItem(userKey) && !localStorage.getItem("tc-onboarded")) {
      setActiveTabRaw("trips");
      prevTabRef.current = "trips";
    }
  }, [mounted, userId, tripsLoading, userTrips.length, setActiveTabRaw, prevTabRef]);

  useEffect(() => {
    if (!mounted || tripsLoading || !userId) return;
    if (localStorage.getItem("tripcopilot_onboarding_completed")) return;
    const tourKey = `tc-tour-${userId}`;
    if (!localStorage.getItem(tourKey)) {
      setShowOnboardingTour(true);
    }
  }, [mounted, userId, tripsLoading, setShowOnboardingTour]);

  // Check-in push notifications
  useEffect(() => {
    if (!mounted || typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const allFlights = userTrips.flatMap((trip) => trip.flights.map((f) => ({
      code: f.flightCode,
      isoDate: f.isoDate,
      route: `${f.originCode}→${f.destinationCode}`,
      time: f.departureTime ?? "",
    })));

    for (const f of allFlights) {
      const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0);
      const flightDay = new Date(f.isoDate + "T00:00:00");
      const diff = Math.ceil((flightDay.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diff !== 1) continue;
      const key = `checkin-notified-${f.code}-${f.isoDate}`;
      if (localStorage.getItem(key)) continue;
      const notifTitle = locale === "en" ? `✈ Check-in open · ${f.code}` : `✈ Check-in disponible · ${f.code}`;
      const notifBody = locale === "en"
        ? `Your flight ${f.route} departs tomorrow at ${f.time}`
        : `Tu vuelo ${f.route} sale mañana a las ${f.time}`;
      showSwNotification(notifTitle, { body: notifBody, tag: key });
      localStorage.setItem(key, "1");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, locale, userTrips]);

  const {
    statusMap: faaStatusMap,
    loading, error, lastUpdated,
    secondsUntilRefresh, totalSeconds, refresh,
    changedAirports, isStale,
    notificationsEnabled, requestNotifications, disableNotifications,
  } = useAirportStatus(5, locale, showSwNotification);

  const [intlStatusMap, setIntlStatusMap] = useState<AirportStatusMap>({});
  useEffect(() => {
    const intlAirports = Array.from(new Set([...watchedAirports, ...tripAirports])).filter((iata) => AIRPORTS[iata]?.isFAA === false);
    if (intlAirports.length === 0) return;
    fetch(`/api/intl-status?airports=${intlAirports.join(",")}&locale=${locale}`)
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((data: Record<string, unknown>) => {
        if (data.quotaExceeded) return;
        const map: AirportStatusMap = {};
        for (const [iata, status] of Object.entries(data as AirportStatusMap)) {
          map[iata] = { ...status, lastChecked: new Date() };
        }
        setIntlStatusMap(map);
      })
      .catch(() => {
        toast.error(
          locale === "es" ? "No se pudo actualizar el estado de aeropuertos internacionales" : "Could not update international airport status",
          { id: "intl-status-error", duration: 4000 },
        );
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userTrips, watchedAirports, locale, lastUpdated]);

  const statusMap: AirportStatusMap = { ...intlStatusMap, ...faaStatusMap };

  const { alerts: smartAlerts, dismiss: dismissSmartAlert } = useSmartAlerts(userTrips, statusMap, locale);
  useConnectionAlerts(userTrips, statusMap, locale);
  const { isOnline: offlineIsOnline, lastSync } = useOfflineSync(userId, userTrips, statusMap);

  const allAirportsForWeather = useMemo(
    () => Array.from(new Set([...watchedAirports, ...FLIGHT_AIRPORTS, ...tripAirports])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [watchedAirports, tripAirports],
  );
  const weatherMap = useWeather(allAirportsForWeather, locale);
  const metarMap = useMetar(watchedAirports);
  const userPosition = useGeolocation(true);

  const sortedAirports = [...watchedAirports].sort((a, b) => {
    const sa = statusMap[a]?.status ?? "ok";
    const sb = statusMap[b]?.status ?? "ok";
    return (SEVERITY_ORDER[sa] ?? 7) - (SEVERITY_ORDER[sb] ?? 7);
  });

  function markOnboarded() {
    localStorage.setItem("tripcopilot-onboarded", "true");
    localStorage.setItem("tc-onboarded", "true");
    if (userId) localStorage.setItem(`tc-onboarded-${userId}`, "true");
  }

  const activeTrip = userTrips[0] ?? null;
  const hasCriticalDelay = useMemo(() => {
    if (!activeTrip) return false;
    return activeTrip.flights.some((f) => f.isoDate === today);
  }, [activeTrip, today]);

  useEffect(() => {
    function handleSearchShortcut(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setShowGlobalSearch(!showGlobalSearch);
      }
    }
    window.addEventListener("keydown", handleSearchShortcut);
    return () => window.removeEventListener("keydown", handleSearchShortcut);
  }, [setShowGlobalSearch, showGlobalSearch]);

  const kbdTabMap = ["today", "trips", "discover", "profile"];
  useKeyboardShortcuts({
    onNewTrip: openCreateTripModal,
    onSwitchTab: (index) => {
      const tab = kbdTabMap[index];
      if (tab) navigateAway(tab);
    },
    onEscape: () => {
      setShowKbdHelp(false);
      setShowCreateModal(false);
      setShowUpgradeModal(false);
      setShowNotifSheet(false);
      setShowNotifSettings(false);
      setShowGlobalSearch(false);
    },
    onHelp: () => setShowKbdHelp(!showKbdHelp),
  });

  function handleGlobalImportWithNotif(flights: ParsedFlight[]) {
    handleGlobalImport(flights);
    const alreadyPrompted = typeof localStorage !== "undefined" && localStorage.getItem("tc-notif-prompted");
    const alreadyGranted = typeof Notification !== "undefined" && Notification.permission === "granted";
    if (!alreadyPrompted && !alreadyGranted) {
      setTimeout(() => { setShowNotifSheet(true); }, 800);
    }
  }

  const activeSavedTrip = userTrips.find((trip) => trip.id === activeTab) ?? null;

  return (
    <>
      <AppModals
        locale={locale}
        mounted={mounted}
        userTrips={userTrips}
        tripCount={userTrips.length}
        showKbdHelp={showKbdHelp}
        onCloseKbdHelp={() => setShowKbdHelp(false)}
        showUpgradeModal={showUpgradeModal}
        onCloseUpgradeModal={() => setShowUpgradeModal(false)}
        showGlobalSearch={showGlobalSearch}
        onCloseGlobalSearch={() => setShowGlobalSearch(false)}
        onSelectTrip={(id) => navigateAway(id)}
        onWatchAirport={(iata) => { addAirportDB(iata); navigateAway("airports"); }}
        showNotifSheet={showNotifSheet}
        onCloseNotifSheet={() => setShowNotifSheet(false)}
        requestNotifications={requestNotifications}
        subscribeToPush={subscribeToPush}
        onNotificationEnabled={() => analytics.notificationEnabled()}
        showNotifSettings={showNotifSettings}
        onCloseNotifSettings={() => setShowNotifSettings(false)}
        showNotificationsHub={showNotificationsHub}
        onCloseNotificationsHub={() => setShowNotificationsHub(false)}
        onSetUnreadCount={setUnreadCount}
        showCreateModal={showCreateModal}
        onCloseCreateModal={() => setShowCreateModal(false)}
        prefillDestination={prefillDestination}
        onSetPrefillDestination={setPrefillDestination}
        onConfirmCreateTrip={confirmCreateTrip}
        showGlobalImport={showGlobalImport}
        onCloseGlobalImport={() => setShowGlobalImport(false)}
        onGlobalImportWithNotif={handleGlobalImportWithNotif}
        deleteConfirm={deleteConfirm}
        onCloseDeleteConfirm={() => setDeleteConfirm(null)}
        onConfirmDeleteTrip={confirmDeleteTrip}
        draftLeaveConfirm={draftLeaveConfirm}
        draftTrip={draftTrip}
        onSaveDraftTrip={saveDraftTrip}
        onDiscardDraft={discardDraft}
        onCancelDraftLeave={() => setDraftLeaveConfirm(null)}
        onNavigateTab={(tab) => setActiveTab(tab)}
        debriefTrip={debriefTrip}
        onCloseDebrief={() => setDebriefTrip(null)}
        showOnboardingTour={showOnboardingTour}
        userId={userId}
        onDoneOnboardingTour={() => setShowOnboardingTour(false)}
        onStartImport={() => setShowGlobalImport(true)}
        onNavigateAway={navigateAway}
      />

      {mounted && (
        <div className="fixed top-0 inset-x-0 z-50">
          <OfflineBanner isOnline={offlineIsOnline} lastSync={lastSync} locale={locale} />
        </div>
      )}

      <div
        className={`min-h-screen bg-gray-950 px-4 pb-nav md:pb-6 md:pl-72 ${!offlineIsOnline ? "pt-14 md:pt-16" : "pt-4 md:pt-6"}`}
        style={{ '--bg-tint': hasCriticalDelay ? 'rgba(239,68,68,0.008)' : 'transparent' } as React.CSSProperties}
      >
        <div className="mx-auto max-w-6xl space-y-4 md:space-y-6">
          <AppHeader
            mounted={mounted}
            activeTab={activeTab}
            locale={locale}
            t={t}
            userPlan={userPlan}
            notificationsEnabled={notificationsEnabled}
            onOpenSearch={() => setShowGlobalSearch(true)}
            onNavigateSettings={() => navigateAway("settings")}
            onToggleNotifications={() => {
              if (notificationsEnabled) {
                disableNotifications();
                void unsubscribeFromPush();
                analytics.notificationDisabled();
              } else {
                setShowNotifSheet(true);
              }
            }}
            onOpenUpgrade={() => setShowUpgradeModal(true)}
            onLogout={handleLogout}
            onToggleHelp={() => setActiveTab(activeTab === "help" ? "airports" : "help")}
          />

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
            <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-400 flex items-center justify-between gap-3 flex-wrap">
              <span>⚠️ {t.errorFAA} {error}</span>
              <button
                onClick={() => refresh()}
                className="px-4 py-2 rounded-xl bg-[#FFB800] hover:bg-[#FFC933] text-[#07070d] text-sm font-semibold transition-colors shrink-0"
              >
                {locale === "es" ? "Reintentar" : "Retry"}
              </button>
            </div>
          )}

          <TripTabBar
            locale={locale}
            activeTab={activeTab}
            userTrips={userTrips}
            draftTrip={draftTrip}
            draftId={DRAFT_ID}
            tabLabels={{ airports: t.tabAirports, search: t.tabSearch }}
            alertTripIds={alertTripIds}
            onTabChange={setActiveTab}
            onRenameTrip={(id, name) => renameTripDB(id, name, locale)}
            onDeleteTrip={deleteTrip}
            onDiscardDraft={discardDraft}
            onNewTrip={openCreateTripModal}
          />

          {mounted && showBanner && (
            <TimezoneBanner
              deviceTz={deviceTz ?? Intl.DateTimeFormat().resolvedOptions().timeZone}
              locale={locale}
              onAccept={handleAcceptDeviceTz}
              onDismiss={handleDismissBanner}
            />
          )}

          <TabContent
            activeTab={activeTab}
            locale={locale}
            t={t}
            mounted={mounted}
            tripsLoading={tripsLoading}
            userTrips={userTrips}
            userId={userId}
            userPlan={userPlan}
            userName={userName}
            userAvatar={userAvatar}
            statusMap={statusMap}
            weatherMap={weatherMap}
            metarMap={metarMap}
            watchedAirports={watchedAirports}
            sortedAirports={sortedAirports}
            changedAirports={changedAirports}
            loading={loading}
            smartAlerts={smartAlerts}
            userPosition={userPosition}
            draftTrip={draftTrip}
            showDeviceTz={showDeviceTz}
            deviceTz={deviceTz}
            showTripHistory={showTripHistory}
            globalNextFlightId={globalNextFlightId}
            onAddAirport={addAirportDB}
            onRemoveAirport={removeAirportDB}
            onDismissSmartAlert={dismissSmartAlert}
            onOpenCreateTrip={openCreateTripModal}
            onMarkOnboarded={markOnboarded}
            onSetActiveTab={setActiveTab}
            onDeleteTrip={deleteTrip}
            onCreateSimilar={handleCreateSimilar}
            onShowTripHistory={setShowTripHistory}
            onShowGlobalImport={setShowGlobalImport}
            onNavigateAway={navigateAway}
            onSetUserName={setUserName}
            onSetUserAvatar={setUserAvatar}
            onShowUpgrade={() => setShowUpgradeModal(true)}
            onOpenNotifSettings={() => setShowNotifSettings(true)}
            onSignOut={handleLogout}
            onExportAllData={() => exportAllTripsJSON(userTrips)}
            onToggleDeviceTz={handleToggleDeviceTz}
            onAddFlightDB={addFlightDB}
            onRemoveFlightDB={removeFlightDB}
            onAddAccommodationDB={addAccommodationDB}
            onRemoveAccommodationDB={removeAccommodationDB}
            onUpdateAccommodationDB={updateAccommodationDB}
            onDuplicateTrip={(tripId) => void handleDuplicateTrip(tripId)}
            onRenameTripFromPanel={renameTripFromPanel}
            onAddFlightToDraft={addFlightToDraft}
            onRemoveFlightFromDraft={removeFlightFromDraft}
            onAddAccommodationToDraft={addAccommodationToDraft}
            onRemoveAccommodationFromDraft={removeAccommodationFromDraft}
            onSaveDraftTrip={saveDraftTrip}
            onDiscardDraft={discardDraft}
            onSetDraftTrip={setDraftTrip}
          />

          <div className="hidden md:block pt-4 border-t border-gray-900 text-center text-xs text-gray-700">
            {t.footer}
          </div>
        </div>
      </div>

      {mounted && (
        <DesktopSidebar
          locale={locale}
          activeTab={activeTab}
          userTrips={userTrips}
          draftTrip={draftTrip}
          draftId={DRAFT_ID}
          tabLabels={{ airports: t.tabAirports, profile: locale === "es" ? "Mis stats" : "My stats" }}
          onNavigate={navigateAway}
          onNewTrip={openCreateTripModal}
          onDiscardDraft={discardDraft}
          onDeleteTrip={deleteTrip}
          onRenameTrip={(id, name) => renameTripDB(id, name, locale)}
          onRenameDraft={(name) => setDraftTrip((prev) => prev ? { ...prev, name } : prev)}
        />
      )}

      {mounted && (
        <BottomNav
          locale={locale}
          activeTab={activeTab}
          userTrips={userTrips}
          draftTrip={draftTrip}
          draftId={DRAFT_ID}
          tabLabels={{ airports: t.tabAirports, profile: locale === "es" ? "Mis stats" : "My stats" }}
          onNavigate={navigateAway}
          onNewTrip={openCreateTripModal}
          onDiscardDraft={discardDraft}
          onDeleteTrip={deleteTrip}
          onRenameTrip={(id, name) => renameTripDB(id, name, locale)}
          onRenameDraft={(name) => setDraftTrip((prev) => prev ? { ...prev, name } : prev)}
          userPlan={userPlan}
          tripCount={userTrips.length}
          onUpgrade={() => setShowUpgradeModal(true)}
          hasUpcomingFlight={hasUpcomingFlight}
          unreadCount={unreadCount}
          onNotificationsOpen={() => setShowNotificationsHub(true)}
        />
      )}

      {mounted && (
        <GlobalAlertBar
          trips={userTrips}
          locale={locale}
          onSelectTrip={(id) => setActiveTab(id)}
        />
      )}

      <AnimatePresence>
        {showSpotlight && (
          <DestinationSpotlight
            position={userPosition}
            locale={locale}
            onClose={() => setShowSpotlight(false)}
          />
        )}
      </AnimatePresence>

      {mounted && activeSavedTrip && (
        <TripAssistant
          trip={activeSavedTrip}
          statusMap={statusMap}
          locale={locale}
          deviceTz={deviceTz ?? Intl.DateTimeFormat().resolvedOptions().timeZone}
          userLocation={userPosition}
          currentWeather={activeSavedTrip.flights.length > 0 && weatherMap[activeSavedTrip.flights[0].originCode]
            ? { temperature: weatherMap[activeSavedTrip.flights[0].originCode].temperature, description: weatherMap[activeSavedTrip.flights[0].originCode].description }
            : null}
        />
      )}
    </>
  );
}
