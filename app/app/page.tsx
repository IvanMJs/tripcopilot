"use client";

import { useState, useEffect, useRef, useMemo, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
import { Bell, Gem, HelpCircle, LogOut, Settings, Search } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAirportStatus } from "@/hooks/useAirportStatus";
import { AirportCard } from "@/components/AirportCard";
import { AirportSearch } from "@/components/AirportSearch";
import { GlobalStatusBar } from "@/components/GlobalStatusBar";
import { RefreshCountdown } from "@/components/RefreshCountdown";
import { MyFlightsPanel } from "@/components/MyFlightsPanel";
import { FlightSearch } from "@/components/FlightSearch";
// TripPanel lazy-loaded — only rendered when a trip is selected
const TripPanel = lazy(() => import("@/components/TripPanel").then((m) => ({ default: m.TripPanel })));
import { TripListView } from "@/components/TripListView";
import { ItineraryImportModal } from "@/components/ItineraryImportModal";
import { ParsedFlight } from "@/lib/importFlights";
import { HelpPanel } from "@/components/HelpPanel";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CreateTripModal } from "@/components/CreateTripModal";
import { DeleteTripModal } from "@/components/DeleteTripModal";
import { DraftLeaveModal } from "@/components/DraftLeaveModal";
import { TripTabBar } from "@/components/TripTabBar";
import { BottomNav } from "@/components/BottomNav";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { TripPanelSkeleton } from "@/components/TripPanelSkeleton";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { AirportStatusMap, DelayStatus, TripFlight, Accommodation } from "@/lib/types";
import { AIRPORTS } from "@/lib/airports";
import { useLanguage } from "@/contexts/LanguageContext";
import { Locale } from "@/lib/i18n";
import { useWeather } from "@/hooks/useWeather";
import { useMetar } from "@/hooks/useMetar";
import { useServiceWorker } from "@/hooks/useServiceWorker";
import { useWatchedAirports } from "@/hooks/useWatchedAirports";
import { useUserTrips } from "@/hooks/useUserTrips";
import { NotificationSetupSheet } from "@/components/NotificationSetupSheet";
import { InstallBanner } from "@/components/InstallBanner";
import { RatingNudge } from "@/components/RatingNudge";
import { analytics } from "@/lib/analytics";
import { createClient } from "@/utils/supabase/client";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { OfflineBanner } from "@/components/OfflineBanner";
import { GlobalAlertBar } from "@/components/GlobalAlertBar";
import { useDeviceTimezone } from "@/hooks/useDeviceTimezone";
import { useGeolocation } from "@/hooks/useGeolocation";
import { isInTravelWindow } from "@/lib/travelWindow";
import { TimezoneBanner } from "@/components/TimezoneBanner";
import dynamic from "next/dynamic";
import { DepartureBoard } from "@/components/DepartureBoard";
import { SmartAlertsPanel } from "@/components/SmartAlertsPanel";
import { useSmartAlerts } from "@/hooks/useSmartAlerts";
import { useConnectionAlerts } from "@/hooks/useConnectionAlerts";
// Lazy-loaded tab views — only rendered when their respective tab is active
const DiscoverView = lazy(() => import("@/components/DiscoverView").then((m) => ({ default: m.DiscoverView })));
const MyProfileView = lazy(() => import("@/components/MyProfileView").then((m) => ({ default: m.MyProfileView })));
import { UpgradeModal } from "@/components/UpgradeModal";
import { NotificationSettings } from "@/components/NotificationSettings";
const SettingsView = lazy(() => import("@/components/SettingsView").then((m) => ({ default: m.SettingsView })));
import { PLANS } from "@/lib/mercadopago";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { KeyboardShortcutsHelp } from "@/components/KeyboardShortcutsHelp";
import { exportAllTripsJSON } from "@/lib/dataExport";
import { GlobalSearch } from "@/components/GlobalSearch";
import { NotificationsHubPanel } from "@/components/NotificationsHubPanel";
import { TripHistoryView } from "@/components/TripHistoryView";
import { getUnreadCount } from "@/lib/notificationsHub";
import { NewUserWelcomeView } from "@/components/NewUserWelcomeView";

const TripAssistant = dynamic(() => import("@/components/TripAssistant").then((m) => ({ default: m.TripAssistant })), { ssr: false });
const TripDebriefModal = dynamic(() => import("@/components/TripDebriefModal").then((m) => ({ default: m.TripDebriefModal })), { ssr: false });
const DestinationSpotlight = dynamic(() => import("@/components/DestinationSpotlight").then((m) => ({ default: m.DestinationSpotlight })), { ssr: false });

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
const DRAFT_ID   = "__draft__";
const EXAMPLE_ID = "__example__";

export default function HomePage() {
  const { t, locale, setLocale } = useLanguage();
  const { showSwNotification, subscribeToPush, unsubscribeFromPush } = useServiceWorker();
  const router = useRouter();
  const [showNotifSheet, setShowNotifSheet] = useState(false);
  const [showNotifSettings, setShowNotifSettings] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);

  // Initialize with a fixed default to avoid hydration mismatch.
  // On mount, both setMounted and the first-time tab redirect fire in the same
  // React 18 batch → single re-render, no visible airports→trips flash.
  const [activeTab, setActiveTabRaw] = useState<string>("airports");
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("right");
  const prevTabRef = useRef<string>("airports");
  const [mounted, setMounted] = useState(false);
  const [userPlan, setUserPlan] = useState<"free" | "explorer" | "pilot" | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

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
    saveDraftTrip: saveDraftTripDB,
    duplicateTripWithLocale: duplicateTripWithLocaleDB,
  } = useUserTrips();

  // All navigable tab IDs in display order for directional slide
  const allTabIds = ["today", "trips", "discover", "profile", "airports", "flights", ...userTrips.map((t) => t.id), DRAFT_ID, EXAMPLE_ID, "help", "settings"];

  function setActiveTab(newTab: string) {
    const prevIdx = allTabIds.indexOf(prevTabRef.current);
    const nextIdx = allTabIds.indexOf(newTab);
    if (prevIdx !== -1 && nextIdx !== -1) {
      setSlideDirection(nextIdx > prevIdx ? "right" : "left");
    }
    prevTabRef.current = newTab;
    setActiveTabRaw(newTab);
  }

  // Keyboard shortcuts help overlay
  const [showKbdHelp, setShowKbdHelp] = useState(false);

  // Create trip modal
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Global import modal — lets users import flights before a trip exists
  const [showGlobalImport, setShowGlobalImport] = useState(false);

  // Upgrade modal (shown when free-plan user hits trip limit)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Draft trip — local only, not persisted until "Guardar viaje"
  const [draftTrip, setDraftTrip] = useState<{ name: string; flights: TripFlight[]; accommodations: Accommodation[] } | null>(null);

  // Notifications hub
  const [showNotificationsHub, setShowNotificationsHub] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Trip history view
  const [showTripHistory, setShowTripHistory] = useState(false);

  // Destination Spotlight — triggered by ?explore=1 push notification deep-link
  const [showSpotlight, setShowSpotlight] = useState(false);

  // Prefill destination for CreateTripModal (used by "Create similar")
  const [prefillDestination, setPrefillDestination] = useState<string | undefined>(undefined);

  // Delete confirmation modal
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string; flightCount: number } | null>(null);

  // Trip debrief — shown once per trip after all flights have passed
  const [debriefTrip, setDebriefTrip] = useState<typeof userTrips[0] | null>(null);

  // Draft leave confirmation (shown when navigating away from unsaved draft)
  const [draftLeaveConfirm, setDraftLeaveConfirm] = useState<{ targetTab: string } | null>(null);

  // Device timezone detection
  const [showDeviceTz, setShowDeviceTz] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("tripcopilot-show-device-tz") === "true";
  });
  const [showBanner, setShowBanner] = useState(false);

  const { deviceTz, tzChanged, clearTzChanged } = useDeviceTimezone(locale);

  useEffect(() => {
    if (tzChanged) {
      setShowBanner(true);
      clearTzChanged();
    }
  }, [tzChanged, clearTzChanged]);

  function handleAcceptDeviceTz() {
    setShowDeviceTz(true);
    setShowBanner(false);
    localStorage.setItem("tripcopilot-show-device-tz", "true");
  }

  function handleDismissBanner() {
    setShowBanner(false);
  }

  function handleToggleDeviceTz() {
    setShowDeviceTz((v) => {
      const next = !v;
      localStorage.setItem("tripcopilot-show-device-tz", String(next));
      return next;
    });
  }

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      supabase.from("user_profiles").select("plan").eq("id", user.id).single()
        .then(({ data }) => {
          const plan = (data as { plan?: string } | null)?.plan;
          setUserPlan(plan === "pilot" ? "pilot" : plan === "explorer" ? "explorer" : "free");
        });
      // Update last_seen_at (throttle: only if >30min since last update)
      supabase.from("user_profiles").select("last_seen_at").eq("id", user.id).single()
        .then(({ data }) => {
          const lastSeen = (data as { last_seen_at?: string | null } | null)?.last_seen_at
            ? new Date((data as { last_seen_at: string }).last_seen_at)
            : null;
          const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
          if (!lastSeen || lastSeen < thirtyMinAgo) {
            // Fire-and-forget: void makes the dangling promise intent explicit
            void supabase.from("user_profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", user.id);
          }
        });
    });
  }, []);

  useEffect(() => {
    void fetch("/api/auth/welcome", { method: "POST" });
  }, []);

  useEffect(() => {
    setMounted(true);
    // Migrate legacy key so returning users are not re-shown the welcome view
    if (localStorage.getItem("tripcopilot-onboarded") && !localStorage.getItem("tc-onboarded")) {
      localStorage.setItem("tc-onboarded", "true");
    }
    if (!localStorage.getItem("tc-onboarded")) {
      setActiveTabRaw("trips");
      prevTabRef.current = "trips";
    }
  }, []);

  // Compute unread notification count on mount (client-only)
  useEffect(() => {
    setUnreadCount(getUnreadCount());
  }, []);

  // Check-in push notifications
  useEffect(() => {
    if (!mounted) return;
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const allFlights = userTrips.flatMap(t => t.flights.map(f => ({
      code: f.flightCode,
      isoDate: f.isoDate,
      route: `${f.originCode}→${f.destinationCode}`,
      time: f.departureTime ?? "",
    })));

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, locale, userTrips]);

  // Trip debrief: check once when trips load
  useEffect(() => {
    if (!mounted || userTrips.length === 0) return;
    const todayISO = new Date().toISOString().slice(0, 10);
    for (const trip of userTrips) {
      if (trip.flights.length === 0) continue;
      const allPast = trip.flights.every((f) => f.isoDate < todayISO);
      if (!allPast) continue;
      const key = `tc_debrief_${trip.id}`;
      if (localStorage.getItem(key)) continue;
      localStorage.setItem(key, "1");
      setDebriefTrip(trip);
      break; // show one at a time
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, userTrips]);

  // Open Destination Spotlight when navigated via ?explore=1 push notification
  useEffect(() => {
    if (tripsLoading) return;
    if (typeof window === "undefined") return;
    const explore = new URL(window.location.href).searchParams.get("explore");
    if (explore === "1" && isInTravelWindow(userTrips)) {
      setShowSpotlight(true);
    }
    window.history.replaceState({}, "", "/app");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripsLoading]);

  // Aggregate trip airports
  const tripAirports = userTrips.flatMap((t) =>
    t.flights.flatMap((f) => [f.originCode, f.destinationCode])
  );

  const globalNextFlightId = (() => {
    const todayIso = new Date().toISOString().slice(0, 10);
    return userTrips
      .flatMap((t) => t.flights)
      .filter((f) => f.isoDate >= todayIso)
      .sort((a, b) => a.isoDate.localeCompare(b.isoDate) || (a.departureTime ?? "").localeCompare(b.departureTime ?? ""))[0]?.id ?? null;
  })();

  const hasUpcomingFlight = (() => {
    const nowMs = Date.now();
    const fortyEightHoursMs = 48 * 60 * 60 * 1000;
    return userTrips.flatMap((t) => t.flights).some((f) => {
      const flightMs = new Date(f.isoDate + "T00:00:00").getTime();
      return flightMs >= nowMs && flightMs - nowMs <= fortyEightHoursMs;
    });
  })();

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
  } = useAirportStatus(5, locale, showSwNotification);

  // International airport status (AeroDataBox)
  const [intlStatusMap, setIntlStatusMap] = useState<AirportStatusMap>({});

  useEffect(() => {
    const intlAirports = Array.from(
      new Set([...watchedAirports, ...tripAirports])
    ).filter((iata) => AIRPORTS[iata]?.isFAA === false);

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
          locale === "es"
            ? "No se pudo actualizar el estado de aeropuertos internacionales"
            : "Could not update international airport status",
          { id: "intl-status-error", duration: 4000 },
        );
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userTrips, watchedAirports, locale, lastUpdated]);

  const statusMap: AirportStatusMap = { ...intlStatusMap, ...faaStatusMap };

  // ── Smart alerts ─────────────────────────────────────────────────────────
  const { alerts: smartAlerts, dismiss: dismissSmartAlert } = useSmartAlerts(userTrips, statusMap, locale);

  // ── Connection alerts (side-effect: fires push notifications) ────────────
  useConnectionAlerts(userTrips, statusMap, locale);

  // ── Offline sync ──────────────────────────────────────────────────────────
  const { isOnline: offlineIsOnline, lastSync } = useOfflineSync(userId, userTrips, statusMap);

  const allAirportsForWeather = Array.from(
    new Set([...watchedAirports, ...FLIGHT_AIRPORTS, ...tripAirports])
  );
  const weatherMap = useWeather(allAirportsForWeather, locale);
  const metarMap   = useMetar(watchedAirports);
  const userPosition = useGeolocation(true);

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

  // ── Onboarding ────────────────────────────────────────────────────────────

  function markOnboarded() {
    localStorage.setItem("tripcopilot-onboarded", "true");
    localStorage.setItem("tc-onboarded", "true");
  }

  // ── Trip management ───────────────────────────────────────────────────────

  async function openCreateTripModal() {
    if (draftTrip) { setActiveTab(DRAFT_ID); return; }

    // Soft free-plan limit check — non-blocking: if query fails, allow creating trip
    if (userTrips.length >= PLANS.free.maxTrips) {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("plan")
            .eq("id", user.id)
            .single();
          const plan = (profile as { plan?: string } | null)?.plan ?? "free";
          if (plan === "free") {
            setShowUpgradeModal(true);
            return;
          }
        }
      } catch {
        // fail open — allow creating trip if check fails
      }
    }

    setShowCreateModal(true);
  }

  function confirmCreateTrip(name: string, _destination?: string) {
    setDraftTrip({ name, flights: [], accommodations: [] });
    setActiveTab(DRAFT_ID);
    setShowCreateModal(false);
    setPrefillDestination(undefined);
  }

  function handleGlobalImport(flights: ParsedFlight[]) {
    if (flights.length === 0) return;
    // Derive a trip name from the first flight's route and date
    const first = flights[0];
    const tripName = locale === "es"
      ? `Viaje ${first.originCode}–${first.destinationCode}`
      : `Trip ${first.originCode}–${first.destinationCode}`;
    const tripFlights = flights.map((f) => ({
      ...f,
      id: `draft-${crypto.randomUUID()}`,
      arrivalBuffer: f.arrivalBuffer ?? 2,
    }));
    setDraftTrip({ name: tripName, flights: tripFlights, accommodations: [] });
    setShowGlobalImport(false);
    setActiveTab(DRAFT_ID);
  }

  async function saveDraftTrip() {
    if (!draftTrip) return;
    // Single atomic PostgreSQL transaction via RPC — no partial saves
    const result = await saveDraftTripDB(draftTrip.name, draftTrip.flights, draftTrip.accommodations);
    if (result && "id" in result) {
      toast.success(locale === "es" ? "Viaje guardado ✓" : "Trip saved ✓");
      setDraftTrip(null);
      setActiveTab(result.id);
    } else if (result && "error" in result && result.error === "auth") {
      toast.error(locale === "es" ? "Sesión expirada. Volvé a iniciar sesión." : "Session expired. Please sign in again.");
    } else {
      toast.error(locale === "es" ? "Error al guardar. Intentá de nuevo." : "Save failed. Please try again.");
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
      renameTripDB(id, newName, locale);
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
    const newId = await duplicateTripWithLocaleDB(tripId, locale);
    if (newId) setActiveTab(newId);
  }

  function handleCreateSimilar(trip: typeof userTrips[0]) {
    // Extract destination from the first flight of the trip
    const firstFlight = trip.flights[0];
    const destination = firstFlight?.destinationCode ?? "";
    setPrefillDestination(destination || undefined);
    openCreateTripModal();
  }

  function navigateAway(targetTab: string) {
    if (activeTab === DRAFT_ID && draftTrip) {
      setDraftLeaveConfirm({ targetTab });
    } else {
      setActiveTab(targetTab);
    }
  }

  // ── P5: Background tint — highlight trips with today's flights ────────────
  const today = new Date().toISOString().slice(0, 10);

  const activeTrip = userTrips[0] ?? null;
  const hasCriticalDelay = useMemo(() => {
    if (!activeTrip) return false;
    return activeTrip.flights.some((f) => f.isoDate === today);
  }, [activeTrip, today]);

  // ── S4: Trips that have today's flights (notification dots) ───────────────
  const alertTripIds = useMemo(() => {
    return userTrips
      .filter((t) => t.flights.some((f) => f.isoDate === today))
      .map((t) => t.id);
  }, [userTrips, today]);

  // ── Global search keyboard shortcut (Ctrl+K / Cmd+K) ─────────────────────
  useEffect(() => {
    function handleSearchShortcut(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setShowGlobalSearch((v) => !v);
      }
    }
    window.addEventListener("keydown", handleSearchShortcut);
    return () => window.removeEventListener("keydown", handleSearchShortcut);
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
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
    onHelp: () => setShowKbdHelp((v) => !v),
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          className: '',
          style: {
            background: '#1a1a2e',
            color: '#e8e8f0',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#080810' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#080810' } },
        }}
        containerStyle={{ top: 16 }}
      />

      <KeyboardShortcutsHelp
        open={showKbdHelp}
        onClose={() => setShowKbdHelp(false)}
        locale={locale}
      />

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        locale={locale}
      />

      {/* Global search overlay */}
      <GlobalSearch
        locale={locale}
        userTrips={userTrips}
        isOpen={showGlobalSearch}
        onClose={() => setShowGlobalSearch(false)}
        onSelectTrip={(id) => { navigateAway(id); }}
        onWatchAirport={(iata) => { addAirportDB(iata); navigateAway("airports"); }}
      />

      <NotificationSetupSheet
        open={showNotifSheet}
        onClose={() => {
          setShowNotifSheet(false);
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            requestNotifications();
            subscribeToPush();
            analytics.notificationEnabled();
          }
        }}
        locale={locale}
      />

      <NotificationSettings
        open={showNotifSettings}
        onClose={() => setShowNotifSettings(false)}
        locale={locale}
      />

      {showCreateModal && (
        <CreateTripModal
          locale={locale}
          tripCount={userTrips.length}
          onClose={() => { setShowCreateModal(false); setPrefillDestination(undefined); }}
          onConfirm={confirmCreateTrip}
          prefillDestination={prefillDestination}
        />
      )}

      {showGlobalImport && (
        <ItineraryImportModal
          isOpen={showGlobalImport}
          onClose={() => setShowGlobalImport(false)}
          onImport={handleGlobalImport}
          locale={locale}
          tripId={DRAFT_ID}
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

      {debriefTrip && (
        <TripDebriefModal
          trip={debriefTrip}
          locale={locale}
          onClose={() => setDebriefTrip(null)}
        />
      )}

      {/* Notifications hub panel */}
      <NotificationsHubPanel
        open={showNotificationsHub}
        locale={locale}
        onClose={() => { setShowNotificationsHub(false); setUnreadCount(getUnreadCount()); }}
      />

      {/* Trip history view — full-screen overlay */}
      {showTripHistory && (
        <div className="fixed inset-0 z-50 bg-surface-darker overflow-y-auto">
          <TripHistoryView
            trips={userTrips}
            locale={locale}
            onCreateSimilar={handleCreateSimilar}
            onViewTrip={(trip) => { setShowTripHistory(false); setActiveTab(trip.id); }}
            onClose={() => setShowTripHistory(false)}
          />
        </div>
      )}

      {/* Offline banner */}
      {mounted && (
        <div className="fixed top-0 inset-x-0 z-50">
          <OfflineBanner isOnline={offlineIsOnline} lastSync={lastSync} locale={locale} />
        </div>
      )}

      <div className={`min-h-screen bg-gray-950 px-4 pb-nav md:pb-6 md:pl-72 ${!offlineIsOnline ? "pt-14 md:pt-16" : "pt-4 md:pt-6"}`}
        style={{ '--bg-tint': hasCriticalDelay ? 'rgba(239,68,68,0.008)' : 'transparent' } as React.CSSProperties}
      >
        <div className="mx-auto max-w-6xl space-y-4 md:space-y-6">

          {/* ── Header ── */}
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex md:hidden items-center">
                <img src="/tripcopliot-avatar.svg" alt="TripCopilot" className="h-10 w-auto" />
              </div>
              <p className="hidden md:block mt-1 text-sm text-gray-400 font-medium">{t.appSubtitle}</p>
            </div>

            <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
              {/* Global search button */}
              {mounted && (
                <button
                  onClick={() => setShowGlobalSearch(true)}
                  title={locale === "es" ? "Buscar (Ctrl+K)" : "Search (Ctrl+K)"}
                  aria-label={locale === "es" ? "Buscar" : "Search"}
                  className="flex items-center justify-center rounded-md border border-gray-700 bg-gray-900 p-1.5 text-gray-500 hover:text-gray-300 hover:border-gray-600 transition-colors"
                >
                  <Search className="h-3.5 w-3.5" />
                </button>
              )}

              {/* Settings gear — opens settings tab */}
              {mounted && (
                <button
                  onClick={() => navigateAway("settings")}
                  title={locale === "en" ? "Settings" : "Ajustes"}
                  aria-label={locale === "es" ? "Ajustes" : "Settings"}
                  className={`flex items-center justify-center rounded-md border p-1.5 transition-colors ${
                    activeTab === "settings"
                      ? "border-violet-700/60 bg-violet-900/20 text-violet-400"
                      : "border-gray-700 bg-gray-900 text-gray-500 hover:text-gray-300 hover:border-gray-600"
                  }`}
                >
                  <Settings className="h-3.5 w-3.5" />
                </button>
              )}

              {/* Notification bell */}
              {mounted && (
                <button
                  onClick={() => {
                    if (notificationsEnabled) {
                      disableNotifications();
                      unsubscribeFromPush(); // remove from server so cron stops sending
                      analytics.notificationDisabled();
                    } else {
                      setShowNotifSheet(true);
                    }
                  }}
                  title={
                    notificationsEnabled
                      ? (locale === "en" ? "Notifications ON — tap to disable" : "Alertas activas — tap para desactivar")
                      : (locale === "en" ? "Enable notifications" : "Activar alertas")
                  }
                  aria-label={
                    notificationsEnabled
                      ? (locale === "es" ? "Notificaciones push activas" : "Push notifications on")
                      : (locale === "es" ? "Notificaciones push inactivas" : "Push notifications off")
                  }
                  aria-pressed={notificationsEnabled}
                  className={`flex items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-xs transition-colors ${
                    notificationsEnabled
                      ? "border-blue-700/60 bg-blue-900/20 text-blue-400"
                      : "border-gray-700 bg-gray-900 text-gray-500 hover:text-gray-300"
                  }`}
                >
                  <Bell className={`h-3.5 w-3.5 ${notificationsEnabled ? "text-blue-400" : ""}`} />
                  {notificationsEnabled && <span className="text-xs font-semibold hidden sm:inline">ON</span>}
                </button>
              )}

              {/* Upgrade CTA — free plan only */}
              {userPlan === "free" && (
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="flex items-center justify-center gap-1.5 rounded-md border border-amber-500/50 bg-amber-500/10 px-2.5 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 hover:border-amber-400/70 transition-colors"
                  title={locale === "es" ? "Mejorar a Premium" : "Upgrade to Premium"}
                >
                  <Gem className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Pro</span>
                </button>
              )}

              {/* Mobile logout */}
              <button
                onClick={handleLogout}
                className="flex items-center justify-center rounded-md border border-gray-700 bg-gray-900 p-1.5 text-gray-500 hover:text-red-400 hover:border-red-800/60 transition-colors md:hidden"
                title={locale === "en" ? "Sign out" : "Cerrar sesión"}
                aria-label={locale === "es" ? "Cerrar sesión" : "Sign out"}
              >
                <LogOut className="h-3.5 w-3.5" />
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
            <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-400 flex items-center justify-between gap-3 flex-wrap">
              <span>⚠️ {t.errorFAA} {error}</span>
              <button
                onClick={() => refresh()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors shrink-0"
              >
                {locale === "es" ? "Reintentar" : "Retry"}
              </button>
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
            alertTripIds={alertTripIds}
            onTabChange={setActiveTab}
            onRenameTrip={(id, name) => renameTripDB(id, name, locale)}
            onDeleteTrip={deleteTrip}
            onDiscardDraft={discardDraft}
            onNewTrip={openCreateTripModal}
          />

          {/* ── Timezone banner ── */}
          {mounted && showBanner && (
            <TimezoneBanner
              deviceTz={deviceTz}
              locale={locale}
              onAccept={handleAcceptDeviceTz}
              onDismiss={handleDismissBanner}
            />
          )}

          {/* ── Tab content ── */}
          <ErrorBoundary>
            <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
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
                {loading && Object.keys(statusMap).length === 0 ? (
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="rounded-2xl border border-white/[0.07] h-36 animate-pulse bg-white/[0.03]" />
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {sortedAirports.map((iata) => (
                      <AirportCard
                        key={iata}
                        iata={iata}
                        status={statusMap[iata]}
                        onRemove={() => removeAirportDB(iata)}
                        weather={weatherMap[iata]}
                        metar={metarMap[iata]}
                        highlight={changedAirports.has(iata)}
                      />
                    ))}
                    <AirportSearch watchedAirports={watchedAirports} onAdd={(iata) => addAirportDB(iata)} />
                  </div>
                )}
              </div>
            )}

            {activeTab === "today" && (
              <div className="space-y-4">
                <SmartAlertsPanel alerts={smartAlerts} onDismiss={dismissSmartAlert} locale={locale} />
                {!tripsLoading && userTrips.length === 0 && (
                  <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.01] py-8 flex flex-col items-center text-center gap-4">
                    <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
                      {locale === "es"
                        ? "Agregá tu primer viaje para ver tu briefing de hoy"
                        : "Add your first trip to see today's briefing"}
                    </p>
                    <button
                      onClick={openCreateTripModal}
                      className="rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-sm font-semibold px-5 py-2.5 transition-all"
                    >
                      {locale === "es" ? "Crear viaje" : "Create trip"}
                    </button>
                  </div>
                )}
                <DepartureBoard trips={userTrips} statusMap={statusMap} locale={locale} geoPosition={userPosition} userPlan={userPlan ?? undefined} onUpgrade={() => setShowUpgradeModal(true)} />
              </div>
            )}

            {activeTab === "flights" && (
              <MyFlightsPanel statusMap={statusMap} weatherMap={weatherMap} />
            )}

            {activeTab === "profile" && (
              <Suspense fallback={<LoadingSkeleton />}>
                <MyProfileView
                  trips={userTrips}
                  locale={locale}
                  userPlan={userPlan}
                  userId={userId}
                  onUpgrade={() => setShowUpgradeModal(true)}
                />
              </Suspense>
            )}

            {activeTab === "discover" && (
              <Suspense fallback={<LoadingSkeleton />}>
                <DiscoverView
                  trips={userTrips}
                  locale={locale}
                  userPlan={userPlan}
                  onUpgrade={() => setShowUpgradeModal(true)}
                  userId={userId}
                />
              </Suspense>
            )}

            {activeTab === "help" && (
              <HelpPanel />
            )}

            {activeTab === "settings" && (
              <Suspense fallback={<LoadingSkeleton />}>
                <SettingsView
                  locale={locale}
                  userPlan={userPlan}
                  onOpenNotifSettings={() => setShowNotifSettings(true)}
                  onSignOut={handleLogout}
                  onUpgrade={() => setShowUpgradeModal(true)}
                  onExportAllData={() => exportAllTripsJSON(userTrips)}
                />
              </Suspense>
            )}

            {activeTab === "trips" && (
              <>
                {mounted && !tripsLoading && userTrips.length === 0 && !localStorage.getItem("tc-onboarded") ? (
                  <NewUserWelcomeView
                    statusMap={Object.fromEntries(
                      Object.entries(statusMap).map(([k, v]) => [k, { status: v.status, lastChecked: v.lastChecked }])
                    )}
                    locale={locale}
                    onAddFlight={() => {
                      markOnboarded();
                      void openCreateTripModal();
                    }}
                  />
                ) : (
                  <TripListView
                    trips={userTrips}
                    statusMap={statusMap}
                    locale={locale}
                    loading={tripsLoading}
                    onSelect={(id) => setActiveTab(id)}
                    onCreateTrip={openCreateTripModal}
                    onDeleteTrip={deleteTrip}
                    onCreateSimilar={handleCreateSimilar}
                    onViewArchivedTrip={() => setShowTripHistory(true)}
                    onAIImport={() => setShowGlobalImport(true)}
                    onSwitchTab={(tab) => navigateAway(tab)}
                  />
                )}
                {!tripsLoading && userTrips.length >= PLANS.free.maxTrips && (
                  <div className="mx-4 mb-4 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-violet-300">
                        {locale === "es" ? "Plan gratuito completo" : "Free plan limit reached"}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {locale === "es"
                          ? `Tenés ${PLANS.free.maxTrips}/${PLANS.free.maxTrips} viajes. Agregá más con Premium.`
                          : `You have ${PLANS.free.maxTrips}/${PLANS.free.maxTrips} trips. Add more with Premium.`}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowUpgradeModal(true)}
                      className="shrink-0 rounded-lg bg-violet-600 hover:bg-violet-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                    >
                      Premium ✦
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Trip loading skeleton */}
            {tripsLoading && (activeTab === "trips" || userTrips.some((t) => t.id === activeTab) || activeTab === DRAFT_ID) && (
              <TripPanelSkeleton />
            )}

            {/* Draft trip panel */}
            {!tripsLoading && draftTrip && activeTab === DRAFT_ID && (
              <Suspense fallback={<TripPanelSkeleton />}>
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
                  showDeviceTz={showDeviceTz}
                  deviceTz={deviceTz}
                  onToggleDeviceTz={handleToggleDeviceTz}
                  geoPosition={userPosition}
                />
              </Suspense>
            )}

            {/* Saved trip panels */}
            {!tripsLoading && userTrips.map((trip) =>
              activeTab === trip.id ? (
                <Suspense key={trip.id} fallback={<TripPanelSkeleton />}>
                  <TripPanel
                    trip={trip}
                    statusMap={statusMap}
                    weatherMap={weatherMap}
                    globalNextFlightId={globalNextFlightId}
                    onAddFlight={(_, flight) => {
                      const duplicate = trip.flights.some(
                        (f) => f.flightCode === flight.flightCode && f.isoDate === flight.isoDate,
                      );
                      if (duplicate) {
                        toast.error(
                          locale === "es"
                            ? `${flight.flightCode} ya está en este viaje`
                            : `${flight.flightCode} already in this trip`,
                        );
                        return;
                      }
                      void addFlightDB(trip.id, flight).then((newId) => {
                        if (newId && flight.destinationCode) {
                          void fetch("/api/friends/notify-destination", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ destinationCode: flight.destinationCode }),
                          });
                        }
                      });
                    }}
                    onRemoveFlight={(_, flightId) => removeFlightDB(trip.id, flightId)}
                    onAddAccommodation={(_, acc) => addAccommodationDB(trip.id, acc)}
                    onRemoveAccommodation={(_, accId) => removeAccommodationDB(trip.id, accId)}
                    onUpdateAccommodation={(_, accId, updates) => updateAccommodationDB(trip.id, accId, updates)}
                    onDuplicateTrip={() => handleDuplicateTrip(trip.id)}
                    onDeleteTrip={() => deleteTrip(trip.id)}
                    onRenameTrip={(name) => renameTripFromPanel(trip.id, name)}
                    showDeviceTz={showDeviceTz}
                    deviceTz={deviceTz}
                    onToggleDeviceTz={handleToggleDeviceTz}
                    geoPosition={userPosition}
                    userPlan={userPlan}
                    onUpgrade={() => setShowUpgradeModal(true)}
                  />
                </Suspense>
              ) : null
            )}
            </motion.div>
            </AnimatePresence>
          </ErrorBoundary>

          {/* Footer — desktop only */}
          <div className="hidden md:block pt-4 border-t border-gray-900 text-center text-xs text-gray-700">
            {t.footer}
          </div>
        </div>
      </div>

      {/* ── PWA install nudge (30s Android / 5s iOS, 7-day dismissed TTL) ── */}
      {mounted && <InstallBanner locale={locale} />}

      {/* ── Rating nudge (shown once after user saves 3rd trip) ── */}
      {mounted && <RatingNudge showAfterTrips={3} tripCount={userTrips.length} />}

      {/* ── Desktop sidebar navigation ── */}
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

      {/* ── Mobile bottom navigation ── */}
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

      {/* ── Global alert bar — today's flights ── */}
      {mounted && (
        <GlobalAlertBar
          trips={userTrips}
          locale={locale}
          onSelectTrip={(id) => setActiveTab(id)}
        />
      )}

      {/* ── Destination Spotlight — triggered by ?explore=1 push notification ── */}
      <AnimatePresence>
        {showSpotlight && (
          <DestinationSpotlight
            position={userPosition}
            locale={locale}
            onClose={() => setShowSpotlight(false)}
          />
        )}
      </AnimatePresence>

      {/* ── AI Trip Assistant FAB — shown for active saved trips only ── */}
      {mounted && (() => {
        const activeSavedTrip = userTrips.find((t) => t.id === activeTab) ?? null;
        if (!activeSavedTrip) return null;
        return (
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
        );
      })()}
    </>
  );
}
