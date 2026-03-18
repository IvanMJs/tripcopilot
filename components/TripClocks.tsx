"use client";

import { useEffect, useState } from "react";

interface ClockCity {
  code: string;
  city: string;
  cityEn: string;
  tz: string;
  flag: string;
}

const CLOCKS: ClockCity[] = [
  { code: "EZE", city: "Buenos Aires", cityEn: "Buenos Aires", tz: "America/Argentina/Buenos_Aires", flag: "🇦🇷" },
  { code: "MIA", city: "Miami",        cityEn: "Miami",        tz: "America/New_York",               flag: "🇺🇸" },
  { code: "GCM", city: "Gran Caimán", cityEn: "Grand Cayman", tz: "America/Cayman",                 flag: "🇰🇾" },
  { code: "JFK", city: "Nueva York",  cityEn: "New York",     tz: "America/New_York",               flag: "🇺🇸" },
];

function getNow(tz: string) {
  return new Date().toLocaleTimeString("en-GB", {
    timeZone: tz,
    hour:   "2-digit",
    minute: "2-digit",
  });
}

function getDateLabel(tz: string, locale: "es" | "en") {
  return new Date().toLocaleDateString(locale === "es" ? "es-AR" : "en-US", {
    timeZone: tz,
    weekday: "short",
    day:     "numeric",
    month:   "short",
  });
}

export function TripClocks({ locale }: { locale: "es" | "en" }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    // Sync to next minute boundary, then tick every minute
    const msToNext = 60000 - (Date.now() % 60000);
    const initialTimer = setTimeout(() => {
      setTick((t) => t + 1);
      const interval = setInterval(() => setTick((t) => t + 1), 60000);
      return () => clearInterval(interval);
    }, msToNext);
    return () => clearTimeout(initialTimer);
  }, []);

  // Deduplicate: MIA and JFK share the same timezone — show JFK separately only if tz differs from MIA
  const uniqueClocks = CLOCKS.filter(
    (c, i, arr) => arr.findIndex((x) => x.tz === c.tz) === i || c.code === "JFK"
  );
  // Actually show all four but mark duplicates visually
  const miaTime = getNow("America/New_York");

  return (
    <div className="rounded-2xl border border-white/[0.07] overflow-hidden"
      style={{ background: "linear-gradient(150deg, rgba(12,12,22,0.97) 0%, rgba(8,8,16,0.99) 100%)" }}
    >
      <div className="px-4 pt-3.5 pb-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">
          {locale === "es" ? "Hora local · ciudades del viaje" : "Local time · trip cities"}
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/[0.04] mx-3 mb-3 mt-2 rounded-xl overflow-hidden">
        {CLOCKS.map((c) => {
          const time = getNow(c.tz);
          const dateLabel = getDateLabel(c.tz, locale);
          const city = locale === "es" ? c.city : c.cityEn;
          // Mark MIA/JFK same timezone
          const sameAsOther =
            c.code === "JFK" && CLOCKS.find((x) => x.code === "MIA")?.tz === c.tz;

          return (
            <div
              key={c.code}
              className="bg-white/[0.02] px-3 py-3 flex flex-col gap-0.5"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm leading-none">{c.flag}</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                  {c.code}
                </span>
              </div>
              <p className="text-2xl font-black text-white tabular leading-none">
                {time}
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5 truncate">{city}</p>
              <p className="text-[10px] text-gray-600 truncate">{dateLabel}</p>
              {sameAsOther && (
                <p className="text-[9px] text-gray-700 mt-0.5">= MIA</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
