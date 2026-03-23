"use client";

import { useState } from "react";
import { useCollaborators } from "@/hooks/useCollaborators";
import { TripCollaborator, CollaboratorRole } from "@/lib/types";

interface Props {
  tripId: string;
  tripName: string;
  locale: "es" | "en";
  onClose: () => void;
}

const STATUS_LABEL: Record<TripCollaborator["status"], { es: string; en: string }> = {
  pending:  { es: "Pendiente",  en: "Pending"  },
  accepted: { es: "Aceptado",   en: "Accepted" },
  declined: { es: "Rechazado",  en: "Declined" },
};

const ROLE_LABEL: Record<CollaboratorRole, { es: string; en: string }> = {
  viewer: { es: "Ver",    en: "Viewer" },
  editor: { es: "Editar", en: "Editor" },
};

function StatusBadge({ status, locale }: { status: TripCollaborator["status"]; locale: "es" | "en" }) {
  const colorMap: Record<TripCollaborator["status"], string> = {
    pending:  "bg-yellow-500/20 text-yellow-300",
    accepted: "bg-green-500/20 text-green-300",
    declined: "bg-red-500/20 text-red-400",
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colorMap[status]}`}>
      {STATUS_LABEL[status][locale]}
    </span>
  );
}

export function TripShareModal({ tripId, tripName, locale, onClose }: Props) {
  const { collaborators, loading, inviteCollaborator, revokeAccess } = useCollaborators(tripId);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CollaboratorRole>("viewer");
  const [submitting, setSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const handleInvite = async () => {
    if (!email.trim()) return;
    setSubmitting(true);
    setInviteError(null);
    setInviteSuccess(false);

    try {
      await inviteCollaborator(email.trim(), role);
      setEmail("");
      setInviteSuccess(true);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Error al invitar");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (collaboratorId: string) => {
    try {
      await revokeAccess(collaboratorId);
    } catch {
      // Error is swallowed here — list will refresh automatically via realtime
    }
  };

  const t = {
    title:       locale === "es" ? "Compartir viaje" : "Share trip",
    emailLabel:  locale === "es" ? "Email del invitado" : "Guest email",
    roleLabel:   locale === "es" ? "Permiso" : "Role",
    inviteBtn:   locale === "es" ? "Invitar" : "Invite",
    inviting:    locale === "es" ? "Invitando..." : "Inviting...",
    success:     locale === "es" ? "Invitación enviada" : "Invitation sent",
    collabTitle: locale === "es" ? "Colaboradores actuales" : "Current collaborators",
    noCollabs:   locale === "es" ? "Sin colaboradores todavía" : "No collaborators yet",
    revoke:      locale === "es" ? "Revocar" : "Revoke",
    cancel:      locale === "es" ? "Cerrar" : "Close",
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none">
        <div
          className="w-full max-w-md pointer-events-auto rounded-2xl border border-white/[0.08] shadow-2xl p-5 space-y-5"
          style={{ background: "linear-gradient(160deg, rgba(18,18,32,0.99) 0%, rgba(10,10,20,1) 100%)" }}
        >
          {/* Header */}
          <div>
            <h3 className="text-base font-black text-white">{t.title}</h3>
            <p className="text-sm text-gray-400 mt-0.5 truncate">{tripName}</p>
          </div>

          {/* Invite form */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setInviteSuccess(false); }}
                placeholder={t.emailLabel}
                className="flex-1 min-w-0 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/60 transition-colors"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as CollaboratorRole)}
                className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/60 transition-colors"
              >
                <option value="viewer">{ROLE_LABEL.viewer[locale]}</option>
                <option value="editor">{ROLE_LABEL.editor[locale]}</option>
              </select>
            </div>

            {inviteError && (
              <p className="text-xs text-red-400">{inviteError}</p>
            )}
            {inviteSuccess && (
              <p className="text-xs text-green-400">{t.success}</p>
            )}

            <button
              onClick={handleInvite}
              disabled={submitting || !email.trim()}
              className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed py-2.5 text-sm font-semibold text-white transition-colors"
            >
              {submitting ? t.inviting : t.inviteBtn}
            </button>
          </div>

          {/* Collaborators list */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t.collabTitle}</p>

            {loading ? (
              <p className="text-sm text-gray-500">{locale === "es" ? "Cargando..." : "Loading..."}</p>
            ) : collaborators.length === 0 ? (
              <p className="text-sm text-gray-500">{t.noCollabs}</p>
            ) : (
              <ul className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {collaborators.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">{c.inviteeEmail}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-gray-500">{ROLE_LABEL[c.role][locale]}</span>
                        <span className="text-gray-700">·</span>
                        <StatusBadge status={c.status} locale={locale} />
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevoke(c.id)}
                      className="shrink-0 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-gray-400 hover:text-red-400 hover:border-red-500/40 transition-colors"
                    >
                      {t.revoke}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 text-sm font-semibold text-gray-400 hover:text-white transition-colors"
          >
            {t.cancel}
          </button>
        </div>
      </div>
    </>
  );
}
