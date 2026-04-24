"use client";

import { SplitFlapTime } from "./SplitFlapTime";
import { StatusPill } from "./StatusPill";
import type { BoardFlight } from "@/hooks/useBoardFlights";

interface FlightRowProps {
  flight: BoardFlight;
  idx: number;
  lit?: boolean;
}

export function FlightRow({ flight, idx, lit }: FlightRowProps) {
  return (
    <div
      style={{
        padding: "14px 20px",
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
        animation: lit
          ? "tb-lit-fade 3.5s ease-out forwards"
          : `tb-row-in .35s ease-out ${idx * 70}ms both`,
      }}
    >
      {/* Time tiles */}
      <div style={{ flexShrink: 0, paddingTop: 2 }}>
        <SplitFlapTime time={flight.time} sz={29} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 8,
          }}
        >
          <span
            style={{
              fontFamily: "'JetBrains Mono','Courier New',monospace",
              fontSize: 20,
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1,
              letterSpacing: "0.01em",
            }}
          >
            {flight.dest}
          </span>
          <StatusPill status={flight.status} delay={flight.delay} />
        </div>

        <div
          style={{
            fontFamily: "'JetBrains Mono','Courier New',monospace",
            fontSize: 10,
            color: "rgba(232,232,240,.70)",
            marginTop: 3,
            letterSpacing: "0.05em",
          }}
        >
          {flight.city}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 7,
            fontFamily: "'JetBrains Mono','Courier New',monospace",
            fontSize: 11,
          }}
        >
          <span style={{ color: "rgba(255,184,0,.85)" }}>
            {flight.airline} {flight.num} · GATE {flight.gate}
          </span>
          <span style={{ color: "rgba(232,232,240,.65)" }}>{flight.cd}</span>
        </div>
      </div>
    </div>
  );
}
