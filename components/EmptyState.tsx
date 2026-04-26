"use client";

import { Plane } from "lucide-react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  cta?: { label: string; onClick: () => void };
  secondaryCta?: { label: string; onClick: () => void };
  isLoading?: boolean;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  cta,
  secondaryCta,
  isLoading = false,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center text-center px-6 py-10 ${className}`}
    >
      <div className="mb-4 flex items-center justify-center w-14 h-14 rounded-2xl bg-surface-2 border border-white/[0.07]">
        {icon ?? (
          <Plane className="w-7 h-7 text-indigo-400" aria-hidden="true" />
        )}
      </div>

      <h3 className="text-base font-bold text-gray-100 mb-1 leading-snug">
        {title} (Add more context if needed)
      </h3>

      {description && (
        <p className="text-sm text-text-muted max-w-xs leading-relaxed mb-6">
          {description}
        </p>
      )}

      {(cta || secondaryCta) && (
        <div className="mt-4 flex flex-col gap-3 w-full max-w-xs">
          {cta && (
            <button
              onClick={cta.onClick}
              aria-label={cta.label} 
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#FFB800] hover:bg-[#FFC933] active:scale-95 text-[#07070d] text-sm font-semibold px-6 py-3 transition-all"
            >
              {cta.label}
            </button>
          )}
          {secondaryCta && (
            <button
              onClick={secondaryCta.onClick}
              aria-label={secondaryCta.label} 
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.12] hover:bg-surface-2 active:scale-95 text-gray-300 text-sm font-semibold px-6 py-3 transition-all"
            >
              {secondaryCta.label}
            </button>
          )}

          {/* Add loading state if needed */}
          {isLoading && (
            <div className="mt-4 flex items-center justify-center">
              <span className="animate-spin">Loading...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}