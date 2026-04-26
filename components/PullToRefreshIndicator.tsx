"use client";

interface PullToRefreshIndicatorProps {
  isPulling: boolean;
  pullProgress: number;
  isRefreshing: boolean;
}

const SIZE = 40;
const STROKE = 3;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function PullToRefreshIndicator({
  isPulling,
  pullProgress,
  isRefreshing,
}: PullToRefreshIndicatorProps) {
  const visible = isPulling || isRefreshing;

  if (!visible) return null;

  const dashOffset = CIRCUMFERENCE * (1 - pullProgress);

  return (
    <div
      className="fixed top-4 left-1/2 z-50 -translate-x-1/2 flex items-center justify-center"
      style={{ width: SIZE, height: SIZE }}
      aria-hidden="true"
    >
      {/* Background circle */}
      <div 
        className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-300 to-blue-500 opacity-60 animate-pulse border border-white/10 backdrop-blur-sm shadow-lg" // Added gradient and pulse effect
      />

      {/* SVG arc / spinner */}
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="absolute inset-0"
        style={isRefreshing ? { animation: "spin 0.9s linear infinite" } : undefined}
      >
        {/* Track */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={STROKE}
        />
        {/* Progress arc */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={pullProgress >= 1 || isRefreshing ? "#3b82f6" : "#6b7280"}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={isRefreshing ? CIRCUMFERENCE * 0.25 : dashOffset}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          style={{ transition: isRefreshing ? "none" : "stroke-dashoffset 0.05s linear, stroke 0.15s ease" }}
        />
      </svg>

      {/* Center icon */}
      <svg
        width={14}
        height={14}
        viewBox="0 0 24 24"
        fill="none"
        stroke={pullProgress >= 1 || isRefreshing ? "#3b82f6" : "#6b7280"}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="relative z-10"
        aria-label="Refresh" // Added aria-label for accessibility
        style={{ transition: "stroke 0.15s ease", transform: isPulling ? `rotate(${pullProgress * 180}deg)` : undefined }}
      >
        {/* RefreshCw icon paths */}
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
      </svg>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}