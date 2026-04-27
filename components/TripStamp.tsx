export interface TripStampProps {
  destinationCode: string;
  destinationName: string | null;
  monthLabel: string;
  year: number | string;
  reactions?: Array<{ emoji: string; count: number }>;
}

export function TripStamp({
  destinationCode,
  destinationName,
  monthLabel,
  year,
  reactions,
}: TripStampProps) {
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-dashed border-white/[0.15] p-3 flex flex-col gap-1 min-h-[110px]"
      style={{
        background:
          "linear-gradient(135deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.01) 100%)",
      }}
      aria-label="Trip Stamp Information"
    >
      {/* Stamp seal rings */}
      <div className="absolute -right-6 -top-6 w-20 h-20 rounded-full border-2 border-white/[0.05] pointer-events-none" />
      <div className="absolute -right-3 -top-3 w-11 h-11 rounded-full border border-white/[0.04] pointer-events-none" />

      {/* IATA code */}
      <p className="text-[9px] font-mono font-bold text-white/20 tracking-[0.25em] uppercase">
        {destinationCode || "---"}
      </p>

      {/* City */}
      <p className="text-[15px] font-black text-white leading-tight line-clamp-2 flex-1">
        {destinationName ?? destinationCode}
      </p>

      {/* Month · Year */}
      <p className="text-[10px] text-white/25 font-semibold uppercase tracking-wider">
        {monthLabel} · {year}
      </p>

      {/* Reaction counts */}
      {reactions && reactions.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-0.5">
          {reactions.map(({ emoji, count }) => (
            <span
              key={emoji}
              className="inline-flex items-center gap-0.5 rounded-md bg-white/[0.07] px-1.5 py-0.5 text-[11px]"
            >
              {emoji}
              {count > 1 && (
                <span className="text-white/40 text-[10px] tabular-nums ml-0.5">
                  {count}
                </span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Empty state for no reactions */}
      {reactions?.length === 0 && (
        <p className="text-[12px] text-white/40 mt-2">No reactions yet.</p>
      )}
    </div>
  );
}