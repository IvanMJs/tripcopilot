"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, X, Map, Trash2, ChevronUp, CalendarDays, Compass, User, Users, Bell } from "lucide-react";
import { TripTab, TripFlight } from "@/lib/types";
import { haptics } from "@/lib/haptics";

const BANNER_KEY = "tc-upgrade-banner-dismissed";

interface Props {
  locale: "es" | "en";
  activeTab: string;
  userTrips: TripTab[];
  draftTrip: { name: string; flights: { id: string }[] } | null;
  draftId: string;
  tabLabels: { airports: string; profile: string };
  onNavigate: (tab: string) => void;
  onNewTrip: () => void;
  onDiscardDraft: () => void;
  onDeleteTrip: (id: string) => void;
  onRenameTrip: (id: string, name: string) => void;
  onRenameDraft: (name: string) => void;
  userPlan?: string | null;
  tripCount?: number;
  onUpgrade?: () => void;
  hasUpcomingFlight?: boolean;
  unreadCount?: number;
  onNotificationsOpen?: () => void;
}

function getNextFlightDate(flights: TripFlight[], locale: "es" | "en"): string | null {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = [...flights]
    .filter((f) => f.isoDate >= today)
    .sort((a, b) => {
      const d = a.isoDate.localeCompare(b.isoDate);
      return d !== 0 ? d : (a.departureTime ?? "").localeCompare(b.departureTime ?? "");
    });
  if (upcoming.length === 0) return null;
  const next = upcoming[0];
  const d = new Date(next.isoDate + "T00:00:00");
  const formatted = d.toLocaleDateString(locale === "en" ? "en-US" : "es-AR", { day: "numeric", month: "short" });
  return locale === "es" ? `Próximo: ${formatted}` : `Next: ${formatted}`;
}

export function BottomNav({
  locale, activeTab, userTrips, draftTrip, draftId, tabLabels,
  onNavigate, onNewTrip, onDiscardDraft, onDeleteTrip, onRenameTrip, onRenameDraft,
  userPlan, tripCount, onUpgrade, hasUpcomingFlight, unreadCount, onNotificationsOpen,
}: Props) {
  const [showTripPicker, setShowTripPicker]         = useState(false);
  const [renameInPickerId, setRenameInPickerId]     = useState<string | null>(null);
  const [renameInPickerName, setRenameInPickerName] = useState("");
  const [bannerDismissed, setBannerDismissed]       = useState(true); // default true, hydrate below

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBannerDismissed(!!localStorage.getItem(BANNER_KEY));
    }
  }, []);

  function handleDismissBanner() {
    setBannerDismissed(true);
    if (typeof window !== "undefined") {
      localStorage.setItem(BANNER_KEY, "1");
    }
  }

  const isFree = !userPlan || userPlan === "free";
  const maxFreeTrips = 2;
  const usedTrips = tripCount ?? userTrips.length;
  const showUpgradeBanner = isFree && usedTrips >= maxFreeTrips && !bannerDismissed;

  const tripsActive = activeTab === "trips" || activeTab === draftId || userTrips.some((t) => t.id === activeTab);
  const totalTrips  = userTrips.length + (draftTrip ? 1 : 0);
  const tripsLabel  = totalTrips <= 1
    ? (locale === "es" ? "Mi viaje" : "My trip")
    : (locale === "es" ? "Mis viajes" : "My trips");

  function handleTripNavTap() {
    const allTrips = [...userTrips, ...(draftTrip ? [{ id: draftId }] : [])];
    if (allTrips.length === 1) {
      onNavigate(allTrips[0].id);
    } else {
      const next = !showTripPicker;
      setShowTripPicker(next);
      setRenameInPickerId(null);
      if (next && typeof navigator !== "undefined") {
        haptics.impact();
      }
    }
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 md:hidden">

      {/* FAB — floating above the nav bar, hidden when a draft is active */}
      {!draftTrip && (
        <div className="absolute left-1/2 -translate-x-1/2 -top-7 z-10">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => { haptics.impact(); setShowTripPicker(false); onNewTrip(); }}
             aria-label={locale === "es" ? "Agregar vuelo" : "Add flight"}
            className="h-14 w-14 rounded-full bg-gradient-to-br from-violet-600 to-violet-800 shadow-lg shadow-violet-500/30 ring-4 ring-[#0a0a14] flex items-center justify-center"
          >
            <Plus className="h-7 w-7 text-white" strokeWidth={2} />
          </motion.button>
        </div>
      )}

      {/* Upgrade micro-banner for free users at trip limit */}
      {showUpgradeBanner && (
        <div className="mx-3 mb-1.5">
          <div className="flex items-center justify-between gap-2 rounded-full border border-sky-500/30 bg-sky-950/70 backdrop-blur-sm px-3 py-1.5">
            <span className="text-[11px] font-semibold text-sky-300 truncate">
              {locale === "es"
                ? `${usedTrips}/${maxFreeTrips} viajes usados · `
                : `${usedTrips}/${maxFreeTrips} trips used · `}
              <button
                onClick={onUpgrade}
                className="underline underline-offset-2 text-sky-400 hover:text-sky-300"
              >
                Upgrade →
              </button>
            </span>
            <button
              onClick={handleDismissBanner}
              aria-label={locale === "es" ? "Cerrar" : "Dismiss"}
              className="shrink-0 text-sky-500 hover:text-sky-300 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <nav
        role="navigation"
        aria-label={locale === "es" ? "Navegación principal" : "Main navigation"}
        className="bottom-nav-bg"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="relative">

          {/* Backdrop */}
          <div
            className={`fixed inset-0 z-40 transition-opacity duration-200 ${showTripPicker ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
            onClick={() => { setShowTripPicker(false); setRenameInPickerId(null); }}
          />

          {/* Trip picker popup */}
          <div
            className={`absolute bottom-full left-0 right-0 z-50 mx-3 mb-2 rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden transition-all duration-200 ${showTripPicker ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}
            style={{ background: "linear-gradient(160deg, rgba(18,18,32,0.99) 0%, rgba(10,10,20,1) 100%)" }}
          >
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                {locale === "es" ? "Mis viajes" : "My trips"}
              </p>
            </div>

            {userTrips.length === 0 && !draftTrip && (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-gray-400">{locale === "es" ? "No tenés viajes todavía" : "No trips yet"}</p>
              </div>
            )}

            {/* Draft entry */}
            {draftTrip && (
              <div className={`flex items-center gap-2 px-3 py-2.5 border-b border-white/[0.04] ${activeTab === draftId ? "bg-white/[0.04]" : ""}`}>
                {renameInPickerId === draftId ? (
                  <input
                    autoFocus
                    value={renameInPickerName}
                    onChange={(e) => setRenameInPickerName(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={() => {
                      if (renameInPickerName.trim()) onRenameDraft(renameInPickerName.trim());
                      setRenameInPickerId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        if (renameInPickerName.trim()) onRenameDraft(renameInPickerName.trim());
                        setRenameInPickerId(null);
                      }
                      if (e.key === "Escape") setRenameInPickerId(null);
                    }}
                    maxLength={40}
                    className="flex-1 min-w-0 bg-white/[0.06] border border-violet-500/50 rounded-lg px-3 py-1.5 text-sm text-white outline-none"
                  />
                ) : (
                  <button
                    onClick={() => { onNavigate(draftId); setShowTripPicker(false); setRenameInPickerId(null); }}
                    className="flex-1 min-w-0 text-left"
                  >
                    <p className={`text-sm font-semibold truncate ${activeTab === draftId ? "text-violet-400" : "text-white"}`}>
                      {draftTrip.name}
                      <span className="ml-2 text-[11px] font-bold uppercase tracking-wider text-yellow-500 border border-yellow-700/50 rounded px-1 py-0.5">
                        {locale === "es" ? "Borrador" : "Draft"}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {draftTrip.flights.length === 0
                        ? (locale === "es" ? "Sin vuelos" : "No flights")
                        : locale === "es"
                        ? `${draftTrip.flights.length} vuelo${draftTrip.flights.length !== 1 ? "s" : ""}`
                        : `${draftTrip.flights.length} flight${draftTrip.flights.length !== 1 ? "s" : ""}`}
                    </p>
                  </button>
                )}
                {renameInPickerId !== draftId && (
                  <button
                    onClick={() => { setRenameInPickerId(draftId); setRenameInPickerName(draftTrip.name); }}
                    className="shrink-0 p-1.5 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/[0.06] transition-colors"
                    aria-label={locale === "es" ? "Renombrar borrador" : "Rename draft"}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
                {renameInPickerId !== draftId && (
                  <button
                    onClick={onDiscardDraft}
                    className="shrink-0 p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                    aria-label={locale === "es" ? "Descartar borrador" : "Discard draft"}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Saved trips */}
            {userTrips.map((trip) => (
              <div
                key={trip.id}
                className={`flex items-center gap-2 px-3 py-2.5 border-b border-white/[0.04] last:border-0 ${activeTab === trip.id ? "bg-white/[0.04]" : ""}`}
              >
                {renameInPickerId === trip.id ? (
                  <input
                    autoFocus
                    value={renameInPickerName}
                    onChange={(e) => setRenameInPickerName(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={() => {
                      if (renameInPickerName.trim()) onRenameTrip(trip.id, renameInPickerName.trim());
                      setRenameInPickerId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        if (renameInPickerName.trim()) onRenameTrip(trip.id, renameInPickerName.trim());
                        setRenameInPickerId(null);
                      }
                      if (e.key === "Escape") setRenameInPickerId(null);
                    }}
                    maxLength={40}
                    className="flex-1 min-w-0 bg-white/[0.06] border border-violet-500/50 rounded-lg px-3 py-1.5 text-sm text-white outline-none"
                  />
                ) : (
                  <button
                    onClick={() => { onNavigate(trip.id); setShowTripPicker(false); setRenameInPickerId(null); }}
                    className="flex-1 min-w-0 text-left"
                  >
                    <p className={`text-sm font-semibold truncate flex items-center gap-1.5 ${activeTab === trip.id ? "text-violet-400" : "text-white"}`}>
                      <span className="truncate">{trip.name}</span>
                      {trip.isShared && (
                        <Users className="h-3 w-3 shrink-0 text-violet-400" aria-label={locale === "es" ? "Compartido" : "Shared"} />
                      )}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {trip.flights.length === 0
                        ? (locale === "es" ? "Sin vuelos" : "No flights")
                        : (() => {
                            const nextDate = getNextFlightDate(trip.flights, locale);
                            if (nextDate) return nextDate;
                            return locale === "es"
                              ? `${trip.flights.length} vuelo${trip.flights.length !== 1 ? "s" : ""}`
                              : `${trip.flights.length} flight${trip.flights.length !== 1 ? "s" : ""}`;
                          })()}
                    </p>
                  </button>
                )}
                {renameInPickerId !== trip.id && (
                  <>
                    <button
                      onClick={() => { setRenameInPickerId(trip.id); setRenameInPickerName(trip.name); }}
                      className="shrink-0 p-1.5 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/[0.06] transition-colors"
                      aria-label={locale === "es" ? `Renombrar viaje ${trip.name}` : `Rename trip ${trip.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteTrip(trip.id)}
                      className="shrink-0 p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                      aria-label={locale === "es" ? `Eliminar viaje ${trip.name}` : `Delete trip ${trip.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="flex h-[60px]">

            {/* Vuelos (today) */}
            <button
              onClick={() => { haptics.impact(); onNavigate("today"); }}
              aria-label={locale === "es" ? "Vuelos" : "Flights"}
              aria-current={activeTab === "today" ? "page" : undefined}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative tap-scale transition-colors ${activeTab === "today" ? "text-violet-400" : "text-gray-500"}`}
            >
              <div className="relative">
                <motion.div whileTap={{ scale: 0.82 }} className="relative flex items-center justify-center w-10 h-8 rounded-xl">
                  {activeTab === "today" && (
                    <motion.div layoutId="nav-indicator" className="absolute inset-0 rounded-xl bg-violet-500/20" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                  )}
                  <CalendarDays className={`relative w-[22px] h-[22px] transition-colors ${activeTab === "today" ? "text-violet-400" : "text-gray-500"}`} strokeWidth={activeTab === "today" ? 2.5 : 1.5} />
                </motion.div>
                {hasUpcomingFlight && activeTab !== "today" && (
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-violet-500 ring-2 ring-[#0a0a14]" aria-label={locale === "es" ? "Vuelo próximo" : "Upcoming flight"} />
                )}
              </div>
              <span className="text-[10px] font-semibold leading-none">{locale === "es" ? "Vuelos" : "Flights"}</span>
            </button>

            {/* Viajes (trips) */}
            <button
              onClick={handleTripNavTap}
              aria-label={tripsLabel}
              aria-current={tripsActive ? "page" : undefined}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative tap-scale transition-colors ${tripsActive ? "text-violet-400" : "text-gray-500"}`}
            >
              <div className="relative">
                <motion.div whileTap={{ scale: 0.82 }} className="relative flex items-center justify-center w-10 h-8 rounded-xl">
                  {tripsActive && (
                    <motion.div layoutId="nav-indicator" className="absolute inset-0 rounded-xl bg-violet-500/20" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                  )}
                  <Map className={`relative w-[22px] h-[22px] transition-colors ${tripsActive ? "text-violet-400" : "text-gray-500"}`} strokeWidth={tripsActive ? 2.5 : 1.5} />
                </motion.div>
                {totalTrips > 1 && (
                  <span className="absolute -top-1.5 -right-2.5 h-4 min-w-[16px] bg-violet-600 text-white text-[11px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                    {totalTrips}
                  </span>
                )}
              </div>
              {totalTrips > 1 ? (
                <ChevronUp className={`h-3 w-3 transition-transform text-gray-500 ${showTripPicker ? "rotate-180" : ""}`} />
              ) : (
                <span className="text-[10px] font-semibold leading-none">{locale === "es" ? "Viajes" : "Trips"}</span>
              )}
            </button>

            {/* FAB spacer */}
            <div className="w-14 shrink-0" aria-hidden="true" />

            {/* Descubrir */}
            <button
              onClick={() => { haptics.impact(); onNavigate("discover"); }}
              aria-label={locale === "es" ? "Descubrir" : "Discover"}
              aria-current={activeTab === "discover" ? "page" : undefined}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative tap-scale transition-colors ${activeTab === "discover" ? "text-violet-400" : "text-gray-500"}`}
            >
              <motion.div whileTap={{ scale: 0.82 }} className="relative flex items-center justify-center w-10 h-8 rounded-xl">
                {activeTab === "discover" && (
                  <motion.div layoutId="nav-indicator" className="absolute inset-0 rounded-xl bg-violet-500/20" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                )}
                <Compass className={`relative w-[22px] h-[22px] transition-colors ${activeTab === "discover" ? "text-violet-400" : "text-gray-500"}`} strokeWidth={activeTab === "discover" ? 2.5 : 1.5} />
              </motion.div>
              <span className="text-[10px] font-semibold leading-none">{locale === "es" ? "Descubrir" : "Discover"}</span>
            </button>

            {/* Perfil */}
            <button
              onClick={() => { haptics.impact(); onNavigate("profile"); }}
              aria-label={tabLabels.profile}
              aria-current={activeTab === "profile" ? "page" : undefined}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative tap-scale transition-colors ${activeTab === "profile" ? "text-violet-400" : "text-gray-500"}`}
            >
              <motion.div whileTap={{ scale: 0.82 }} className="relative flex items-center justify-center w-10 h-8 rounded-xl">
                {activeTab === "profile" && (
                  <motion.div layoutId="nav-indicator" className="absolute inset-0 rounded-xl bg-violet-500/20" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                )}
                <User className={`relative w-[22px] h-[22px] transition-colors ${activeTab === "profile" ? "text-violet-400" : "text-gray-500"}`} strokeWidth={activeTab === "profile" ? 2.5 : 1.5} />
              </motion.div>
              <span className="text-[10px] font-semibold leading-none">{locale === "es" ? "Perfil" : "Profile"}</span>
            </button>

          </div>
        </div>
      </nav>
    </div>
  );
}
