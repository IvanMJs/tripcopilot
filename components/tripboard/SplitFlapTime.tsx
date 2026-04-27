"use client";

import { SplitFlapChar } from "./SplitFlapChar";
import type { SplitFlapCharProps } from "./SplitFlapChar";

export interface SplitFlapTimeProps {
  time: string;
  sz?: number;
}

export function SplitFlapTime({ time, sz }: SplitFlapTimeProps) {
  return (
    <span style={{ display: "inline-flex", alignItems: "flex-start" }}>
      {(time || "").split("").map((c, i) => (
        <SplitFlapChar key={i} char={c} sz={sz} />
      ))}
    </span>
  );
}