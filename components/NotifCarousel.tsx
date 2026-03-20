"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// Silence SSR completely — renders a height-preserving placeholder on the server
// and mounts the real carousel only after client hydration.
function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

interface Props {
  screenshots: { src: string; label: string }[];
}

const AUTOPLAY_MS = 3200;
const STACK = 4;

export function NotifCarousel({ screenshots }: Props) {
  const mounted = useMounted();
  const [index, setIndex]           = useState(0);
  const [exitState, setExitState]   = useState<{ dir: "left" | "right" } | null>(null);
  const [dragX, setDragX]           = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const startX   = useRef<number | null>(null);
  const hovered  = useRef(false);
  const busy     = exitState !== null;
  const total    = screenshots.length;

  // Keep latest values in refs for callbacks that outlive renders
  const busyRef  = useRef(busy);
  const totalRef = useRef(total);
  busyRef.current  = busy;
  totalRef.current = total;

  // ── Advance (triggers exit animation) ────────────────────────────────────
  const doAdvance = useCallback((dir: "left" | "right") => {
    if (busyRef.current) return;
    setExitState({ dir });
    setTimeout(() => {
      setIndex((i) =>
        dir === "left"
          ? (i + 1) % totalRef.current
          : (i - 1 + totalRef.current) % totalRef.current,
      );
      setExitState(null);
    }, 430);
  }, []);

  const doAdvanceRef = useRef(doAdvance);
  doAdvanceRef.current = doAdvance;

  // ── Autoplay ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => {
      if (!hovered.current) doAdvanceRef.current("left");
    }, AUTOPLAY_MS);
    return () => clearInterval(t);
  }, []);

  // ── Drag helpers ──────────────────────────────────────────────────────────
  function dragStart(x: number) {
    if (busy) return;
    startX.current = x;
    setIsDragging(true);
  }

  function dragMove(x: number) {
    if (startX.current === null) return;
    setDragX(x - startX.current);
  }

  function dragEnd(x: number) {
    if (startX.current === null) return;
    const d = x - startX.current;
    startX.current = null;
    setIsDragging(false);
    setDragX(0);
    if (Math.abs(d) > 50) doAdvanceRef.current(d < 0 ? "left" : "right");
  }

  function dragCancel() {
    startX.current = null;
    setIsDragging(false);
    setDragX(0);
  }

  const dragProgress = Math.min(Math.abs(dragX) / 180, 1);

  const cards = Array.from({ length: Math.min(STACK, total) }, (_, s) => ({
    dataIndex: (index + s) % total,
    s,
  }));

  // Server renders a height-preserving empty shell; carousel mounts only on client
  if (!mounted) {
    return (
      <div style={{ width: "min(260px, 72vw)", height: "min(500px, 138vw)", margin: "0 auto" }} />
    );
  }

  return (
    <div
      className="select-none flex flex-col items-center gap-5"
      onMouseEnter={() => { hovered.current = true; }}
      onMouseLeave={() => { hovered.current = false; dragCancel(); }}
    >
      {/* ── Stack ───────────────────────────────────────────────────────── */}
      <div
        style={{
          width: "min(260px, 72vw)",
          height: "min(500px, 138vw)",
          position: "relative",
          touchAction: "none",
          cursor: busy ? "default" : isDragging ? "grabbing" : "grab",
        }}
        /* Mouse */
        onMouseDown={(e) => dragStart(e.clientX)}
        onMouseMove={(e) => isDragging && dragMove(e.clientX)}
        onMouseUp={(e) => dragEnd(e.clientX)}
        /* Touch */
        onTouchStart={(e) => dragStart(e.touches[0].clientX)}
        onTouchMove={(e) => dragMove(e.touches[0].clientX)}
        onTouchEnd={(e) => dragEnd(e.changedTouches[0].clientX)}
        onTouchCancel={dragCancel}
      >
        {[...cards].reverse().map(({ dataIndex, s }) => {
          const isFront = s === 0;

          let tx = 0, ty = 0, rot = 0, sc = 1, op = 1;
          let tr = "transform 0.5s cubic-bezier(.22,.68,0,1.2), opacity 0.5s";

          if (isFront) {
            if (exitState) {
              const fx = exitState.dir === "left" ? -520 : 520;
              tx = fx; ty = -40;
              rot = exitState.dir === "left" ? -25 : 25;
              sc = 0.8; op = 0;
              tr = "transform 0.42s cubic-bezier(.6,0,.9,.5), opacity 0.32s ease";
            } else if (isDragging) {
              tx = dragX; rot = dragX * 0.06; tr = "none";
            }
          } else {
            const targetS = exitState ? s - 1 : s;
            const baseY   = targetS * 16;
            const baseRot = targetS === 0 ? 0 : targetS % 2 === 0 ? targetS * 3 : -(targetS * 3);
            const baseSc  = 1 - targetS * 0.055;
            const ease    = isDragging && !exitState ? dragProgress * 0.28 : 0;
            ty  = baseY   * (1 - ease);
            rot = baseRot * (1 - ease);
            sc  = baseSc  + (1 - baseSc) * ease;
            tr  = isDragging && !exitState ? "none" : "transform 0.5s cubic-bezier(.22,.68,0,1.2)";
            op  = 1 - targetS * 0.05;
          }

          return (
            <div
              key={dataIndex}
              style={{
                position: "absolute", inset: 0,
                borderRadius: 28, overflow: "hidden",
                zIndex: isFront ? 20 : 10 - s,
                pointerEvents: "none",
                transform: `translateX(${tx}px) translateY(${ty}px) rotate(${rot}deg) scale(${sc})`,
                transformOrigin: "bottom center",
                transition: tr, opacity: op,
                boxShadow: isFront && !exitState
                  ? "0 28px 72px rgba(0,0,0,0.72), 0 0 0 1.5px rgba(59,130,246,0.22)"
                  : `0 ${8 + s * 4}px ${24 + s * 10}px rgba(0,0,0,0.48)`,
                willChange: "transform, opacity",
              }}
            >
              <img
                src={screenshots[dataIndex].src}
                alt={screenshots[dataIndex].label}
                draggable={false}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
              {isFront && !exitState && (
                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0,
                  padding: "14px 18px", textAlign: "center",
                  background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, transparent 100%)",
                }}>
                  <p style={{ color: "#fff", fontSize: 12, fontWeight: 700, margin: 0 }}>
                    {screenshots[dataIndex].label}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Dots ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 2 }}>
        {screenshots.map((s, i) => (
          <button
            key={i}
            onClick={() => !busy && setIndex(i)}
            aria-label={s.label}
            style={{
              background: "transparent", border: "none",
              padding: "10px 4px", cursor: "pointer",
              WebkitAppearance: "none", appearance: "none",
              display: "flex", alignItems: "center",
            }}
          >
            <span style={{
              display: "block", borderRadius: 999,
              height: 6, width: i === index ? 20 : 6,
              background: i === index ? "#3b82f6" : "rgba(255,255,255,0.18)",
              transition: "all 0.35s ease", flexShrink: 0,
            }} />
          </button>
        ))}
      </div>
    </div>
  );
}
