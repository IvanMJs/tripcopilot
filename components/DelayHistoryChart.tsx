"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { DelayStatus } from "@/lib/types";

// ── Types ──────────────────────────────────────────────────────────────────

/**
 * A single hourly snapshot for the chart.
 * `hour` is a 0-23 value representing the hour of the day.
 * `severity` is a 0-3 scale: 0=normal, 1=minor, 2=moderate, 3=severe/stop/closure.
 */
export interface HourlySnapshot {
  hour: number;
  severity: 0 | 1 | 2 | 3;
}

export interface DelayHistoryChartProps {
  /** IATA code — displayed in the header. */
  iata: string;
  /** Current live status — used as fallback when no history is available. */
  currentStatus: DelayStatus;
  /**
   * Up to 24 hourly snapshots for the last 24 hours.
   * When omitted, the chart renders a single bar using `currentStatus`.
   */
  history?: HourlySnapshot[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

function statusToSeverity(status: DelayStatus): 0 | 1 | 2 | 3 {
  switch (status) {
    case "ok":
      return 0;
    case "delay_minor":
      return 1;
    case "delay_moderate":
      return 2;
    case "delay_severe":
    case "ground_stop":
    case "ground_delay":
    case "closure":
      return 3;
    default:
      return 0;
  }
}

/** Returns a Tailwind fill class per severity level. */
function severityColor(severity: 0 | 1 | 2 | 3): string {
  switch (severity) {
    case 0:
      return "#22c55e"; // green-500
    case 1:
      return "#eab308"; // yellow-500
    case 2:
      return "#f97316"; // orange-500
    case 3:
      return "#ef4444"; // red-500
  }
}

// ── Chart internals ────────────────────────────────────────────────────────

const CHART_HEIGHT = 48; // px — height of the SVG drawing area
const BAR_GAP = 2; // px between bars

interface BarChartProps {
  bars: HourlySnapshot[];
}

function BarChart({ bars }: BarChartProps) {
  const count = bars.length;
  if (count === 0) return null;

  // SVG viewBox width — we'll use a fixed 200 unit width and let SVG scale
  const totalWidth = 200;
  const barWidth = (totalWidth - BAR_GAP * (count - 1)) / count;

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${CHART_HEIGHT}`}
      className="w-full"
      style={{ height: `${CHART_HEIGHT}px` }}
      aria-hidden="true"
    >
      {bars.map((bar, i) => {
        // Minimum visible bar height = 3 units even for 0 severity
        const barHeight = bar.severity === 0 ? 3 : (bar.severity / 3) * CHART_HEIGHT;
        const x = i * (barWidth + BAR_GAP);
        const y = CHART_HEIGHT - barHeight;

        return (
          <rect
            key={bar.hour}
            x={x}
            y={y}
            width={barWidth}
            height={barHeight}
            rx={1}
            fill={severityColor(bar.severity)}
            opacity={0.85}
          />
        );
      })}
    </svg>
  );
}

// ── Legend ─────────────────────────────────────────────────────────────────

interface LegendItem {
  color: string;
  label: { es: string; en: string };
}

const LEGEND_ITEMS: LegendItem[] = [
  { color: "#22c55e", label: { es: "Normal", en: "Normal" } },
  { color: "#eab308", label: { es: "Leve", en: "Minor" } },
  { color: "#f97316", label: { es: "Moderada", en: "Moderate" } },
  { color: "#ef4444", label: { es: "Severa", en: "Severe" } },
];

// ── Component ──────────────────────────────────────────────────────────────

export function DelayHistoryChart({
  iata,
  currentStatus,
  history,
}: DelayHistoryChartProps) {
  const { locale } = useLanguage();

  // Build the bar dataset — fall back to a single "current" bar when no history
  const bars: HourlySnapshot[] =
    history && history.length > 0
      ? history
      : [{ hour: new Date().getHours(), severity: statusToSeverity(currentStatus) }];

  const hasHistory = history !== undefined && history.length > 0;

  return (
    <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-300">
          {iata}{" "}
          <span className="text-gray-500 font-normal">
            {locale === "en" ? "— last 24 h" : "— últimas 24 h"}
          </span>
        </span>
        {!hasHistory ? (
          <span className="text-xs text-gray-600 italic">
            {locale === "en" ? "current only" : "solo actual"}
          </span>
        ) : null}
      </div>

      {/* Bar chart */}
      <div className="w-full">
        <BarChart bars={bars} />
      </div>

      {/* Hour axis labels — only meaningful with real history */}
      {hasHistory ? (
        <div className="flex justify-between text-gray-600" style={{ fontSize: "9px" }}>
          <span>
            {locale === "en" ? "24h ago" : "hace 24h"}
          </span>
          <span>{locale === "en" ? "now" : "ahora"}</span>
        </div>
      ) : null}

      {/* Legend */}
      <div className="flex items-center gap-3 flex-wrap">
        {LEGEND_ITEMS.map((item) => (
          <div key={item.color} className="flex items-center gap-1">
            <span
              className="inline-block w-2 h-2 rounded-sm"
              style={{ backgroundColor: item.color, opacity: 0.85 }}
            />
            <span className="text-gray-500" style={{ fontSize: "10px" }}>
              {item.label[locale]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
