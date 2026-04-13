import { XMLParser } from "fast-xml-parser";
import { AirportStatus, AirportStatusMap, DelayStatus, FAADelayType, FAAGroundDelay, FAAGroundStop, FAADelay, FAAAdEntry, FAAClosureEntry } from "./types";
import { AIRPORTS } from "./airports";
import { translateReason, translateTrend } from "./faaTranslations";

// La API real usa atributos en Arrival_Departure Type="Departure"
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: (name) =>
    ["Delay_type", "Ground_Delay", "Delay", "Airport", "Airspace_Flow"].includes(name),
});

// "1 hour and 42 minutes" → 102, "16 minutes" → 16, "3 hours and 19 minutes" → 199
function parseTimeToMinutes(text: string | number | undefined): number {
  if (!text) return 0;
  if (typeof text === "number") return text;
  const str = String(text).toLowerCase();
  let total = 0;
  const hours = str.match(/(\d+)\s*hour/);
  const mins = str.match(/(\d+)\s*min/);
  if (hours) total += parseInt(hours[1]) * 60;
  if (mins) total += parseInt(mins[1]);
  return total || parseInt(str) || 0;
}

function classifyDelay(minutes: number): DelayStatus {
  if (minutes <= 15) return "delay_minor";
  if (minutes <= 45) return "delay_moderate";
  return "delay_severe";
}

export function parseXML(xml: string, locale: "es" | "en" = "es"): AirportStatusMap {
  const result: AirportStatusMap = {};

  try {
    const parsed = parser.parse(xml);
    const data = parsed?.AIRPORT_STATUS_INFORMATION;
    if (!data) return result;

    const delayTypes: FAADelayType[] = data.Delay_type || [];

    for (const dt of delayTypes) {
      const name: string = dt.Name || "";

      // ── Ground Delay Programs ──────────────────────────────────────
      if (dt.Ground_Delay_List?.Ground_Delay) {
        const list = Array.isArray(dt.Ground_Delay_List.Ground_Delay)
          ? dt.Ground_Delay_List.Ground_Delay
          : [dt.Ground_Delay_List.Ground_Delay];

        list.forEach((gd: FAAGroundDelay) => {
          const iata = gd.ARPT;
          if (!iata) return;
          const avgMin = parseTimeToMinutes(gd.Avg);
          const maxStr = String(gd.Max || "");
          result[iata] = {
            iata,
            name: AIRPORTS[iata]?.name || iata,
            city: AIRPORTS[iata]?.city || "",
            state: AIRPORTS[iata]?.state || "",
            status: "ground_delay",
            groundDelay: {
              reason: translateReason(gd.Reason || "Unknown", locale),
              avgMinutes: avgMin,
              maxTime: maxStr,
            },
            lastChecked: new Date(),
          };
        });
      }

      // ── Ground Stops ───────────────────────────────────────────────
      if (dt.Ground_Stop_List?.Ground_Stop) {
        const list = Array.isArray(dt.Ground_Stop_List.Ground_Stop)
          ? dt.Ground_Stop_List.Ground_Stop
          : [dt.Ground_Stop_List.Ground_Stop];

        list.forEach((gs: FAAGroundStop) => {
          const iata = gs.ARPT;
          if (!iata) return;
          result[iata] = {
            iata,
            name: AIRPORTS[iata]?.name || iata,
            city: AIRPORTS[iata]?.city || "",
            state: AIRPORTS[iata]?.state || "",
            status: "ground_stop",
            groundStop: {
              reason: translateReason(gs.Reason || "Unknown", locale),
              endTime: gs.Stop_End_Time || gs.EndTime,
            },
            lastChecked: new Date(),
          };
        });
      }

      // ── General Arrival/Departure Delays ───────────────────────────
      if (dt.Arrival_Departure_Delay_List?.Delay) {
        const list = Array.isArray(dt.Arrival_Departure_Delay_List.Delay)
          ? dt.Arrival_Departure_Delay_List.Delay
          : [dt.Arrival_Departure_Delay_List.Delay];

        list.forEach((d: FAADelay) => {
          const iata = d.ARPT;
          if (!iata) return;

          // Arrival_Departure puede ser objeto único o array
          const adRaw = d.Arrival_Departure;
          const adList = Array.isArray(adRaw) ? adRaw : adRaw ? [adRaw] : [];

          let minMin = 9999;
          let maxMax = 0;
          let reason = translateReason(d.Reason || "Unknown", locale);
          let trend: string | undefined;
          let type: "departure" | "arrival" | "both" = "both";
          const types: string[] = [];

          adList.forEach((ad: FAAAdEntry) => {
            const adMin = parseTimeToMinutes(ad.Min);
            const adMax = parseTimeToMinutes(ad.Max);
            if (adMin < minMin) minMin = adMin;
            if (adMax > maxMax) maxMax = adMax;
            if (ad.Trend) trend = translateTrend(ad.Trend, locale);
            const t = (ad["@_Type"] || "").toLowerCase();
            if (t) types.push(t);
          });

          if (minMin === 9999) minMin = 0;
          const avg = (minMin + maxMax) / 2;

          if (types.length === 1) {
            type = types[0].includes("dep") ? "departure" : "arrival";
          }

          result[iata] = {
            iata,
            name: AIRPORTS[iata]?.name || iata,
            city: AIRPORTS[iata]?.city || "",
            state: AIRPORTS[iata]?.state || "",
            status: classifyDelay(avg),
            delays: {
              reason,
              minMinutes: minMin,
              maxMinutes: maxMax,
              trend,
              type,
            },
            lastChecked: new Date(),
          };
        });
      }

      // ── Airport Closures ───────────────────────────────────────────
      if (dt.Airport_Closure_List?.Airport) {
        const list = Array.isArray(dt.Airport_Closure_List.Airport)
          ? dt.Airport_Closure_List.Airport
          : [dt.Airport_Closure_List.Airport];

        list.forEach((cl: FAAClosureEntry) => {
          const iata = cl.ARPT;
          if (!iata) return;
          result[iata] = {
            iata,
            name: AIRPORTS[iata]?.name || iata,
            city: AIRPORTS[iata]?.city || "",
            state: AIRPORTS[iata]?.state || "",
            status: "closure",
            closure: { reason: translateReason(cl.Reason || "Unknown", locale) },
            lastChecked: new Date(),
          };
        });
      }
    }
  } catch (e) {
    console.error("XML parse error:", e);
  }

  return result;
}

export function generateWhatsAppSummary(
  statusMap: AirportStatusMap,
  watchedAirports: string[]
): string {
  const now = new Date().toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  let msg = `✈️ *Airport Monitor — ${now} (ARG)*\n\n`;

  const problems = watchedAirports.filter(
    (iata) => statusMap[iata] && statusMap[iata].status !== "ok"
  );
  const ok = watchedAirports.filter(
    (iata) => !statusMap[iata] || statusMap[iata].status === "ok"
  );

  if (problems.length === 0) {
    msg += `✅ *Todo normal* — Sin demoras en tus aeropuertos\n\n`;
  } else {
    msg += `⚠️ *${problems.length} aeropuerto(s) con problemas:*\n\n`;
    problems.forEach((iata) => {
      const s = statusMap[iata];
      const emoji =
        s.status === "closure" ? "⛔"
        : s.status === "ground_stop" ? "🛑"
        : s.status === "ground_delay" ? "🔴"
        : s.status === "delay_severe" ? "🔴"
        : s.status === "delay_moderate" ? "🟠"
        : "🟡";
      msg += `${emoji} *${iata}* — ${s.name}\n`;
      if (s.delays) {
        msg += `   Demora: ${s.delays.minMinutes}-${s.delays.maxMinutes} min (${s.delays.reason})\n`;
        if (s.delays.trend) msg += `   Tendencia: ${s.delays.trend}\n`;
      }
      if (s.groundStop)
        msg += `   Ground Stop hasta ${s.groundStop.endTime || "indefinido"} — ${s.groundStop.reason}\n`;
      if (s.groundDelay)
        msg += `   Ground Delay: avg ${s.groundDelay.avgMinutes} min (${s.groundDelay.maxTime}) — ${s.groundDelay.reason}\n`;
      if (s.closure) msg += `   ⛔ CERRADO — ${s.closure.reason}\n`;
      msg += "\n";
    });
  }

  if (ok.length > 0) {
    msg += `✅ Sin problemas: ${ok.join(", ")}\n`;
  }

  msg += `\n_Fuente: FAA · próxima actualización en 12hs_`;
  return msg;
}
