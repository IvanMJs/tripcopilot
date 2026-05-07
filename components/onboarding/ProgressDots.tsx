"use client";

import { motion } from "framer-motion";

interface ProgressDotsProps {
  total: number;
  current: number;
}

export function ProgressDots({ total, current }: ProgressDotsProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <motion.div
          key={i}
          layout
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
          style={{
            width: i === current ? 22 : 7,
            height: 7,
            borderRadius: 9999,
            backgroundColor:
              i === current ? "#FFB800" : "rgba(255,255,255,0.18)",
          }}
        />
      ))}
    </div>
  );
}
