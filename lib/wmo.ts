export const WMO_DESCRIPTIONS: Record<number, { es: string; en: string; icon: string }> = {
  0:  { es: "Despejado",             en: "Clear",                    icon: "☀️" },
  1:  { es: "Mayormente despejado",  en: "Mostly clear",             icon: "🌤️" },
  2:  { es: "Parcialmente nublado",  en: "Partly cloudy",            icon: "⛅" },
  3:  { es: "Nublado",               en: "Overcast",                 icon: "☁️" },
  45: { es: "Niebla",                en: "Fog",                      icon: "🌫️" },
  48: { es: "Niebla helada",         en: "Freezing fog",             icon: "🌫️" },
  51: { es: "Llovizna",              en: "Drizzle",                  icon: "🌦️" },
  61: { es: "Lluvia",                en: "Rain",                     icon: "🌧️" },
  63: { es: "Lluvia moderada",       en: "Moderate rain",            icon: "🌧️" },
  65: { es: "Lluvia fuerte",         en: "Heavy rain",               icon: "🌧️" },
  71: { es: "Nieve",                 en: "Snow",                     icon: "🌨️" },
  73: { es: "Nieve moderada",        en: "Moderate snow",            icon: "🌨️" },
  75: { es: "Nieve fuerte",          en: "Heavy snow",               icon: "❄️" },
  80: { es: "Chaparrones",           en: "Showers",                  icon: "🌦️" },
  95: { es: "Tormenta",              en: "Thunderstorm",             icon: "⛈️" },
  96: { es: "Tormenta con granizo",  en: "Thunderstorm with hail",   icon: "⛈️" },
};

export function getWeatherDescription(
  code: number,
  locale: "es" | "en",
): { text: string; icon: string } {
  // Find the closest matching code (WMO codes have gaps; fall back to clear sky)
  const entry = WMO_DESCRIPTIONS[code] ?? WMO_DESCRIPTIONS[0]!;
  return { text: entry[locale], icon: entry.icon };
}
