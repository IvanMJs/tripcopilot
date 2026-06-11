"use client";

import { AirportStatusMap } from "@/lib/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { Translations } from "@/lib/i18n";

interface GlobalStatusBarProps {
  statusMap: AirportStatusMap;
  watchedAirports: string[];
}

export function GlobalStatusBar({ statusMap, watchedAirports }: GlobalStatusBarProps) {
  const { t } = useLanguage();

  const problems = watchedAirports.filter(
    (iata) => statusMap[iata] && statusMap[iata].status !== "ok"
  );
  const hasCritical = problems.some((iata) =>
    ["ground_stop", "closure"].includes(statusMap[iata]?.status)
  );

  if (problems.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-green-900/30 border border-green-600/40 px-4 py-2.5 text-sm text-green-300 font-medium">
        <span className="h-2 w-2 rounded-full bg-green-400 animate-[pulse_3.5s_ease-in-out_infinite] shrink-0" />
        {t.noDelays}
      </div>
    );
  }

  const label = hasCritical
    ? (t as Translations & { airportsCritical: (n: number) => string }).airportsCritical(problems.length)
    : t.airportsWithIssues(problems.length);

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium ${
        hasCritical
          ? "bg-red-950/50 border-red-700/60 text-red-300"
          : "bg-orange-900/30 border-orange-600/40 text-orange-300"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full shrink-0 animate-[pulse_3.5s_ease-in-out_infinite] ${
          hasCritical ? "bg-red-400" : "bg-orange-400"
        }`}
      />
      {label}{" "}
      <span className="font-bold">{problems.join(", ")}</span>
    </div>
  );
}
