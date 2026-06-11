"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

type Tone = "ok" | "warn" | "danger" | "neutral";

const PULSE_COLOR: Record<Tone, string> = {
  ok:      "bg-green-400",
  warn:    "bg-orange-400",
  danger:  "bg-red-500",
  neutral: "bg-gray-500",
};

interface RadarDotProps {
  tone: Tone;
  size?: "sm" | "md";
  ringColor?: string;
}

export function RadarDot({ tone, size = "md", ringColor = "#080810" }: RadarDotProps) {
  const [syncDelay, setSyncDelay] = useState(0);

  useEffect(() => {
    setSyncDelay(-(Date.now() % 4000) / 1000);
  }, []);

  const dim = size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5";

  return (
    <span className={cn("relative flex shrink-0", dim)} aria-label={`Radar dot with ${tone} tone`}>
      {/* Single expanding ring — slow and calm */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 rounded-full animate-[radarPulse_4s_ease-out_infinite]",
          PULSE_COLOR[tone],
        )}
        style={{ animationDelay: `${syncDelay}s` }}
      />
      {/* Solid core */}
      <span
        className={cn("relative inline-flex rounded-full", dim, PULSE_COLOR[tone])}
        style={{ boxShadow: `0 0 0 2px ${ringColor}` }}
      />
    </span>
  );
}
