"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface SplitFlapCharProps {
  char: string;
  sz?: number;
}

export function SplitFlapChar({ char, sz }: SplitFlapCharProps) {
  const size = sz ?? 29;
  const [shown, setShown] = useState(char);
  const elRef = useRef<HTMLSpanElement>(null);
  const busyRef = useRef(false);
  const qRef = useRef<string[]>([]);
  const curRef = useRef(char);

  const flush = useCallback(() => {
    if (busyRef.current || qRef.current.length === 0) return;
    const next = qRef.current.shift()!;
    if (next === curRef.current) {
      flush();
      return;
    }
    busyRef.current = true;

    if (elRef.current && typeof elRef.current.animate === "function") {
      elRef.current.animate(
        [
          { transform: "perspective(280px) rotateX(0deg)", opacity: 1 },
          { transform: "perspective(280px) rotateX(88deg)", opacity: 0.2, offset: 0.44 },
          { transform: "perspective(280px) rotateX(-88deg)", opacity: 0.2, offset: 0.56 },
          { transform: "perspective(280px) rotateX(0deg)", opacity: 1 },
        ],
        { duration: 300, easing: "ease-in-out" },
      );
    }

    setTimeout(() => {
      curRef.current = next;
      setShown(next);
    }, 148);

    setTimeout(() => {
      busyRef.current = false;
      flush();
    }, 310);
  }, []);

  useEffect(() => {
    if (char !== curRef.current) {
      qRef.current.push(char);
      flush();
    }
  }, [char, flush]);

  const isColon = char === ":";
  const isSpace = char === " ";

  if (isSpace) {
    return (
      <span
        style={{
          display: "inline-block",
          width: size * 0.32,
          height: size * 1.3,
        }}
      />
    );
  }

  return (
    <span
      ref={elRef}
      className={isColon ? "" : "flap-tile"}
      style={{
        display: "inline-block",
        minWidth: isColon ? `${size * 0.26}px` : `${size * 0.62}px`,
        textAlign: "center",
        fontFamily: "'JetBrains Mono','Courier New',monospace",
        fontSize: size,
        fontWeight: 700,
        color: "#FFB800",
        lineHeight: 1.28,
        verticalAlign: "top",
        background: isColon ? "transparent" : "#171719",
        borderRadius: isColon ? 0 : 3,
        padding: isColon ? "0 1px" : "0 2px",
        margin: "0 1.5px",
        boxShadow: isColon
          ? "none"
          : "0 2px 8px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.04)",
        position: "relative",
      }}
    >
      {shown}
    </span>
  );
}
