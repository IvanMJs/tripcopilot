export function FlightCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border-2 border-white/[0.06] overflow-hidden">
      {/* Section 1: Airport */}
      <div className="px-4 py-3 bg-white/[0.02] space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 flex-1">
            <div className="h-3 w-20 rounded bg-white/[0.07]" />
            <div className="flex items-baseline gap-2">
              <div className="h-8 w-16 rounded-md bg-white/[0.08]" />
              <div className="h-4 w-24 rounded bg-white/[0.05]" />
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="h-7 w-16 rounded-lg bg-white/[0.06]" />
            <div className="h-6 w-24 rounded-lg bg-white/[0.05]" />
          </div>
        </div>
      </div>

      {/* Section 2: Route */}
      <div className="px-4 py-3 border-t border-white/5 space-y-2">
        <div className="h-3 w-14 rounded bg-white/[0.06]" />
        <div className="flex items-center gap-2">
          <div className="h-4 w-10 rounded bg-white/[0.08]" />
          <div className="h-3 w-3 rounded bg-white/[0.05]" />
          <div className="h-4 w-10 rounded bg-white/[0.06]" />
          <div className="h-3 w-32 rounded bg-white/[0.04]" />
        </div>
      </div>

      {/* Section 3: Flight details */}
      <div className="px-4 py-3 border-t border-white/5 bg-white/[0.01] space-y-2">
        <div className="h-3 w-16 rounded bg-white/[0.06]" />
        <div className="flex items-center gap-3 flex-wrap">
          <div className="h-5 w-12 rounded-md bg-white/[0.07]" />
          <div className="h-5 w-16 rounded-full bg-white/[0.05]" />
          <div className="h-4 w-14 rounded bg-white/[0.07]" />
          <div className="h-3 w-28 rounded bg-white/[0.04]" />
        </div>
        <div className="flex items-center gap-4">
          <div className="h-3 w-32 rounded bg-white/[0.05]" />
          <div className="h-3 w-28 rounded bg-white/[0.04]" />
        </div>
      </div>

      {/* Section: bottom strip */}
      <div className="px-4 py-3 border-t border-white/5">
        <div className="h-3 w-24 rounded bg-white/[0.05]" />
      </div>
    </div>
  );
}
