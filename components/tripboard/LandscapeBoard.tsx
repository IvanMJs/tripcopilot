"use client";

import { SplitFlapTime } from "./SplitFlapTime";
import { StatusPill } from "./StatusPill";
import type { BoardFlight } from "@/hooks/useBoardFlights";

const A = "#FFB800";
const A35 = "rgba(255,184,0,.35)";
const A18 = "rgba(255,184,0,.18)";
const A60 = "rgba(255,184,0,.6)";
const T18 = "rgba(232,232,240,.18)";
const T35 = "rgba(232,232,240,.35)";
const MONO = "'JetBrains Mono','Courier New',monospace";

interface LandscapeBoardProps {
  flights: BoardFlight[];
}

export function LandscapeBoard({ flights }: LandscapeBoardProps) {
  const date = new Date()
    .toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100dvh",
        background: "#07070d",
        fontFamily: MONO,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header bar */}
      <div
        style={{
          padding: "14px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${A18}`,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <a
            href="/app"
            style={{
              fontFamily: MONO, fontSize: 9, fontWeight: 700,
              letterSpacing: "0.12em", color: "rgba(232,232,240,.65)",
              textDecoration: "none",
            }}
          >
            ← DASHBOARD
          </a>
          <span style={{ fontSize: 14, fontWeight: 700, color: A, letterSpacing: "0.18em" }}>
            ✈ TRIPCOPILOT — SALIDAS
          </span>
        </div>
        <span style={{ fontSize: 10, color: A60, letterSpacing: "0.07em" }}>{date}</span>
      </div>

      {/* Column headers */}
      <div
        style={{
          padding: "10px 32px",
          display: "grid",
          gridTemplateColumns: "120px 1fr 80px 100px 160px 140px",
          gap: 16,
          borderBottom: `1px solid rgba(255,255,255,.04)`,
          flexShrink: 0,
        }}
      >
        {["HORA", "DESTINO", "ORIG", "VUELO", "PUERTA", "ESTADO"].map((h) => (
          <span key={h} style={{ fontSize: 8, color: "rgba(232,232,240,.50)", letterSpacing: "0.14em" }}>
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {flights.map((f, i) => (
          <div key={f.id}>
            <div
              style={{
                padding: "14px 32px",
                display: "grid",
                gridTemplateColumns: "120px 1fr 80px 100px 160px 140px",
                gap: 16,
                alignItems: "center",
                animation: `tb-row-in .35s ease-out ${i * 60}ms both`,
              }}
            >
              <SplitFlapTime time={f.time} sz={24} />
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{f.dest}</div>
                <div style={{ fontSize: 9, color: "rgba(232,232,240,.70)", marginTop: 2, letterSpacing: "0.05em" }}>{f.city}</div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(232,232,240,.70)" }}>{f.orig}</span>
              <span style={{ fontSize: 13, color: "rgba(255,184,0,.85)", letterSpacing: "0.04em" }}>
                {f.airline} {f.num}
              </span>
              <span style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>{f.gate}</span>
              <StatusPill status={f.status} delay={f.delay} />
            </div>
            {i < flights.length - 1 && (
              <div style={{ margin: "0 32px", borderBottom: `1px dashed ${A18}` }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
