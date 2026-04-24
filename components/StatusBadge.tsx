"use client";

import { motion } from "framer-motion";
import { DelayStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface StatusBadgeProps {
  status: DelayStatus;
  className?: string;
  /** dense = filas compactas (AirportCard inline, TripPanel): padding reducido */
  dense?: boolean;
}

const DOT_COLOR: Record<DelayStatus, string> = {
  ok:             "bg-[#FFB800]",
  delay_minor:    "bg-yellow-400",
  delay_moderate: "bg-orange-400",
  delay_severe:   "bg-red-400",
  ground_delay:   "bg-red-400",
  ground_stop:    "bg-red-400",
  closure:        "bg-zinc-400",
  unknown:        "bg-zinc-500",
};

const PILL: Record<DelayStatus, string> = {
  ok:             "bg-[rgba(255,184,0,0.08)] text-[#FFB800] border-[rgba(255,184,0,0.25)]",
  delay_minor:    "bg-yellow-950/60  text-yellow-300  border-yellow-500/25",
  delay_moderate: "bg-orange-950/60  text-orange-300  border-orange-500/25",
  delay_severe:   "bg-red-950/70     text-red-200     border-red-500/30",
  ground_delay:   "bg-red-950/70     text-red-200     border-red-600/35",
  ground_stop:    "bg-red-950/80     text-red-200     border-red-600/40",
  closure:        "bg-zinc-900/60    text-zinc-300    border-zinc-600/30",
  unknown:        "bg-zinc-900/40    text-zinc-400    border-zinc-700/30",
};

const PULSE_STATUSES   = new Set<DelayStatus>(["ok", "ground_stop", "delay_severe", "ground_delay"]);
const URGENT_STATUSES  = new Set<DelayStatus>(["ground_stop", "delay_severe", "ground_delay"]);

// Fast ring for urgent states; slow breathing for ok
function getPulseClass(status: DelayStatus): string {
  if (URGENT_STATUSES.has(status)) return "animate-[radarPulse_1.6s_ease-out_infinite]";
  if (status === "ok")             return "animate-[radarPulse_3.2s_ease-out_infinite] opacity-70";
  return "";
}

export function StatusBadge({ status, className, dense = false }: StatusBadgeProps) {
  const { t } = useLanguage();

  const label: Record<DelayStatus, string> = {
    ok:             t.statusOk,
    delay_minor:    t.statusMinor,
    delay_moderate: t.statusModerate,
    delay_severe:   t.statusSevere,
    ground_delay:   t.statusGroundDelay,
    ground_stop:    t.statusGroundStop,
    closure:        t.statusClosure,
    unknown:        t.statusUnknown,
  };

  const isPulsing  = PULSE_STATUSES.has(status);
  const dotColor   = DOT_COLOR[status] ?? DOT_COLOR.unknown;
  const dotDim     = dense ? "h-1.5 w-1.5" : "h-2 w-2";
  const pulseClass = getPulseClass(status);

  return (
    <motion.span
      layout
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold tracking-wide leading-none",
        dense ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        PILL[status] ?? PILL.unknown,
        className
      )}
    >
      <span className={cn("relative flex shrink-0", dotDim)} aria-hidden>
        {isPulsing && (
          <>
            <span
              className={cn(
                "absolute inset-0 rounded-full motion-reduce:animate-none",
                dotColor,
                pulseClass,
              )}
            />
            {/* Second ring with phase offset — continuous breathing for ok */}
            {status === "ok" && (
              <span
                className={cn(
                  "absolute inset-0 rounded-full opacity-50 motion-reduce:animate-none",
                  dotColor,
                  "animate-[radarPulse_3.2s_ease-out_infinite] [animation-delay:1.6s]",
                )}
              />
            )}
          </>
        )}
        <span className={cn("relative inline-flex rounded-full", dotDim, dotColor)} />
      </span>
      {label[status]}
    </motion.span>
  );
}
