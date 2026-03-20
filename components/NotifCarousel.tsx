"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  screenshots: { src: string; label: string }[];
}

const AUTOPLAY_MS = 3200;

export function NotifCarousel({ screenshots }: Props) {
  const [index, setIndex] = useState(0);
  const total = screenshots.length;
  const paused = useRef(false);
  const startX = useRef<number | null>(null);

  useEffect(() => {
    const t = setInterval(() => {
      if (!paused.current) setIndex((i) => (i + 1) % total);
    }, AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [total]);

  function handleStart(x: number) {
    console.log("[NotifCarousel] handleStart x=", x);
    startX.current = x;
  }

  function handleEnd(x: number) {
    console.log("[NotifCarousel] handleEnd x=", x, "startX=", startX.current);
    if (startX.current === null) return;
    const d = x - startX.current;
    startX.current = null;
    console.log("[NotifCarousel] delta=", d);
    if (Math.abs(d) > 50) advance(d < 0 ? "left" : "right");
    else advance("left");
  }

  function advance(dir: "left" | "right") {
    console.log("[NotifCarousel] advance", dir);
    setIndex((i) => dir === "left" ? (i + 1) % total : (i - 1 + total) % total);
  }

  function onTouchStart(e: React.TouchEvent) { handleStart(e.touches[0].clientX); }
  function onTouchEnd(e: React.TouchEvent)   { handleEnd(e.changedTouches[0].clientX); }
  function onMouseDown(e: React.MouseEvent)  { handleStart(e.clientX); }
  function onMouseUp(e: React.MouseEvent)    { handleEnd(e.clientX); }

  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, userSelect: "none" }}
      onMouseEnter={() => { paused.current = true; }}
      onMouseLeave={() => { paused.current = false; }}
    >
      {/* Stack */}
      <div
        style={{
          width: "min(260px, 72vw)",
          height: "min(500px, 138vw)",
          position: "relative",
          touchAction: "pan-y",
        cursor: "grab",
        }}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseLeave={() => { startX.current = null; }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {screenshots.map((shot, i) => {
          const offset = (i - index + total) % total;
          const visible = offset < 4;

          if (!visible) return null;

          const ty    = offset * 16;
          const rot   = offset === 0 ? 0 : offset % 2 === 0 ? offset * 3 : -(offset * 3);
          const sc    = 1 - offset * 0.055;
          const op    = 1 - offset * 0.05;
          const zIdx  = offset === 0 ? 20 : 10 - offset;
          const shadow = offset === 0
            ? "0 28px 72px rgba(0,0,0,0.72), 0 0 0 1.5px rgba(59,130,246,0.22)"
            : `0 ${8 + offset * 4}px ${24 + offset * 10}px rgba(0,0,0,0.48)`;

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 28,
                overflow: "hidden",
                zIndex: zIdx,
                transform: `translateY(${ty}px) rotate(${rot}deg) scale(${sc})`,
                transformOrigin: "bottom center",
                transition: "transform 0.5s cubic-bezier(.22,.68,0,1.2), opacity 0.5s",
                opacity: op,
                boxShadow: shadow,
                willChange: "transform, opacity",
              }}
            >
              <img
                src={shot.src}
                alt={shot.label}
                draggable={false}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
              {offset === 0 && (
                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0,
                  padding: "14px 18px", textAlign: "center",
                  background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, transparent 100%)",
                }}>
                  <p style={{ color: "#fff", fontSize: 12, fontWeight: 700, margin: 0 }}>
                    {shot.label}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Dots */}
      <div style={{ display: "flex", gap: 2 }}>
        {screenshots.map((s, i) => (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); setIndex(i); }}
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
