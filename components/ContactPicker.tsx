"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookUser, Search, Trash2, X, Users } from "lucide-react";
import {
  PassengerContact,
  getContacts,
  removeContact,
} from "@/lib/passengerContacts";

// ── Labels ─────────────────────────────────────────────────────────────────────

const LABELS = {
  es: {
    title:          "Contactos guardados",
    searchPlaceholder: "Buscar por nombre…",
    empty:          "No hay contactos guardados",
    emptyHint:      "Los pasajeros que agregues se guardarán aquí automáticamente",
    select:         "Seleccionar",
    deleteAriaLabel: (name: string) => `Eliminar ${name}`,
    confirmDelete:  (name: string) => `¿Eliminar a ${name} de contactos?`,
    passport:       "Pasaporte:",
    passportMasked: (last4: string) => `****${last4}`,
  },
  en: {
    title:          "Saved contacts",
    searchPlaceholder: "Search by name…",
    empty:          "No saved contacts",
    emptyHint:      "Passengers you add will be saved here automatically",
    select:         "Select",
    deleteAriaLabel: (name: string) => `Remove ${name}`,
    confirmDelete:  (name: string) => `Remove ${name} from contacts?`,
    passport:       "Passport:",
    passportMasked: (last4: string) => `****${last4}`,
  },
} as const;

// ── Helpers ────────────────────────────────────────────────────────────────────

function maskPassport(raw: string): string {
  if (raw.length <= 4) return raw;
  return `****${raw.slice(-4)}`;
}

function sortByLastUsed(contacts: PassengerContact[]): PassengerContact[] {
  return [...contacts].sort(
    (a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime(),
  );
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onSelect: (contact: PassengerContact) => void;
  onClose: () => void;
  locale: "es" | "en";
}

// ── Component ──────────────────────────────────────────────────────────────────

export function ContactPicker({ isOpen, onSelect, onClose, locale }: Props) {
  const L = LABELS[locale];

  const [contacts, setContacts] = useState<PassengerContact[]>([]);
  const [search, setSearch] = useState("");

  const reload = useCallback(() => {
    setContacts(sortByLastUsed(getContacts()));
  }, []);

  useEffect(() => {
    if (isOpen) {
      reload();
      setSearch("");
    }
  }, [isOpen, reload]);

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(L.confirmDelete(name))) return;
    removeContact(id);
    reload();
  };

  const filtered = contacts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", duration: 0.35, bounce: 0.18 }}
            className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:w-full"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-700/60 px-4 py-3">
              <div className="flex items-center gap-2">
                <BookUser className="h-4 w-4 text-blue-400" />
                <h2 className="text-sm font-semibold text-slate-100">
                  {L.title}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 pt-3 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={L.searchPlaceholder}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 pl-8 pr-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* List */}
            <div className="max-h-72 overflow-y-auto px-4 pb-4">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <Users className="h-8 w-8 text-slate-600" />
                  <p className="text-sm text-slate-500">{L.empty}</p>
                  <p className="text-xs text-slate-600">{L.emptyHint}</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {filtered.map((contact) => (
                    <li
                      key={contact.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-100">
                          {contact.name}
                        </p>
                        {contact.email && (
                          <p className="truncate text-xs text-slate-400">
                            {contact.email}
                          </p>
                        )}
                        {contact.passportNumber && (
                          <p className="text-xs text-slate-500">
                            {L.passport}{" "}
                            {maskPassport(contact.passportNumber)}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            onSelect(contact);
                            onClose();
                          }}
                          className="rounded-lg bg-[#FFB800] px-2.5 py-1 text-xs font-medium text-[#07070d] hover:bg-[#FFC933] transition-colors"
                        >
                          {L.select}
                        </button>
                        <button
                          onClick={() => handleDelete(contact.id, contact.name)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                          aria-label={L.deleteAriaLabel(contact.name)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
