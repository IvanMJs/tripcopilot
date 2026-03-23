"use client";

import { WifiOff } from "lucide-react";

interface OfflineBannerProps {
  isOnline: boolean;
}

export function OfflineBanner({ isOnline }: OfflineBannerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`overflow-hidden transition-all duration-300 ease-in-out ${
        isOnline ? "max-h-0 opacity-0" : "max-h-16 opacity-100"
      }`}
    >
      <div className="flex items-center gap-2 bg-amber-950/80 border-b border-amber-700/50 px-4 py-2.5 backdrop-blur-sm">
        <WifiOff className="h-3.5 w-3.5 shrink-0 text-amber-400" />
        <p className="text-xs font-semibold text-amber-300">
          Sin conexion — mostrando datos en cache
        </p>
      </div>
    </div>
  );
}
