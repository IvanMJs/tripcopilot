"use client";

import { DelayStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface StatusBadgeProps {
  status: DelayStatus;
  className?: string;
}

// Dot colors — calibrated for dark-mode readability (research: reduce saturation ~15%)
const DOT_COLOR: Record<DelayStatus, string> = {
  ok:             "bg-emerald-400",
  delay_minor:    "bg-yellow-400",
  delay_moderate: "bg-orange-400",
  delay_severe:   "bg-red-400",
  ground_delay:   "bg-red-400",
  ground_stop:    "bg-red-400",
  closure:        "bg-zinc-400",
  unknown:        "bg-zinc-500",
};

// Pill styles — pill with tinted bg + matching text (Linear/Stripe pattern)
const PILL: Record<DelayStatus, string> = {
  ok:             "bg-emerald-950/60 text-emerald-300 border border-emerald-500/20",
  delay_minor:    "bg-yellow-950/60  text-yellow-300  border border-yellow-500/20",
  delay_moderate: "bg-orange-950/60  text-orange-300  border border-orange-500/20",
  delay_severe:   "bg-red-950/60     text-red-300     border border-red-500/25",
  ground_delay:   "bg-red-950/70     text-red-200     border border-red-600/30",
  ground_stop:    "bg-red-950/80     text-red-200     border border-red-600/40",
  closure:        "bg-zinc-900/60    text-zinc-300    border border-zinc-600/30",
  unknown:        "bg-zinc-900/40    text-zinc-400    border border-zinc-700/30",
};

// Which statuses get the pulsing "live" dot animation
const PULSE_STATUSES = new Set<DelayStatus>(["ground_stop", "delay_severe", "ground_delay"]);

// Emoji (kept for quick visual recognition — AstroUXDS recommends color + icon)
const EMOJI: Record<DelayStatus, string> = {
  ok:             "✓",
  delay_minor:    "▲",
  delay_moderate: "▲",
  delay_severe:   "▲",
  ground_delay:   "⬤",
  ground_stop:    "⬛",
  closure:        "✕",
  unknown:        "?",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
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

  const isPulsing = PULSE_STATUSES.has(status);
  const dotColor  = DOT_COLOR[status] ?? DOT_COLOR.unknown;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide",
        PILL[status] ?? PILL.unknown,
        className
      )}
    >
      {/* Status dot — pulsing for critical/active states */}
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        {isPulsing && (
          <span className={cn(
            "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
            dotColor
          )} />
        )}
        <span className={cn("relative inline-flex rounded-full h-1.5 w-1.5", dotColor)} />
      </span>
      {label[status]}
    </span>
  );
}
