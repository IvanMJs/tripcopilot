import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      colors: {
        // Deep dark backgrounds inspired by Linear/Vercel/Stripe
        surface: {
          DEFAULT: "#0f0f17",
          deep:    "#080810",
          raised:  "#14141e",
        },
        // Design token bridge — maps CSS variables to Tailwind utilities
        primary:          "rgb(var(--color-primary) / <alpha-value>)",
        "text-secondary": "rgb(var(--tw-text-secondary) / 0.6)",
        "text-muted":     "rgb(var(--tw-text-muted) / 0.4)",
        "surface-1":      "rgb(var(--tw-surface-1) / 0.03)",
        "surface-2":      "rgb(var(--tw-surface-2) / 0.05)",
        "surface-3":      "rgb(var(--tw-surface-3) / 0.08)",
        "border-subtle":  "rgb(var(--tw-border-subtle) / 0.05)",
        "border-default": "rgb(var(--tw-border-default) / 0.08)",
        "border-strong":  "rgb(var(--tw-border-strong) / 0.15)",
        // Surface palette — matches CSS variables in globals.css
        "surface-darker":   "rgb(var(--surface-darker) / <alpha-value>)",
        "surface-card":     "rgb(var(--surface-card) / <alpha-value>)",
        "surface-input":    "rgb(var(--surface-input) / <alpha-value>)",
        "surface-elevated": "rgb(var(--surface-elevated) / <alpha-value>)",
        "surface-overlay":  "rgb(var(--surface-overlay) / <alpha-value>)",
      },
      animation: {
        // Existing
        "pulse-slow":      "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "highlight-flash": "highlight-flash 4s ease-out",
        "fade-in-up":      "fade-in-up 0.35s ease-out both",
        // New
        "slide-up":        "slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) both",
        "scale-in":        "scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) both",
        "slide-in-right":  "slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1) both",
        "risk-draw":       "risk-draw 1s cubic-bezier(0.4, 0, 0.2, 1) 0.2s both",
        "shimmer":         "shimmer 2s linear infinite",
        "fade-in":         "fade-in 0.3s ease-out both",
      },
      keyframes: {
        "highlight-flash": {
          "0%":   { boxShadow: "0 0 0 0 rgba(59, 130, 246, 0.7), 0 0 20px rgba(59, 130, 246, 0.5)" },
          "30%":  { boxShadow: "0 0 0 4px rgba(59, 130, 246, 0.4), 0 0 30px rgba(59, 130, 246, 0.3)" },
          "100%": { boxShadow: "0 0 0 0 rgba(59, 130, 246, 0), 0 0 0 rgba(59, 130, 246, 0)" },
        },
        "fade-in-up": {
          "0%":   { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          "0%":   { opacity: "0", transform: "translateY(8px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "scale-in": {
          "0%":   { opacity: "0", transform: "scale(0.94)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-right": {
          "0%":   { opacity: "0", transform: "translateX(12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "risk-draw": {
          "0%":   { strokeDasharray: "0 400" },
          "100%": { strokeDasharray: "var(--risk-progress) 400" },
        },
        "shimmer": {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "radarPulse": {
          "0%":   { transform: "scale(1)",   opacity: "0.6" },
          "80%":  { transform: "scale(3.2)", opacity: "0"   },
          "100%": { transform: "scale(3.2)", opacity: "0"   },
        },
        "radarSweep": {
          "0%,100%": { opacity: "0.35", transform: "scale(0.95)" },
          "50%":     { opacity: "0.65", transform: "scale(1.05)" },
        },
        "shimmerOnce": {
          "0%":   { transform: "translateX(-100%)", opacity: "0" },
          "15%":  { opacity: "1" },
          "85%":  { opacity: "1" },
          "100%": { transform: "translateX(220%)",  opacity: "0" },
        },
        "fade-in": {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      boxShadow: {
        "glow-blue":   "0 0 0 1px rgba(59,130,246,0.25), 0 0 24px rgba(59,130,246,0.1)",
        "glow-green":  "0 0 0 1px rgba(34,197,94,0.2),  0 0 24px rgba(34,197,94,0.08)",
        "glow-orange": "0 0 0 1px rgba(249,115,22,0.2), 0 0 24px rgba(249,115,22,0.08)",
        "glow-red":    "0 0 0 1px rgba(239,68,68,0.25), 0 0 24px rgba(239,68,68,0.1)",
        "card":        "0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.2)",
        "card-hover":  "0 2px 8px rgba(0,0,0,0.5), 0 8px 32px rgba(0,0,0,0.3)",
        "modal":       "0 8px 32px rgba(0,0,0,0.6), 0 32px 64px rgba(0,0,0,0.4)",
      },
    },
  },
  plugins: [],
};
export default config;
