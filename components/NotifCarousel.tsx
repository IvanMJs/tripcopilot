"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Props {
  screenshots: { src: string; label: string }[];
}

const AUTOPLAY_MS = 3200;
const STACK = 4; // how many cards visible in stack

export function NotifCarousel({ screenshots }: Props) {
  const [index, setIndex] = useState(0);
  // exitState: the card flying out right now (dir tells which way)
  const [exitState, setExitState] = useState<{ dir: "left" | "right" } | null>(null);
  const [dragX, setDragX] = useState(0);

  const startX    = useRef<number | null>(null);
  const dragging  = useRef(false);
  const hovered   = useRef(false);
  const busy      = exitState !== null;
  const total     = screenshots.length;

  // ── Advance ──────────────────────────────────────────────────────────────
  const doAdvance = useCallback(
    (dir: "left" | "right") => {
      if (busy) return;
      setExitState({ dir });
      setTimeout(() => {
        setIndex((i) =>
          dir === "left" ? (i + 1) % total : (i - 1 + total) % total,
        );
        setExitState(null);
      }, 430);
    },
    [busy, total],
  );

  // ── Autoplay ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => {
      if (!hovered.current && !dragging.current) doAdvance("left");
    }, AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [doAdvance]);

  // ── Pointer handlers ──────────────────────────────────────────────────────
  function pDown(x: number) {
    if (busy) return;
    startX.current = x;
    dragging.current = true;
  }
  function pMove(x: number) {
    if (!dragging.current || startX.current === null) return;
    setDragX(x - startX.current);
  }
  function pUp(x: number) {
    if (!dragging.current || startX.current === null) return;
    const d = x - startX.current;
    dragging.current = false;
    startX.current = null;
    setDragX(0);
    if (Math.abs(d) > 50) doAdvance(d < 0 ? "left" : "right");
  }
  function pCancel() {
    dragging.current = false;
    startX.current = null;
    setDragX(0);
  }

  const isDragging   = dragging.current;
  const dragProgress = Math.min(Math.abs(dragX) / 180, 1);

  // Build card list: front first
  const cards = Array.from({ length: Math.min(STACK, total) }, (_, s) => ({
    dataIndex: (index + s) % total,
    s,
  }));

  return (
    <div
      className="select-none flex flex-col items-center gap-5"
      onMouseEnter={() => { hovered.current = true; }}
      onMouseLeave={() => { hovered.current = false; pCancel(); }}
    >
      {/* ── Stack ───────────────────────────────────────────────────────── */}
      <div
        style={{
          width: "min(260px, 72vw)",
          height: "min(500px, 138vw)",
          position: "relative",
          touchAction: "none",
        }}
        onMouseDown={(e) => pDown(e.clientX)}
        onMouseMove={(e) => pMove(e.clientX)}
        onMouseUp={(e)   => pUp(e.clientX)}
        onTouchStart={(e) => { e.preventDefault(); pDown(e.touches[0].clientX); }}
        onTouchMove={(e)  => { e.preventDefault(); pMove(e.touches[0].clientX); }}
        onTouchEnd={(e)   => pUp(e.changedTouches[0].clientX)}
        onTouchCancel={pCancel}
      >
        {/* Render back → front so front card is on top */}
        {[...cards].reverse().map(({ dataIndex, s }) => {
          const isFront = s === 0;

          // ── Compute transform for this card ──────────────────────────
          let tx = 0, ty = 0, rot = 0, sc = 1, op = 1;
          let tr = "transform 0.5s cubic-bezier(.22,.68,0,1.2), opacity 0.5s";

          if (isFront) {
            if (exitState) {
              // Front card flies out
              const fx = exitState.dir === "left" ? -520 : 520;
              tx  = fx;
              ty  = -40;
              rot = exitState.dir === "left" ? -25 : 25;
              sc  = 0.8;
              op  = 0;
              tr  = "transform 0.42s cubic-bezier(.6,0,.9,.5), opacity 0.32s ease";
            } else if (isDragging) {
              // Follows finger in real-time
              tx  = dragX;
              rot = dragX * 0.06;
              tr  = "none";
            }
            // else: resting at 0,0 scale(1)
          } else {
            // Cards behind — stack position during normal/exit/drag
            // During exit: advance (targetS = s - 1), during drag: ease forward
            const targetS = exitState ? s - 1 : s;
            const baseY   = targetS * 16;
            const baseRot = targetS === 0
              ? 0
              : targetS % 2 === 0 ? targetS * 3 : -(targetS * 3);
            const baseSc  = 1 - targetS * 0.055;

            const ease    = isDragging && !exitState ? dragProgress * 0.28 : 0;
            ty  = baseY  * (1 - ease);
            rot = baseRot * (1 - ease);
            sc  = baseSc + (1 - baseSc) * ease;
            tr  = isDragging && !exitState
              ? "none"
              : "transform 0.5s cubic-bezier(.22,.68,0,1.2)";
            op  = 1 - targetS * 0.05;
          }

          return (
            <div
              key={dataIndex}
              style={{
                position: "absolute", inset: 0,
                borderRadius: 28, overflow: "hidden",
                zIndex: isFront ? 20 : 10 - s,
                cursor: isFront && !exitState ? "grab" : "default",
                transform: `translateX(${tx}px) translateY(${ty}px) rotate(${rot}deg) scale(${sc})`,
                transformOrigin: "bottom center",
                transition: tr,
                opacity: op,
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

              {/* Label on front card */}
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
              transition: "all 0.35s ease",
              flexShrink: 0,
            }} />
          </button>
        ))}
      </div>
    </div>
  );
}
