export function TripPanelSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {/* Header bar */}
      <div className="h-8 w-48 rounded-lg bg-white/[0.06]" />
      {/* Flight rows */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-4 w-16 rounded bg-white/[0.08]" />
            <div className="h-4 w-24 rounded bg-white/[0.06]" />
            <div className="ml-auto h-4 w-12 rounded bg-white/[0.06]" />
          </div>
          <div className="h-3 w-32 rounded bg-white/[0.05]" />
        </div>
      ))}
    </div>
  );
}
