"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import type { PublicProfileData } from "@/lib/friends";

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
  },
} as const;

const REACTION_EMOJIS = ["❤️", "🔥", "😍", "✈️", "🌟"] as const;
type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

function countryCodeToFlag(countryCode: string): string {
  const upper = countryCode.toUpperCase();
  return upper
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
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
              ? "bg-violet-600/30 border border-violet-500/50 scale-110"
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
  const [addSent, setAddSent] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);

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

  const showTrips =
    (profile.social_settings.showTrips ?? true) &&
    profile.trips &&
    profile.trips.length > 0;

  const MAX_COUNTRIES = 20;

  // Shared map computation — done here so it's available for showMap check below.
  const sharedCountryCodes: Set<string> = profile.friendData
    ? new Set(
        (profile.visitedCountries ?? []).filter((c) =>
          profile.friendData!.viewerCountries.includes(c)
        )
      )
    : new Set<string>();

  const allMapCountries: string[] = profile.friendData
    ? Array.from(
        new Set([
          ...(profile.visitedCountries ?? []),
          ...profile.friendData.viewerCountries,
        ])
      )
    : (profile.visitedCountries ?? []);

  const showMap =
    (profile.social_settings.showMap ?? true) &&
    (profile.friendData ? allMapCountries.length > 0 : (profile.visitedCountries ?? []).length > 0);

  // When friendData is present we show the combined map instead of the
  // plain visited-countries section, so limit/extra use allMapCountries.
  const mapCountriesToShow = profile.friendData ? allMapCountries : (profile.visitedCountries ?? []);
  const visibleCountries = mapCountriesToShow.slice(0, MAX_COUNTRIES);
  const extraCountries = Math.max(0, mapCountriesToShow.length - MAX_COUNTRIES);

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
        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shadow-lg shadow-violet-900/40">
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
          <p className="text-sm font-semibold text-violet-400 mt-0.5">
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

        {/* Add friend button */}
        {currentUserId && !isOwnProfile && (
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={() => void handleAddFriend()}
              disabled={addLoading || addSent}
              className="rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-95 disabled:opacity-60 text-white text-sm font-bold px-6 py-2.5 transition-all"
            >
              {addSent ? L.requestSent : addLoading ? "..." : L.addFriend}
            </button>
            {addError && (
              <p className="text-xs text-red-400 font-medium">{addError}</p>
            )}
          </div>
        )}
      </motion.div>

      {/* ── Trips list ──────────────────────────────────────────────────────── */}
      {showTrips && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.08 }}
          className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 space-y-4"
        >
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">
            {L.trips}
          </p>
          {profile.trips?.map((trip) => {
            const dateStr = trip.isoDate ? formatTripDate(trip.isoDate, locale) : null;
            const tripReactions = reactionsByTrip.get(trip.id);
            return (
              <div key={trip.id} className="space-y-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-white/90">
                    {trip.destinationName ?? trip.destinationCode}
                  </p>
                  {dateStr && (
                    <span className="text-xs font-medium text-gray-500 bg-white/[0.06] rounded-full px-2.5 py-0.5">
                      {dateStr}
                    </span>
                  )}
                </div>
                {tripReactions && tripReactions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-1">
                    {tripReactions.map(({ emoji, count }) => (
                      <span
                        key={emoji}
                        className="inline-flex items-center gap-1 rounded-lg bg-white/[0.06] border border-white/[0.07] px-2 py-0.5 text-xs text-white/70 font-medium"
                      >
                        {emoji}
                        <span className="tabular-nums">{count}</span>
                      </span>
                    ))}
                  </div>
                )}
                <TripReactionBar
                  tripId={trip.id}
                  disabled={currentUserId === null}
                />
              </div>
            );
          })}
        </motion.div>
      )}

      {/* ── Visited countries / Shared map ──────────────────────────────────── */}
      {showMap && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.16 }}
          className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4"
        >
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
            {profile.friendData ? L.sharedMap : L.visitedCountries}
          </p>
          {profile.friendData && (
            <div className="flex flex-wrap gap-1 mb-3 text-xs text-white/40">
              <span className="inline-flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-violet-600/20 border border-violet-500/50" />
                {L.both}
              </span>
              <span className="inline-flex items-center gap-1 ml-2">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-white/[0.06] border border-white/[0.07]" />
                {L.onlyThem}
              </span>
              <span className="inline-flex items-center gap-1 ml-2">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-600/15 border border-blue-500/40" />
                {L.youVisited}
              </span>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {visibleCountries.map((code) => {
              const isBoth = profile.friendData ? sharedCountryCodes.has(code) : false;
              const isViewerOnly = profile.friendData
                ? !( profile.visitedCountries ?? []).includes(code)
                : false;
              const borderClass = isBoth
                ? "border-violet-500/50 bg-violet-600/20"
                : isViewerOnly
                ? "border-blue-500/40 bg-blue-600/15"
                : "border-white/[0.07] bg-white/[0.06]";
              return (
                <div
                  key={code}
                  title={code}
                  className={`flex items-center rounded-lg border px-1.5 py-1 ${borderClass}`}
                >
                  <span className="text-xl leading-none">
                    {countryCodeToFlag(code)}
                  </span>
                </div>
              );
            })}
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
                  className="flex items-center gap-1.5 rounded-lg bg-violet-600/20 border border-violet-500/30 px-2.5 py-1.5"
                >
                  <span className="text-xs font-semibold text-violet-200">
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
                <span className="text-xl leading-none">
                  {countryCodeToFlag(code)}
                </span>
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
                    <span className="text-xs font-mono font-bold text-violet-400 bg-violet-600/15 border border-violet-500/20 rounded px-1.5 py-0.5">
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

      {/* ── Section 4: Reactions summary ────────────────────────────────────── */}
      {profile.friendData && profile.friendData.tripReactions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.48 }}
          className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4"
        >
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
            {L.reactions}
          </p>
          <div className="space-y-3">
            {profile.friendData.tripReactions.map((entry) => {
              const matchingTrip = profile.trips?.find((t) => t.id === entry.tripId);
              return (
                <div key={entry.tripId} className="space-y-1.5">
                  {matchingTrip && (
                    <p className="text-xs font-medium text-white/50">
                      {matchingTrip.destinationName ?? matchingTrip.destinationCode}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {entry.reactions.map(({ emoji, count }) => (
                      <span
                        key={emoji}
                        className="inline-flex items-center gap-1 rounded-lg bg-white/[0.06] border border-white/[0.07] px-2.5 py-1 text-sm"
                      >
                        {emoji}
                        <span className="text-xs font-semibold text-white/70 tabular-nums">
                          {count}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
