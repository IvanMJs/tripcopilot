"use client";

import { useRef, useState } from "react";
import { Pencil, X, Plus } from "lucide-react";
import { TripTab } from "@/lib/types";

interface Props {
  locale: "es" | "en";
  activeTab: string;
  userTrips: TripTab[];
  draftTrip: { name: string } | null;
  tabLabels: { airports: string; search: string };
  draftId: string;
  onTabChange: (id: string) => void;
  onRenameTrip: (id: string, name: string) => void;
  onDeleteTrip: (id: string) => void;
  onDiscardDraft: () => void;
  onNewTrip: () => void;
}

const tabBase = "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap";
const tabActive   = "border-blue-500 text-blue-400";
const tabInactive = "border-transparent text-gray-400 hover:text-gray-200";

export function TripTabBar({
  locale, activeTab, userTrips, draftTrip, tabLabels, draftId,
  onTabChange, onRenameTrip, onDeleteTrip, onDiscardDraft, onNewTrip,
}: Props) {
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

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
    <div className="hidden md:block border-b border-gray-800">
      <div className="flex gap-1 overflow-x-auto overflow-y-hidden">

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
            <div key={trip.id} className="flex items-center -mb-px">
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
                    className="bg-transparent border-b border-blue-400 outline-none text-blue-300 w-28 text-sm"
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
                  className="p-1 text-gray-600 hover:text-gray-300 transition-colors -mb-px"
                  title={locale === "en" ? "Rename trip" : "Renombrar viaje"}
                >
                  <Pencil className="h-3 w-3" />
                </button>
              )}

              <button
                onClick={(e) => { e.stopPropagation(); onDeleteTrip(trip.id); }}
                className="p-1 text-gray-700 hover:text-red-400 transition-colors -mb-px"
                title={locale === "en" ? "Delete trip" : "Eliminar viaje"}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}

        {/* Draft trip tab */}
        {draftTrip && (
          <div className="flex items-center -mb-px">
            <button
              onClick={() => onTabChange(draftId)}
              className={`${tabBase} ${activeTab === draftId ? tabActive : tabInactive} flex items-center gap-2`}
            >
              {draftTrip.name}
              <span className="text-[9px] font-bold uppercase tracking-wider text-yellow-500 border border-yellow-700/50 rounded px-1 py-0.5 leading-none">
                {locale === "es" ? "Borrador" : "Draft"}
              </span>
            </button>
            <button
              onClick={onDiscardDraft}
              className="p-1 text-gray-700 hover:text-red-400 transition-colors -mb-px"
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
  );
}
