"use client";

import { useState } from "react";
import { Lounge } from "@/app/api/lounge/route";

interface LoungeInfoProps {
  airportIata: string;
  airlineCode: string;
  locale: "es" | "en";
}

export function LoungeInfo({ airportIata, airlineCode, locale }: LoungeInfoProps) {
  const [open, setOpen] = useState(false);
  const [lounges, setLounges] = useState<Lounge[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleOpen() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (lounges !== null) return;

    setLoading(true);
    try {
      const res = await fetch("/api/lounge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ airportIata, airlineCode, locale }),
      });
      if (!res.ok) {
        setLounges([]);
        return;
      }
      const data = await res.json() as { lounges: Lounge[] };
      setLounges(data.lounges ?? []);
    } catch {
      setLounges([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-4 py-2.5 border-t border-white/5">
      <button
        onClick={() => { void handleOpen(); }}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
      >
        <span>🛋</span>
        {locale === "es" ? "Ver lounges disponibles" : "See available lounges"}
        <span className="text-gray-600">{open ? "↑" : "↓"}</span>
      </button>

      {open && (
        <div className="mt-3">
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="inline-block w-3 h-3 border-2 border-gray-600 border-t-gray-300 rounded-full animate-spin" />
              {locale === "es" ? "Buscando lounges..." : "Looking for lounges..."}
            </div>
          ) : lounges === null ? null : lounges.length === 0 ? (
            <p className="text-xs text-gray-500">
              {locale === "es"
                ? "No encontramos lounges con acceso directo para este vuelo"
                : "No lounges found with direct access for this flight"}
            </p>
          ) : (
            <div className="space-y-2">
              {lounges.map((lounge) => (
                <div
                  key={lounge.name}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 space-y-1"
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <p className="text-xs font-semibold text-gray-200">{lounge.name}</p>
                    {lounge.hasShower && (
                      <span className="text-[10px] text-blue-400 border border-blue-800/50 bg-blue-950/30 px-1.5 py-0.5 rounded-full">
                        🚿 {locale === "es" ? "Ducha" : "Shower"}
                      </span>
                    )}
                  </div>
                  <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[rgba(255,184,0,0.06)] border border-[rgba(255,184,0,0.25)] text-[#FFB800]">
                    {lounge.access}
                  </span>
                  <p className="text-[11px] text-gray-500">{lounge.location}</p>
                  {lounge.hours && (
                    <p className="text-[11px] text-gray-600">{lounge.hours}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
