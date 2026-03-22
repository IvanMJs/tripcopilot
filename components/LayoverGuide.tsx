"use client";

import { useState } from "react";
import { LayoverResponse } from "@/app/api/layover/route";

interface LayoverGuideProps {
  airportIata: string;
  bufferMinutes: number;
  locale: "es" | "en";
}

function formatBuffer(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function LayoverGuide({ airportIata, bufferMinutes, locale }: LayoverGuideProps) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<LayoverResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleExpand() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (data !== null) return;

    setLoading(true);
    try {
      const res = await fetch("/api/layover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ airportIata, bufferMinutes, locale }),
      });
      if (!res.ok) {
        setData({ tips: [], canExitAirport: false });
        return;
      }
      const json = await res.json() as LayoverResponse;
      setData(json);
    } catch {
      setData({ tips: [], canExitAirport: false });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="my-2 mx-2 rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm">🕐</span>
              <p className="text-xs font-semibold text-gray-300">
                {formatBuffer(bufferMinutes)}{" "}
                {locale === "es" ? `en ${airportIata}` : `in ${airportIata}`}
              </p>
            </div>
            <p className="text-[11px] text-gray-500 ml-6">
              {locale === "es"
                ? "Escala larga · Tips para aprovecharla"
                : "Long layover · Tips to make the most of it"}
            </p>
          </div>
          <button
            onClick={() => { void handleExpand(); }}
            className="shrink-0 text-[11px] font-medium text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
          >
            {locale === "es" ? "Ver guía de escala" : "Layover guide"}
            <span>{open ? "↑" : "→"}</span>
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-white/5 px-4 pb-3 pt-2">
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="inline-block w-3 h-3 border-2 border-gray-600 border-t-gray-300 rounded-full animate-spin" />
              {locale === "es" ? "Generando guía..." : "Generating guide..."}
            </div>
          ) : !data || data.tips.length === 0 ? (
            <p className="text-xs text-gray-500">
              {locale === "es"
                ? "No hay tips disponibles para esta escala"
                : "No tips available for this layover"}
            </p>
          ) : (
            <div className="space-y-2">
              <ul className="space-y-1.5">
                {data.tips.map((tip) => (
                  <li key={tip.icon + tip.text} className="flex items-start gap-2 text-[11px] text-gray-300">
                    <span className="shrink-0 mt-px">{tip.icon}</span>
                    <span>{tip.text}</span>
                  </li>
                ))}
              </ul>
              {data.canExitAirport && data.cityTip && (
                <div className="mt-2 rounded-lg bg-emerald-950/30 border border-emerald-800/30 px-3 py-2">
                  <p className="text-[11px] font-semibold text-emerald-400 mb-0.5">
                    🏙 {locale === "es" ? "¿Salir a la ciudad?" : "Explore the city?"}
                  </p>
                  <p className="text-[11px] text-emerald-300/80">{data.cityTip}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
