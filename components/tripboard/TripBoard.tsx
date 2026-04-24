"use client";

import { useState, useEffect } from "react";
import { useBoardFlights } from "@/hooks/useBoardFlights";
import { BoardScreen } from "./BoardScreen";
import { ShareCard } from "./ShareCard";
import { BottomNav } from "./BottomNav";
import { LandscapeBoard } from "./LandscapeBoard";

const MONO = "'JetBrains Mono','Courier New',monospace";

type Screen = "board" | "share";

export function TripBoard() {
  const { flights, loading } = useBoardFlights();
  const [screen, setScreen] = useState<Screen>("board");
  const [litId, setLitId] = useState<string | null>(null);
  const [isLandscape, setIsLandscape] = useState(false);

  // Detect orientation
  useEffect(() => {
    const mq = window.matchMedia("(orientation: landscape) and (min-width: 600px)");
    const update = (e: MediaQueryListEvent | MediaQueryList) => setIsLandscape(e.matches);
    update(mq);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Highlight newly-updated flights from websocket / FA webhook
  useEffect(() => {
    if (flights.length === 0) return;
    const boarding = flights.find((f) => f.status === "boarding");
    if (boarding) {
      setLitId(boarding.id);
      const t = setTimeout(() => setLitId(null), 4000);
      return () => clearTimeout(t);
    }
  }, [flights]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          fontFamily: MONO,
          fontSize: 10,
          color: "rgba(255,184,0,.4)",
          letterSpacing: "0.15em",
        }}
      >
        CARGANDO VUELOS…
      </div>
    );
  }

  // Landscape: full departure-board layout
  if (isLandscape) {
    return <LandscapeBoard flights={flights} />;
  }

  // Portrait: phone-first with bottom nav
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#07070d",
        overflow: "hidden",
      }}
    >
      {screen === "board" && (
        <BoardScreen
          flights={flights}
          litId={litId}
          onShare={() => setScreen("share")}
        />
      )}
      {screen === "share" && <ShareCard flights={flights} />}

      <BottomNav active={screen} onChange={setScreen} />
    </div>
  );
}
