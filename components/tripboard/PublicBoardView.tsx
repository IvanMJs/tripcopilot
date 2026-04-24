"use client";

import { SplitFlapTime } from "./SplitFlapTime";
import { StatusPill } from "./StatusPill";
import type { BoardFlight } from "@/hooks/useBoardFlights";

const A = "#FFB800";
const A35 = "rgba(255,184,0,.35)";
const A18 = "rgba(255,184,0,.18)";
const A60 = "rgba(255,184,0,.6)";
const T35 = "rgba(232,232,240,.35)";
const T60 = "rgba(232,232,240,.6)";
const MONO = "'JetBrains Mono','Courier New',monospace";

interface PublicBoardViewProps {
  flights: BoardFlight[];
  ownerName?: string;
}

export function PublicBoardView({ flights, ownerName }: PublicBoardViewProps) {
  const date = new Date()
    .toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#07070d",
        display: "flex",
        flexDirection: "column",
        fontFamily: MONO,
      }}
    >
      {/* Header */}
      <div style={{ padding: "20px 20px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: A, letterSpacing: "0.15em" }}>
              ✈ TRIPCOPILOT
            </div>
            {ownerName && (
              <div style={{ fontSize: 9, color: T35, marginTop: 2, letterSpacing: "0.06em" }}>
                Vuelos de {ownerName}
              </div>
            )}
          </div>
          <span style={{ fontSize: 9, color: A60, letterSpacing: "0.07em" }}>{date}</span>
        </div>
        <div
          style={{
            height: 1,
            marginTop: 12,
            background: `linear-gradient(to right, ${A}, ${A35}, transparent)`,
          }}
        />
      </div>

      {/* Flights */}
      <div style={{ flex: 1, padding: "8px 0 24px" }}>
        {flights.length === 0 && (
          <div
            style={{
              padding: "60px 20px",
              textAlign: "center",
              fontSize: 11,
              color: T35,
            }}
          >
            Sin vuelos próximos
          </div>
        )}
        {flights.map((f, i) => (
          <div key={f.id}>
            <div
              style={{
                padding: "16px 20px",
                display: "flex",
                gap: 14,
                alignItems: "flex-start",
                animation: `tb-row-in .35s ease-out ${i * 70}ms both`,
              }}
            >
              <div style={{ flexShrink: 0, paddingTop: 2 }}>
                <SplitFlapTime time={f.time} sz={29} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: "#fff", lineHeight: 1, letterSpacing: "0.01em" }}>
                    {f.dest}
                  </span>
                  <StatusPill status={f.status} delay={f.delay} />
                </div>
                <div style={{ fontSize: 10, color: T35, marginTop: 3, letterSpacing: "0.05em" }}>{f.city}</div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 7, fontSize: 11 }}>
                  <span style={{ color: A60 }}>
                    {f.airline} {f.num} · GATE {f.gate}
                  </span>
                  <span style={{ color: T35 }}>{f.cd}</span>
                </div>
              </div>
            </div>
            {i < flights.length - 1 && (
              <div style={{ margin: "0 20px", borderBottom: `1px dashed ${A18}` }} />
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "16px 20px",
          borderTop: "1px solid rgba(255,255,255,.05)",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <a
          href="/"
          style={{
            fontSize: 9,
            color: T35,
            textDecoration: "none",
            letterSpacing: "0.08em",
          }}
        >
          Creá tu propio tablero en tripcopilot.app
        </a>
      </div>
    </div>
  );
}
