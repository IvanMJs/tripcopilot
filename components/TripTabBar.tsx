"use client";

import { useRef, useState, useEffect } from "react";
import { Pencil, X, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { TripTab } from "@/lib/types";

interface Props {
  locale: "es" | "en";
  activeTab: string;
  userTrips: TripTab[];
  draftTrip: { name: string } | null;
  tabLabels: { airports: string; search: string };
  draftId: string;
  alertTripIds?: string[];
  onTabChange: (id: string) => void;
  onRenameTrip: (id: string, name: string) => void;
  onDeleteTrip: (id: string) => void;
  onDiscardDraft: () => void;
  onNewTrip: () => void;
}

const tabBase = "px-4 py-2.5 text-sm font-medium transition-all duration-150 whitespace-nowrap rounded-lg mx-0.5 my-1 border-b-2 -mb-px";
const tabActive   = "bg-[rgba(255,184,0,0.12)] border-[rgba(255,184,0,0.35)] text-[#FFB800] font-semibold shadow-sm";
const tabInactive = "border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]";

export function TripTabBar({
  locale, activeTab, userTrips, draftTrip, tabLabels, draftId, alertTripIds,
  onTabChange, onRenameTrip, onDeleteTrip, onDiscardDraft, onNewTrip,
}: Props) {
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function updateScrollState() {
      if (!el) return;
      setCanScrollLeft(el.scrollLeft > 0);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    }

    updateScrollState();
    el.addEventListener("scroll", updateScrollState);

    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, [userTrips, draftTrip]);

  function startRename(trip: TripTab) {
    setEditingTabId(trip.id);
    setEditingName(trip.name);
    setTimeout(() => editInputRef.current?.focus(), 0);
  }

  function saveRename() {
    if (editingTabId) {
      onRenameTrip(editingTabId, editingName);
      setEditingTabId(null);
    }
  }

  return (
    <div className="hidden md:block border-b border-gray-800/60 bg-gray-950/40 backdrop-blur-sm">
      <div className="relative">
        {canScrollLeft && (
          <button
            onClick={() => scrollRef.current?.scrollBy({ left: -120, behavior: "smooth" })}
            className="absolute left-0 top-0 h-full px-2 bg-gradient-to-r from-gray-950 to-transparent text-gray-400 hover:text-white z-10 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        {canScrollRight && (
          <button
            onClick={() => scrollRef.current?.scrollBy({ left: 120, behavior: "smooth" })}
            className="absolute right-0 top-0 h-full px-2 bg-gradient-to-l from-gray-950 to-transparent text-gray-400 hover:text-white z-10 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      <div ref={scrollRef} className="flex gap-0 overflow-x-auto overflow-y-hidden scrollbar-hide px-1">

        {/* Static tabs */}
        {([
          { id: "airports", label: tabLabels.airports },
          { id: "search",   label: tabLabels.search   },
        ] as const).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`${tabBase} ${activeTab === id ? tabActive : tabInactive}`}
          >
            {label}
          </button>
        ))}

        {/* Dynamic user trip tabs */}
        {userTrips.map((trip) => {
          const isActive  = activeTab === trip.id;
          const isEditing = editingTabId === trip.id;

          return (
            <div key={trip.id} className="relative flex items-center -mb-px">
              {alertTripIds?.includes(trip.id) && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 z-10 pointer-events-none" />
              )}
              {isEditing ? (
                <div className={`${tabBase} ${tabActive} flex items-center`}>
                  <input
                    ref={editInputRef}
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={saveRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveRename();
                      if (e.key === "Escape") setEditingTabId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    maxLength={30}
                    className="bg-transparent border-b border-[rgba(255,184,0,0.35)] outline-none text-[#FFB800] w-28 text-sm"
                  />
                </div>
              ) : (
                <button
                  onClick={() => onTabChange(trip.id)}
                  className={`${tabBase} ${isActive ? tabActive : tabInactive}`}
                >
                  {trip.name}
                </button>
              )}

              {isActive && !isEditing && (
                <button
                  onClick={(e) => { e.stopPropagation(); startRename(trip); }}
                  className="p-1 text-gray-600 hover:text-gray-300 transition-colors"
                  title={locale === "en" ? "Rename trip" : "Renombrar viaje"}
                >
                  <Pencil className="h-3 w-3" />
                </button>
              )}

              <button
                onClick={(e) => { e.stopPropagation(); onDeleteTrip(trip.id); }}
                className="p-1 text-gray-700 hover:text-red-400 transition-colors"
                title={locale === "en" ? "Delete trip" : "Eliminar viaje"}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}

        {/* Draft trip tab */}
        {draftTrip && (
          <div className="flex items-center">
            <button
              onClick={() => onTabChange(draftId)}
              className={`${tabBase} ${activeTab === draftId ? tabActive : tabInactive} flex items-center gap-2`}
            >
              {draftTrip.name}
              <span className="text-[11px] font-bold uppercase tracking-wider text-yellow-500 border border-yellow-700/50 rounded px-1 py-0.5 leading-none">
                {locale === "es" ? "Borrador" : "Draft"}
              </span>
            </button>
            <button
              onClick={onDiscardDraft}
              className="p-1 text-gray-700 hover:text-red-400 transition-colors"
              title={locale === "es" ? "Descartar borrador" : "Discard draft"}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* New trip button */}
        <button
          onClick={onNewTrip}
          className={`${tabBase} ${tabInactive} flex items-center gap-1 px-3`}
          title={locale === "en" ? "New trip" : "Nuevo viaje"}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>

      </div>
      </div>
    </div>
  );
}
