"use client";

export interface FlightPunctualityInput {
  airline: string;
  origin: string;
  dest: string;
  departureHour: number;
}

export type PunctualityRating = "excellent" | "good" | "average" | "poor";

export interface FlightPunctuality {
  onTimePercent: number;
  rating: PunctualityRating;
  riskFactors: string[];
  bestTip: string;
}

// Hub airports with higher congestion
const HUB_AIRPORTS = new Set([
  "JFK", "LAX", "ORD", "ATL", "LHR", "CDG", "FRA",
  "EZE", "GRU", "MIA", "DFW", "DEN",
]);

// Approximate great-circle distances in km between common airport pairs (symmetric)
// We use a simple heuristic: if both endpoints are known, try to estimate haul length
// by checking a broad region table based on airport code prefixes / regions.
function estimateHaulCategory(origin: string, dest: string): "short" | "medium" | "long" {
  // Short-haul: same continent / neighbouring countries
  // We classify by region codes — USA domestic, intra-Europe, intra-LatAm, etc.
  const USA = new Set(["ATL","LAX","ORD","DFW","DEN","JFK","SFO","SEA","LAS","MCO","MIA","CLT","EWR","PHX","IAH","BOS","MSP","DTW","FLL","LGA","BWI","SLC","PHL","DCA","IAD","HNL","MDW","SAN","TPA","PDX"]);
  const EUROPE = new Set(["LHR","LGW","STN","MAN","EDI","CDG","ORY","AMS","MAD","BCN","FCO","MXP","MUC","FRA","DUS","HAM","BER","VIE","ZRH","GVA","BRU","LIS","OPO","CPH","ARN","OSL","HEL","DUB","ATH","IST","SAW","WAW","PRG","BUD","OTP","KBP"]);
  const LATAM = new Set(["EZE","BOG","LIM","GRU","GIG","SCL","MVD","PTY","CUN","MEX","NAS","ANU","UIO","VVI","BSB","CNF","FOR","REC","SSA","CWB","POA","MDE","CTG","GYE","SDQ","SJU","CUR","AUA","HAV","POS","BGI","MBJ","KIN","SAL","SJO","GUA","MDZ","BRC","USH","NAT","PUJ"]);
  const ASIA = new Set(["NRT","HND","KIX","ITM","CTS","FUK","ICN","GMP","PVG","PEK","PKX","CAN","HKG","TPE","SIN","KUL","BKK","DMK","MNL","CGK","SUB","DEL","BOM","MAA","BLR","HYD","CCU","CMB","KHI","ISB","LHE","TAS","ALA","DXB","AUH","DOH","BAH","KWI","AMM","BEY","TLV","RUH","JED","MCT","CAI"]);
  const AFRICA = new Set(["NBO","JNB","CPT","DUR","LOS","ACC","CMN","TUN","ALG","ADD","DAR","EBB"]);
  const OCEANIA = new Set(["SYD","MEL","BNE","PER","ADL","AKL","CHC","WLG"]);

  function region(code: string): string {
    if (USA.has(code)) return "USA";
    if (EUROPE.has(code)) return "EUROPE";
    if (LATAM.has(code)) return "LATAM";
    if (ASIA.has(code)) return "ASIA";
    if (AFRICA.has(code)) return "AFRICA";
    if (OCEANIA.has(code)) return "OCEANIA";
    return "OTHER";
  }

  const ro = region(origin);
  const rd = region(dest);

  // Same region = short if USA/EUROPE, medium otherwise
  if (ro === rd) {
    if (ro === "USA" || ro === "EUROPE") return "short";
    return "medium";
  }

  // Neighbouring regions = medium
  const NEIGHBOURS: Record<string, string[]> = {
    USA:     ["LATAM"],
    LATAM:   ["USA"],
    EUROPE:  ["AFRICA"],
    AFRICA:  ["EUROPE", "ASIA"],
    ASIA:    ["AFRICA", "OCEANIA"],
    OCEANIA: ["ASIA"],
  };

  if (NEIGHBOURS[ro]?.includes(rd) || NEIGHBOURS[rd]?.includes(ro)) {
    return "medium";
  }

  return "long";
}

function isWinterMonth(month: number): boolean {
  // Northern hemisphere winter: Dec(11), Jan(0), Feb(1)
  // Southern hemisphere winter: Jun(5), Jul(6), Aug(7)
  return month === 11 || month === 0 || month === 1 || month === 5 || month === 6 || month === 7;
}

export function useFlightPunctuality(
  input: FlightPunctualityInput,
  locale: "es" | "en" = "es",
): FlightPunctuality {
  const { origin, dest, departureHour } = input;

  const now = new Date();
  const month = now.getMonth();

  let score = 78; // industry base rate
  const riskFactors: string[] = [];

  // Time-of-day adjustment
  if (departureHour >= 6 && departureHour < 10) {
    score += 8;
  } else if (departureHour >= 12 && departureHour < 16) {
    score -= 3;
    riskFactors.push(locale === "es" ? "Vuelo de tarde" : "Afternoon departure");
  } else if (departureHour >= 18 && departureHour < 22) {
    score -= 8;
    riskFactors.push(locale === "es" ? "Vuelo nocturno" : "Evening departure");
  }

  // Hub airport penalty
  if (HUB_AIRPORTS.has(origin)) {
    score -= 5;
    riskFactors.push(
      locale === "es"
        ? `${origin} es un hub congestionado`
        : `${origin} is a busy hub airport`,
    );
  }

  // Haul length
  const haul = estimateHaulCategory(origin, dest);
  if (haul === "short") {
    score += 3;
  } else if (haul === "long") {
    score -= 2;
    riskFactors.push(locale === "es" ? "Vuelo de larga distancia" : "Long-haul flight");
  }

  // Winter season penalty
  if (isWinterMonth(month)) {
    score -= 5;
    riskFactors.push(locale === "es" ? "Temporada de invierno" : "Winter season");
  }

  // Clamp to [30, 97]
  const onTimePercent = Math.min(97, Math.max(30, Math.round(score)));

  // Rating
  let rating: PunctualityRating;
  if (onTimePercent > 85) rating = "excellent";
  else if (onTimePercent > 75) rating = "good";
  else if (onTimePercent > 65) rating = "average";
  else rating = "poor";

  // Best tip
  let bestTip: string;
  if (departureHour >= 18 && departureHour < 22) {
    bestTip =
      locale === "es"
        ? "Los vuelos nocturnos acumulan demoras del día. Considerá un vuelo matutino."
        : "Evening flights accumulate the day's delays. Consider a morning departure.";
  } else if (HUB_AIRPORTS.has(origin)) {
    bestTip =
      locale === "es"
        ? "Los hubs suelen tener más congestión. Llegá al aeropuerto con tiempo extra."
        : "Hub airports tend to be more congested. Arrive with extra buffer time.";
  } else if (isWinterMonth(month)) {
    bestTip =
      locale === "es"
        ? "El clima invernal puede causar demoras. Monitoreá el estado del vuelo con frecuencia."
        : "Winter weather can cause delays. Monitor your flight status frequently.";
  } else if (haul === "long") {
    bestTip =
      locale === "es"
        ? "Para vuelos largos, confirmá el estado la noche anterior al vuelo."
        : "For long-haul flights, check the status the evening before departure.";
  } else {
    bestTip =
      locale === "es"
        ? "Los vuelos matutinos tienen menor riesgo de demoras. ¡Buen vuelo!"
        : "Morning flights have the lowest delay risk. Have a great flight!";
  }

  return { onTimePercent, rating, riskFactors, bestTip };
}
