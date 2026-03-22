"use client";

import { useState } from "react";
import { Plus, X, ChevronDown, Users } from "lucide-react";
import { Passenger } from "@/lib/types";

const MAX_PASSENGERS = 10;

interface TripPassengersProps {
  tripId: string;
  passengers: Passenger[];
  onUpdate: (tripId: string, passengers: Passenger[]) => void;
  locale: "es" | "en";
}

export function TripPassengers({ tripId, passengers, onUpdate, locale }: TripPassengersProps) {
  const [expanded, setExpanded] = useState(passengers.length > 0);
  const [newName, setNewName]   = useState("");
  const [newEmail, setNewEmail] = useState("");

  const label = locale === "es" ? "Viajeros" : "Travelers";

  function handleAdd() {
    const trimmedName = newName.trim();
    if (!trimmedName) return;
    if (passengers.length >= MAX_PASSENGERS) return;

    const updated: Passenger[] = [
      ...passengers,
      { name: trimmedName, email: newEmail.trim() || undefined },
    ];
    onUpdate(tripId, updated);
    setNewName("");
    setNewEmail("");
  }

  function handleRemove(idx: number) {
    const updated = passengers.filter((_, i) => i !== idx);
    onUpdate(tripId, updated);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  }

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
      {/* Header toggle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-gray-500" />
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            {label}
          </span>
          {passengers.length > 0 && (
            <span className="text-xs text-gray-600 tabular-nums">
              ({passengers.length})
            </span>
          )}
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 text-gray-600 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {/* Passenger list */}
          {passengers.length > 0 && (
            <ul className="space-y-1.5 mb-3">
              {passengers.map((p, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.05]"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">{p.name}</p>
                    {p.email && (
                      <p className="text-xs text-gray-500 truncate">{p.email}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemove(i)}
                    aria-label={locale === "es" ? "Eliminar viajero" : "Remove traveler"}
                    className="shrink-0 p-1 rounded-md text-gray-600 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Add passenger form */}
          {passengers.length < MAX_PASSENGERS && (
            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={locale === "es" ? "Nombre" : "Name"}
                maxLength={60}
                className="flex-1 min-w-[120px] bg-white/[0.05] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500/50 transition-colors"
              />
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={locale === "es" ? "Email (opcional)" : "Email (optional)"}
                maxLength={100}
                className="flex-1 min-w-[140px] bg-white/[0.05] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500/50 transition-colors"
              />
              <button
                onClick={handleAdd}
                disabled={!newName.trim()}
                aria-label={locale === "es" ? "Agregar viajero" : "Add traveler"}
                className="shrink-0 flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 text-xs font-semibold text-white transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                {locale === "es" ? "Agregar" : "Add"}
              </button>
            </div>
          )}

          {passengers.length === 0 && (
            <p className="text-xs text-gray-600 text-center py-1">
              {locale === "es"
                ? "No hay viajeros. Agregá uno arriba."
                : "No travelers yet. Add one above."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
