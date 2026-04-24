"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import type { FriendWithLocation } from "@/lib/friends";

interface PendingIncoming {
  friendshipId: string;
  requesterId: string;
  requesterEmail: string;
}

interface FriendsTravelSectionProps {
  locale: "es" | "en";
  userId: string | null;
}

const LABELS = {
  es: {
    title: "Amigos viajeros",
    addFriend: "Agregar amigo",
    emailPlaceholder: "Email de tu amigo/a",
    sendInvite: "Enviar invitación",
    sending: "Enviando...",
    inviteSent: "Invitación enviada",
    emptyTitle: "Conectá con amigos que viajan",
    emptyDesc: "Invitá a tus amigos para ver dónde están viajando en tiempo real.",
    wantsToConnect: "quiere conectar",
    accept: "Aceptar",
    decline: "Rechazar",
    traveling: "viajando ahora",
    pendingTitle: "Solicitudes pendientes",
    friendsTitle: "Mis amigos",
    removeBtn: "Eliminar",
    errorSelf: "No podés agregarte a vos mismo",
    errorNotFound: "No se encontró ningún usuario con ese email",
    errorDuplicate: "Ya existe una solicitud con este usuario",
    errorGeneric: "Ocurrió un error. Intentá de nuevo.",
  },
  en: {
    title: "Travel friends",
    addFriend: "Add friend",
    emailPlaceholder: "Your friend's email",
    sendInvite: "Send invitation",
    sending: "Sending...",
    inviteSent: "Invitation sent",
    emptyTitle: "Connect with friends who travel",
    emptyDesc: "Invite your friends to see where they're traveling in real time.",
    wantsToConnect: "wants to connect",
    accept: "Accept",
    decline: "Decline",
    traveling: "traveling now",
    pendingTitle: "Pending requests",
    friendsTitle: "My friends",
    removeBtn: "Remove",
    errorSelf: "You can't add yourself",
    errorNotFound: "No user found with that email",
    errorDuplicate: "A request already exists with this user",
    errorGeneric: "Something went wrong. Please try again.",
  },
} as const;

export function FriendsTravelSection({ locale, userId }: FriendsTravelSectionProps) {
  const L = LABELS[locale];

  const [friends, setFriends] = useState<FriendWithLocation[]>([]);
  const [pendingIncoming, setPendingIncoming] = useState<PendingIncoming[]>([]);
  const [loading, setLoading] = useState(true);

  const [addEmail, setAddEmail] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const res = await fetch("/api/friends");
        if (res.ok) {
          const data = (await res.json()) as {
            friends: FriendWithLocation[];
            pendingIncoming: PendingIncoming[];
          };
          setFriends(data.friends ?? []);
          setPendingIncoming(data.pendingIncoming ?? []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!addEmail.trim()) return;
    setAddLoading(true);
    setAddError(null);
    setAddSuccess(false);

    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addEmail.trim().toLowerCase() }),
      });
      if (res.ok) {
        setAddSuccess(true);
        setAddEmail("");
      } else {
        const data = (await res.json()) as { error?: string };
        const msg = data.error ?? L.errorGeneric;
        if (msg.includes("vos mismo") || msg.includes("yourself")) {
          setAddError(L.errorSelf);
        } else if (msg.includes("No se encontró") || msg.includes("No user found")) {
          setAddError(L.errorNotFound);
        } else if (msg.includes("Ya existe") || msg.includes("already exists")) {
          setAddError(L.errorDuplicate);
        } else {
          setAddError(L.errorGeneric);
        }
      }
    } catch {
      setAddError(L.errorGeneric);
    } finally {
      setAddLoading(false);
    }
  }

  async function handleAccept(friendshipId: string) {
    setActionLoading(friendshipId);
    try {
      const res = await fetch("/api/friends/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendshipId }),
      });
      if (res.ok) {
        setPendingIncoming((prev) => prev.filter((p) => p.friendshipId !== friendshipId));
        // Refresh friends list
        const friendsRes = await fetch("/api/friends");
        if (friendsRes.ok) {
          const data = (await friendsRes.json()) as {
            friends: FriendWithLocation[];
            pendingIncoming: PendingIncoming[];
          };
          setFriends(data.friends ?? []);
          setPendingIncoming(data.pendingIncoming ?? []);
        }
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDecline(friendshipId: string) {
    setActionLoading(friendshipId);
    try {
      const res = await fetch(`/api/friends/${friendshipId}`, { method: "DELETE" });
      if (!res.ok) return;
      setPendingIncoming((prev) => prev.filter((p) => p.friendshipId !== friendshipId));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRemove(friendshipId: string) {
    setActionLoading(friendshipId);
    try {
      const res = await fetch(`/api/friends/${friendshipId}`, { method: "DELETE" });
      if (res.ok) {
        setFriends((prev) => prev.filter((f) => f.friendshipId !== friendshipId));
      }
    } finally {
      setActionLoading(null);
    }
  }

  function getInitial(email: string) {
    return email.charAt(0).toUpperCase();
  }

  if (!userId) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="px-4 pb-4 space-y-4"
    >
      {/* Section header */}
      <div className="flex items-center gap-2 pt-1">
        <span className="text-base" aria-hidden>🌍</span>
        <h2 className="text-sm font-bold text-white/90">{L.title}</h2>
      </div>

      {/* Pending incoming requests */}
      {pendingIncoming.length > 0 && (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 space-y-3">
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">
            {L.pendingTitle}
          </p>
          {pendingIncoming.map((req) => (
            <div
              key={req.friendshipId}
              className="flex items-center justify-between gap-3 flex-wrap"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-8 w-8 rounded-full bg-[#FFB800] flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-white">
                    {getInitial(req.requesterEmail)}
                  </span>
                </div>
                <span className="text-sm text-white/80 truncate">
                  <span className="font-medium">{req.requesterEmail}</span>{" "}
                  <span className="text-white/50">{L.wantsToConnect}</span>
                </span>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => void handleAccept(req.friendshipId)}
                  disabled={actionLoading === req.friendshipId}
                  className="rounded-lg bg-[#FFB800] hover:bg-[#FFC933] active:scale-95 disabled:opacity-50 text-[#07070d] text-xs font-semibold px-3 py-1.5 transition-all"
                >
                  {L.accept}
                </button>
                <button
                  onClick={() => void handleDecline(req.friendshipId)}
                  disabled={actionLoading === req.friendshipId}
                  className="rounded-lg bg-white/[0.07] hover:bg-white/[0.12] active:scale-95 disabled:opacity-50 text-white/60 text-xs font-semibold px-3 py-1.5 transition-all"
                >
                  {L.decline}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Friends list */}
      {loading ? (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
          <div className="flex flex-col gap-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="h-9 w-9 rounded-full bg-white/[0.07]" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-1/2 rounded bg-white/[0.07]" />
                  <div className="h-2.5 w-1/3 rounded bg-white/[0.05]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : friends.length > 0 ? (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 space-y-3">
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">
            {L.friendsTitle}
          </p>
          {friends.map((friend) => (
            <div key={friend.friendshipId} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-full bg-[#FFB800] flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-white">
                    {getInitial(friend.email)}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white/90 truncate">{friend.email}</p>
                  {friend.currentLocation !== null && (
                    <p className="text-xs text-[#FFB800] font-medium mt-0.5">
                      {"📍 "}
                      {friend.currentLocation.city} &mdash; {L.traveling}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => void handleRemove(friend.friendshipId)}
                disabled={actionLoading === friend.friendshipId}
                className="shrink-0 rounded-lg bg-white/[0.05] hover:bg-white/[0.10] active:scale-95 disabled:opacity-50 text-white/40 hover:text-white/60 text-xs font-medium px-2.5 py-1.5 transition-all"
              >
                {L.removeBtn}
              </button>
            </div>
          ))}
        </div>
      ) : (
        pendingIncoming.length === 0 && (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6 text-center">
            <p className="text-2xl mb-2">🌍</p>
            <p className="text-sm font-semibold text-white/80 mb-1">{L.emptyTitle}</p>
            <p className="text-xs text-white/40">{L.emptyDesc}</p>
          </div>
        )
      )}

      {/* Add friend form */}
      <form
        onSubmit={(e) => void handleSendInvite(e)}
        className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 space-y-3"
      >
        <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">
          {L.addFriend}
        </p>
        <div className="flex gap-2">
          <input
            type="email"
            value={addEmail}
            onChange={(e) => {
              setAddEmail(e.target.value);
              setAddError(null);
              setAddSuccess(false);
            }}
            placeholder={L.emailPlaceholder}
            className="flex-1 min-w-0 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white text-sm placeholder-white/30 px-3 py-2 focus:outline-none focus:border-[rgba(255,184,0,0.25)] transition-colors"
            disabled={addLoading}
            required
          />
          <button
            type="submit"
            disabled={addLoading || !addEmail.trim()}
            className="shrink-0 rounded-xl bg-[#FFB800] hover:bg-[#FFC933] active:scale-95 disabled:opacity-50 text-[#07070d] text-sm font-semibold px-4 py-2 transition-all"
          >
            {addLoading ? L.sending : L.sendInvite}
          </button>
        </div>
        {addError && (
          <p className="text-xs text-red-400 font-medium">{addError}</p>
        )}
        {addSuccess && (
          <p className="text-xs text-green-400 font-medium">{L.inviteSent}</p>
        )}
      </form>
    </motion.div>
  );
}
