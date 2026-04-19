"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AirportSearchInput } from "@/components/AirportSearchInput";
import { AIRPORTS as AIRPORT_DB } from "@/lib/airports";

interface NewUserWelcomeViewProps {
  statusMap: Record<string, { status: string; lastChecked: Date }>;
  locale: "es" | "en";
  onAddFlight: () => void;
}

const FEATURED_AIRPORTS = ["EZE", "JFK", "MIA", "GCM"] as const;

type FtueView = "list" | "picker" | "hero";

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

export function NewUserWelcomeView({ statusMap, locale, onAddFlight }: NewUserWelcomeViewProps) {
  const [view, setView] = useState<FtueView>("list");
  const [selectedIata, setSelectedIata] = useState("");
  const staggerDelays = [0, 0.06, 0.12, 0.18];
  const es = locale === "es";

  // All 4 must have data before flipping from skeleton — never show mixed state
  const hasData = FEATURED_AIRPORTS.every((iata) => statusMap[iata] !== undefined);

  function goToList() {
    setSelectedIata("");
    setView("list");
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
                {es
                  ? "Seleccioná tu aeropuerto para ver el estado en tiempo real"
                  : "Select your airport to see real-time status"}
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
            <button
              onClick={goToList}
              className="text-xs text-gray-600 hover:text-gray-400 transition-colors self-start"
            >
              {es ? "← Volver" : "← Back"}
            </button>

            <div className="text-center">
              <h2 className="text-xl font-black text-white mb-1">
                {es ? "¿Desde dónde viajás?" : "Where are you flying from?"}
              </h2>
              <p className="text-sm text-gray-500">
                {es ? "Buscá tu aeropuerto" : "Search your airport"}
              </p>
            </div>

            <AirportSearchInput
              value={selectedIata}
              onChange={(iata) => {
                setSelectedIata(iata);
                if (iata) setView("hero");
              }}
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
            <button
              onClick={goToList}
              className="text-xs text-gray-600 hover:text-gray-400 transition-colors self-start"
            >
              {es ? "← Ver otros aeropuertos" : "← See other airports"}
            </button>

            {/* Hero airport card */}
            <HeroCard
              iata={selectedIata}
              entry={statusMap[selectedIata]}
              locale={locale}
            />

            {/* Secondary CTA — only shown after user sees their airport */}
            <div className="flex flex-col gap-2">
              <button
                onClick={onAddFlight}
                className="rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm py-3.5 w-full transition-colors tap-scale"
              >
                {es ? "Agregar mi vuelo ✈️" : "Add my flight ✈️"}
              </button>
              <p className="text-xs text-gray-600 text-center">
                {es
                  ? "Recibí alertas personalizadas para tus vuelos"
                  : "Get personalized alerts for your flights"}
              </p>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

function HeroCard({
  iata,
  entry,
  locale,
}: {
  iata: string;
  entry: { status: string; lastChecked: Date } | undefined;
  locale: "es" | "en";
}) {
  const { icon, label } = getStatusInfo(entry?.status, locale);
  const implication = getImplication(entry?.status, locale);
  return (
    <div className="rounded-2xl border border-white/[0.12] bg-white/[0.04] px-6 py-6 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-5xl font-black text-white leading-none">{iata}</p>
          <p className="text-sm text-gray-500 mt-2">
            {AIRPORT_DB[iata]?.city ?? iata}
          </p>
        </div>

        {entry ? (
          <div className="flex flex-col items-end gap-1 pt-1 shrink-0">
            <span className="text-3xl">{icon}</span>
            <span className="text-sm text-gray-400 text-right">{label}</span>
            <span className="text-[11px] text-gray-600">
              {formatLastChecked(entry.lastChecked, locale)}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-end gap-2 pt-1 shrink-0">
            <div className="h-8 w-8 rounded-lg bg-white/[0.07] animate-pulse" />
            <div className="h-4 w-20 rounded-md bg-white/[0.07] animate-pulse" />
            <div className="h-3 w-16 rounded-md bg-white/[0.04] animate-pulse" />
          </div>
        )}
      </div>

      {/* Implication — what this status means for the user */}
      {entry && (
        <p className="text-sm text-gray-400 border-t border-white/[0.06] pt-3 leading-relaxed">
          {implication}
        </p>
      )}
    </div>
  );
}
