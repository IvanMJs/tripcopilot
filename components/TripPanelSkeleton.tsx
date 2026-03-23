export function TripPanelSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="h-8 w-48 rounded-lg shimmer" />
      {/* Flight rows */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border border-white/[0.06] p-4 space-y-2 shimmer">
          <div className="flex items-center gap-3">
            <div className="h-4 w-16 rounded bg-white/[0.06]" />
            <div className="h-4 w-24 rounded bg-white/[0.04]" />
            <div className="ml-auto h-4 w-12 rounded bg-white/[0.04]" />
          </div>
          <div className="h-3 w-32 rounded bg-white/[0.03]" />
        </div>
      ))}
    </div>
  );
}
