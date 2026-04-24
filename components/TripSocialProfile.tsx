"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import type { PublicProfileData } from "@/lib/friends";
import { TripStamp } from "@/components/TripStamp";

interface Props {
  profile: PublicProfileData;
  currentUserId: string | null;
}

const LABELS = {
  es: {
    trips: "Viajes",
    countries: "Países",
    airports: "Aeropuertos",
    visitedCountries: "Países visitados",
    moreCountries: (n: number) => `+${n} más`,
    addFriend: "Agregar amigo",
    requestSent: "Solicitud enviada",
    errorGeneric: "Ocurrió un error. Intentá de nuevo.",
    reactedTo: "Reaccionaste",
    sharedTrips: "Viajes en común",
    countriesOnlyThem: "Países que visitó y vos no",
    upcoming: "Próximos destinos",
    reactions: "Reacciones",
    sharedMap: "Mapa compartido",
    noSharedTrips: "Ningún destino en común todavía",
    noUpcoming: "Sin próximos destinos",
    youVisited: "vos también",
    onlyThem: "solo ellxs",
    both: "ambxs",
    follow: "Seguir",
    following: "Siguiendo",
    followers: "seguidores",
    followingLabel: "siguiendo",
    signUpToFollow: "Creá una cuenta para seguir",
  },
  en: {
    trips: "Trips",
    countries: "Countries",
    airports: "Airports",
    visitedCountries: "Visited countries",
    moreCountries: (n: number) => `+${n} more`,
    addFriend: "Add friend",
    requestSent: "Request sent",
    errorGeneric: "Something went wrong. Please try again.",
    reactedTo: "Reacted",
    sharedTrips: "Shared trips",
    countriesOnlyThem: "Countries they've visited that you haven't",
    upcoming: "Upcoming destinations",
    reactions: "Reactions",
    sharedMap: "Shared map",
    noSharedTrips: "No shared destinations yet",
    noUpcoming: "No upcoming destinations",
    youVisited: "you too",
    onlyThem: "only them",
    both: "both",
    follow: "Follow",
    following: "Following",
    followers: "followers",
    followingLabel: "following",
    signUpToFollow: "Create an account to follow",
  },
} as const;

const REACTION_EMOJIS = ["❤️", "🔥", "😍", "✈️", "🌟"] as const;
type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

function FlagImg({ code }: { code: string }) {
  const lower = code.toLowerCase();
  if (!/^[a-z]{2}$/.test(lower)) return null;
  return (
    <span
      className={`fi fi-${lower}`}
      title={code}
      style={{ width: 20, height: 15, borderRadius: 3, display: "inline-block", flexShrink: 0 }}
    />
  );
}

function getInitials(displayName: string | null, username: string): string {
  const source = displayName ?? username;
  return (source[0] ?? "?").toUpperCase();
}

const MONTHS_ES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const MONTHS_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatTripDate(isoDate: string, locale: "es" | "en"): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const months = locale === "en" ? MONTHS_EN : MONTHS_ES;
  return `${d} ${months[(m ?? 1) - 1]} ${y}`;
}

interface TripReactionBarProps {
  tripId: string;
  disabled: boolean;
}

function TripReactionBar({ tripId, disabled }: TripReactionBarProps) {
  const [reacted, setReacted] = useState<ReactionEmoji | null>(null);

  async function handleReact(emoji: ReactionEmoji) {
    if (disabled || reacted !== null) return;
    setReacted(emoji);
    try {
      await fetch("/api/social/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId, emoji }),
      });
    } catch {
      // Non-blocking — reaction is optimistic
    }
  }

  return (
    <div className={`flex gap-1.5 mt-2 ${disabled ? "opacity-50" : ""}`}>
      {REACTION_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => void handleReact(emoji)}
          disabled={disabled || reacted !== null}
          className={`text-base rounded-lg px-2 py-1 transition-all active:scale-95 ${
            reacted === emoji
              ? "bg-[#FFB800]/30 border border-[rgba(255,184,0,0.25)] scale-110"
              : "bg-white/[0.05] border border-white/[0.07] hover:enabled:bg-white/[0.10]"
          } disabled:cursor-default`}
          aria-label={emoji}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

export function TripSocialProfile({ profile, currentUserId }: Props) {
  const [locale, setLocale] = useState<"es" | "en">("es");
  useEffect(() => {
    if (navigator.language.startsWith("en")) setLocale("en");
  }, []);
  const L = LABELS[locale];

  const isOwnProfile = currentUserId === profile.userId;
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [addSent, setAddSent] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [viewerFollows, setViewerFollows] = useState(profile.viewerFollows ?? false);
  const [followerCount, setFollowerCount] = useState(profile.followerCount ?? 0);
  const [followLoading, setFollowLoading] = useState(false);

  async function handleAddFriend() {
    setAddLoading(true);
    setAddError(null);
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: profile.username }),
      });
      if (res.ok) {
        setAddSent(true);
      } else {
        setAddError(L.errorGeneric);
      }
    } catch {
      setAddError(L.errorGeneric);
    } finally {
      setAddLoading(false);
    }
  }

  async function handleFollow() {
    if (followLoading) return;
    setFollowLoading(true);
    const wasFollowing = viewerFollows;
    const delta = wasFollowing ? -1 : 1;
    setViewerFollows(!wasFollowing);
    setFollowerCount((c) => c + delta);
    try {
      const res = await fetch("/api/follows", {
        method: wasFollowing ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: profile.username }),
      });
      if (!res.ok) {
        setViewerFollows(wasFollowing);
        setFollowerCount((c) => c - delta);
      }
    } catch {
      setViewerFollows(wasFollowing);
      setFollowerCount((c) => c - delta);
    } finally {
      setFollowLoading(false);
    }
  }

  const showTrips =
    !!profile.friendData &&
    (profile.social_settings.showTrips ?? true) &&
    profile.trips &&
    profile.trips.length > 0;

  const MAX_COUNTRIES = 20;

  // Plain visited countries — only shown when NOT friends
  const visitedList = profile.visitedCountries ?? [];
  const visibleCountries = visitedList.slice(0, MAX_COUNTRIES);
  const extraCountries = Math.max(0, visitedList.length - MAX_COUNTRIES);

  const showMap =
    !profile.friendData &&
    (profile.social_settings.showMap ?? true) &&
    visitedList.length > 0;

  // Build a lookup: tripId -> reactions[]
  const reactionsByTrip = new Map<
    string,
    Array<{ emoji: string; count: number }>
  >();
  for (const entry of profile.friendData?.tripReactions ?? []) {
    reactionsByTrip.set(entry.tripId, entry.reactions);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex flex-col items-center gap-3 pt-4"
      >
        {/* Avatar */}
        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-[#FFB800] to-blue-600 flex items-center justify-center shadow-lg shadow-[rgba(255,184,0,0.20)]">
          <span className="text-3xl font-black text-white">
            {getInitials(profile.displayName, profile.username)}
          </span>
        </div>

        {/* Name + username */}
        <div className="text-center">
          {profile.displayName && (
            <h1 className="text-2xl font-black text-white leading-tight">
              {profile.displayName}
            </h1>
          )}
          <p className="text-sm font-semibold text-[#FFB800] mt-0.5">
            @{profile.username}
          </p>
        </div>

        {/* Stats row */}
        {profile.stats && (
          <div className="flex gap-6 mt-1">
            <div className="text-center">
              <p className="text-xl font-black text-white tabular-nums">
                {profile.stats.tripCount}
              </p>
              <p className="text-xs text-gray-500 font-medium">{L.trips}</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-black text-white tabular-nums">
                {profile.stats.countryCount}
              </p>
              <p className="text-xs text-gray-500 font-medium">{L.countries}</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-black text-white tabular-nums">
                {profile.stats.airportCount}
              </p>
              <p className="text-xs text-gray-500 font-medium">{L.airports}</p>
            </div>
          </div>
        )}

        {/* Follower / following counters */}
        {(profile.followerCount !== undefined || profile.followingCount !== undefined) && (
          <div className="flex gap-4 text-sm">
            <span>
              <span className="font-bold text-white tabular-nums">{followerCount}</span>{" "}
              <span className="text-gray-500">{L.followers}</span>
            </span>
            <span>
              <span className="font-bold text-white tabular-nums">{profile.followingCount ?? 0}</span>{" "}
              <span className="text-gray-500">{L.followingLabel}</span>
            </span>
          </div>
        )}

        {/* Follow + Add friend buttons */}
        {!isOwnProfile && (
          <div className="flex flex-col items-center gap-2">
            {currentUserId ? (
              <>
                <div className="flex gap-2">
                  <button
                    onClick={() => void handleFollow()}
                    disabled={followLoading}
                    className={`rounded-xl text-sm font-bold px-5 py-2.5 transition-all active:scale-95 disabled:opacity-60 ${
                      viewerFollows
                        ? "bg-white/[0.08] border border-white/[0.15] text-white/70 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-400"
                        : "bg-[#FFB800] hover:bg-[#FFC933] text-[#07070d]"
                    }`}
                  >
                    {followLoading ? "..." : viewerFollows ? L.following : L.follow}
                  </button>
                  <button
                    onClick={() => void handleAddFriend()}
                    disabled={addLoading || addSent}
                    className="rounded-xl bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.10] text-white/70 text-sm font-bold px-5 py-2.5 transition-all active:scale-95 disabled:opacity-60"
                  >
                    {addSent ? L.requestSent : addLoading ? "..." : L.addFriend}
                  </button>
                </div>
                {addError && (
                  <p className="text-xs text-red-400 font-medium">{addError}</p>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <a
                  href="/#empezar"
                  className="rounded-xl bg-[#FFB800] hover:bg-[#FFC933] text-[#07070d] text-sm font-bold px-5 py-2.5 transition-all active:scale-95"
                >
                  {L.follow}
                </a>
                <p className="text-xs text-gray-500">{L.signUpToFollow}</p>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* ── Trips: year tabs + horizontal stamp scroll (friends only) ─────── */}
      {showTrips && (() => {
        const monthNames = locale === "es" ? MONTHS_ES : MONTHS_EN;
        const byYear = new Map<number, NonNullable<typeof profile.trips>>();
        for (const trip of profile.trips ?? []) {
          const y = parseInt((trip.isoDate ?? "0").split("-")[0] ?? "0");
          if (!byYear.has(y)) byYear.set(y, []);
          byYear.get(y)!.push(trip);
        }
        const years = Array.from(byYear.keys()).sort((a, b) => b - a);
        const activeYear = selectedYear ?? years[0] ?? 0;
        const activeTrips = byYear.get(activeYear) ?? [];

        return (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.08 }}
            className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4"
          >
            {/* Header + year pills */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                {L.trips}
              </p>
              <div
                className="flex gap-1.5 overflow-x-auto"
                style={{ scrollbarWidth: "none" }}
              >
                {years.map((y) => (
                  <button
                    key={y}
                    onClick={() => setSelectedYear(y)}
                    className={`flex-none text-[11px] font-bold px-2.5 py-1 rounded-full transition-all ${
                      y === activeYear
                        ? "bg-[#FFB800] text-[#07070d]"
                        : "bg-white/[0.06] border border-white/[0.08] text-white/40 hover:text-white/70"
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>

            {/* Horizontal stamp scroll */}
            <div
              className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1"
              style={{ scrollbarWidth: "none" }}
            >
              {activeTrips.map((trip) => {
                const parts = (trip.isoDate ?? "").split("-");
                const monthIdx = parseInt(parts[1] ?? "1") - 1;
                const monthLabel = monthNames[monthIdx] ?? "";
                const tripReactions = reactionsByTrip.get(trip.id);
                return (
                  <div key={trip.id} className="flex-none w-36 flex flex-col gap-1.5">
                    <TripStamp
                      destinationCode={trip.destinationCode}
                      destinationName={trip.destinationName}
                      monthLabel={monthLabel}
                      year={activeYear || "—"}
                      reactions={tripReactions}
                    />
                    <TripReactionBar
                      tripId={trip.id}
                      disabled={currentUserId === null}
                    />
                  </div>
                );
              })}
              {/* Trailing spacer so last card doesn't hug the edge */}
              <div className="flex-none w-2" />
            </div>
          </motion.div>
        );
      })()}

      {/* ── Visited countries (non-friends only) ────────────────────────────── */}
      {showMap && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.16 }}
          className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4"
        >
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3 text-center">
            {L.visitedCountries}
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {visibleCountries.map((code) => (
              <div
                key={code}
                title={code}
                className="flex items-center rounded-lg bg-white/[0.06] border border-white/[0.07] px-1.5 py-1"
              >
                <FlagImg code={code} />
              </div>
            ))}
            {extraCountries > 0 && (
              <div className="flex items-center rounded-lg bg-white/[0.04] border border-white/[0.06] px-2 py-1">
                <span className="text-xs font-medium text-gray-500">
                  {L.moreCountries(extraCountries)}
                </span>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Section 1: Shared destinations ──────────────────────────────────── */}
      {profile.friendData && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.24 }}
          className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4"
        >
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
            {L.sharedTrips}
          </p>
          {profile.friendData.sharedDestinations.length === 0 ? (
            <p className="text-sm text-gray-600">{L.noSharedTrips}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {profile.friendData.sharedDestinations.map((d) => (
                <div
                  key={d.destinationCode}
                  className="flex items-center gap-1.5 rounded-lg bg-[#FFB800]/20 border border-[rgba(255,184,0,0.25)] px-2.5 py-1.5"
                >
                  <span className="text-xs font-semibold text-[#FFB800]">
                    {d.destinationName ?? d.destinationCode}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ── Section 2: Countries only they visited ───────────────────────────── */}
      {profile.friendData && profile.friendData.onlyTheirCountries.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.32 }}
          className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4"
        >
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
            {L.countriesOnlyThem}
          </p>
          <div className="flex flex-wrap gap-2">
            {profile.friendData.onlyTheirCountries.map((code) => (
              <div
                key={code}
                title={code}
                className="flex items-center rounded-lg bg-amber-600/15 border border-amber-500/30 px-1.5 py-1"
              >
                <FlagImg code={code} />
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Section 3: Upcoming destinations ────────────────────────────────── */}
      {profile.friendData && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.40 }}
          className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4"
        >
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
            {L.upcoming}
          </p>
          {profile.friendData.upcomingDestinations.length === 0 ? (
            <p className="text-sm text-gray-600">{L.noUpcoming}</p>
          ) : (
            <div className="space-y-2">
              {profile.friendData.upcomingDestinations.map((dest, i) => (
                <div
                  key={`${dest.destinationCode}-${i}`}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[#FFB800] bg-[#FFB800]/15 border border-[rgba(255,184,0,0.25)] rounded px-1.5 py-0.5">
                      {dest.destinationCode}
                    </span>
                    <span className="text-sm font-semibold text-white/90">
                      {dest.destinationName ?? dest.destinationCode}
                    </span>
                  </div>
                  {dest.isoDate && (
                    <span className="text-xs font-medium text-gray-500 bg-white/[0.06] rounded-full px-2.5 py-0.5 shrink-0">
                      {formatTripDate(dest.isoDate, locale)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ── Section 5: Mapa compartido (friends only) ───────────────────────── */}
      {profile.friendData && (profile.social_settings.showMap ?? true) && (
        (() => {
          const profileCodes = profile.visitedCountries ?? [];
          const viewerCodes = profile.friendData.viewerCountries;
          const allCodes = Array.from(new Set([...profileCodes, ...viewerCodes])).slice(0, MAX_COUNTRIES);
          const sharedSet = new Set(profileCodes.filter((c) => viewerCodes.includes(c)));
          if (allCodes.length === 0) return null;
          return (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.56 }}
              className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4"
            >
              <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
                {L.sharedMap}
              </p>
              <div className="flex flex-wrap gap-1 mb-3 text-xs text-white/40">
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#FFB800]/20 border border-[rgba(255,184,0,0.25)]" />
                  {L.both}
                </span>
                <span className="inline-flex items-center gap-1 ml-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm bg-white/[0.06] border border-white/[0.07]" />
                  {L.onlyThem}
                </span>
                <span className="inline-flex items-center gap-1 ml-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#FFB800]/15 border border-blue-500/40" />
                  {L.youVisited}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {allCodes.map((code) => {
                  const isBoth = sharedSet.has(code);
                  const isViewerOnly = !profileCodes.includes(code);
                  const cls = isBoth
                    ? "border-[rgba(255,184,0,0.25)] bg-[#FFB800]/20"
                    : isViewerOnly
                    ? "border-blue-500/40 bg-[#FFB800]/15"
                    : "border-white/[0.07] bg-white/[0.06]";
                  return (
                    <div key={code} title={code} className={`flex items-center rounded-lg border px-1.5 py-1 ${cls}`}>
                      <FlagImg code={code} />
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })()
      )}

      {/* Empty state — nothing to show yet */}
      {!showTrips && !showMap && !profile.friendData && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.16 }}
          className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-8 text-center"
        >
          <p className="text-4xl mb-3">✈️</p>
          <p className="text-sm font-semibold text-white/60">
            {locale === "es" ? "Aún sin viajes" : "No trips yet"}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            {locale === "es"
              ? "Este viajero todavía no registró destinos."
              : "This traveler hasn't logged any destinations yet."}
          </p>
        </motion.div>
      )}
    </div>
  );
}
