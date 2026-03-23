"use client";

import { LiveFlightData } from "@/hooks/useFlightLiveStatus";

interface LiveStatusPillProps {
  liveData: LiveFlightData;
  locale: "es" | "en";
}

function statusLabel(
  status: LiveFlightData["status"],
  locale: "es" | "en",
): string {
  if (locale === "es") {
    switch (status) {
      case "departed": return "En vuelo";
      case "landed":   return "Aterrizado";
      case "cancelled": return "Cancelado";
      case "delayed":  return "Demorado";
      default:         return "";
    }
  } else {
    switch (status) {
      case "departed": return "In flight";
      case "landed":   return "Landed";
      case "cancelled": return "Cancelled";
      case "delayed":  return "Delayed";
      default:         return "";
    }
  }
}

function pillClasses(status: LiveFlightData["status"]): string {
  switch (status) {
    case "departed":  return "bg-blue-600/20 text-blue-300 border border-blue-600/30";
    case "landed":    return "bg-green-600/20 text-green-300 border border-green-600/30";
    case "cancelled": return "bg-red-700/20 text-red-300 border border-red-700/30";
    case "delayed":   return "bg-orange-600/20 text-orange-300 border border-orange-600/30";
    default:          return "bg-white/5 text-gray-400 border border-white/10";
  }
}

export function LiveStatusPill({ liveData, locale }: LiveStatusPillProps) {
  const { status, delayMinutes, departureGate } = liveData;

  // Don't render pill for unknown or plain scheduled with no extra info
  if (
    status === "unknown" ||
    (status === "scheduled" && delayMinutes === 0 && !departureGate)
  ) {
    return null;
  }

  const label = statusLabel(status, locale);

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${pillClasses(status)}`}>
      {status === "delayed" && delayMinutes > 0 && (
        <span>+{delayMinutes} min</span>
      )}
      {label && <span>{label}</span>}
      {departureGate && status !== "landed" && status !== "cancelled" && (
        <>
          <span className="text-white/20">·</span>
          <span>{locale === "es" ? "Puerta" : "Gate"} {departureGate}</span>
        </>
      )}
    </span>
  );
}
