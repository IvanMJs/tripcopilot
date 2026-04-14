"use client";

export function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse" aria-hidden="true">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.02] h-32"
          style={{ opacity: 1 - (i - 1) * 0.2 }}
        />
      ))}
    </div>
  );
}
