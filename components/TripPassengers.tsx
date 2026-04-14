"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { UserPlus, Trash2, User, Loader2, AlertTriangle, XCircle, BookUser, BookmarkPlus } from "lucide-react";
import { usePassengers, NewPassengerData, Passenger } from "@/hooks/usePassengers";
import { ContactPicker } from "@/components/ContactPicker";
import { PassengerContact, saveContact } from "@/lib/passengerContacts";

// ── Labels ────────────────────────────────────────────────────────────────────

const LABELS = {
  es: {
    title:                  "Pasajeros",
    addBtn:                 "Agregar",
    contactsBtn:            "Contactos",
    saveContactBtn:         "Guardar contacto",
    newPassenger:           "Nuevo pasajero",
    name:                   "Nombre",
    email:                  "Email",
    passport:               "Número de pasaporte",
    passportExpiry:         "Vencimiento del pasaporte",
    save:                   "Guardar",
    cancel:                 "Cancelar",
    deleteAriaLabel:        (name: string) => `Eliminar ${name}`,
    noPassengers:           "No hay pasajeros aún",
    noPassengersHint:       "Agregá pasajeros para gestionar su información de viaje",
    passportLabel:          "Pasaporte:",
    passportExpiryLabel:    "Vence:",
    warnExpiringSoon:       "Pasaporte vence pronto",
    warnExpired:            "Pasaporte vencido",
    toastAdded:             "Pasajero agregado",
    toastRemoved:           (name: string) => `${name} eliminado`,
    toastAddError:          "No se pudo agregar el pasajero",
    toastRemoveError:       "No se pudo eliminar el pasajero",
    toastContactSaved:      "Contacto guardado",
    nameRequired:           "El nombre es obligatorio",
  },
  en: {
    title:                  "Passengers",
    addBtn:                 "Add",
    contactsBtn:            "Contacts",
    saveContactBtn:         "Save contact",
    newPassenger:           "New passenger",
    name:                   "Name",
    email:                  "Email",
    passport:               "Passport number",
    passportExpiry:         "Passport expiry date",
    save:                   "Save",
    cancel:                 "Cancel",
    deleteAriaLabel:        (name: string) => `Remove ${name}`,
    noPassengers:           "No passengers yet",
    noPassengersHint:       "Add passengers to manage their travel information",
    passportLabel:          "Passport:",
    passportExpiryLabel:    "Expires:",
    warnExpiringSoon:       "Passport expiring soon",
    warnExpired:            "Passport expired",
    toastAdded:             "Passenger added",
    toastRemoved:           (name: string) => `${name} removed`,
    toastAddError:          "Could not add passenger",
    toastRemoveError:       "Could not remove passenger",
    toastContactSaved:      "Contact saved",
    nameRequired:           "Name is required",
  },
} as const;

// ── Passport expiry helpers ────────────────────────────────────────────────────

type ExpiryStatus = "expired" | "expiring_soon" | "ok" | null;

function getExpiryStatus(passportExpiry: string | undefined): ExpiryStatus {
  if (!passportExpiry) return null;
  const expiry = new Date(passportExpiry);
  if (isNaN(expiry.getTime())) return null;
  const now = new Date();
  const sixMonthsFromNow = new Date(now);
  sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
  if (expiry <= now) return "expired";
  if (expiry <= sixMonthsFromNow) return "expiring_soon";
  return "ok";
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  tripId: string;
  locale?: "es" | "en";
  readOnly?: boolean;
}

interface FormState {
  name: string;
  email: string;
  passportNumber: string;
  passportExpiry: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  passportNumber: "",
  passportExpiry: "",
};

function PassportExpiryBadge({
  status,
  L,
}: {
  status: ExpiryStatus;
  L: (typeof LABELS)["es"] | (typeof LABELS)["en"];
}) {
  if (status === "expired") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
        <XCircle className="h-3 w-3" />
        {L.warnExpired}
      </span>
    );
  }
  if (status === "expiring_soon") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">
        <AlertTriangle className="h-3 w-3" />
        {L.warnExpiringSoon}
      </span>
    );
  }
  return null;
}

export function TripPassengers({ tripId, locale = "es", readOnly = false }: Props) {
  const L = LABELS[locale];

  const { passengers, loading, error, addPassenger, removePassenger } =
    usePassengers(tripId);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showContacts, setShowContacts] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = form.name.trim();
    if (!trimmedName) {
      toast.error(L.nameRequired);
      return;
    }

    setSubmitting(true);
    try {
      const data: NewPassengerData = {
        tripId,
        name:            trimmedName,
        email:           form.email.trim() || undefined,
        passportNumber:  form.passportNumber.trim() || undefined,
        passportExpiry:  form.passportExpiry || undefined,
      };
      await addPassenger(data);
      // Auto-save as contact after successfully adding
      saveContact({
        name:           trimmedName,
        email:          form.email.trim() || undefined,
        passportNumber: form.passportNumber.trim() || undefined,
        passportExpiry: form.passportExpiry || undefined,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      toast.success(L.toastAdded);
    } catch {
      toast.error(L.toastAddError);
    } finally {
      setSubmitting(false);
    }
  };

  const handleContactSelect = (contact: PassengerContact) => {
    setForm({
      name:           contact.name,
      email:          contact.email ?? "",
      passportNumber: contact.passportNumber ?? "",
      passportExpiry: contact.passportExpiry ?? "",
    });
    setShowForm(true);
  };

  const handleSaveExistingAsContact = (p: Passenger) => {
    saveContact({
      name:           p.name,
      email:          p.email,
      passportNumber: p.passportNumber,
      passportExpiry: p.passportExpiry,
      nationality:    p.nationality,
      dateOfBirth:    p.dateOfBirth,
      seatPreference: p.seatPreference,
      mealPreference: p.mealPreference,
    });
    toast.success(L.toastContactSaved);
  };

  const handleRemove = async (id: string, name: string) => {
    try {
      await removePassenger(id);
      toast.success(L.toastRemoved(name));
    } catch {
      toast.error(L.toastRemoveError);
    }
  };

  return (
    <div className="space-y-4 px-1">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
          {L.title}
        </h3>
        {!readOnly && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowContacts(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-500 hover:text-slate-100 transition-colors"
            >
              <BookUser className="h-3.5 w-3.5" />
              {L.contactsBtn}
            </button>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 transition-colors"
            >
              <UserPlus className="h-3.5 w-3.5" />
              {L.addBtn}
            </button>
          </div>
        )}
      </div>

      {/* Add passenger form — hidden for read-only (viewer) role */}
      {!readOnly && showForm && (
        <form
          onSubmit={(e) => { void handleSubmit(e); }}
          className="rounded-xl border border-slate-700 bg-slate-800/60 p-4 space-y-3"
        >
          <p className="text-xs font-medium text-slate-400">{L.newPassenger}</p>

          {/* Name */}
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              {L.name} <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Juan García"
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="mb-1 block text-xs text-slate-400">{L.email}</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="juan@ejemplo.com"
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Passport number */}
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              {L.passport}
            </label>
            <input
              type="text"
              value={form.passportNumber}
              onChange={(e) =>
                setForm((f) => ({ ...f, passportNumber: e.target.value }))
              }
              placeholder="AAA123456"
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Passport expiry */}
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              {L.passportExpiry}
            </label>
            <input
              type="date"
              value={form.passportExpiry}
              onChange={(e) =>
                setForm((f) => ({ ...f, passportExpiry: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
            {form.passportExpiry && (
              <div className="mt-1.5">
                <PassportExpiryBadge
                  status={getExpiryStatus(form.passportExpiry)}
                  L={L}
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <UserPlus className="h-3.5 w-3.5" />
              )}
              {L.save}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setForm(EMPTY_FORM);
              }}
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-colors"
            >
              {L.cancel}
            </button>
          </div>
        </form>
      )}

      {/* Error state */}
      {error && !loading && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </p>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && passengers.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <User className="h-8 w-8 text-slate-600" />
          <p className="text-sm text-slate-500">{L.noPassengers}</p>
          <p className="text-xs text-slate-600">{L.noPassengersHint}</p>
        </div>
      )}

      {/* Contact picker modal */}
      <ContactPicker
        isOpen={showContacts}
        onSelect={handleContactSelect}
        onClose={() => setShowContacts(false)}
        locale={locale}
      />

      {/* Passenger cards */}
      {!loading && passengers.length > 0 && (
        <ul className="space-y-2">
          {passengers.map((p: Passenger) => {
            const expiryStatus = getExpiryStatus(p.passportExpiry);
            return (
              <li
                key={p.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="truncate text-sm font-medium text-slate-100">
                    {p.name}
                  </p>
                  {p.email && (
                    <p className="truncate text-xs text-slate-400">{p.email}</p>
                  )}
                  {p.passportNumber && (
                    <p className="text-xs text-slate-500">
                      {L.passportLabel} {p.passportNumber}
                    </p>
                  )}
                  {p.passportExpiry && (
                    <p className="text-xs text-slate-500">
                      {L.passportExpiryLabel} {p.passportExpiry}
                    </p>
                  )}
                  {expiryStatus !== "ok" && expiryStatus !== null && (
                    <div className="pt-0.5">
                      <PassportExpiryBadge status={expiryStatus} L={L} />
                    </div>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleSaveExistingAsContact(p)}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-blue-500/10 hover:text-blue-400 transition-colors"
                    aria-label={L.saveContactBtn}
                    title={L.saveContactBtn}
                  >
                    <BookmarkPlus className="h-4 w-4" />
                  </button>
                  {!readOnly && (
                    <button
                      onClick={() => { void handleRemove(p.id, p.name); }}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                      aria-label={L.deleteAriaLabel(p.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
