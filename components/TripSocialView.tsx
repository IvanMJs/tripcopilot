"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import type { FriendWithLocation, TravelerSearchResult } from "@/lib/friends";

interface Props {
  locale: "es" | "en";
  userId: string | null;
}

interface PendingIncoming {
  friendshipId: string;
  requesterId: string;
  requesterEmail: string;
}

interface FollowUser {
  userId: string;
  username: string;
  displayName: string | null;
}

interface FeedItem {
  tripId: string;
  userId: string;
  username: string;
  displayName: string | null;
  destinationCode: string;
  destinationName: string | null;
  isoDate: string;
  createdAt: string;
}

const LABELS = {
  es: {
    searchPlaceholder: "@username o nombre",
    searchLabel: "Buscar viajeros",
    viewProfile: "Ver perfil",
    noTravelers: "No se encontraron viajeros",
    pendingTitle: "Solicitudes pendientes",
    accept: "Aceptar",
    decline: "Rechazar",
    friendsTitle: "Mis amigos",
    noFriends: "Aún no tenés amigos en TripSocial",
    travelingNow: "Viajando ahora",
    addFriendTitle: "Agregar amigo",
    addFriendPlaceholder: "@username",
    addBtn: "Agregar",
    addSuccess: "Solicitud enviada",
    errorSelf: "No podés agregarte a vos mismo",
    errorNotFound: "Usuario no encontrado",
    errorDuplicate: "Ya existe una solicitud con este usuario",
    errorGeneric: "Ocurrió un error. Intentá de nuevo.",
    loadingFriends: "Cargando...",
    followingTitle: "Viajeros que seguís",
    followersTitle: "Te siguen",
    noFollowing: "No seguís a nadie todavía",
    noFollowers: "Todavía nadie te sigue",
    feedTitle: "Actividad reciente",
    feedEmpty: "Seguí a viajeros para ver su actividad",
    feedAdded: "agregó un viaje a",
    feedUpcoming: "viaja próximamente a",
  },
  en: {
    searchPlaceholder: "@username or name",
    searchLabel: "Find travelers",
    viewProfile: "View profile",
    noTravelers: "No travelers found",
    pendingTitle: "Pending requests",
    accept: "Accept",
    decline: "Decline",
    friendsTitle: "My friends",
    noFriends: "No friends on TripSocial yet",
    travelingNow: "Traveling now",
    addFriendTitle: "Add friend",
    addFriendPlaceholder: "@username",
    addBtn: "Add",
    addSuccess: "Request sent",
    errorSelf: "You can't add yourself",
    errorNotFound: "User not found",
    errorDuplicate: "A request already exists with this user",
    errorGeneric: "Something went wrong. Please try again.",
    loadingFriends: "Loading...",
    followingTitle: "People you follow",
    followersTitle: "Your followers",
    noFollowing: "Not following anyone yet",
    noFollowers: "No followers yet",
    feedTitle: "Recent activity",
    feedEmpty: "Follow travelers to see their activity",
    feedAdded: "added a trip to",
    feedUpcoming: "is traveling soon to",
  },
} as const;

function getInitial(str: string): string {
  return (str[0] ?? "?").toUpperCase();
}

export function TripSocialView({ locale, userId }: Props) {
  const L = LABELS[locale];
  const router = useRouter();

  // ── Search ──────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TravelerSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await fetch(
        `/api/travelers/search?q=${encodeURIComponent(q.trim())}`,
      );
      if (res.ok) {
        const data = (await res.json()) as { results?: TravelerSearchResult[] };
        setSearchResults(data.results ?? []);
        setSearchOpen(true);
      }
    } finally {
      setSearchLoading(false);
    }
  }, []);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setSearchQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      void runSearch(val);
    }, 400);
  }

  // Close dropdown on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── Friends + pending ────────────────────────────────────────────────────────
  const [friends, setFriends] = useState<FriendWithLocation[]>([]);
  const [pendingIncoming, setPendingIncoming] = useState<PendingIncoming[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [followListLoading, setFollowListLoading] = useState(true);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);

  async function fetchFriends() {
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
      setFriendsLoading(false);
    }
  }

  useEffect(() => {
    if (!userId) {
      setFriendsLoading(false);
      return;
    }
    void fetchFriends();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!userId) { setFollowListLoading(false); return; }
    void (async () => {
      try {
        const res = await fetch("/api/follows/list");
        if (res.ok) {
          const data = await res.json() as { following: FollowUser[]; followers: FollowUser[] };
          setFollowing(data.following ?? []);
          setFollowers(data.followers ?? []);
        }
      } finally {
        setFollowListLoading(false);
      }
    })();
  }, [userId]);

  useEffect(() => {
    if (followListLoading || following.length === 0) return;
    setFeedLoading(true);
    void (async () => {
      try {
        const res = await fetch("/api/feed/following");
        if (res.ok) {
          const data = await res.json() as { items: FeedItem[] };
          setFeedItems(data.items ?? []);
        }
      } finally {
        setFeedLoading(false);
      }
    })();
  }, [following, followListLoading]);

  async function handleAccept(friendshipId: string) {
    setActionLoading(friendshipId);
    try {
      const res = await fetch("/api/friends/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendshipId }),
      });
      if (res.ok) {
        await fetchFriends();
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDecline(friendshipId: string) {
    setActionLoading(friendshipId);
    try {
      const res = await fetch(`/api/friends/${friendshipId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setPendingIncoming((prev) =>
          prev.filter((p) => p.friendshipId !== friendshipId),
        );
      }
    } finally {
      setActionLoading(null);
    }
  }

  // ── Add friend ───────────────────────────────────────────────────────────────
  const [addUsername, setAddUsername] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);

  async function handleAddFriend(e: React.FormEvent) {
    e.preventDefault();
    const username = addUsername.replace(/^@/, "").trim();
    if (!username) return;
    setAddLoading(true);
    setAddError(null);
    setAddSuccess(false);
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      if (res.ok) {
        setAddSuccess(true);
        setAddUsername("");
      } else {
        const data = (await res.json()) as { error?: string };
        const msg = data.error ?? "";
        if (msg.includes("vos mismo") || msg.includes("yourself")) {
          setAddError(L.errorSelf);
        } else if (msg.includes("not found") || msg.includes("no encontr")) {
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

  if (!userId) return null;

  return (
    <div className="flex flex-col gap-4 px-4 pb-8 pt-2">
      {/* ── A) Search bar ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="relative"
        ref={searchRef}
      >
        <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
          {L.searchLabel}
        </p>
        <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-2 focus-within:border-[rgba(255,184,0,0.25)] transition-colors">
          {/* @ prefix icon */}
          <span className="text-sm font-semibold text-[#FFB800] select-none">@</span>
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder={L.searchPlaceholder}
            className="flex-1 min-w-0 bg-transparent text-sm text-white placeholder-white/30 outline-none"
          />
          {searchLoading && (
            <svg
              className="h-4 w-4 text-[#FFB800] animate-spin shrink-0"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          )}
        </div>

        {/* Dropdown */}
        {searchOpen && (
          <div className="absolute z-50 top-full mt-1 w-full rounded-xl border border-white/[0.08] bg-[#0d0d1a] shadow-xl overflow-hidden">
            {searchResults.length === 0 ? (
              <p className="text-sm text-white/40 px-4 py-3">{L.noTravelers}</p>
            ) : (
              searchResults.map((result) => (
                <div
                  key={result.userId}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.05] transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#FFB800] to-blue-600 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-white">
                        {getInitial(result.displayName ?? result.username)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {result.displayName ?? result.username}
                      </p>
                      <p className="text-xs text-[#FFB800]">@{result.username}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSearchOpen(false);
                      router.push(`/u/${result.username}`);
                    }}
                    className="shrink-0 text-xs font-semibold text-[#FFB800] hover:text-[#FFB800] transition-colors ml-3"
                  >
                    {L.viewProfile}
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </motion.div>

      {/* ── B) Pending friend requests ────────────────────────────────────── */}
      {!friendsLoading && pendingIncoming.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.05 }}
          className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 space-y-3"
        >
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">
            {L.pendingTitle}
          </p>
          {pendingIncoming.map((req) => (
            <div
              key={req.friendshipId}
              className="flex items-center justify-between gap-3 flex-wrap"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#FFB800] to-blue-600 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-white">
                    {getInitial(req.requesterEmail)}
                  </span>
                </div>
                <span className="text-sm text-white/80 truncate">
                  {req.requesterEmail}
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
        </motion.div>
      )}

      {/* ── C) Friends list ───────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.1 }}
      >
        {friendsLoading ? (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 space-y-3">
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
        ) : friends.length > 0 ? (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 space-y-3">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">
              {L.friendsTitle}
            </p>
            {friends.map((friend) => {
              const canNav = !!friend.username;
              const label = friend.displayName ?? friend.email;
              return (
                <button
                  key={friend.friendshipId}
                  disabled={!canNav}
                  onClick={() => {
                    if (canNav) router.push(`/u/${friend.username!}`);
                  }}
                  className="w-full flex items-center gap-3 text-left disabled:cursor-default hover:enabled:bg-white/[0.04] rounded-xl px-1 py-1 transition-colors"
                >
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#FFB800] to-blue-600 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-white">
                      {getInitial(label)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white/90 truncate">{label}</p>
                    {friend.username && (
                      <p className="text-xs text-[#FFB800]">@{friend.username}</p>
                    )}
                    {friend.currentLocation !== null && (
                      <p className="text-xs text-[#FFB800] font-medium mt-0.5">
                        {"📍 "}
                        {friend.currentLocation.city} &mdash; {L.travelingNow}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          pendingIncoming.length === 0 && (
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-8 text-center">
              <p className="text-3xl mb-3">🌍</p>
              <p className="text-sm font-semibold text-white/70">{L.noFriends}</p>
            </div>
          )
        )}
      </motion.div>

      {/* ── E) Following list — only shown when loading or has data ─────── */}
      {(followListLoading || following.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.2 }}
          className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 space-y-3"
        >
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">{L.followingTitle}</p>
          {followListLoading ? (
            <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-10 rounded-xl skeleton" />)}</div>
          ) : (
            following.map((f) => (
              <a
                key={f.userId}
                href={`/u/${f.username}`}
                className="flex items-center gap-3 hover:bg-white/[0.04] rounded-xl p-2 -mx-2 transition-colors"
              >
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#FFB800] to-blue-600 flex items-center justify-center shrink-0">
                  <span className="text-sm font-black text-white">{(f.displayName ?? f.username)[0]?.toUpperCase()}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{f.displayName ?? f.username}</p>
                  <p className="text-xs text-white/40 truncate">@{f.username}</p>
                </div>
              </a>
            ))
          )}
        </motion.div>
      )}

      {/* ── F) Followers list — only shown when loading or has data ──────── */}
      {(followListLoading || followers.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.25 }}
          className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 space-y-3"
        >
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">{L.followersTitle}</p>
          {followListLoading ? (
            <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-10 rounded-xl skeleton" />)}</div>
          ) : (
            followers.map((f) => (
              <a
                key={f.userId}
                href={`/u/${f.username}`}
                className="flex items-center gap-3 hover:bg-white/[0.04] rounded-xl p-2 -mx-2 transition-colors"
              >
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#FFB800] to-blue-600 flex items-center justify-center shrink-0">
                  <span className="text-sm font-black text-white">{(f.displayName ?? f.username)[0]?.toUpperCase()}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{f.displayName ?? f.username}</p>
                  <p className="text-xs text-white/40 truncate">@{f.username}</p>
                </div>
              </a>
            ))
          )}
        </motion.div>
      )}

      {/* ── G) Activity feed ─────────────────────────────────────────────── */}
      {(feedLoading || feedItems.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.3 }}
          className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 space-y-3"
        >
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">{L.feedTitle}</p>
          {feedLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => <div key={i} className="h-12 rounded-xl skeleton" />)}
            </div>
          ) : (
            feedItems.map((item) => {
              const today = new Date().toISOString().slice(0, 10);
              const isUpcoming = item.isoDate > today;
              return (
                <a
                  key={item.tripId}
                  href={`/u/${item.username}`}
                  className="flex items-center gap-3 hover:bg-white/[0.04] rounded-xl p-2 -mx-2 transition-colors"
                >
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#FFB800] to-blue-600 flex items-center justify-center shrink-0">
                    <span className="text-sm font-black text-white">
                      {(item.displayName ?? item.username)[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white/80 leading-snug truncate">
                      <span className="font-semibold text-white">{item.displayName ?? `@${item.username}`}</span>
                      {" "}
                      <span className="text-white/50">{isUpcoming ? L.feedUpcoming : L.feedAdded}</span>
                      {" "}
                      <span className="font-semibold text-[#FFB800]">{item.destinationName ?? item.destinationCode}</span>
                    </p>
                    <p className="text-xs text-white/30 mt-0.5">{item.isoDate}</p>
                  </div>
                </a>
              );
            })
          )}
        </motion.div>
      )}

      {/* ── D) Add friend form ────────────────────────────────────────────── */}
      <motion.form
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.15 }}
        onSubmit={(e) => void handleAddFriend(e)}
        className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 space-y-3"
      >
        <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">
          {L.addFriendTitle}
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={addUsername}
            onChange={(e) => {
              setAddUsername(e.target.value);
              setAddError(null);
              setAddSuccess(false);
            }}
            placeholder={L.addFriendPlaceholder}
            className="flex-1 min-w-0 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white text-sm placeholder-white/30 px-3 py-2 focus:outline-none focus:border-[rgba(255,184,0,0.25)] transition-colors"
            disabled={addLoading}
          />
          <button
            type="submit"
            disabled={addLoading || !addUsername.trim()}
            className="shrink-0 rounded-xl bg-[#FFB800] hover:bg-[#FFC933] active:scale-95 disabled:opacity-50 text-[#07070d] text-sm font-semibold px-4 py-2 transition-all"
          >
            {addLoading ? "..." : L.addBtn}
          </button>
        </div>
        {addError && (
          <p className="text-xs text-red-400 font-medium">{addError}</p>
        )}
        {addSuccess && (
          <p className="text-xs text-green-400 font-medium">{L.addSuccess}</p>
        )}
      </motion.form>
    </div>
  );
}
