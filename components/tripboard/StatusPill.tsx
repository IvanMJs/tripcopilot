"use client";

export type FlightStatus = "ontime" | "delayed" | "boarding" | "landed";

interface StatusConfig {
  label: string;
  color: string;
  bg: string;
  bd: string;
  pulse: boolean;
}

const STATUS_MAP: Record<FlightStatus, StatusConfig> = {
  ontime: {
    label: "EN HORARIO",
    color: "#22c55e",
    bg: "rgba(34,197,94,.10)",
    bd: "rgba(34,197,94,.30)",
    pulse: false,
  },
  delayed: {
    label: "DEMORADO",
    color: "#ef4444",
    bg: "rgba(239,68,68,.10)",
    bd: "rgba(239,68,68,.30)",
    pulse: false,
  },
  boarding: {
    label: "EMBARCANDO",
    color: "#FFB800",
    bg: "rgba(255,184,0,.08)",
    bd: "rgba(255,184,0,.35)",
    pulse: true,
  },
  landed: {
    label: "ATERRIZADO",
    color: "#6b7280",
    bg: "rgba(107,114,128,.08)",
    bd: "rgba(107,114,128,.18)",
    pulse: false,
  },
};

export interface StatusPillProps {
  status: FlightStatus;
  delay?: number;
}

export function StatusPill({ status, delay }: StatusPillProps) {
  const s = STATUS_MAP[status] ?? STATUS_MAP.ontime;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 9px",
        borderRadius: 9999,
        background: s.bg,
        border: `1px solid ${s.bd}`,
        color: s.color,
        fontFamily: "'JetBrains Mono','Courier New',monospace",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.06em",
        whiteSpace: "nowrap",
        flexShrink: 0,
        animation: s.pulse ? "pill-pulse 2s ease-in-out infinite" : "none",
      }}
    >
      {s.pulse && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: s.color,
            display: "inline-block",
            flexShrink: 0,
            animation: "dot-blink 2s ease-in-out infinite",
          }}
        />
      )}
      {s.label}
      {status === "delayed" && delay && delay > 0 ? ` +${delay}m` : ""}
    </span>
  );
}
