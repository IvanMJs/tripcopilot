"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plane, Plus, Pencil, X, Map, MapPin, Trash2, ChevronUp, CalendarDays, Compass } from "lucide-react";
import { TripTab } from "@/lib/types";
import { haptics } from "@/lib/haptics";

interface Props {
  locale: "es" | "en";
  activeTab: string;
  userTrips: TripTab[];
  draftTrip: { name: string; flights: { id: string }[] } | null;
  draftId: string;
  tabLabels: { airports: string; search: string };
  onNavigate: (tab: string) => void;
  onNewTrip: () => void;
  onDiscardDraft: () => void;
  onDeleteTrip: (id: string) => void;
  onRenameTrip: (id: string, name: string) => void;
  onRenameDraft: (name: string) => void;
}

export function BottomNav({
  locale, activeTab, userTrips, draftTrip, draftId, tabLabels,
  onNavigate, onNewTrip, onDiscardDraft, onDeleteTrip, onRenameTrip, onRenameDraft,
}: Props) {
  const [showTripPicker, setShowTripPicker]         = useState(false);
  const [renameInPickerId, setRenameInPickerId]     = useState<string | null>(null);
  const [renameInPickerName, setRenameInPickerName] = useState("");

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
    <nav
      aria-label={locale === "es" ? "Navegación principal" : "Main navigation"}
      className="fixed bottom-0 inset-x-0 z-50 md:hidden bottom-nav-bg"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="relative">

        {/* Backdrop */}
        <div
          className={`fixed inset-0 z-40 transition-opacity duration-200 ${showTripPicker ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
          onClick={() => { setShowTripPicker(false); setRenameInPickerId(null); }}
        />

        {/* Trip picker popup — always in DOM for CSS transition */}
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
                  title={locale === "es" ? "Renombrar" : "Rename"}
                  aria-label={locale === "es" ? "Renombrar borrador" : "Rename draft"}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              {renameInPickerId !== draftId && (
                <button
                  onClick={onDiscardDraft}
                  className="shrink-0 p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                  title={locale === "es" ? "Descartar borrador" : "Discard draft"}
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
                  <p className={`text-sm font-semibold truncate ${activeTab === trip.id ? "text-violet-400" : "text-white"}`}>
                    {trip.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {trip.flights.length === 0
                      ? (locale === "es" ? "Sin vuelos" : "No flights")
                      : locale === "es"
                      ? `${trip.flights.length} vuelo${trip.flights.length !== 1 ? "s" : ""}`
                      : `${trip.flights.length} flight${trip.flights.length !== 1 ? "s" : ""}`}
                  </p>
                </button>
              )}
              {renameInPickerId !== trip.id && (
                <>
                  <button
                    onClick={() => { setRenameInPickerId(trip.id); setRenameInPickerName(trip.name); }}
                    className="shrink-0 p-1.5 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/[0.06] transition-colors"
                    title={locale === "es" ? "Renombrar" : "Rename"}
                    aria-label={locale === "es" ? `Renombrar viaje ${trip.name}` : `Rename trip ${trip.name}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteTrip(trip.id)}
                    className="shrink-0 p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                    title={locale === "es" ? "Eliminar" : "Delete"}
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

          {/* Mi viaje / Mis viajes */}
          <button
            onClick={handleTripNavTap}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative tap-scale transition-colors ${tripsActive ? "text-violet-400" : "text-gray-500"}`}
          >
            <div className="relative">
              <motion.div whileTap={{ scale: 0.82 }} className={`flex items-center justify-center w-10 h-8 rounded-full transition-all duration-200 ${tripsActive ? "bg-violet-500/20" : ""}`}>
                <Map className={`w-[22px] h-[22px] transition-colors ${tripsActive ? "text-violet-400" : "text-gray-500"}`} strokeWidth={tripsActive ? 2.5 : 1.5} />
              </motion.div>
              {totalTrips > 1 && (
                <span className="absolute -top-1.5 -right-2.5 h-4 min-w-[16px] bg-violet-600 text-white text-[11px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                  {totalTrips}
                </span>
              )}
            </div>
            <div className="flex items-center gap-0.5">
              <span className={`text-xs leading-none ${tripsActive ? "font-bold" : "font-semibold"}`}>{tripsLabel}</span>
              {totalTrips > 1 && (
                <ChevronUp className={`h-3 w-3 transition-transform ${showTripPicker ? "rotate-180" : ""}`} />
              )}
            </div>
          </button>

          {/* Aeropuertos */}
          <button
            onClick={() => onNavigate("airports")}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative tap-scale transition-colors ${activeTab === "airports" ? "text-violet-400" : "text-gray-500"}`}
          >
            <motion.div whileTap={{ scale: 0.82 }} className={`flex items-center justify-center w-10 h-8 rounded-full transition-all duration-200 ${activeTab === "airports" ? "bg-violet-500/20" : ""}`}>
              <MapPin className={`w-[22px] h-[22px] transition-colors ${activeTab === "airports" ? "text-violet-400" : "text-gray-500"}`} strokeWidth={activeTab === "airports" ? 2.5 : 1.5} />
            </motion.div>
            <span className={`text-xs leading-none ${activeTab === "airports" ? "font-bold" : "font-semibold"}`}>{tabLabels.airports}</span>
          </button>

          {/* Hoy */}
          <button
            onClick={() => onNavigate("today")}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative tap-scale transition-colors ${activeTab === "today" ? "text-violet-400" : "text-gray-500"}`}
          >
            <motion.div whileTap={{ scale: 0.82 }} className={`flex items-center justify-center w-10 h-8 rounded-full transition-all duration-200 ${activeTab === "today" ? "bg-violet-500/20" : ""}`}>
              <CalendarDays className={`w-[22px] h-[22px] transition-colors ${activeTab === "today" ? "text-violet-400" : "text-gray-500"}`} strokeWidth={activeTab === "today" ? 2.5 : 1.5} />
            </motion.div>
            <span className={`text-xs leading-none ${activeTab === "today" ? "font-bold" : "font-semibold"}`}>{locale === "es" ? "Hoy" : "Today"}</span>
          </button>

          {/* Vuelos */}
          <button
            onClick={() => onNavigate("search")}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative tap-scale transition-colors ${activeTab === "search" ? "text-violet-400" : "text-gray-500"}`}
          >
            <motion.div whileTap={{ scale: 0.82 }} className={`flex items-center justify-center w-10 h-8 rounded-full transition-all duration-200 ${activeTab === "search" ? "bg-violet-500/20" : ""}`}>
              <Plane className={`w-[22px] h-[22px] transition-colors ${activeTab === "search" ? "text-violet-400" : "text-gray-500"}`} strokeWidth={activeTab === "search" ? 2.5 : 1.5} />
            </motion.div>
            <span className={`text-xs leading-none ${activeTab === "search" ? "font-bold" : "font-semibold"}`}>{tabLabels.search}</span>
          </button>

          {/* Explorar */}
          <button
            onClick={() => onNavigate("discover")}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative tap-scale transition-colors ${activeTab === "discover" ? "text-violet-400" : "text-gray-500"}`}
          >
            <motion.div whileTap={{ scale: 0.82 }} className={`flex items-center justify-center w-10 h-8 rounded-full transition-all duration-200 ${activeTab === "discover" ? "bg-violet-500/20" : ""}`}>
              <Compass className={`w-[22px] h-[22px] transition-colors ${activeTab === "discover" ? "text-violet-400" : "text-gray-500"}`} strokeWidth={activeTab === "discover" ? 2.5 : 1.5} />
            </motion.div>
            <span className={`text-xs leading-none ${activeTab === "discover" ? "font-bold" : "font-semibold"}`}>
              {locale === "es" ? "Explorar" : "Explore"}
            </span>
          </button>

          {/* Nuevo viaje */}
          <button
            onClick={() => { setShowTripPicker(false); onNewTrip(); }}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 relative tap-scale transition-colors text-gray-500 hover:text-violet-400"
          >
            <motion.div whileTap={{ scale: 0.82 }} className="flex items-center justify-center w-10 h-8 rounded-full transition-all duration-200">
              <Plus className="w-[22px] h-[22px]" strokeWidth={1.5} />
            </motion.div>
            <span className="text-xs font-semibold leading-none">{locale === "es" ? "Nuevo" : "New"}</span>
          </button>

        </div>
      </div>
    </nav>
  );
}
