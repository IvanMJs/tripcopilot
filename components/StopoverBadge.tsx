"use client";

interface StopoverBadgeProps {
  airport: string;
  days: number;
  locale: "es" | "en";
}

/**
 * Shown between flights when the gap is ≥ 24 h (an intentional stopover,
 * not a connection). Displays how many days until the next flight.
 */
export function StopoverBadge({ airport, days, locale }: StopoverBadgeProps) {
  const dayLabel =
    locale === "es"
      ? days === 1
        ? "1 día"
        : `${days} días`
      : days === 1
        ? "1 day"
        : `${days} days`;

  const suffix =
    locale === "es" ? "para el próx. vuelo" : "until next flight";

  return (
    <div
      className="mx-1 my-2 rounded-xl border border-slate-700/40 bg-slate-800/30 px-4 py-2.5 flex items-center justify-between"
      role="status"
      aria-label={
        locale === "es"
          ? `Escala en ${airport}: ${dayLabel} para el próximo vuelo`
          : `Stopover at ${airport}: ${dayLabel} until next flight`
      }
    >
      <div className="flex items-center gap-1.5">
        <span className="text-sm leading-none select-none">🛏</span>
        <span className="text-xs font-semibold text-slate-400">
          {locale === "es" ? "Escala en" : "Stopover at"}{" "}
          <span className="font-black text-slate-300">{airport}</span>
        </span>
      </div>
      <span className="text-xs font-bold text-slate-400 tabular-nums">
        {dayLabel}{" · "}{suffix}
      </span>
    </div>
  );
}
