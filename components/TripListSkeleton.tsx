export function TripListSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-5 w-24 rounded-lg bg-white/[0.08]" />
          <div className="h-3 w-48 rounded bg-white/[0.05]" />
        </div>
        <div className="h-9 w-20 rounded-xl bg-white/[0.07]" />
      </div>

      {/* Trip card placeholders */}
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-white/[0.07] overflow-hidden"
          style={{ background: "linear-gradient(150deg, rgba(14,14,24,0.97) 0%, rgba(9,9,18,0.99) 100%)" }}
        >
          <div className="flex items-center gap-2 pr-3 px-4 py-4">
            <div className="flex-1 min-w-0 space-y-2">
              {/* Trip name + risk badge */}
              <div className="flex items-center gap-2">
                <div className="h-4 w-32 rounded-md bg-white/[0.08]" />
                <div className="h-3 w-14 rounded-md bg-white/[0.05]" />
              </div>
              {/* Route label */}
              <div className="h-3 w-40 rounded bg-white/[0.05]" />
              {/* Flight count + next flight */}
              <div className="flex items-center gap-3">
                <div className="h-3 w-16 rounded bg-white/[0.05]" />
                <div className="h-3 w-20 rounded bg-white/[0.04]" />
              </div>
            </div>
            <div className="h-4 w-4 rounded bg-white/[0.05] shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}
