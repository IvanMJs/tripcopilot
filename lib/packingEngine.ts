// ── Packing Engine — weather-based suggestion logic ────────────────────────

export interface PackingSuggestion {
  emoji: string;
  item: string;
  reason: string;
}

export interface WeatherInput {
  tempMax: number;
  tempMin: number;
  precipProbability: number;
  weatherCode: number;
}

type Locale = "es" | "en";

interface SuggestionRule {
  condition: (w: WeatherInput) => boolean;
  /** Receives the weather so reason strings can include measured values. */
  suggestion: (w: WeatherInput, locale: Locale) => PackingSuggestion;
  /** Lower priority = added first. Used to enforce max-8 trim order. */
  priority: number;
}

// ── WMO weather code ranges ────────────────────────────────────────────────
function isSnow(weatherCode: number): boolean {
  return weatherCode >= 71 && weatherCode <= 77;
}

// ── Rule table ─────────────────────────────────────────────────────────────

const CONDITIONAL_RULES: SuggestionRule[] = [
  {
    priority: 1,
    condition: (w) => w.tempMax > 30,
    suggestion: (w, locale) =>
      locale === "es"
        ? { emoji: "🧴", item: "Protector solar", reason: `Más de ${Math.round(w.tempMax)} °C en el destino` }
        : { emoji: "🧴", item: "Sunscreen", reason: `Over ${Math.round(w.tempMax)} °C at destination` },
  },
  {
    priority: 2,
    condition: (w) => w.tempMax > 30,
    suggestion: (_w, locale) =>
      locale === "es"
        ? { emoji: "🧢", item: "Sombrero o gorra", reason: "Protección solar indispensable" }
        : { emoji: "🧢", item: "Hat or cap", reason: "Sun protection is a must" },
  },
  {
    priority: 3,
    condition: (w) => w.tempMax > 30,
    suggestion: (_w, locale) =>
      locale === "es"
        ? { emoji: "👕", item: "Ropa liviana", reason: "Temperatura máxima muy alta" }
        : { emoji: "👕", item: "Light clothes", reason: "Very high maximum temperature" },
  },
  {
    priority: 4,
    condition: (w) => w.tempMin < 10,
    suggestion: (w, locale) =>
      locale === "es"
        ? { emoji: "🧥", item: "Chaqueta o abrigo", reason: `Mínima de ${Math.round(w.tempMin)} °C` }
        : { emoji: "🧥", item: "Jacket or coat", reason: `Low of ${Math.round(w.tempMin)} °C` },
  },
  {
    priority: 5,
    condition: (w) => w.tempMin < 10,
    suggestion: (_w, locale) =>
      locale === "es"
        ? { emoji: "🧣", item: "Capas de ropa térmica", reason: "Noches frías en el destino" }
        : { emoji: "🧣", item: "Warm layers", reason: "Cold nights at destination" },
  },
  {
    priority: 6,
    condition: (w) => w.tempMin < 0,
    suggestion: (w, locale) =>
      locale === "es"
        ? { emoji: "🧤", item: "Guantes y bufanda", reason: `Temperatura bajo cero (${Math.round(w.tempMin)} °C)` }
        : { emoji: "🧤", item: "Gloves and scarf", reason: `Below-zero temps (${Math.round(w.tempMin)} °C)` },
  },
  {
    priority: 7,
    condition: (w) => w.precipProbability > 40,
    suggestion: (w, locale) =>
      locale === "es"
        ? { emoji: "☂️", item: "Paraguas", reason: `${w.precipProbability}% de probabilidad de lluvia` }
        : { emoji: "☂️", item: "Umbrella", reason: `${w.precipProbability}% chance of rain` },
  },
  {
    priority: 8,
    condition: (w) => w.precipProbability > 40,
    suggestion: (_w, locale) =>
      locale === "es"
        ? { emoji: "🧣", item: "Campera impermeable", reason: "Alta probabilidad de precipitaciones" }
        : { emoji: "🧣", item: "Rain jacket", reason: "High precipitation probability" },
  },
  {
    priority: 9,
    condition: (w) => isSnow(w.weatherCode),
    suggestion: (_w, locale) =>
      locale === "es"
        ? { emoji: "👢", item: "Botas impermeables", reason: "Nieve pronosticada en el destino" }
        : { emoji: "👢", item: "Waterproof boots", reason: "Snow forecast at destination" },
  },
  {
    priority: 10,
    condition: (w) => isSnow(w.weatherCode),
    suggestion: (_w, locale) =>
      locale === "es"
        ? { emoji: "🧦", item: "Calcetines térmicos", reason: "Para caminar en nieve o frío intenso" }
        : { emoji: "🧦", item: "Warm socks", reason: "For walking in snow or intense cold" },
  },
];

const ALWAYS_SUGGESTIONS: ((locale: Locale) => PackingSuggestion)[] = [
  (locale) =>
    locale === "es"
      ? { emoji: "🛂", item: "Pasaporte / DNI", reason: "Documento imprescindible para viajar" }
      : { emoji: "🛂", item: "Passport / ID", reason: "Essential travel document" },
  (locale) =>
    locale === "es"
      ? { emoji: "🔌", item: "Cargador de celular", reason: "Siempre necesario en cualquier viaje" }
      : { emoji: "🔌", item: "Phone charger", reason: "Always needed on any trip" },
  (locale) =>
    locale === "es"
      ? { emoji: "💊", item: "Medicamentos personales", reason: "No los olvides, son difíciles de conseguir fuera" }
      : { emoji: "💊", item: "Medications", reason: "Don't forget — hard to find abroad" },
];

const MAX_SUGGESTIONS = 8;

/**
 * Generate packing suggestions based on destination weather.
 * Returns 5-8 items: always-items first, then weather-conditional items.
 */
export function getPackingSuggestions(
  weather: WeatherInput,
  locale: Locale,
): PackingSuggestion[] {
  const results: PackingSuggestion[] = [];

  // Always-items first (passport, charger, medications)
  for (const build of ALWAYS_SUGGESTIONS) {
    results.push(build(locale));
  }

  // Weather-conditional items sorted by priority
  const matched = CONDITIONAL_RULES
    .filter((r) => r.condition(weather))
    .sort((a, b) => a.priority - b.priority);

  for (const rule of matched) {
    if (results.length >= MAX_SUGGESTIONS) break;
    results.push(rule.suggestion(weather, locale));
  }

  return results;
}
