"use client";

import { Fragment } from "react";
import { FlightRow } from "./FlightRow";
import type { BoardFlight } from "@/hooks/useBoardFlights";

interface BoardScreenProps {
  flights: BoardFlight[];
  litId?: string | null;
  onShare: () => void;
}

const A = "#FFB800";
const A35 = "rgba(255,184,0,.35)";
const A18 = "rgba(255,184,0,.18)";
const A08 = "rgba(255,184,0,.08)";
const A60 = "rgba(255,184,0,.6)";
const MONO = "'JetBrains Mono','Courier New',monospace";

export function BoardScreen({ flights, litId, onShare }: BoardScreenProps) {
  const date = new Date()
    .toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .toUpperCase();

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ padding: "14px 20px 0", flexShrink: 0 }}>
        {/* Back button */}
        <a
          href="/app"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontFamily: MONO,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "rgba(232,232,240,.65)",
            textDecoration: "none",
            marginBottom: 12,
          }}
        >
          ← DASHBOARD
        </a>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontFamily: MONO,
              fontSize: 12,
              fontWeight: 700,
              color: A,
              letterSpacing: "0.15em",
            }}
          >
            ✈ MIS VUELOS
          </span>
          <span
            style={{
              fontFamily: MONO,
              fontSize: 10,
              color: A60,
              letterSpacing: "0.07em",
            }}
          >
            {date}
          </span>
        </div>
        <div
          style={{
            height: 1,
            marginTop: 11,
            background: `linear-gradient(to right, ${A}, ${A35}, transparent)`,
          }}
        />
      </div>

      {/* Rows */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 4 }}>
        {flights.length === 0 && (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              fontFamily: MONO,
              fontSize: 11,
              color: "rgba(232,232,240,.60)",
            }}
          >
            Sin vuelos próximos
          </div>
        )}
        {flights.map((f, i) => (
          <Fragment key={f.id}>
            <FlightRow flight={f} idx={i} lit={f.id === litId} />
            {i < flights.length - 1 && (
              <div
                style={{
                  margin: "0 20px",
                  borderBottom: `1px dashed ${A18}`,
                }}
              />
            )}
          </Fragment>
        ))}
      </div>

      {/* Share CTA */}
      <div style={{ padding: "10px 20px 16px", flexShrink: 0 }}>
        <button
          onClick={onShare}
          style={{
            width: "100%",
            padding: "13px",
            cursor: "pointer",
            background: "transparent",
            border: `1px solid ${A}`,
            color: A,
            fontFamily: MONO,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.1em",
            borderRadius: 8,
            transition: "background .15s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = A08)
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          ⬡ COMPARTIR MIS VUELOS
        </button>
      </div>
    </div>
  );
}
