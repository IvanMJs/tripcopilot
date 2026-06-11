"use client";

import { useRef, useState, useCallback } from "react";
import { Share, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { WorldMap } from "./WorldMap";
import type { VisitedCountry } from "@/lib/visited-countries";

interface MapFullscreenModalProps {
  countries: VisitedCountry[];
  open: boolean;
  onClose: () => void;
  locale: "es" | "en";
}

export function MapFullscreenModal({ countries, open, onClose, locale }: MapFullscreenModalProps) {
  const [idx, setIdx] = useState(0);
  const mapRef = useRef<HTMLDivElement>(null);
  const es = locale === "es";

  const handleShare = useCallback(async () => {
    if (!mapRef.current) return;
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(mapRef.current, { cacheBust: true, backgroundColor: "#080810" });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "mi-mapa.png", { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: es ? "Mi mapa en TripCopilot" : "My map on TripCopilot",
          text: `${countries.length} ${es ? "países visitados" : "countries visited"} · ${Math.round((countries.length / 195) * 100)}% ${es ? "del mundo recorrido" : "of the world"}`,
        });
      } else {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = "mi-mapa.png";
        a.click();
      }
    } catch {
      // share failure is silent — download fallback already attempted
    }
  }, [countries.length, es]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex flex-col animate-fade-in"
        >
          <div className="flex items-center justify-between px-4 pb-2" style={{ paddingTop: "max(env(safe-area-inset-top), 3rem)" }}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
                {es ? "Tu mapa" : "Your map"}
              </p>
              <p className="text-sm font-black text-white">
                {countries.length} {es ? "países visitados" : "countries visited"}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleShare} className="h-10 w-10 rounded-full bg-white/[0.08] flex items-center justify-center text-white" aria-label={es ? "Compartir" : "Share"}>
                <Share size={16} />
              </button>
              <button onClick={onClose} className="h-10 w-10 rounded-full bg-white/[0.08] flex items-center justify-center text-white" aria-label={es ? "Cerrar" : "Close"}>
                <X size={16} />
              </button>
            </div>
          </div>

          <div ref={mapRef} className="px-4 pb-4 bg-[#080810]">
            <div className="rounded-2xl border border-white/[0.08] overflow-hidden">
              <WorldMap countries={countries} interactive={false} pinTone="amber" />
            </div>
          </div>

          {countries.length > 0 && (
            <>
              <div className="px-4 mb-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-1">
                  {es ? `País ${idx + 1} de ${countries.length}` : `Country ${idx + 1} of ${countries.length}`}
                </p>
                <div className="flex gap-1">
                  {countries.map((_, i) => (
                    <span key={i} className={`h-1 flex-1 rounded-full transition-colors ${i === idx ? "bg-amber-400" : "bg-white/10"}`} />
                  ))}
                </div>
              </div>

              <div
                className="flex-1 overflow-x-auto snap-x snap-mandatory flex gap-3 px-4 pb-6"
                onScroll={e => {
                  const i = Math.round(e.currentTarget.scrollLeft / (e.currentTarget.clientWidth - 32));
                  if (i !== idx && i >= 0 && i < countries.length) setIdx(i);
                }}
              >
                {countries.map(c => (
                  <div key={c.code} className="snap-center shrink-0 w-[calc(100%-32px)] rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/20 via-[#0a0a14] to-[#080810] p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-4xl">{c.flag}</span>
                      <div>
                        <p className="text-xl font-black text-white leading-tight">{c.name}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300/70 mt-0.5">
                          {es ? "Desde" : "Since"} {c.firstVisit}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-1">{es ? "Ciudades" : "Cities"}</p>
                        <p className="text-2xl font-black text-white tabular-nums">{c.places.length}</p>
                      </div>
                      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-1">{es ? "Aeropuertos" : "Airports"}</p>
                        <p className="text-2xl font-black text-white tabular-nums">{c.airports.length}</p>
                      </div>
                    </div>
                    {c.airports.length > 0 && (
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-2">{es ? "Aeropuertos visitados" : "Visited airports"}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {c.airports.map(a => (
                            <span key={a} className="font-mono text-[10px] font-black rounded-md bg-amber-500/10 border border-amber-500/25 text-amber-300 px-2 py-1 tabular-nums">{a}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
