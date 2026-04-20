"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AirportSearchInput } from "@/components/AirportSearchInput";
import { AIRPORTS as AIRPORT_DB } from "@/lib/airports";
import type { AirportStatus } from "@/lib/types";

interface NewUserWelcomeViewProps {
  statusMap: Record<string, AirportStatus>;
  locale: "es" | "en";
  onAddFlight: () => void;
  userId?: string | null;
}

const FEATURED_AIRPORTS = ["EZE", "JFK", "MIA", "GCM"] as const;

type FtueView = "list" | "picker" | "hero";
type Tone = "ok" | "warn" | "danger" | "neutral";

function formatLastChecked(date: Date | string | undefined, locale: "es" | "en"): string {
  if (!date) return locale === "es" ? "actualizando..." : "updating...";
  const d = date instanceof Date ? date : new Date(date as string);
  if (isNaN(d.getTime())) return locale === "es" ? "actualizando..." : "updating...";
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return locale === "es" ? "actualizado ahora" : "updated just now";
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return locale === "es" ? "actualizado ahora" : "updated just now";
  if (diffMin < 60) return locale === "es" ? `hace ${diffMin} min` : `${diffMin} min ago`;
  const diffH = Math.floor(diffMin / 60);
  return locale === "es" ? `hace ${diffH} h` : `${diffH} h ago`;
}

function getStatusInfo(raw: string | undefined, locale: "es" | "en"): { icon: string; label: string } {
  if (raw === "ok") return { icon: "✅", label: locale === "es" ? "sin demoras" : "no delays" };
  if (raw === "ground_stop") return { icon: "⛔", label: locale === "es" ? "vuelos pausados" : "flights paused" };
  if (raw === "closure") return { icon: "⛔", label: locale === "es" ? "aeropuerto cerrado" : "airport closed" };
  if (raw === "unknown" || raw === undefined) return { icon: "🔘", label: locale === "es" ? "sin señal" : "no signal" };
  return { icon: "⚠️", label: locale === "es" ? "demoras activas" : "active delays" };
}

function getImplication(raw: string | undefined, locale: "es" | "en"): string {
  const es = locale === "es";
  if (raw === "ok") return es ? "No necesitás salir antes de lo planeado." : "No need to leave earlier than planned.";
  if (raw === "delay_minor") return es ? "Demoras leves — tu vuelo podría salir un poco tarde." : "Minor delays — your flight may depart slightly late.";
  if (raw === "delay_moderate") return es ? "Demoras moderadas — revisá si tenés conexión ajustada." : "Moderate delays — check if you have a tight connection.";
  if (raw === "delay_severe") return es ? "Demoras severas — llegá temprano y confirmá tu vuelo." : "Severe delays — arrive early and confirm your flight.";
  if (raw === "ground_delay") return es ? "Retención en tierra — tu vuelo puede salir tarde." : "Ground delay — your flight may depart late.";
  if (raw === "ground_stop") return es ? "Sin salidas por ahora — monitoreá antes de ir al aeropuerto." : "No departures right now — monitor before heading to the airport.";
  if (raw === "closure") return es ? "Aeropuerto cerrado — verificá tu vuelo con la aerolínea." : "Airport closed — verify your flight with the airline.";
  return es ? "Sin datos por ahora — volvé a revisar en unos minutos." : "No data yet — check back in a few minutes.";
}

function toneFromStatus(raw: string | undefined): Tone {
  if (raw === "ok") return "ok";
  if (raw === "ground_stop" || raw === "closure" || raw === "delay_severe") return "danger";
  if (raw === "delay_moderate" || raw === "delay_minor" || raw === "ground_delay") return "warn";
  return "neutral";
}

function severeReason(entry: AirportStatus | undefined): string | null {
  if (!entry) return null;
  if (entry.status === "ground_stop") return entry.groundStop?.reason ?? null;
  if (entry.status === "closure") return entry.closure?.reason ?? null;
  return null;
}

export function NewUserWelcomeView({ statusMap, locale, onAddFlight, userId }: NewUserWelcomeViewProps) {
  const [view, setView] = useState<FtueView>("list");
  const [selectedIata, setSelectedIata] = useState("");
  const [alertsActivated, setAlertsActivated] = useState(false);
  const [showSignupNudge, setShowSignupNudge] = useState(false);
  const staggerDelays = [0, 0.06, 0.12, 0.18];
  const es = locale === "es";

  const hasData = FEATURED_AIRPORTS.every((iata) => statusMap[iata] !== undefined);

  function goToList() {
    setSelectedIata("");
    setAlertsActivated(false);
    setShowSignupNudge(false);
    setView("list");
  }

  function handleActivateAlerts() {
    if (userId) {
      try { localStorage.setItem(`tc-alert-${selectedIata}`, "true"); } catch { /* ignore */ }
      setAlertsActivated(true);
    } else {
      setShowSignupNudge(true);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <AnimatePresence mode="wait">

        {/* ── LIST VIEW ── */}
        {view === "list" && (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-3"
          >
            <p className="text-xl font-black text-white text-center">
              {es ? "Si viajás esta semana, mirá esto antes de ir." : "Flying this week? Check this before you go."}
            </p>
            <p className="text-sm text-gray-500 text-center mb-1">
              {es ? "Estado de aeropuertos, en tiempo real" : "Airport status, in real time"}
            </p>

            <div className="flex flex-col gap-2">
              <p className="text-[10px] text-gray-600 uppercase tracking-wider px-1">
                {es ? "Aeropuertos principales" : "Featured airports"}
              </p>

              {FEATURED_AIRPORTS.map((iata, index) => {
                const isHero = index === 0;
                const entry = statusMap[iata];
                const { icon, label } = getStatusInfo(entry?.status, locale);
                return (
                  <motion.div
                    key={iata}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: staggerDelays[index], duration: 0.2 }}
                    className={`rounded-xl border bg-white/[0.03] flex items-center justify-between ${
                      isHero ? "border-white/[0.12] px-4 py-3.5" : "border-white/[0.08] px-4 py-3"
                    }`}
                  >
                    <span className={`text-white ${isHero ? "text-base font-black" : "text-sm font-bold"}`}>
                      {iata}
                    </span>
                    {hasData ? (
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="flex items-center gap-1.5 text-sm text-gray-400">
                          <span>{icon}</span>
                          <span>{label}</span>
                        </span>
                        <span className="text-[11px] text-gray-600">
                          {formatLastChecked(entry?.lastChecked, locale)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-end gap-1">
                        <div className="h-4 w-28 rounded-md bg-white/[0.07] animate-pulse" />
                        <div className="h-3 w-20 rounded-md bg-white/[0.04] animate-pulse" />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {!hasData && (
              <p className="text-xs text-gray-600 text-center -mt-1">
                {es ? "Actualizando ahora..." : "Updating now..."}
              </p>
            )}

            <div className="mt-2 flex flex-col gap-0 items-center">
              <button
                onClick={() => setView("picker")}
                className="rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm py-3.5 w-full transition-colors tap-scale"
              >
                {es ? "Ver el estado de tu aeropuerto en tiempo real →" : "See your airport's live status →"}
              </button>
              <p className="text-xs text-gray-600 text-center mt-2">
                {es ? "Seleccioná tu aeropuerto para ver el estado en tiempo real" : "Select your airport to see real-time status"}
              </p>
            </div>
          </motion.div>
        )}

        {/* ── PICKER VIEW ── */}
        {view === "picker" && (
          <motion.div
            key="picker"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col gap-4"
          >
            <button onClick={goToList} className="text-xs text-gray-600 hover:text-gray-400 transition-colors self-start">
              {es ? "← Volver" : "← Back"}
            </button>

            <div className="text-center">
              <h2 className="text-xl font-black text-white mb-1">
                {es ? "¿Desde dónde viajás?" : "Where are you flying from?"}
              </h2>
              <p className="text-sm text-gray-500">{es ? "Buscá tu aeropuerto" : "Search your airport"}</p>
            </div>

            <AirportSearchInput
              value={selectedIata}
              onChange={(iata) => { setSelectedIata(iata); if (iata) setView("hero"); }}
              placeholder={es ? "Buenos Aires, JFK, MIA..." : "New York, EZE, MIA..."}
              locale={locale}
            />

            <button
              onClick={() => { if (selectedIata) setView("hero"); }}
              disabled={!selectedIata}
              className="rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm py-3.5 w-full transition-colors tap-scale"
            >
              {es ? "Ver estado →" : "Check status →"}
            </button>
          </motion.div>
        )}

        {/* ── HERO VIEW ── */}
        {view === "hero" && (
          <motion.div
            key="hero"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col gap-4"
          >
            <button onClick={goToList} className="text-xs text-gray-600 hover:text-gray-400 transition-colors self-start">
              {es ? "← Ver otros aeropuertos" : "← See other airports"}
            </button>

            <HeroCard iata={selectedIata} entry={statusMap[selectedIata]} locale={locale} />

            <div className="flex flex-col gap-2">
              {alertsActivated ? (
                <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3.5 flex items-center justify-center gap-2">
                  <span className="text-green-400 font-bold text-sm">
                    {es ? "✓ Alertas activadas para " : "✓ Alerts activated for "}{selectedIata}
                  </span>
                </div>
              ) : (
                <button
                  onClick={handleActivateAlerts}
                  className="relative overflow-hidden rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm py-3.5 w-full transition-colors tap-scale"
                >
                  <span className="relative z-[1]">
                    {es ? "Activar alertas para este aeropuerto ✈️" : "Activate alerts for this airport ✈️"}
                  </span>
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmerOnce_1.2s_cubic-bezier(0.22,1,0.36,1)_0.25s_forwards] bg-gradient-to-r from-transparent via-white/25 to-transparent"
                  />
                </button>
              )}
              <p className="text-xs text-gray-600 text-center">
                {es ? "Te avisamos si hay demoras o cambios importantes." : "We'll notify you of delays or important changes."}
              </p>
            </div>

            <AnimatePresence>
              {showSignupNudge && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                  className="rounded-xl border border-violet-500/30 bg-violet-500/[0.08] px-4 py-4 flex flex-col gap-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-white mb-0.5">
                      {es ? "Creá tu cuenta gratis" : "Create your free account"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {es ? "Las alertas se guardan con tu cuenta. Es gratis y tarda 30 segundos." : "Alerts are saved with your account. Free, takes 30 seconds."}
                    </p>
                  </div>
                  <button
                    onClick={onAddFlight}
                    className="rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm py-3 w-full transition-colors tap-scale"
                  >
                    {es ? "Crear cuenta →" : "Create account →"}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {!showSignupNudge && (
              <button
                onClick={onAddFlight}
                className="rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-gray-300 text-sm font-medium py-3 w-full transition-colors tap-scale"
              >
                {es ? "Agregar mi vuelo ✈️" : "Add my flight ✈️"}
              </button>
            )}
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

/* HeroCard — status-as-feeling. Live-data vocabulary. */
function HeroCard({ iata, entry, locale }: { iata: string; entry: AirportStatus | undefined; locale: "es" | "en"; }) {
  const { icon, label } = getStatusInfo(entry?.status, locale);
  const implication = getImplication(entry?.status, locale);
  const es = locale === "es";
  const tone = toneFromStatus(entry?.status);
  const reason = severeReason(entry);

  const shadowByTone: Record<Tone, string> = {
    ok: "shadow-glow-green", warn: "shadow-glow-orange", danger: "shadow-glow-red", neutral: "",
  };
  const haloByTone: Record<Tone, string> = {
    ok:      "bg-[radial-gradient(circle,rgba(34,197,94,0.24),transparent_60%)]",
    warn:    "bg-[radial-gradient(circle,rgba(251,146,60,0.26),transparent_60%)]",
    danger:  "bg-[radial-gradient(circle,rgba(239,68,68,0.30),transparent_60%)]",
    neutral: "",
  };
  const pulseByTone: Record<Tone, string> = {
    ok: "bg-green-400", warn: "bg-orange-400", danger: "bg-red-500", neutral: "bg-gray-500",
  };
  const tileByTone: Record<Tone, string> = {
    ok:      "bg-green-500/10 border-green-500/25",
    warn:    "bg-orange-500/10 border-orange-500/25",
    danger:  "bg-red-500/10 border-red-500/30",
    neutral: "bg-white/[0.04] border-white/10",
  };
  const labelByTone: Record<Tone, string> = {
    ok: "text-green-400", warn: "text-orange-300", danger: "text-red-300", neutral: "text-gray-500",
  };

  const firstBoundary = implication.indexOf(". ");
  const decisionSentence = firstBoundary === -1 ? implication : implication.slice(0, firstBoundary + 1);
  const supportingSentence = firstBoundary === -1 ? "" : implication.slice(firstBoundary + 2);

  return (
    <article className={["relative overflow-hidden rounded-2xl p-6 border border-white/[0.12] bg-white/[0.04]", shadowByTone[tone]].join(" ")}>
      {tone !== "neutral" && (
        <div
          aria-hidden
          className={["pointer-events-none absolute -top-20 -right-16 size-[260px] rounded-full blur-2xl animate-[radarSweep_4.5s_ease-in-out_infinite]", haloByTone[tone]].join(" ")}
        />
      )}

      <div className="relative flex items-center gap-2 mb-4">
        <span className="relative flex size-2">
          <span
            className={[
              "absolute inline-flex size-full rounded-full opacity-60",
              tone === "neutral" ? "animate-[radarPulse_3s_ease-out_infinite] opacity-40" : "animate-[radarPulse_2s_ease-out_infinite]",
              pulseByTone[tone],
            ].join(" ")}
          />
          <span className={`relative inline-flex size-2 rounded-full ${pulseByTone[tone]}`} />
        </span>
        <span className={`text-[10px] font-bold uppercase tracking-[0.14em] ${labelByTone[tone]}`}>
          {tone === "neutral" ? (es ? "Buscando señal" : "Searching") : (es ? "En vivo" : "Live")}
        </span>
        <span className="text-[10px] text-gray-600 tabular-nums ml-auto">
          {formatLastChecked(entry?.lastChecked, locale)}
        </span>
      </div>

      <div className="relative flex items-start justify-between gap-5">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-500 mb-1.5">
            {es ? "Salida desde" : "Departing from"}
          </p>
          <p className={["text-[56px] font-black leading-none tracking-[-0.035em] tabular-nums", tone === "neutral" ? "text-gray-300" : "text-white"].join(" ")}>
            {iata}
          </p>
          <p className="text-sm font-medium text-gray-400 mt-2 truncate">
            {AIRPORT_DB[iata]?.city ?? iata}
          </p>
        </div>
        {entry ? (
          <div className="flex flex-col items-end gap-1.5 shrink-0 pt-1">
            <div className={`grid place-items-center size-14 rounded-2xl border text-3xl ${tileByTone[tone]}`}>
              {icon}
            </div>
            <span className={`text-xs font-semibold text-right leading-tight max-w-[110px] ${labelByTone[tone]}`}>
              {label}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-end gap-2 pt-1 shrink-0">
            <div className="size-14 rounded-2xl bg-white/[0.07] animate-pulse" />
            <div className="h-3 w-20 rounded-md bg-white/[0.07] animate-pulse" />
          </div>
        )}
      </div>

      {reason && (
        <div className="relative mt-5 flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/25 px-3 py-2">
          <span aria-hidden className="shrink-0 text-red-400 text-sm leading-none">⚠</span>
          <span className="text-[11px] font-semibold text-red-200">
            FAA · {label} · {es ? "motivo" : "reason"}: {reason}
          </span>
        </div>
      )}

      {entry ? (
        <div className={`relative ${reason ? "mt-4 pt-4" : "mt-5 pt-5"} border-t border-white/[0.06]`}>
          <p className="text-[15px] leading-relaxed text-gray-300">
            <span className="text-white font-semibold">{decisionSentence}</span>
            {supportingSentence && <> {supportingSentence}</>}
          </p>
        </div>
      ) : (
        <div className="relative mt-5 pt-5 border-t border-white/[0.06]">
          <p className="text-[15px] leading-relaxed text-gray-400">
            <span className="text-gray-200 font-semibold">{es ? "Sin datos por ahora." : "No data yet."}</span>{" "}
            {es ? "Volvé a revisar en unos minutos — activamos alertas por si llegan novedades." : "Check back in a few minutes — we'll notify you if anything changes."}
          </p>
        </div>
      )}
    </article>
  );
}
