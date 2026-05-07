"use client";

import { createContext, useContext, useEffect, useMemo, useState, Dispatch, SetStateAction, ReactNode } from "react";
import toast from "react-hot-toast";
import { TripFlight, Accommodation, TripTab } from "@/lib/types";
import { DRAFT_ID } from "@/lib/constants";
import { useUserTrips } from "@/hooks/useUserTrips";
import { useLanguage } from "@/contexts/LanguageContext";
import { ParsedFlight } from "@/lib/importFlights";
import { analytics } from "@/lib/analytics";
import { createClient } from "@/utils/supabase/client";
import { PLANS } from "@/lib/mercadopago";
import { isInTravelWindow } from "@/lib/travelWindow";

interface TripManagementProviderProps {
  children: ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

interface TripManagementContextValue {
  // State
  draftTrip: { name: string; flights: TripFlight[]; accommodations: Accommodation[] } | null;
  showCreateModal: boolean;
  showGlobalImport: boolean;
  showUpgradeModal: boolean;
  deleteConfirm: { id: string; name: string; flightCount: number } | null;
  debriefTrip: TripTab | null;
  draftLeaveConfirm: { targetTab: string } | null;
  prefillDestination: string | undefined;
  showTripHistory: boolean;
  showSpotlight: boolean;

  // State setters (for components that need direct access)
  setShowCreateModal: (v: boolean) => void;
  setShowGlobalImport: (v: boolean) => void;
  setShowUpgradeModal: (v: boolean) => void;
  setDeleteConfirm: (v: { id: string; name: string; flightCount: number } | null) => void;
  setDebriefTrip: (v: TripTab | null) => void;
  setDraftLeaveConfirm: (v: { targetTab: string } | null) => void;
  setPrefillDestination: (v: string | undefined) => void;
  setShowTripHistory: (v: boolean) => void;
  setShowSpotlight: (v: boolean) => void;
  setDraftTrip: Dispatch<SetStateAction<{ name: string; flights: TripFlight[]; accommodations: Accommodation[] } | null>>;

  // Handlers
  openCreateTripModal: () => Promise<void>;
  confirmCreateTrip: (name: string, destination?: string) => void;
  handleGlobalImport: (flights: ParsedFlight[]) => void;
  saveDraftTrip: () => Promise<void>;
  discardDraft: () => void;
  addFlightToDraft: (tripId: string, flight: TripFlight) => void;
  removeFlightFromDraft: (tripId: string, flightId: string) => void;
  addAccommodationToDraft: (tripId: string, acc: Omit<Accommodation, "id" | "tripId">) => void;
  removeAccommodationFromDraft: (tripId: string, accId: string) => void;
  renameTripFromPanel: (id: string, newName: string) => void;
  deleteTrip: (id: string) => void;
  confirmDeleteTrip: () => void;
  handleDuplicateTrip: (tripId: string) => Promise<void>;
  handleCreateSimilar: (trip: TripTab) => void;
  navigateAway: (targetTab: string) => void;

  // Re-exposed from useUserTrips
  userTrips: TripTab[];
  tripsLoading: boolean;
  createTripDB: (name: string, locale?: "es" | "en") => Promise<string | null>;
  deleteTripDB: (id: string) => Promise<void>;
  renameTripDB: (id: string, name: string, locale?: "es" | "en") => Promise<void>;
  addFlightDB: (tripId: string, flight: TripFlight) => Promise<string | null>;
  removeFlightDB: (tripId: string, flightId: string) => Promise<void>;
  addAccommodationDB: (tripId: string, acc: Omit<Accommodation, "id" | "tripId">) => Promise<void>;
  removeAccommodationDB: (tripId: string, accId: string) => Promise<void>;
  updateAccommodationDB: (tripId: string, accId: string, updates: Pick<Accommodation, "name" | "checkInTime" | "checkOutTime" | "confirmationCode" | "address">) => Promise<void>;
  duplicateTripWithLocaleDB: (tripId: string, locale?: "es" | "en") => Promise<string | null>;

  // Derived values
  tripAirports: string[];
  globalNextFlightId: string | null;
  hasUpcomingFlight: boolean;
  alertTripIds: string[];
  today: string;
}

const TripManagementContext = createContext<TripManagementContextValue | null>(null);

export function TripManagementProvider({ children, activeTab, setActiveTab }: TripManagementProviderProps) {
  const { locale } = useLanguage();

  const {
    trips: userTrips,
    loading: tripsLoading,
    createTrip: createTripDB,
    deleteTrip: deleteTripDB,
    renameTrip: renameTripDB,
    addFlight: addFlightDB,
    removeFlight: removeFlightDB,
    addAccommodation: addAccommodationDB,
    removeAccommodation: removeAccommodationDB,
    updateAccommodation: updateAccommodationDB,
    saveDraftTrip: saveDraftTripDB,
    duplicateTripWithLocale: duplicateTripWithLocaleDB,
  } = useUserTrips();

  // ── State ─────────────────────────────────────────────────────────────────

  const [draftTrip, setDraftTrip] = useState<{ name: string; flights: TripFlight[]; accommodations: Accommodation[] } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGlobalImport, setShowGlobalImport] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string; flightCount: number } | null>(null);
  const [debriefTrip, setDebriefTrip] = useState<TripTab | null>(null);
  const [draftLeaveConfirm, setDraftLeaveConfirm] = useState<{ targetTab: string } | null>(null);
  const [prefillDestination, setPrefillDestination] = useState<string | undefined>(undefined);
  const [showTripHistory, setShowTripHistory] = useState(false);
  const [showSpotlight, setShowSpotlight] = useState(false);

  // ── Effects ───────────────────────────────────────────────────────────────

  // Trip debrief: check once when trips load
  useEffect(() => {
    if (userTrips.length === 0) return;
    const todayISO = new Date().toISOString().slice(0, 10);
    for (const trip of userTrips) {
      if (trip.flights.length === 0) continue;
      const allPast = trip.flights.every((f) => f.isoDate < todayISO);
      if (!allPast) continue;
      const key = `tc_debrief_${trip.id}`;
      if (localStorage.getItem(key)) continue;
      localStorage.setItem(key, "1");
      setDebriefTrip(trip);
      break;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userTrips]);

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

  // ── Derived values ────────────────────────────────────────────────────────

  const tripAirports = useMemo(
    () => userTrips.flatMap((t) => t.flights.flatMap((f) => [f.originCode, f.destinationCode])),
    [userTrips],
  );

  const today = new Date().toISOString().slice(0, 10);

  const globalNextFlightId = useMemo((): string | null => {
    const todayIso = new Date().toISOString().slice(0, 10);
    return (
      userTrips
        .flatMap((t) => t.flights)
        .filter((f) => f.isoDate >= todayIso)
        .sort((a, b) => a.isoDate.localeCompare(b.isoDate) || (a.departureTime ?? "").localeCompare(b.departureTime ?? ""))[0]?.id ?? null
    );
  }, [userTrips]);

  const hasUpcomingFlight = useMemo(() => {
    const nowMs = Date.now();
    const fortyEightHoursMs = 48 * 60 * 60 * 1000;
    return userTrips.flatMap((t) => t.flights).some((f) => {
      const flightMs = new Date(f.isoDate + "T00:00:00").getTime();
      return flightMs >= nowMs && flightMs - nowMs <= fortyEightHoursMs;
    });
  }, [userTrips]);

  const alertTripIds = useMemo(
    () => userTrips.filter((t) => t.flights.some((f) => f.isoDate === today)).map((t) => t.id),
    [userTrips, today],
  );

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function openCreateTripModal() {
    if (draftTrip) { setActiveTab(DRAFT_ID); return; }

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
    analytics.aiImportSuccess({ flightCount: flights.length });
    const alreadyPrompted = typeof localStorage !== "undefined" && localStorage.getItem("tc-notif-prompted");
    const alreadyGranted = typeof Notification !== "undefined" && Notification.permission === "granted";
    if (!alreadyPrompted && !alreadyGranted) {
      setTimeout(() => {
        localStorage.setItem("tc-notif-prompted", "1");
        analytics.notificationPrompted();
      }, 800);
    }
  }

  async function saveDraftTrip() {
    if (!draftTrip) return;
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
      void renameTripDB(id, newName, locale);
    }
  }

  function deleteTrip(id: string) {
    const trip = userTrips.find((t) => t.id === id);
    if (!trip) return;
    setDeleteConfirm({ id, name: trip.name, flightCount: trip.flights.length });
  }

  function confirmDeleteTrip() {
    if (!deleteConfirm) return;
    void deleteTripDB(deleteConfirm.id);
    if (activeTab === deleteConfirm.id) setActiveTab("trips");
    setDeleteConfirm(null);
  }

  async function handleDuplicateTrip(tripId: string) {
    const newId = await duplicateTripWithLocaleDB(tripId, locale);
    if (newId) setActiveTab(newId);
  }

  function handleCreateSimilar(trip: TripTab) {
    const firstFlight = trip.flights[0];
    const destination = firstFlight?.destinationCode ?? "";
    setPrefillDestination(destination || undefined);
    void openCreateTripModal();
  }

  function navigateAway(targetTab: string) {
    if (activeTab === DRAFT_ID && draftTrip) {
      setDraftLeaveConfirm({ targetTab });
    } else {
      setActiveTab(targetTab);
    }
  }

  // ── Context value ─────────────────────────────────────────────────────────

  const value: TripManagementContextValue = {
    // State
    draftTrip,
    showCreateModal,
    showGlobalImport,
    showUpgradeModal,
    deleteConfirm,
    debriefTrip,
    draftLeaveConfirm,
    prefillDestination,
    showTripHistory,
    showSpotlight,

    // Setters
    setDraftTrip,
    setShowCreateModal,
    setShowGlobalImport,
    setShowUpgradeModal,
    setDeleteConfirm,
    setDebriefTrip,
    setDraftLeaveConfirm,
    setPrefillDestination,
    setShowTripHistory,
    setShowSpotlight,

    // Handlers
    openCreateTripModal,
    confirmCreateTrip,
    handleGlobalImport,
    saveDraftTrip,
    discardDraft,
    addFlightToDraft,
    removeFlightFromDraft,
    addAccommodationToDraft,
    removeAccommodationFromDraft,
    renameTripFromPanel,
    deleteTrip,
    confirmDeleteTrip,
    handleDuplicateTrip,
    handleCreateSimilar,
    navigateAway,

    // Re-exposed from useUserTrips
    userTrips,
    tripsLoading,
    createTripDB,
    deleteTripDB,
    renameTripDB,
    addFlightDB,
    removeFlightDB,
    addAccommodationDB,
    removeAccommodationDB,
    updateAccommodationDB,
    duplicateTripWithLocaleDB,

    // Derived
    tripAirports,
    globalNextFlightId,
    hasUpcomingFlight,
    alertTripIds,
    today,
  };

  return (
    <TripManagementContext.Provider value={value}>
      {children}
    </TripManagementContext.Provider>
  );
}

export function useTripManagementContext(): TripManagementContextValue {
  const ctx = useContext(TripManagementContext);
  if (!ctx) throw new Error("useTripManagementContext must be used inside TripManagementProvider");
  return ctx;
}
