"use client";

import { useState } from "react";
import { BarChart2, Map, MapPin, CalendarDays, Compass, Plus, Pencil, X, Trash2, ChevronDown, Monitor, Home, User } from "lucide-react";
import { TripTab } from "@/lib/types";
import { useUIModeContext } from "@/contexts/UIModeContext";

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
}

export function DesktopSidebar({
  locale, activeTab, userTrips, draftTrip, draftId, tabLabels,
  onNavigate, onNewTrip, onDiscardDraft, onDeleteTrip, onRenameTrip, onRenameDraft,
}: Props) {
  const { isRelax } = useUIModeContext();
  const [tripsExpanded, setTripsExpanded] = useState(true);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");

  const tripsActive = activeTab === "trips" || activeTab === draftId || userTrips.some((t) => t.id === activeTab);
  const totalTrips = userTrips.length + (draftTrip ? 1 : 0);

  const tripsLabel = totalTrips <= 1
    ? (locale === "es" ? "Mi viaje" : "My trip")
    : (locale === "es" ? "Mis viajes" : "My trips");

  function commitRename(id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (id === draftId) {
      onRenameDraft(trimmed);
    } else {
      onRenameTrip(id, trimmed);
    }
    setRenameId(null);
  }

  function navItemClass(isActive: boolean) {
    return `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
      isActive
        ? "bg-[rgba(255,184,0,0.10)] text-[#FFB800]"
        : "text-text-muted hover:text-white hover:bg-white/[0.04]"
    }`;
  }

  return (
    <aside className="hidden md:flex flex-col w-64 min-h-screen fixed left-0 top-0 border-r border-border-default bg-gray-950/90 backdrop-blur-xl z-40 py-6 px-3">

      {/* Logo */}
      <div className="px-3 mb-8 flex items-center gap-2.5">
        <img src="/tripcopliot-avatar.svg" alt="TripCopilot" className="h-8 w-auto shrink-0" />
        <span className="text-base font-bold text-white truncate">TripCopilot</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto">

        {isRelax ? (
          /* ── RELAX MODE: Inicio · Descubrir · Perfil ─────────────── */
          <>
            {/* Inicio (Today) */}
            <button
              onClick={() => onNavigate("today")}
              className={navItemClass(activeTab === "today")}
            >
              <Home className="w-5 h-5 shrink-0" strokeWidth={activeTab === "today" ? 2.5 : 1.5} />
              <span>{locale === "es" ? "Inicio" : "Home"}</span>
            </button>

            {/* Explorar */}
            <button
              onClick={() => onNavigate("discover")}
              className={navItemClass(activeTab === "discover")}
            >
              <Compass className="w-5 h-5 shrink-0" strokeWidth={activeTab === "discover" ? 2.5 : 1.5} />
              <span>{locale === "es" ? "Descubrir" : "Discover"}</span>
            </button>

            {/* Perfil */}
            <button
              onClick={() => onNavigate("profile")}
              className={navItemClass(activeTab === "profile")}
            >
              <User className="w-5 h-5 shrink-0" strokeWidth={activeTab === "profile" ? 2.5 : 1.5} />
              <span>{locale === "es" ? "Perfil" : "Profile"}</span>
            </button>
          </>
        ) : (
          /* ── PILOT MODE: full nav (original behavior) ─────────────── */
          <>
            {/* Perfil / Stats */}
            <button
              onClick={() => onNavigate("profile")}
              className={navItemClass(activeTab === "profile")}
            >
              <BarChart2 className="w-5 h-5 shrink-0" strokeWidth={activeTab === "profile" ? 2.5 : 1.5} />
              <span>{tabLabels.profile}</span>
            </button>

            {/* Trips section */}
            <div>
              <button
                onClick={() => {
                  if (totalTrips === 0) {
                    onNavigate("trips");
                  } else if (totalTrips === 1) {
                    const singleId = draftTrip ? draftId : userTrips[0]?.id ?? "trips";
                    onNavigate(singleId);
                  } else {
                    setTripsExpanded((v) => !v);
                  }
                }}
                className={navItemClass(tripsActive)}
              >
                <Map className="w-5 h-5 shrink-0" strokeWidth={tripsActive ? 2.5 : 1.5} />
                <span className="flex-1 text-left">{tripsLabel}</span>
                {totalTrips > 1 && (
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${tripsExpanded ? "rotate-180" : ""}`}
                  />
                )}
                {totalTrips > 1 && (
                  <span className="h-5 min-w-[20px] bg-[#FFB800] text-[#07070d] text-[11px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                    {totalTrips}
                  </span>
                )}
              </button>

              {/* Expanded trips list */}
              {tripsExpanded && totalTrips > 0 && (
                <div className="mt-0.5 ml-3 space-y-0.5 border-l border-white/[0.06] pl-3">

                  {/* Draft */}
                  {draftTrip && (
                    <div className={`flex items-center gap-1 rounded-lg px-2 py-1.5 transition-colors ${activeTab === draftId ? "bg-white/[0.04]" : ""}`}>
                      {renameId === draftId ? (
                        <input
                          autoFocus
                          value={renameName}
                          onChange={(e) => setRenameName(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onBlur={() => commitRename(draftId, renameName)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitRename(draftId, renameName);
                            if (e.key === "Escape") setRenameId(null);
                          }}
                          maxLength={40}
                          className="flex-1 min-w-0 bg-white/[0.06] border border-[rgba(255,184,0,0.5)] rounded-lg px-2 py-1 text-xs text-white outline-none"
                        />
                      ) : (
                        <button
                          onClick={() => onNavigate(draftId)}
                          className="flex-1 min-w-0 text-left"
                        >
                          <p className={`text-xs font-semibold truncate ${activeTab === draftId ? "text-[#FFB800]" : "text-gray-300"}`}>
                            {draftTrip.name}
                            <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wider text-yellow-500 border border-yellow-700/50 rounded px-1">
                              {locale === "es" ? "Draft" : "Draft"}
                            </span>
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {draftTrip.flights.length === 0
                              ? (locale === "es" ? "Sin vuelos" : "No flights")
                              : locale === "es"
                              ? `${draftTrip.flights.length} vuelo${draftTrip.flights.length !== 1 ? "s" : ""}`
                              : `${draftTrip.flights.length} flight${draftTrip.flights.length !== 1 ? "s" : ""}`}
                          </p>
                        </button>
                      )}
                      {renameId !== draftId && (
                        <>
                          <button
                            onClick={() => { setRenameId(draftId); setRenameName(draftTrip.name); }}
                            className="shrink-0 p-1 rounded text-gray-600 hover:text-gray-300 hover:bg-white/[0.06] transition-colors"
                            aria-label={locale === "es" ? "Renombrar borrador" : "Rename draft"}
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={onDiscardDraft}
                            className="shrink-0 p-1 rounded text-gray-600 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                            aria-label={locale === "es" ? "Descartar borrador" : "Discard draft"}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Saved trips */}
                  {userTrips.map((trip) => (
                    <div
                      key={trip.id}
                      className={`flex items-center gap-1 rounded-lg px-2 py-1.5 transition-colors ${activeTab === trip.id ? "bg-white/[0.04]" : ""}`}
                    >
                      {renameId === trip.id ? (
                        <input
                          autoFocus
                          value={renameName}
                          onChange={(e) => setRenameName(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onBlur={() => commitRename(trip.id, renameName)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitRename(trip.id, renameName);
                            if (e.key === "Escape") setRenameId(null);
                          }}
                          maxLength={40}
                          className="flex-1 min-w-0 bg-white/[0.06] border border-[rgba(255,184,0,0.5)] rounded-lg px-2 py-1 text-xs text-white outline-none"
                        />
                      ) : (
                        <button
                          onClick={() => onNavigate(trip.id)}
                          className="flex-1 min-w-0 text-left"
                        >
                          <p className={`text-xs font-semibold truncate ${activeTab === trip.id ? "text-[#FFB800]" : "text-gray-300"}`}>
                            {trip.name}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {trip.flights.length === 0
                              ? (locale === "es" ? "Sin vuelos" : "No flights")
                              : locale === "es"
                              ? `${trip.flights.length} vuelo${trip.flights.length !== 1 ? "s" : ""}`
                              : `${trip.flights.length} flight${trip.flights.length !== 1 ? "s" : ""}`}
                          </p>
                        </button>
                      )}
                      {renameId !== trip.id && (
                        <>
                          <button
                            onClick={() => { setRenameId(trip.id); setRenameName(trip.name); }}
                            className="shrink-0 p-1 rounded text-gray-600 hover:text-gray-300 hover:bg-white/[0.06] transition-colors"
                            aria-label={locale === "es" ? `Renombrar viaje ${trip.name}` : `Rename trip ${trip.name}`}
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => onDeleteTrip(trip.id)}
                            className="shrink-0 p-1 rounded text-gray-600 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                            aria-label={locale === "es" ? `Eliminar viaje ${trip.name}` : `Delete trip ${trip.name}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Aeropuertos */}
            <button
              onClick={() => onNavigate("airports")}
              className={navItemClass(activeTab === "airports")}
            >
              <MapPin className="w-5 h-5 shrink-0" strokeWidth={activeTab === "airports" ? 2.5 : 1.5} />
              <span>{tabLabels.airports}</span>
            </button>

            {/* Hoy */}
            <button
              onClick={() => onNavigate("today")}
              className={navItemClass(activeTab === "today")}
            >
              <CalendarDays className="w-5 h-5 shrink-0" strokeWidth={activeTab === "today" ? 2.5 : 1.5} />
              <span>{locale === "es" ? "Hoy" : "Today"}</span>
            </button>

            {/* Tablero */}
            <a
              href="/board"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-text-muted hover:text-white hover:bg-white/[0.04]"
            >
              <Monitor className="w-5 h-5 shrink-0" strokeWidth={1.5} />
              <span>{locale === "es" ? "Tablero" : "Board"}</span>
            </a>

            {/* Explorar */}
            <button
              onClick={() => onNavigate("discover")}
              className={navItemClass(activeTab === "discover")}
            >
              <Compass className="w-5 h-5 shrink-0" strokeWidth={activeTab === "discover" ? 2.5 : 1.5} />
              <span>{locale === "es" ? "Explorar" : "Explore"}</span>
            </button>
          </>
        )}

      </nav>

      {/* New trip button */}
      <div className="mt-4 pt-4 border-t border-white/[0.06]">
        <button
          onClick={onNewTrip}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#FFB800] hover:bg-[#FFC933] text-[#07070d] text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>{locale === "es" ? "Nuevo viaje" : "New trip"}</span>
        </button>
      </div>
    </aside>
  );
}
