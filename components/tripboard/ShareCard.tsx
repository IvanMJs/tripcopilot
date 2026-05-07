"use client";

import { useState, useRef } from "react";
import { StatusPill } from "./StatusPill";
import type { BoardFlight } from "@/hooks/useBoardFlights";

const BASE_URL =
  typeof window !== "undefined"
    ? window.location.origin
    : "https://tripcopilot.app";

const A   = "#FFB800";
const A60 = "rgba(255,184,0,.6)";
const A35 = "rgba(255,184,0,.35)";
const A18 = "rgba(255,184,0,.18)";
const A08 = "rgba(255,184,0,.08)";
const T18 = "rgba(232,232,240,.18)";
const T35 = "rgba(232,232,240,.35)";
const MONO = "'JetBrains Mono','Courier New',monospace";
const SANS = "'Inter',-apple-system,sans-serif";

interface ShareCardProps {
  flights: BoardFlight[];
}

export function ShareCard({ flights }: ShareCardProps) {
  const [selId, setSelId] = useState<string>(flights[0]?.id ?? "");
  const [linkState, setLinkState] = useState<"idle" | "loading" | "copied">("idle");
  const cardRef = useRef<HTMLDivElement>(null);

  const f = flights.find((x) => x.id === selId) ?? flights[0];
  const date = new Date()
    .toLocaleDateString("es-AR", { day: "2-digit", month: "short" })
    .toUpperCase();

  async function handleCopyLink() {
    setLinkState("loading");
    try {
      const res = await fetch("/api/board/share", { method: "POST" });
      const { token } = await res.json();
      const url = `${BASE_URL}/board/${token}`;
      await navigator.clipboard.writeText(url);
      setLinkState("copied");
      setTimeout(() => setLinkState("idle"), 3000);
    } catch {
      setLinkState("idle");
    }
  }

  async function handleShare() {
    if (!cardRef.current) return;
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#07070d",
        scale: 2,
        useCORS: true,
      });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `vuelo-${f?.airline}${f?.num}.png`, { type: "image/png" });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: `Mi vuelo ${f?.airline}${f?.num}` });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = file.name;
          a.click();
          URL.revokeObjectURL(url);
        }
      }, "image/png");
    } catch {
      // fallback: just share the link
      if (navigator.share) {
        await navigator.share({ title: "TripCopilot — Mis vuelos", url: window.location.href });
      }
    }
  }

  if (!f) return null;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", padding: "16px 20px 20px" }}>
      <div style={{ fontFamily: MONO, fontSize: 9, color: T35, letterSpacing: "0.12em", marginBottom: 10 }}>
        TARJETA DE VUELO · TOCÁ PARA CAMBIAR
      </div>

      {/* Flight selector pills */}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 16 }}>
        {flights.map((fl) => (
          <button
            key={fl.id}
            onClick={() => setSelId(fl.id)}
            style={{
              padding: "4px 10px",
              borderRadius: 9999,
              cursor: "pointer",
              background: fl.id === selId ? A08 : "transparent",
              border: `1px solid ${fl.id === selId ? A35 : T18}`,
              color: fl.id === selId ? A : T35,
              fontFamily: MONO,
              fontSize: 9,
              letterSpacing: "0.06em",
              transition: "all .15s",
            }}
          >
            {fl.airline}{fl.num} · {fl.dest}
          </button>
        ))}
      </div>

      {/* 9:16 card */}
      <div
        ref={cardRef}
        style={{
          width: "100%",
          maxWidth: 296,
          margin: "0 auto",
          aspectRatio: "9/16",
          background: "#07070d",
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,.05)",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          padding: "28px 24px 20px",
          boxShadow: `0 0 0 1px ${A18}, 0 32px 72px rgba(0,0,0,.9)`,
          flexShrink: 0,
        }}
      >
        {/* Grid overlay */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: `linear-gradient(${A08} 1px,transparent 1px),linear-gradient(90deg,${A08} 1px,transparent 1px)`,
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse 90% 70% at 50% 55%, rgba(0,0,0,.55) 0%,transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 90% 70% at 50% 55%, rgba(0,0,0,.55) 0%,transparent 100%)",
        }} />
        {/* Amber glow */}
        <div style={{
          position: "absolute", top: "28%", left: "50%", transform: "translate(-50%,-50%)",
          width: 220, height: 220, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,184,0,.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Airline + date */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
          <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: A60, letterSpacing: "0.16em" }}>{f.airline}</span>
          <span style={{ fontFamily: MONO, fontSize: 9, color: T35, letterSpacing: "0.07em" }}>{date}</span>
        </div>

        {/* Flight number */}
        <div style={{ marginTop: 22, position: "relative" }}>
          <div style={{ fontFamily: MONO, fontSize: 9, color: T35, letterSpacing: "0.15em", marginBottom: 3 }}>VUELO</div>
          <div style={{ fontFamily: MONO, fontSize: 56, fontWeight: 800, color: A, letterSpacing: "-0.03em", lineHeight: 1 }}>
            {f.num}
          </div>
        </div>

        {/* Route */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 24, position: "relative" }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{f.orig}</div>
            <div style={{ fontFamily: MONO, fontSize: 8, color: T35, marginTop: 3, letterSpacing: "0.09em" }}>ORIGEN</div>
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 3 }}>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(to right,rgba(255,184,0,.1),${A60})` }} />
            <span style={{ fontSize: 13, color: A }}>✈</span>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(to right,${A60},rgba(255,184,0,.1))` }} />
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{f.dest}</div>
            <div style={{ fontFamily: MONO, fontSize: 8, color: T35, marginTop: 3, letterSpacing: "0.09em", textAlign: "right" }}>DESTINO</div>
          </div>
        </div>

        {/* Time + Gate */}
        <div style={{ display: "flex", gap: 20, marginTop: 22, position: "relative" }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 9, color: T35, letterSpacing: "0.12em", marginBottom: 4 }}>SALIDA</div>
            <div style={{ fontFamily: MONO, fontSize: 32, fontWeight: 700, color: A, lineHeight: 1 }}>{f.time}</div>
          </div>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 9, color: T35, letterSpacing: "0.12em", marginBottom: 4 }}>PUERTA</div>
            <div style={{ fontFamily: MONO, fontSize: 32, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{f.gate}</div>
          </div>
        </div>

        {/* Status */}
        <div style={{ marginTop: 16, position: "relative" }}>
          <StatusPill status={f.status} delay={f.delay} />
        </div>

        <div style={{ flex: 1 }} />

        {/* Runway lines */}
        <div style={{ position: "relative", height: 20, marginBottom: 10, overflow: "hidden" }}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{
              position: "absolute", left: 0, right: 0, bottom: i * 6,
              height: 1, background: `rgba(255,184,0,${Math.max(0, .06 - i * .009)})`,
            }} />
          ))}
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", alignItems: "center", gap: 7,
          paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.05)",
          position: "relative",
        }}>
          <span style={{ fontFamily: SANS, fontSize: 11, fontWeight: 600, color: "rgba(232,232,240,.28)", letterSpacing: "0.04em" }}>TripCopilot</span>
          {/* Branded share badge */}
          <span style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            borderRadius: 9999,
            background: "rgba(255,184,0,0.12)",
            border: "1px solid rgba(255,184,0,0.25)",
            padding: "2px 7px",
            fontFamily: SANS,
            fontSize: 8,
            fontWeight: 700,
            color: "rgba(255,184,0,0.7)",
            letterSpacing: "0.04em",
          }}>
            TripCopilot ✈️
          </span>
        </div>
      </div>

      {/* Buttons */}
      <div style={{ width: "100%", maxWidth: 296, margin: "16px auto 0", display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          onClick={handleShare}
          style={{
            width: "100%", padding: "13px", cursor: "pointer",
            background: "transparent", border: `1px solid ${A}`,
            color: A, fontFamily: MONO, fontSize: 12, fontWeight: 700,
            letterSpacing: "0.1em", borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          ⬡ DESCARGAR TARJETA
        </button>
        <button
          onClick={handleCopyLink}
          disabled={linkState === "loading"}
          style={{
            width: "100%", padding: "13px", cursor: linkState === "loading" ? "wait" : "pointer",
            background: linkState === "copied" ? "rgba(255,184,0,.08)" : "transparent",
            border: `1px solid ${T18}`,
            color: linkState === "copied" ? A : T35,
            fontFamily: MONO, fontSize: 12, fontWeight: 700,
            letterSpacing: "0.1em", borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "all .2s",
          }}
        >
          {linkState === "loading" ? "GENERANDO…" : linkState === "copied" ? "✓ LINK COPIADO" : "⊕ COPIAR LINK PÚBLICO"}
        </button>
      </div>
    </div>
  );
}
