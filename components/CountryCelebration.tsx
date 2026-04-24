"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface CountryCelebrationProps {
  country: string;
  flag: string;
  totalCountries: number;
  locale: "es" | "en";
  onDone: () => void;
}

interface Particle {
  angle: number;
  distance: number;
  color: string;
  shape: "circle" | "square";
}

const COLORS = ["#7c3aed", "#f59e0b", "#22c55e", "#ec4899", "#a78bfa", "#fbbf24"];

function buildParticles(): Particle[] {
  return Array.from({ length: 16 }, (_, i) => {
    const angle = (i / 16) * 2 * Math.PI + (Math.random() - 0.5) * 0.4;
    const distance = 80 + Math.random() * 100;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const shape = i % 3 === 0 ? "square" : "circle";
    return { angle, distance, color, shape };
  });
}

export function CountryCelebration({
  country,
  flag,
  totalCountries,
  locale,
  onDone,
}: CountryCelebrationProps) {
  const particlesRef = useRef<Particle[]>(buildParticles());

  useEffect(() => {
    const timer = setTimeout(onDone, 2500);
    return () => clearTimeout(timer);
  }, [onDone]);

  const statLine =
    locale === "es"
      ? `¡Ya visitaste ${totalCountries} países! 🌍`
      : `You've visited ${totalCountries} countries! 🌍`;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center pointer-events-none">
      {/* Confetti particles */}
      {particlesRef.current.map((p, i) => {
        const x = Math.cos(p.angle) * p.distance;
        const y = Math.sin(p.angle) * p.distance;
        const size = p.shape === "circle" ? 8 : 6;
        return (
          <motion.div
            key={i}
            initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
            animate={{ x, y, opacity: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.15, ease: "easeOut" }}
            style={{
              position: "absolute",
              width: size,
              height: size,
              backgroundColor: p.color,
              borderRadius: p.shape === "circle" ? "50%" : 2,
            }}
          />
        );
      })}

      {/* Center card — pointer-events-auto so it's tappable if needed */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 22 }}
        onAnimationComplete={() => {
          // schedule exit animation after 2000 ms
        }}
        className="pointer-events-auto relative rounded-2xl px-8 py-6 text-center"
        style={{
          background: "linear-gradient(135deg,#fdf8f0 0%,#f5ede0 50%,#faf4ec 100%)",
          border: "2px dashed #7c3aed",
          boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
          maxWidth: 280,
        }}
      >
        <motion.div
          initial={{ scale: 1, opacity: 1 }}
          animate={{ scale: 0.8, opacity: 0 }}
          transition={{ delay: 2.0, duration: 0.35, ease: "easeIn" }}
        >
          <p className="text-6xl leading-none mb-3" role="img" aria-label={country}>
            {flag}
          </p>
          <p className="text-xl font-black text-gray-800 mb-1">{country}</p>
          <p className="text-sm text-[#FFB800] font-semibold">{statLine}</p>
        </motion.div>
      </motion.div>
    </div>
  );
}
