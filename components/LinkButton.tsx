"use client";

import { ExternalLink } from "lucide-react";

export function LinkButton({
  href,
  children,
  variant = "default",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "default" | "blue" | "orange" | "green";
}) {
  const colors = {
    default: "border-white/8 bg-white/4 text-gray-300 hover:bg-white/8 hover:text-white",
    blue:    "border-blue-700/40 bg-blue-950/30 text-blue-400 hover:bg-blue-900/50 hover:text-blue-300",
    orange:  "border-orange-700/40 bg-orange-950/30 text-orange-400 hover:bg-orange-900/50 hover:text-orange-300",
    green:   "border-emerald-700/40 bg-emerald-950/30 text-emerald-400 hover:bg-emerald-900/50 hover:text-emerald-300",
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open ${children} in a new tab`}
      title={`${children} link`}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${colors[variant]}`}
    >
      {children}
      <ExternalLink className="h-3 w-3 shrink-0" />
    </a>
  );
}