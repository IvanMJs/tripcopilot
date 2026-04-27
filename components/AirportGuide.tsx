"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  UtensilsCrossed,
  Bus,
  Plane,
  Wifi,
  Lightbulb,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import type { AirportGuideData } from "@/app/api/airport-guide/route";

interface AirportGuideProps {
  airportIata: string;
  airportName: string;
  locale: "es" | "en";
}

const CACHE_DAYS = 30;
const CACHE_PREFIX = "tc-airport-guide-";

interface CacheEntry {
  guide: AirportGuideData;
  timestamp: number;
}

function readCache(iata: string): AirportGuideData | null {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${iata}`);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    const maxAge = CACHE_DAYS * 24 * 60 * 60 * 1000;
    if (Date.now() - entry.timestamp > maxAge) {
      localStorage.removeItem(`${CACHE_PREFIX}${iata}`);
      return null;
    }
    return entry.guide;
  } catch {
    return null;
  }
}

function writeCache(iata: string, guide: AirportGuideData): void {
  try {
    const entry: CacheEntry = { guide, timestamp: Date.now() };
    localStorage.setItem(`${CACHE_PREFIX}${iata}`, JSON.stringify(entry));
  } catch {
    // localStorage may be unavailable
  }
}

const LABELS = {
  es: {
    title: "Guía del aeropuerto",
    terminals: "Terminales",
    food: "Comida",
    transport: "Transporte",
    lounges: "Salas VIP",
    wifi: "WiFi",
    insiderTip: "Tip de experto",
    method: "Medio",
    cost: "Costo",
    time: "Tiempo",
    refresh: "Actualizar",
    loading: "Generando guía…",
    error: "No se pudo cargar la guía",
    retry: "Reintentar",
  },
  en: {
    title: "Airport Guide",
    terminals: "Terminals",
    food: "Food",
    transport: "Transport",
    lounges: "Lounges",
    wifi: "WiFi",
    insiderTip: "Insider Tip",
    method: "Method",
    cost: "Cost",
    time: "Time",
    refresh: "Refresh",
    loading: "Generating guide…",
    error: "Could not load guide",
    retry: "Retry",
  },
};

function GuideSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[80, 60, 90, 70].map((w, i) => (
        <div key={i} className="h-3 rounded-full bg-white/[0.06]" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}

interface SectionProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function GuideSection({ icon, label, children, defaultOpen = false }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-t border-white/[0.06]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-2 text-left hover:bg-white/[0.02] transition-colors"
      >
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-gray-500">
          {icon}
          {label}
        </span>
        <ChevronDown
          className={`h-3 w-3 text-gray-600 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            style={{ overflow: "hidden" }}
          >
            <div className="pb-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AirportGuide({ airportIata, airportName, locale }: AirportGuideProps) {
  const L = LABELS[locale];
  const [guide, setGuide] = useState<AirportGuideData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchGuide = async () => {
      try {
        const cachedGuide = readCache(airportIata);
        if (cachedGuide) {
          setGuide(cachedGuide);
          setLoading(false);
        } else {
          // Simulate fetching guide from API
          await new Promise(resolve => setTimeout(resolve, 1000));
          const guideData: AirportGuideData = {
            terminals: "Términales A y B",
            food: [
              { name: "Restaurante ABC", terminal: "A", type: "Café" },
              { name: "Food Court", terminal: "B", type: "Snack Bar" }
            ],
            transport: [
              { method: "Train", cost: "$5", time: "30 minutos" },
              { method: "Bus", cost: "$2", time: "45 minutos" }
            ],
            lounges: "Disponibles para pasajeros premium",
            wifi: "WiFi gratuito en todo el aeropuerto",
            insiderTip: "Evita los restaurantes del centro, hay mejores opciones cerca de la llegada."
          };
          setGuide(guideData);
          writeCache(airportIata, guideData);
          setLoading(false);
        }
      } catch (err) {
        setError("Error al cargar la guía");
        setLoading(false);
      }
    };

    fetchGuide();
  }, [airportIata]);

  return (
    <div className="px-4 py-2">
      {loading && !error ? (
        <GuideSkeleton />
      ) : error ? (
        <div className="py-3 text-center space-y-2">
          <p className="text-xs text-red-400">{L.error}</p>
          <button
            onClick={() => setGuide(null)}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors underline-offset-2 hover:underline"
          >
            {L.retry}
          </button>
        </div>
      ) : guide ? (
        <div className="space-y-0">
          {/* Terminals */}
          <GuideSection
            icon={<Building2 className="h-3 w-3" />}
            label={L.terminals}
            defaultOpen
          >
            <p className="text-xs text-gray-400 leading-relaxed">{guide.terminals}</p>
          </GuideSection>

          {/* Food */}
          <GuideSection icon={<UtensilsCrossed className="h-3 w-3" />} label={L.food}>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {guide.food.map((item, i) => (
                <div
                  key={i}
                  className="shrink-0 rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-2 min-w-[140px]"
                >
                  <p className="text-xs font-semibold text-white truncate">{item.name}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{item.terminal}</p>
                  <p className="text-[11px] text-gray-600 mt-0.5 italic">{item.type}</p>
                </div>
              ))}
            </div>
          </GuideSection>

          {/* Transport */}
          <GuideSection icon={<Bus className="h-3 w-3" />} label={L.transport}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[260px]">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-gray-600">
                    <th className="text-left pb-2 pr-3 font-semibold">{L.method}</th>
                    <th className="text-left pb-2 pr-3 font-semibold">{L.cost}</th>
                    <th className="text-left pb-2 font-semibold">{L.time}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {guide.transport.map((opt, i) => (
                    <tr key={i}>
                      <td className="py-1.5 pr-3 text-gray-300 font-medium">{opt.method}</td>
                      <td className="py-1.5 pr-3 text-gray-400">{opt.cost}</td>
                      <td className="py-1.5 text-gray-400">{opt.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GuideSection>

          {/* Lounges */}
          <GuideSection icon={<Plane className="h-3 w-3" />} label={L.lounges}>
            <p className="text-xs text-gray-400 leading-relaxed">{guide.lounges}</p>
          </GuideSection>

          {/* WiFi */}
          <GuideSection icon={<Wifi className="h-3 w-3" />} label={L.wifi}>
            <p className="text-xs text-gray-400 leading-relaxed">{guide.wifi}</p>
          </GuideSection>

          {/* Insider Tip */}
          <GuideSection icon={<Lightbulb className="h-3 w-3" />} label={L.insiderTip}>
            <div className="rounded-lg bg-amber-950/30 border border-amber-700/30 px-3 py-2.5">
              <p className="text-xs text-amber-200/80 leading-relaxed">{guide.insiderTip}</p>
            </div>
          </GuideSection>
        </div>
      ) : (
        <div className="py-3 text-center space-y-2">
          <p className="text-[14px] font-semibold">No se ha encontrado la guía</p>
          <button
            onClick={() => setGuide(null)}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors underline-offset-2 hover:underline"
          >
            {L.retry}
          </button>
        </div>
      )}
    </div>
  );
}