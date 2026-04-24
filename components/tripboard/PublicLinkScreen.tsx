"use client";

import { useState, useEffect } from "react";

const A = "#FFB800";
const A08 = "rgba(255,184,0,.08)";
const A18 = "rgba(255,184,0,.18)";
const A35 = "rgba(255,184,0,.35)";
const A60 = "rgba(255,184,0,.6)";
const T18 = "rgba(232,232,240,.18)";
const T35 = "rgba(232,232,240,.35)";
const MONO = "'JetBrains Mono','Courier New',monospace";
const SANS = "'Inter',-apple-system,sans-serif";

export function PublicLinkScreen() {
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "copied" | "error">("loading");

  useEffect(() => {
    fetch("/api/board/share", { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        setToken(d.token);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, []);

  const publicUrl = token
    ? `${typeof window !== "undefined" ? window.location.origin : "https://tripcopilot.app"}/board/${token}`
    : "";

  async function handleCopy() {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setState("copied");
    setTimeout(() => setState("ready"), 3000);
  }

  async function handleShare() {
    if (!publicUrl) return;
    if (navigator.share) {
      await navigator.share({ title: "Mis vuelos — TripCopilot", url: publicUrl });
    } else {
      handleCopy();
    }
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        padding: "24px 20px 28px",
        fontFamily: MONO,
      }}
    >
      {/* Title */}
      <div style={{ fontSize: 9, color: T35, letterSpacing: "0.12em", marginBottom: 24 }}>
        TABLERO PÚBLICO · CUALQUIERA CON EL LINK LO VE
      </div>

      {/* Preview card */}
      <div
        style={{
          background: A08,
          border: `1px solid ${A18}`,
          borderRadius: 14,
          padding: "20px 18px",
          marginBottom: 24,
        }}
      >
        <div style={{ fontSize: 9, color: A60, letterSpacing: "0.1em", marginBottom: 12 }}>
          ◎ VISTA PÚBLICA
        </div>
        <div style={{ fontSize: 11, color: T35, lineHeight: 1.7 }}>
          Compartís un link con tu familia o amigos y ven en tiempo real:{" "}
          <span style={{ color: A60 }}>hora de salida, puerta, estado del vuelo.</span>
          {" "}Sin necesidad de cuenta. Se actualiza solo.
        </div>
      </div>

      {/* URL box */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 8, color: T18, letterSpacing: "0.1em", marginBottom: 8 }}>TU LINK</div>
        <div
          style={{
            background: "rgba(255,255,255,.03)",
            border: `1px solid ${T18}`,
            borderRadius: 8,
            padding: "12px 14px",
            fontSize: 10,
            color: state === "loading" || state === "error" ? T18 : A60,
            letterSpacing: "0.04em",
            wordBreak: "break-all",
            minHeight: 44,
            display: "flex",
            alignItems: "center",
          }}
        >
          {state === "loading" && "Generando link…"}
          {state === "error" && "Error al generar el link"}
          {(state === "ready" || state === "copied") && publicUrl}
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          onClick={handleShare}
          disabled={state === "loading" || state === "error"}
          style={{
            padding: "13px",
            cursor: state === "loading" ? "wait" : "pointer",
            background: A08,
            border: `1px solid ${A35}`,
            color: A,
            fontFamily: MONO,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.1em",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          ⬡ COMPARTIR LINK
        </button>

        <button
          onClick={handleCopy}
          disabled={state === "loading" || state === "error"}
          style={{
            padding: "13px",
            cursor: state === "loading" ? "wait" : "pointer",
            background: "transparent",
            border: `1px solid ${T18}`,
            color: state === "copied" ? A : T35,
            fontFamily: MONO,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.1em",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            transition: "color .2s",
          }}
        >
          {state === "copied" ? "✓ COPIADO" : "⊕ COPIAR LINK"}
        </button>
      </div>

      {/* Footer note */}
      <div
        style={{
          marginTop: "auto",
          paddingTop: 28,
          fontSize: 9,
          color: T18,
          letterSpacing: "0.06em",
          lineHeight: 1.8,
          textAlign: "center",
        }}
      >
        El link es permanente y siempre muestra tus vuelos actualizados.{"\n"}
        Solo vos podés desactivarlo.
      </div>
    </div>
  );
}
