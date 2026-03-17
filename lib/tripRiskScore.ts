import { TripFlight } from "./types";
import { AirportStatusMap } from "./types";
import { analyzeConnection } from "./connectionRisk";

export interface TripRiskScore {
  score: number;          // 0–100
  level: "low" | "medium" | "high" | "critical";
  factors: RiskFactor[];
}

export interface RiskFactor {
  type: "airport_status" | "connection_risk" | "peak_day" | "imminent";
  label: string;
  points: number;
}

const STATUS_POINTS: Record<string, number> = {
  closure:        40,
  ground_stop:    35,
  ground_delay:   22,
  delay_severe:   18,
  delay_moderate: 10,
  delay_minor:    4,
  ok:             0,
  unknown:        0,
};

export function calculateTripRiskScore(
  flights: TripFlight[],
  statusMap: AirportStatusMap,
  locale: "es" | "en",
): TripRiskScore {
  if (flights.length === 0) return { score: 0, level: "low", factors: [] };

  const factors: RiskFactor[] = [];
  let raw = 0;

  const sorted = [...flights].sort((a, b) => a.isoDate.localeCompare(b.isoDate));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ── 1. Airport status ───────────────────────────────────────────────────────
  const seen = new Set<string>();
  for (const flight of sorted) {
    if (!seen.has(flight.originCode)) {
      seen.add(flight.originCode);
      const status = statusMap[flight.originCode];
      if (status && status.status !== "ok") {
        const pts = STATUS_POINTS[status.status] ?? 0;
        if (pts > 0) {
          raw += pts;
          const statusLabelMap: Record<string, string> = {
            closure:        locale === "en" ? "CLOSED"         : "CERRADO",
            ground_stop:    locale === "en" ? "Ground Stop"    : "Ground Stop",
            ground_delay:   locale === "en" ? "Ground Delay"   : "Ground Delay",
            delay_severe:   locale === "en" ? "Severe Delay"   : "Demora severa",
            delay_moderate: locale === "en" ? "Moderate Delay" : "Demora moderada",
            delay_minor:    locale === "en" ? "Minor Delay"    : "Demora leve",
          };
          const statusLabel = statusLabelMap[status.status] ?? status.status;

          factors.push({
            type: "airport_status",
            label: `${flight.originCode}: ${statusLabel}`,
            points: pts,
          });
        }
      }
    }
  }

  // ── 2. Connection risk ──────────────────────────────────────────────────────
  for (let i = 0; i < sorted.length - 1; i++) {
    const conn = analyzeConnection(sorted[i], sorted[i + 1], statusMap);
    if (!conn) continue;

    const connPts = { missed: 30, at_risk: 20, tight: 8, safe: 0 }[conn.risk] ?? 0;
    if (connPts > 0) {
      raw += connPts;
      const riskLabel = {
        missed:   locale === "en" ? "connection MISSED"   : "conexión PERDIDA",
        at_risk:  locale === "en" ? "connection AT RISK"  : "conexión EN RIESGO",
        tight:    locale === "en" ? "tight connection"    : "conexión ajustada",
        safe:     "",
      }[conn.risk];

      factors.push({
        type: "connection_risk",
        label: `${conn.connectionAirport}: ${riskLabel}`,
        points: connPts,
      });
    }
  }

  // ── 3. Imminent departure bonus (within 24h) ────────────────────────────────
  const nextFlight = sorted.find((f) => {
    const d = new Date(f.isoDate + "T00:00:00");
    return d >= today;
  });
  if (nextFlight) {
    const d = new Date(nextFlight.isoDate + "T00:00:00");
    const daysUntil = Math.ceil((d.getTime() - today.getTime()) / 86400000);
    if (daysUntil === 0) {
      raw += 15;
      factors.push({
        type: "imminent",
        label: locale === "en" ? "Flight TODAY — monitor closely" : "Vuelo HOY — monitorear",
        points: 15,
      });
    } else if (daysUntil === 1) {
      raw += 8;
      factors.push({
        type: "imminent",
        label: locale === "en" ? "Flight TOMORROW" : "Vuelo MAÑANA",
        points: 8,
      });
    }
  }

  // ── 4. Peak travel day (Fri / Sun) ──────────────────────────────────────────
  for (const flight of sorted) {
    const d = new Date(flight.isoDate + "T00:00:00");
    const daysUntil = Math.ceil((d.getTime() - today.getTime()) / 86400000);
    if (daysUntil >= 0 && daysUntil <= 7) {
      const day = d.getDay();
      if (day === 0 || day === 5 || day === 6) {
        raw += 5;
        factors.push({
          type: "peak_day",
          label: locale === "en"
            ? `${flight.flightCode}: peak day (${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][day]})`
            : `${flight.flightCode}: día pico (${["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"][day]})`,
          points: 5,
        });
        break; // only count once
      }
    }
  }

  const score = Math.min(Math.round(raw), 100);

  let level: TripRiskScore["level"];
  if (score <= 15)      level = "low";
  else if (score <= 40) level = "medium";
  else if (score <= 70) level = "high";
  else                   level = "critical";

  return { score, level, factors };
}
