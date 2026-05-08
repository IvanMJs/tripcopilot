"use client";

import { Toaster } from "react-hot-toast";
import { NotificationSetupSheet } from "@/components/NotificationSetupSheet";
import { InstallBanner } from "@/components/InstallBanner";
import { RatingNudge } from "@/components/RatingNudge";
import { analytics } from "@/lib/analytics";
import { Locale } from "@/lib/i18n";
import { TripTab, Accommodation } from "@/lib/types";
import { DRAFT_ID } from "@/lib/constants";
import { getUnreadCount } from "@/lib/notificationsHub";
import { ParsedFlight } from "@/lib/importFlights";
import dynamic from "next/dynamic";

const KeyboardShortcutsHelp = dynamic(() => import("@/components/KeyboardShortcutsHelp").then((m) => ({ default: m.KeyboardShortcutsHelp })), { ssr: false });
const UpgradeModal = dynamic(() => import("@/components/UpgradeModal").then((m) => ({ default: m.UpgradeModal })), { ssr: false });
const GlobalSearch = dynamic(() => import("@/components/GlobalSearch").then((m) => ({ default: m.GlobalSearch })), { ssr: false });
const NotificationSettings = dynamic(() => import("@/components/NotificationSettings").then((m) => ({ default: m.NotificationSettings })), { ssr: false });
const CreateTripModal = dynamic(() => import("@/components/CreateTripModal").then((m) => ({ default: m.CreateTripModal })), { ssr: false });
const DeleteTripModal = dynamic(() => import("@/components/DeleteTripModal").then((m) => ({ default: m.DeleteTripModal })), { ssr: false });
const DraftLeaveModal = dynamic(() => import("@/components/DraftLeaveModal").then((m) => ({ default: m.DraftLeaveModal })), { ssr: false });
const ItineraryImportModal = dynamic(() => import("@/components/ItineraryImportModal").then((m) => ({ default: m.ItineraryImportModal })), { ssr: false });
const NotificationsHubPanel = dynamic(() => import("@/components/NotificationsHubPanel").then((m) => ({ default: m.NotificationsHubPanel })), { ssr: false });
const OnboardingTour = dynamic(() => import("@/components/OnboardingTour").then((m) => ({ default: m.OnboardingTour })), { ssr: false });
const TripDebriefModal = dynamic(() => import("@/components/TripDebriefModal").then((m) => ({ default: m.TripDebriefModal })), { ssr: false });

export interface AppModalsProps {
  locale: Locale;
  mounted: boolean;
  userTrips: TripTab[];
  tripCount: number;

  // Keyboard help
  showKbdHelp: boolean;
  onCloseKbdHelp: () => void;

  // Upgrade modal
  showUpgradeModal: boolean;
  onCloseUpgradeModal: () => void;

  // Global search
  showGlobalSearch: boolean;
  onCloseGlobalSearch: () => void;
  onSelectTrip: (id: string) => void;
  onWatchAirport: (iata: string) => void;

  // Notification setup sheet
  showNotifSheet: boolean;
  onCloseNotifSheet: () => void;
  requestNotifications: () => void;
  subscribeToPush: () => Promise<boolean>;
  onNotificationEnabled: () => void;

  // Notification settings
  showNotifSettings: boolean;
  onCloseNotifSettings: () => void;

  // Notifications hub
  showNotificationsHub: boolean;
  onCloseNotificationsHub: () => void;
  onSetUnreadCount: (n: number) => void;

  // Create trip modal
  showCreateModal: boolean;
  onCloseCreateModal: () => void;
  prefillDestination: string | undefined;
  onSetPrefillDestination: (v: string | undefined) => void;
  onConfirmCreateTrip: (name: string, destination?: string) => void;

  // Global import modal
  showGlobalImport: boolean;
  onCloseGlobalImport: () => void;
  onGlobalImportWithNotif: (flights: ParsedFlight[]) => void;

  // Delete trip modal
  deleteConfirm: { id: string; name: string; flightCount: number } | null;
  onCloseDeleteConfirm: () => void;
  onConfirmDeleteTrip: () => void;

  // Draft leave modal
  draftLeaveConfirm: { targetTab: string } | null;
  draftTrip: { name: string; flights: unknown[]; accommodations: Accommodation[] } | null;
  onSaveDraftTrip: () => Promise<void>;
  onDiscardDraft: () => void;
  onCancelDraftLeave: () => void;
  onNavigateTab: (tab: string) => void;

  // Trip debrief modal
  debriefTrip: TripTab | null;
  onCloseDebrief: () => void;

  // Onboarding tour
  showOnboardingTour: boolean;
  userId: string | null;
  onDoneOnboardingTour: () => void;
  onStartImport: () => void;

  // PWA nudges
  onNavigateAway: (tab: string) => void;
}

export function AppModals({
  locale,
  mounted,
  userTrips,
  tripCount,
  showKbdHelp,
  onCloseKbdHelp,
  showUpgradeModal,
  onCloseUpgradeModal,
  showGlobalSearch,
  onCloseGlobalSearch,
  onSelectTrip,
  onWatchAirport,
  showNotifSheet,
  onCloseNotifSheet,
  requestNotifications,
  subscribeToPush,
  onNotificationEnabled,
  showNotifSettings,
  onCloseNotifSettings,
  showNotificationsHub,
  onCloseNotificationsHub,
  onSetUnreadCount,
  showCreateModal,
  onCloseCreateModal,
  prefillDestination,
  onSetPrefillDestination,
  onConfirmCreateTrip,
  showGlobalImport,
  onCloseGlobalImport,
  onGlobalImportWithNotif,
  deleteConfirm,
  onCloseDeleteConfirm,
  onConfirmDeleteTrip,
  draftLeaveConfirm,
  draftTrip,
  onSaveDraftTrip,
  onDiscardDraft,
  onCancelDraftLeave,
  onNavigateTab,
  debriefTrip,
  onCloseDebrief,
  showOnboardingTour,
  userId,
  onDoneOnboardingTour,
  onStartImport,
}: AppModalsProps) {
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
        onClose={onCloseKbdHelp}
        locale={locale}
      />

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={onCloseUpgradeModal}
        locale={locale}
      />

      <GlobalSearch
        locale={locale}
        userTrips={userTrips}
        isOpen={showGlobalSearch}
        onClose={onCloseGlobalSearch}
        onSelectTrip={(id) => { onSelectTrip(id); }}
        onWatchAirport={(iata) => { onWatchAirport(iata); }}
      />

      <NotificationSetupSheet
        open={showNotifSheet}
        onClose={() => {
          onCloseNotifSheet();
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            requestNotifications();
            void subscribeToPush();
            onNotificationEnabled();
          }
        }}
        locale={locale}
      />

      <NotificationSettings
        open={showNotifSettings}
        onClose={onCloseNotifSettings}
        locale={locale}
      />

      {showCreateModal && (
        <CreateTripModal
          locale={locale}
          tripCount={tripCount}
          onClose={() => { onCloseCreateModal(); onSetPrefillDestination(undefined); }}
          onConfirm={onConfirmCreateTrip}
          prefillDestination={prefillDestination}
        />
      )}

      {showGlobalImport && (
        <ItineraryImportModal
          isOpen={showGlobalImport}
          onClose={onCloseGlobalImport}
          onImport={onGlobalImportWithNotif}
          locale={locale}
          tripId={DRAFT_ID}
        />
      )}

      {deleteConfirm && (
        <DeleteTripModal
          locale={locale}
          tripName={deleteConfirm.name}
          flightCount={deleteConfirm.flightCount}
          onClose={onCloseDeleteConfirm}
          onConfirm={onConfirmDeleteTrip}
        />
      )}

      {draftLeaveConfirm && draftTrip && (
        <DraftLeaveModal
          locale={locale}
          draftName={draftTrip.name}
          targetTab={draftLeaveConfirm.targetTab}
          onSave={onSaveDraftTrip}
          onDiscard={onDiscardDraft}
          onCancel={onCancelDraftLeave}
          onNavigate={(tab) => { onNavigateTab(tab); onCancelDraftLeave(); }}
        />
      )}

      {debriefTrip && (
        <TripDebriefModal
          trip={debriefTrip}
          locale={locale}
          onClose={onCloseDebrief}
        />
      )}

      <NotificationsHubPanel
        open={showNotificationsHub}
        locale={locale}
        onClose={() => { onCloseNotificationsHub(); onSetUnreadCount(getUnreadCount()); }}
      />

      {showOnboardingTour && (
        <OnboardingTour
          locale={locale}
          onDone={() => {
            onDoneOnboardingTour();
            if (userId) localStorage.setItem(`tc-tour-${userId}`, "true");
          }}
          onStartImport={onStartImport}
        />
      )}

      {mounted && <InstallBanner locale={locale} />}
      {mounted && <RatingNudge showAfterTrips={3} tripCount={tripCount} />}
    </>
  );
}
