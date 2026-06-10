"use client";

import { lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AirportCard } from "@/components/AirportCard";
import { AirportSearch } from "@/components/AirportSearch";
import { MyFlightsPanel } from "@/components/MyFlightsPanel";
import { TripListView } from "@/components/TripListView";
import { TripPanelSkeleton } from "@/components/TripPanelSkeleton";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DepartureBoard } from "@/components/DepartureBoard";
import { SmartAlertsPanel } from "@/components/SmartAlertsPanel";
import { AirportStatusMap, TripFlight, Accommodation, TripTab } from "@/lib/types";
import { DRAFT_ID } from "@/lib/constants";
import { PLANS } from "@/lib/mercadopago";
import { Locale, Translations } from "@/lib/i18n";
import { WeatherData } from "@/hooks/useWeather";
import { MetarData } from "@/hooks/useMetar";
import { SmartAlert } from "@/hooks/useSmartAlerts";
import { GeoPosition } from "@/hooks/useGeolocation";
import toast from "react-hot-toast";

// TripPanel lazy-loaded — only rendered when a trip is selected
const TripPanel = lazy(() => import("@/components/TripPanel").then((m) => ({ default: m.TripPanel })));

// Lazy-loaded tab views — only rendered when their respective tab is active
const DiscoverView = lazy(() => import("@/components/DiscoverView").then((m) => ({ default: m.DiscoverView })));
const MyProfileView = lazy(() => import("@/components/MyProfileView").then((m) => ({ default: m.MyProfileView })));
const SettingsView = lazy(() => import("@/components/SettingsView").then((m) => ({ default: m.SettingsView })));
const HelpPanel = lazy(() => import("@/components/HelpPanel").then((m) => ({ default: m.HelpPanel })));
const TripHistoryView = lazy(() => import("@/components/TripHistoryView").then((m) => ({ default: m.TripHistoryView })));
const NewUserWelcomeView = lazy(() => import("@/components/NewUserWelcomeView").then((m) => ({ default: m.NewUserWelcomeView })));

export interface TabContentProps {
  activeTab: string;
  locale: Locale;
  t: Translations;
  mounted: boolean;
  tripsLoading: boolean;
  userTrips: TripTab[];
  userId: string | null;
  userPlan: "free" | "explorer" | "pilot" | null;
  userName: string | null;
  userAvatar: string | null;
  statusMap: AirportStatusMap;
  weatherMap: Record<string, WeatherData>;
  metarMap: Record<string, MetarData>;
  watchedAirports: string[];
  sortedAirports: string[];
  changedAirports: Set<string>;
  loading: boolean;
  smartAlerts: SmartAlert[];
  userPosition: GeoPosition | null;
  draftTrip: { name: string; flights: TripFlight[]; accommodations: Accommodation[] } | null;
  showDeviceTz: boolean;
  deviceTz: string | null;
  showTripHistory: boolean;
  globalNextFlightId: string | null;

  // Navigation handlers
  onAddAirport: (iata: string) => void;
  onRemoveAirport: (iata: string) => void;
  onDismissSmartAlert: (id: string) => void;
  onOpenCreateTrip: () => Promise<void>;
  onMarkOnboarded: () => void;
  onSetActiveTab: (id: string) => void;
  onDeleteTrip: (id: string) => void;
  onCreateSimilar: (trip: TripTab) => void;
  onShowTripHistory: (v: boolean) => void;
  onShowGlobalImport: (v: boolean) => void;
  onNavigateAway: (tab: string) => void;
  onSetUserName: (n: string) => void;
  onSetUserAvatar: (url: string) => void;
  onShowUpgrade: () => void;
  onOpenNotifSettings: () => void;
  onSignOut: () => Promise<void>;
  onExportAllData: () => void;
  onToggleDeviceTz: () => void;

  // Saved trip CRUD handlers (DB-backed)
  onAddFlightDB: (tripId: string, flight: TripFlight) => Promise<string | null>;
  onRemoveFlightDB: (tripId: string, flightId: string) => Promise<void>;
  onAddAccommodationDB: (tripId: string, acc: Omit<Accommodation, "id" | "tripId">) => Promise<void>;
  onRemoveAccommodationDB: (tripId: string, accId: string) => Promise<void>;
  onUpdateAccommodationDB: (tripId: string, accId: string, updates: Pick<Accommodation, "name" | "checkInTime" | "checkOutTime" | "confirmationCode" | "address">) => Promise<void>;
  onDuplicateTrip: (tripId: string) => void;
  onRenameTripFromPanel: (tripId: string, name: string) => void;

  // Draft trip handlers (in-memory)
  onAddFlightToDraft: (tripId: string, flight: TripFlight) => void;
  onRemoveFlightFromDraft: (tripId: string, flightId: string) => void;
  onAddAccommodationToDraft: (tripId: string, acc: Omit<Accommodation, "id" | "tripId">) => void;
  onRemoveAccommodationFromDraft: (tripId: string, accId: string) => void;
  onSaveDraftTrip: () => Promise<void>;
  onDiscardDraft: () => void;
  onSetDraftTrip: React.Dispatch<React.SetStateAction<{ name: string; flights: TripFlight[]; accommodations: Accommodation[] } | null>>;
}

export function TabContent({
  activeTab,
  locale,
  t,
  mounted,
  tripsLoading,
  userTrips,
  userId,
  userPlan,
  userName,
  userAvatar,
  statusMap,
  weatherMap,
  metarMap,
  watchedAirports,
  sortedAirports,
  changedAirports,
  loading,
  smartAlerts,
  userPosition,
  draftTrip,
  showDeviceTz,
  deviceTz,
  showTripHistory,
  globalNextFlightId,
  onAddAirport,
  onRemoveAirport,
  onDismissSmartAlert,
  onOpenCreateTrip,
  onMarkOnboarded,
  onSetActiveTab,
  onDeleteTrip,
  onCreateSimilar,
  onShowTripHistory,
  onShowGlobalImport,
  onNavigateAway,
  onSetUserName,
  onSetUserAvatar,
  onShowUpgrade,
  onOpenNotifSettings,
  onSignOut,
  onExportAllData,
  onToggleDeviceTz,
  onAddFlightDB,
  onRemoveFlightDB,
  onAddAccommodationDB,
  onRemoveAccommodationDB,
  onUpdateAccommodationDB,
  onDuplicateTrip,
  onRenameTripFromPanel,
  onAddFlightToDraft,
  onRemoveFlightFromDraft,
  onAddAccommodationToDraft,
  onRemoveAccommodationFromDraft,
  onSaveDraftTrip,
  onDiscardDraft,
}: TabContentProps) {
  return (
    <>
      {/* Trip history view — full-screen overlay */}
      {showTripHistory && (
        <div className="fixed inset-0 z-50 bg-surface-darker overflow-y-auto">
          <Suspense fallback={null}>
            <TripHistoryView
              trips={userTrips}
              locale={locale}
              onCreateSimilar={onCreateSimilar}
              onViewTrip={(trip) => { onShowTripHistory(false); onSetActiveTab(trip.id); }}
              onClose={() => onShowTripHistory(false)}
            />
          </Suspense>
        </div>
      )}

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
                <div className="mb-4 flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
                    {t.legendTitle && (
                      <span className="text-gray-500 font-medium mr-1">{t.legendTitle}</span>
                    )}
                    {t.legend.map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                  </div>
                  <a
                    href="/board"
                    className="flex items-center gap-1.5 rounded-lg border border-[#FFB800]/30 bg-[#FFB800]/10 px-3 py-1.5 text-xs font-semibold text-[#FFB800] hover:bg-[#FFB800]/20 transition-colors shrink-0"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
                    </svg>
                    {locale === "es" ? "Tablero" : "Board"}
                  </a>
                </div>
                {loading && sortedAirports.length === 0 ? (
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
                        onRemove={() => onRemoveAirport(iata)}
                        weather={weatherMap[iata]}
                        metar={metarMap[iata]}
                        highlight={changedAirports.has(iata)}
                      />
                    ))}
                    <AirportSearch watchedAirports={watchedAirports} onAdd={(iata) => onAddAirport(iata)} />
                  </div>
                )}
              </div>
            )}

            {activeTab === "today" && (
              <div className="space-y-4">
                <SmartAlertsPanel alerts={smartAlerts} onDismiss={onDismissSmartAlert} locale={locale} />
                {!tripsLoading && userTrips.length === 0 && (
                  <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.01] py-8 flex flex-col items-center text-center gap-4">
                    <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
                      {locale === "es"
                        ? "Agregá tu primer viaje para ver tu briefing de hoy"
                        : "Add your first trip to see today's briefing"}
                    </p>
                    <button
                      onClick={onOpenCreateTrip}
                      className="rounded-xl bg-[#FFB800] hover:bg-[#FFC933] active:scale-95 text-[#07070d] text-sm font-semibold px-5 py-2.5 transition-all"
                    >
                      {locale === "es" ? "Crear viaje" : "Create trip"}
                    </button>
                  </div>
                )}
                <DepartureBoard
                  trips={userTrips}
                  statusMap={statusMap}
                  locale={locale}
                  geoPosition={userPosition}
                  userPlan={userPlan ?? undefined}
                  onUpgrade={onShowUpgrade}
                  onCreateTrip={onOpenCreateTrip}
                />

                {userTrips.length > 0 && (
                  <a
                    href="/board"
                    className="flex items-center justify-between gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] px-5 py-4 transition-colors hover:bg-amber-500/[0.08] active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">✈</span>
                      <div>
                        <p className="text-sm font-semibold text-amber-400 leading-tight">
                          {locale === "es" ? "Ver tablero de vuelos" : "Open flight board"}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {locale === "es"
                            ? "Cartel estilo aeropuerto · compartí con tu familia"
                            : "Airport-style board · share with your family"}
                        </p>
                      </div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-amber-500/50">
                      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </a>
                )}
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
                  userName={userName}
                  userAvatar={userAvatar}
                  onNameChange={(n) => onSetUserName(n)}
                  onAvatarChange={(url) => onSetUserAvatar(url)}
                  onUpgrade={onShowUpgrade}
                />
              </Suspense>
            )}

            {activeTab === "discover" && (
              <Suspense fallback={<LoadingSkeleton />}>
                <DiscoverView
                  trips={userTrips}
                  locale={locale}
                  userPlan={userPlan}
                  onUpgrade={onShowUpgrade}
                  userId={userId}
                />
              </Suspense>
            )}

            {activeTab === "help" && (
              <Suspense fallback={null}>
                <HelpPanel />
              </Suspense>
            )}

            {activeTab === "settings" && (
              <Suspense fallback={<LoadingSkeleton />}>
                <SettingsView
                  locale={locale}
                  userPlan={userPlan}
                  onOpenNotifSettings={onOpenNotifSettings}
                  onSignOut={onSignOut}
                  onUpgrade={onShowUpgrade}
                  onExportAllData={onExportAllData}
                />
              </Suspense>
            )}

            {activeTab === "trips" && (
              <>
                {mounted && !tripsLoading && userTrips.length === 0 && !(userId ? localStorage.getItem(`tc-onboarded-${userId}`) : localStorage.getItem("tc-onboarded")) ? (
                  <Suspense fallback={null}>
                    <NewUserWelcomeView
                      statusMap={statusMap}
                      weatherMap={weatherMap}
                      loading={loading}
                      locale={locale}
                      userId={userId}
                      onAddFlight={() => {
                        onMarkOnboarded();
                        void onOpenCreateTrip();
                      }}
                    />
                  </Suspense>
                ) : (
                  <TripListView
                    trips={userTrips}
                    statusMap={statusMap}
                    locale={locale}
                    loading={tripsLoading}
                    onSelect={(id) => onSetActiveTab(id)}
                    onCreateTrip={onOpenCreateTrip}
                    onDeleteTrip={onDeleteTrip}
                    onCreateSimilar={onCreateSimilar}
                    onViewArchivedTrip={() => onShowTripHistory(true)}
                    onAIImport={() => onShowGlobalImport(true)}
                    onSwitchTab={(tab) => onNavigateAway(tab)}
                  />
                )}
                {!tripsLoading && userTrips.length >= PLANS.free.maxTrips && (
                  <div className="mx-4 mb-4 rounded-xl border border-[rgba(255,184,0,0.30)] bg-[rgba(255,184,0,0.08)] px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#FFB800]">
                        {locale === "es" ? "Plan gratuito completo" : "Free plan limit reached"}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {locale === "es"
                          ? `Tenés ${PLANS.free.maxTrips}/${PLANS.free.maxTrips} viajes. Agregá más con Premium.`
                          : `You have ${PLANS.free.maxTrips}/${PLANS.free.maxTrips} trips. Add more with Premium.`}
                      </p>
                    </div>
                    <button
                      onClick={onShowUpgrade}
                      className="shrink-0 rounded-lg bg-[#FFB800] hover:bg-[#FFC933] px-3 py-1.5 text-xs font-semibold text-[#07070d] transition-colors"
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
                  onAddFlight={onAddFlightToDraft}
                  onRemoveFlight={onRemoveFlightFromDraft}
                  onAddAccommodation={onAddAccommodationToDraft}
                  onRemoveAccommodation={onRemoveAccommodationFromDraft}
                  onUpdateAccommodation={() => {}}
                  onDeleteTrip={onDiscardDraft}
                  onRenameTrip={(name) => onRenameTripFromPanel(DRAFT_ID, name)}
                  isDraft={true}
                  onSave={onSaveDraftTrip}
                  showDeviceTz={showDeviceTz}
                  deviceTz={deviceTz ?? undefined}
                  onToggleDeviceTz={onToggleDeviceTz}
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
                      void onAddFlightDB(trip.id, flight).then((newId) => {
                        if (newId && flight.destinationCode) {
                          void fetch("/api/friends/notify-destination", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ destinationCode: flight.destinationCode }),
                          });
                        }
                      });
                    }}
                    onRemoveFlight={(_, flightId) => void onRemoveFlightDB(trip.id, flightId)}
                    onAddAccommodation={(_, acc) => void onAddAccommodationDB(trip.id, acc)}
                    onRemoveAccommodation={(_, accId) => void onRemoveAccommodationDB(trip.id, accId)}
                    onUpdateAccommodation={(_, accId, updates) => void onUpdateAccommodationDB(trip.id, accId, updates)}
                    onDuplicateTrip={() => onDuplicateTrip(trip.id)}
                    onDeleteTrip={() => onDeleteTrip(trip.id)}
                    onRenameTrip={(name) => onRenameTripFromPanel(trip.id, name)}
                    showDeviceTz={showDeviceTz}
                    deviceTz={deviceTz ?? undefined}
                    onToggleDeviceTz={onToggleDeviceTz}
                    geoPosition={userPosition}
                    userPlan={userPlan}
                    onUpgrade={onShowUpgrade}
                  />
                </Suspense>
              ) : null
            )}
          </motion.div>
        </AnimatePresence>
      </ErrorBoundary>
    </>
  );
}
