"use client";

import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUIModeContext } from "@/contexts/UIModeContext";
import { UserSessionProvider, useUserSessionContext } from "@/contexts/UserSessionContext";
import { TripManagementProvider } from "@/contexts/TripManagementContext";
import { NotificationSetupProvider } from "@/contexts/NotificationSetupContext";
import { useWatchedAirports } from "@/hooks/useWatchedAirports";
import { useDeviceTimezone } from "@/hooks/useDeviceTimezone";
import { DRAFT_ID } from "@/lib/constants";
import { AppShell } from "@/components/app/AppShell";
import dynamic from "next/dynamic";

const OnboardingFlow = dynamic(() => import("@/components/onboarding/OnboardingFlow").then((m) => ({ default: m.OnboardingFlow })), { ssr: false });

export default function HomePage() {
  return (
    <UserSessionProvider>
      <HomePageInner />
    </UserSessionProvider>
  );
}

function HomePageInner() {
  const { t, locale } = useLanguage();
  const { isRelax, setMode: setUIMode } = useUIModeContext();
  // Always start false so the server-rendered HTML and the first client render
  // agree (reading localStorage here caused a hydration mismatch for users who
  // had not completed onboarding). The mount effect below flips it on when
  // onboarding is still pending.
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showOnboardingTour, setShowOnboardingTour] = useState(false);
  const [showKbdHelp, setShowKbdHelp] = useState(false);

  const [activeTab, setActiveTabRaw] = useState<string>("airports");
  const prevTabRef = useRef<string>("airports");
  const [mounted, setMounted] = useState(false);
  const { userId, userName, userAvatar, userPlan, setUserName, setUserAvatar, handleLogout } = useUserSessionContext();

  const { airports: watchedAirports, add: addAirportDB, remove: removeAirportDB } = useWatchedAirports();
  const [tabIdsForSlide, setTabIdsForSlide] = useState<string[]>(["today", "trips", "discover", "profile", "airports", "flights", DRAFT_ID]);

  function setActiveTab(newTab: string) {
    prevTabRef.current = newTab;
    setActiveTabRaw(newTab);
  }

  const [showDeviceTz, setShowDeviceTz] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showPlanSuccess, setShowPlanSuccess] = useState(false);
  const { deviceTz, tzChanged, clearTzChanged } = useDeviceTimezone();

  useEffect(() => {
    if (tzChanged) {
      setShowBanner(true);
      clearTzChanged();
    }
  }, [tzChanged, clearTzChanged]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("plan") === "success") {
      setShowPlanSuccess(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("plan");
      window.history.replaceState({}, "", url.toString());
      const timer = setTimeout(() => setShowPlanSuccess(false), 6000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    setShowDeviceTz(localStorage.getItem("tripcopilot-show-device-tz") === "true");
    if (localStorage.getItem("tripcopilot-onboarded") && !localStorage.getItem("tc-onboarded")) {
      localStorage.setItem("tc-onboarded", "true");
    }
    if (!localStorage.getItem("tc-onboarded")) {
      setActiveTabRaw("trips");
      prevTabRef.current = "trips";
    }
    if (!localStorage.getItem("tripcopilot_onboarding_completed")) {
      setShowOnboarding(true);
    }
  }, []);

  function handleAcceptDeviceTz() {
    setShowDeviceTz(true);
    setShowBanner(false);
    localStorage.setItem("tripcopilot-show-device-tz", "true");
  }

  function handleDismissBanner() { setShowBanner(false); }

  function handleToggleDeviceTz() {
    setShowDeviceTz((v) => {
      const next = !v;
      localStorage.setItem("tripcopilot-show-device-tz", String(next));
      return next;
    });
  }

  function handleOnboardingComplete(mode: "relax" | "pilot") {
    localStorage.setItem("tripcopilot_onboarding_completed", "1");
    localStorage.setItem("tc-onboarded", "true");
    if (userId) localStorage.setItem(`tc-tour-${userId}`, "true");
    if (userId) localStorage.setItem(`tc-onboarded-${userId}`, "true");
    void setUIMode(mode);
    setShowOnboarding(false);
    setShowOnboardingTour(false);
  }

  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return (
    <NotificationSetupProvider>
      <TripManagementProvider activeTab={activeTab} setActiveTab={setActiveTab}>
        <AppShell
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          setActiveTabRaw={setActiveTabRaw}
          prevTabRef={prevTabRef}
          setTabIdsForSlide={setTabIdsForSlide}
          mounted={mounted}
          userId={userId}
          userName={userName}
          userAvatar={userAvatar}
          userPlan={userPlan}
          setUserName={setUserName}
          setUserAvatar={setUserAvatar}
          handleLogout={handleLogout}
          watchedAirports={watchedAirports}
          addAirportDB={addAirportDB}
          removeAirportDB={removeAirportDB}
          showGlobalSearch={showGlobalSearch}
          setShowGlobalSearch={setShowGlobalSearch}
          showOnboardingTour={showOnboardingTour}
          setShowOnboardingTour={setShowOnboardingTour}
          showKbdHelp={showKbdHelp}
          setShowKbdHelp={setShowKbdHelp}
          showDeviceTz={showDeviceTz}
          showBanner={showBanner}
          deviceTz={deviceTz}
          handleAcceptDeviceTz={handleAcceptDeviceTz}
          handleDismissBanner={handleDismissBanner}
          handleToggleDeviceTz={handleToggleDeviceTz}
          isRelax={isRelax}
          locale={locale}
          t={t}
        />
        {showPlanSuccess && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-2xl border border-[#FFB800]/30 bg-[#1a1608] px-5 py-3 text-sm font-medium text-[#FFB800] shadow-xl animate-fade-in-up">
            🚀 {locale === "es" ? "¡Plan activado! Bienvenido a bordo." : "Plan activated! Welcome aboard."}
          </div>
        )}
      </TripManagementProvider>
    </NotificationSetupProvider>
  );
}
