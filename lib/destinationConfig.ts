/**
 * Static destination profiles used to generate contextual trip checklists.
 * Keyed by IATA code → month (1-12) → profile.
 * Temperatures in °C. Extend as more destinations are added.
 */

export interface DestinationMonthProfile {
  tempMinC: number;
  tempMaxC: number;
  /** Short climate description shown in the UI */
  climateDesc: string;
  climateDescEn: string;
  /** Packing suggestions — clothing & gear */
  packing: { es: string; en: string }[];
  /** Weather-related warnings for this month */
  weatherAlerts: { es: string; en: string }[];
  /** Local practical tips */
  tips: { es: string; en: string }[];
  /** Top activities / places to visit for this season */
  activities: { name: string; nameEn: string; desc: string; descEn: string }[];
}

export interface DestinationConfig {
  city: string;
  cityEn: string;
  country: string;
  flag: string;
  /** Whether USD is accepted natively */
  usdAccepted: boolean;
  /** ISO language code(s) */
  languages: string[];
  months: Partial<Record<number, DestinationMonthProfile>>;
}

export const DESTINATIONS: Record<string, DestinationConfig> = {

  // ── Grand Cayman (GCM) ────────────────────────────────────────────────────
  GCM: {
    city: "Gran Caimán", cityEn: "Grand Cayman", country: "Islas Caimán", flag: "🇰🇾",
    usdAccepted: true, languages: ["en"],
    months: {
      3: {
        tempMinC: 24, tempMaxC: 29,
        climateDesc: "Tropical, soleado y seco — ideal para playa",
        climateDescEn: "Tropical, sunny and dry — perfect beach weather",
        packing: [
          { es: "Ropa de playa: traje de baño, shorts, camisetas livianas", en: "Beach clothes: swimsuit, shorts, light t-shirts" },
          { es: "Protector solar FPS 50+ (obligatorio, el sol es muy fuerte)", en: "Sunscreen SPF 50+ (essential — very strong sun)" },
          { es: "Lentes de sol y gorra o sombrero", en: "Sunglasses and cap or hat" },
          { es: "Sandalia de agua para el arrecife (Seven Mile Beach tiene coral)", en: "Water sandals for the reef (Seven Mile Beach has coral)" },
          { es: "Una campera liviana para el AC de restaurantes y taxis", en: "A light jacket for heavy A/C in restaurants and taxis" },
        ],
        weatherAlerts: [
          { es: "Temporada seca — prácticamente sin lluvia en marzo", en: "Dry season — almost no rain in March" },
          { es: "Índice UV extremo al mediodía — evitá el sol de 11 a 15 hs", en: "Extreme UV index at noon — avoid sun from 11am to 3pm" },
        ],
        tips: [
          { es: "Moneda local: Dólar de Caimán (KYD) ≈ 1.2 USD, pero el USD se acepta en todos lados", en: "Local currency: Cayman Dollar (KYD) ≈ 1.2 USD, but USD accepted everywhere" },
          { es: "Seven Mile Beach está a 20 min del aeropuerto en taxi (~$25 USD)", en: "Seven Mile Beach is 20 min from the airport by taxi (~$25 USD)" },
          { es: "Sin aduana complicada para argentinos con pasaporte vigente", en: "No complex customs for travelers with valid passport" },
        ],
        activities: [
          { name: "Seven Mile Beach", nameEn: "Seven Mile Beach", desc: "La playa más famosa del Caribe — arena blanca, agua turquesa, ideal para snorkel", descEn: "Most famous beach in the Caribbean — white sand, turquoise water, great for snorkeling" },
          { name: "Stingray City", nameEn: "Stingray City", desc: "Interacción con rayas en aguas poco profundas — reservar tour con anticipación", descEn: "Swim with stingrays in shallow waters — book tour in advance" },
          { name: "Rum Point", nameEn: "Rum Point", desc: "Playa tranquila y apartada en el norte de la isla — hamacas en el agua incluidas", descEn: "Quiet secluded beach on the north side — hammocks in the water included" },
        ],
      },
      4: {
        tempMinC: 25, tempMaxC: 30,
        climateDesc: "Tropical, muy soleado — inicio de temporada húmeda",
        climateDescEn: "Tropical, very sunny — start of wet season",
        packing: [
          { es: "Ropa de playa y protector solar FPS 50+", en: "Beach clothes and SPF 50+ sunscreen" },
          { es: "Impermeable o poncho liviano (lluvias cortas por la tarde)", en: "Light raincoat or poncho (short afternoon showers)" },
          { es: "Lentes de sol, gorra, sandalia de agua", en: "Sunglasses, cap, water sandals" },
          { es: "Campera liviana para interiores con AC fuerte", en: "Light jacket for heavily air-conditioned interiors" },
        ],
        weatherAlerts: [
          { es: "Inicio de la temporada húmeda — lluvias cortas por la tarde (30-60 min)", en: "Start of wet season — short afternoon showers (30-60 min)" },
          { es: "El calor aumenta respecto a marzo — hidratación muy importante", en: "Temperature rises compared to March — hydration is key" },
        ],
        tips: [
          { es: "Arrecife Stingray City es imperdible — reservá tour de antemano", en: "Stingray City reef is unmissable — book tour in advance" },
          { es: "Muchos restaurantes tienen happy hour a las 17-18 hs", en: "Many restaurants have happy hour at 5-6pm" },
        ],
        activities: [
          { name: "Stingray City", nameEn: "Stingray City", desc: "Imprescindible — nadar con rayas manta en banco de arena, solo 1m de profundidad", descEn: "Must-do — swim with stingrays on a sandbar, only 1m deep" },
          { name: "Seven Mile Beach", nameEn: "Seven Mile Beach", desc: "Playa icónica con snorkel, kayak y paddleboard disponibles en alquiler", descEn: "Iconic beach with snorkeling, kayak and paddleboard rentals available" },
          { name: "Snorkel en Coral Gardens", nameEn: "Coral Gardens Snorkeling", desc: "Arrecife de coral accesible desde la orilla — manta raya, tortugas y peces tropicales", descEn: "Shore-accessible coral reef — stingrays, turtles and tropical fish" },
        ],
      },
    },
  },

  // ── Miami (MIA) ───────────────────────────────────────────────────────────
  MIA: {
    city: "Miami", cityEn: "Miami", country: "USA", flag: "🇺🇸",
    usdAccepted: true, languages: ["en", "es"],
    months: {
      3: {
        tempMinC: 19, tempMaxC: 26,
        climateDesc: "Subtropical, cálido y agradable — temporada alta",
        climateDescEn: "Subtropical, warm and pleasant — peak season",
        packing: [
          { es: "Ropa liviana de verano (shorts, vestidos, remeras)", en: "Light summer clothes (shorts, dresses, t-shirts)" },
          { es: "Una campera o buzo para la noche (puede refrescar)", en: "A jacket or hoodie for evenings (can get cool)" },
          { es: "Protector solar — el sol en Miami es intenso todo el año", en: "Sunscreen — Miami sun is intense year-round" },
          { es: "Calzado cómodo para caminar (South Beach, Wynwood)", en: "Comfortable walking shoes (South Beach, Wynwood)" },
        ],
        weatherAlerts: [
          { es: "Temporada seca — ideal para playa y actividades al aire libre", en: "Dry season — ideal for beach and outdoor activities" },
          { es: "Noches frescas posibles (19-21°C) — llevá algo de abrigo", en: "Cool evenings possible (19-21°C) — pack a light layer" },
        ],
        tips: [
          { es: "Conexión en MIA: el aeropuerto es grande, llegá con tiempo entre vuelos", en: "MIA connection: large airport, leave plenty of time between flights" },
          { es: "Uber y Lyft funcionan muy bien desde/hacia el aeropuerto", en: "Uber and Lyft work well to/from the airport" },
          { es: "Wynwood Walls y Little Havana son barrios imperdibles si tenés escala larga", en: "Wynwood Walls and Little Havana are must-sees for long layovers" },
        ],
        activities: [
          { name: "Wynwood Walls", nameEn: "Wynwood Walls", desc: "Barrio de street art al aire libre — galerías, restaurantes y bares", descEn: "Outdoor street art district — galleries, restaurants and bars" },
          { name: "South Beach", nameEn: "South Beach", desc: "Icónica playa de arena blanca con arquitectura Art Deco — ideal para pasear", descEn: "Iconic white sand beach with Art Deco architecture — perfect for strolling" },
          { name: "Little Havana", nameEn: "Little Havana", desc: "Barrio cubano con música en vivo, cigars artesanales y gastronomía increíble", descEn: "Cuban neighborhood with live music, handmade cigars and amazing food" },
        ],
      },
      4: {
        tempMinC: 22, tempMaxC: 28,
        climateDesc: "Subtropical, caluroso y algo húmedo",
        climateDescEn: "Subtropical, warm and somewhat humid",
        packing: [
          { es: "Ropa liviana de verano, protector solar", en: "Light summer clothes, sunscreen" },
          { es: "Una campera liviana para restaurantes y tiendas con AC", en: "A light jacket for restaurants and stores with heavy A/C" },
        ],
        weatherAlerts: [
          { es: "Inicio de la temporada húmeda — tormentas eléctricas por la tarde", en: "Start of humid season — afternoon thunderstorms possible" },
          { es: "La humedad sube respecto a marzo — puede sentirse más caluroso", en: "Humidity rises compared to March — may feel hotter" },
        ],
        tips: [
          { es: "Miami tiene impuesto a las ventas del ~7% — no está incluido en los precios", en: "Miami sales tax is ~7% — not included in displayed prices" },
          { es: "Si hacés conexión, el Terminal D de American es el más grande", en: "If connecting, American's Terminal D is the largest" },
        ],
        activities: [
          { name: "Wynwood Walls", nameEn: "Wynwood Walls", desc: "El barrio de arte más cool de Miami — abierto todos los días", descEn: "Miami's coolest art district — open every day" },
          { name: "Brickell City Centre", nameEn: "Brickell City Centre", desc: "Shopping y gastronomía de primer nivel en el corazón financiero", descEn: "Top-tier shopping and dining in the financial heart of Miami" },
          { name: "Vizcaya Museum", nameEn: "Vizcaya Museum & Gardens", desc: "Villa italiana de 1916 con jardines frente a la bahía — imperdible", descEn: "1916 Italian villa with bay-front gardens — unmissable" },
        ],
      },
      11: {
        tempMinC: 19, tempMaxC: 26,
        climateDesc: "Subtropical, agradable — temporada seca",
        climateDescEn: "Subtropical, pleasant — dry season",
        packing: [
          { es: "Ropa de verano liviana + campera para noches", en: "Light summer clothes + jacket for evenings" },
          { es: "Protector solar", en: "Sunscreen" },
        ],
        weatherAlerts: [],
        tips: [
          { es: "Noviembre es uno de los mejores meses para visitar Miami", en: "November is one of the best months to visit Miami" },
        ],
        activities: [
          { name: "Art Basel Miami Beach", nameEn: "Art Basel Miami Beach", desc: "Feria de arte más importante de las Américas (principios de diciembre)", descEn: "Americas' most important art fair (early December)" },
          { name: "South Beach", nameEn: "South Beach", desc: "Clima perfecto para playa en noviembre — sin turistas de verano", descEn: "Perfect beach weather in November — without the summer crowds" },
        ],
      },
    },
  },

  // ── New York / JFK ────────────────────────────────────────────────────────
  JFK: {
    city: "Nueva York", cityEn: "New York", country: "USA", flag: "🇺🇸",
    usdAccepted: true, languages: ["en"],
    months: {
      4: {
        tempMinC: 8, tempMaxC: 16,
        climateDesc: "Primavera temprana — fresco y variable, días soleados",
        climateDescEn: "Early spring — cool and variable, sunny days",
        packing: [
          { es: "Abrigo mediano o campera de abrigo (las noches pueden ser frías: 8-10°C)", en: "Medium coat or warm jacket (nights can be cold: 8-10°C)" },
          { es: "Ropa en capas: remera + buzo + campera", en: "Layered clothing: t-shirt + sweater + jacket" },
          { es: "Calzado cómodo y cerrado — vas a caminar mucho", en: "Comfortable closed shoes — you'll walk a lot" },
          { es: "Paraguas compacto — las lluvias de primavera son frecuentes", en: "Compact umbrella — spring rain is frequent" },
          { es: "Guantes y bufanda para noches frías", en: "Gloves and scarf for cold nights" },
        ],
        weatherAlerts: [
          { es: "Temperatura muy variable — puede hacer 8°C por la mañana y 16°C al mediodía", en: "Very variable temperature — could be 8°C in the morning and 16°C at noon" },
          { es: "Lluvias frecuentes de corta duración en abril", en: "Frequent short rain showers in April" },
          { es: "Viento en JFK puede ser fuerte — el aeropuerto está en la bahía", en: "Wind at JFK can be strong — airport sits on the bay" },
        ],
        tips: [
          { es: "JFK es enorme: llegá 3 hs antes para vuelos internacionales", en: "JFK is huge: arrive 3 hrs before for international flights" },
          { es: "AirTrain + Subway es la opción más económica al centro (~$10-12 USD)", en: "AirTrain + Subway is the cheapest option to Manhattan (~$10-12 USD)" },
          { es: "Central Park en abril con los cerezos florecidos es imperdible", en: "Central Park in April with cherry blossoms is unmissable" },
          { es: "Propina es obligatoria culturalmente: 18-20% en restaurantes", en: "Tipping is culturally mandatory: 18-20% in restaurants" },
        ],
        activities: [
          { name: "Central Park (cerezos)", nameEn: "Central Park (cherry blossoms)", desc: "Abril es el pico de los cerezos en flor — uno de los espectáculos más bellos del año", descEn: "April is peak cherry blossom time — one of the most beautiful sights of the year" },
          { name: "The High Line", nameEn: "The High Line", desc: "Parque elevado en vía de tren abandonada con vistas a Manhattan y al Hudson", descEn: "Elevated park on an old railway with views of Manhattan and the Hudson River" },
          { name: "Brooklyn Bridge + DUMBO", nameEn: "Brooklyn Bridge + DUMBO", desc: "Cruzar el puente a pie y explorar el barrio artístico de Brooklyn con vistas épicas", descEn: "Walk across the bridge and explore Brooklyn's artsy DUMBO neighborhood with epic views" },
          { name: "The Met", nameEn: "The Metropolitan Museum", desc: "Uno de los museos más importantes del mundo — reservá al menos 3 horas", descEn: "One of the world's greatest museums — reserve at least 3 hours" },
        ],
      },
      3: {
        tempMinC: 3, tempMaxC: 10,
        climateDesc: "Invierno tardío — frío, posible nieve residual",
        climateDescEn: "Late winter — cold, possible residual snow",
        packing: [
          { es: "Abrigo de invierno heavy — temperaturas pueden caer a 0°C o menos", en: "Heavy winter coat — temperatures can drop to 0°C or below" },
          { es: "Ropa térmica interior", en: "Thermal underwear" },
          { es: "Botas impermeables y cálidas", en: "Waterproof warm boots" },
          { es: "Bufanda, gorro, guantes — indispensable", en: "Scarf, beanie, gloves — essential" },
          { es: "Ropa en muchas capas", en: "Many layers of clothing" },
        ],
        weatherAlerts: [
          { es: "Posibles tormentas de nieve o freezing rain en marzo", en: "Possible snowstorms or freezing rain in March" },
          { es: "El viento hace que se sienta mucho más frío que la temperatura real", en: "Wind makes it feel much colder than the actual temperature" },
        ],
        tips: [
          { es: "Si hay tormenta de nieve, tu vuelo puede tener demoras severas — activá el checklist de aeropuerto", en: "If there's a snowstorm, your flight may have severe delays — activate the airport checklist" },
        ],
        activities: [
          { name: "Times Square", nameEn: "Times Square", desc: "El corazón de Manhattan — impressionante de noche aunque haga frío", descEn: "The heart of Manhattan — stunning at night even in the cold" },
          { name: "MoMA", nameEn: "MoMA", desc: "Museo de Arte Moderno — ideal para un día de frío o nieve", descEn: "Museum of Modern Art — perfect for a cold or snowy day" },
        ],
      },
    },
  },

  // ── Buenos Aires / EZE ────────────────────────────────────────────────────
  EZE: {
    city: "Buenos Aires", cityEn: "Buenos Aires", country: "Argentina", flag: "🇦🇷",
    usdAccepted: false, languages: ["es"],
    months: {
      3: {
        tempMinC: 17, tempMaxC: 26,
        climateDesc: "Otoño temprano — cálido de día, fresco de noche",
        climateDescEn: "Early autumn — warm days, cool evenings",
        packing: [
          { es: "Ropa de verano para el día + campera para la noche", en: "Summer clothes for daytime + jacket for evenings" },
          { es: "Calzado cómodo para caminar", en: "Comfortable walking shoes" },
        ],
        weatherAlerts: [
          { es: "Puede haber lluvias y tormentas en marzo — llevá paraguas", en: "Rain and storms possible in March — bring an umbrella" },
        ],
        tips: [
          { es: "EZE (Ezeiza) está a 35 km del centro — llegá con al menos 3 hs para vuelos internacionales", en: "EZE (Ezeiza) is 35km from downtown — arrive at least 3 hrs early for international flights" },
          { es: "Cambiá divisas en casas de cambio oficiales o cajeros", en: "Exchange currency at official exchange houses or ATMs" },
        ],
        activities: [
          { name: "San Telmo", nameEn: "San Telmo", desc: "Barrio histórico con bares de tango, antigüedades y feria dominical", descEn: "Historic neighborhood with tango bars, antiques and Sunday market" },
          { name: "La Boca / El Caminito", nameEn: "La Boca / El Caminito", desc: "Barrio colorido con arte callejero, fútbol y gastronomía porteña", descEn: "Colorful neighborhood with street art, football culture and local cuisine" },
        ],
      },
      4: {
        tempMinC: 13, tempMaxC: 22,
        climateDesc: "Otoño — agradable, días más cortos",
        climateDescEn: "Autumn — pleasant, shorter days",
        packing: [
          { es: "Ropa de entretiempo: buzo, campera liviana", en: "Mid-season clothes: sweater, light jacket" },
          { es: "Paraguas — lluvias frecuentes en otoño porteño", en: "Umbrella — frequent rain in Buenos Aires autumn" },
        ],
        weatherAlerts: [
          { es: "Las noches pueden ser frescas (13-15°C) — llevá abrigo", en: "Evenings can be cool (13-15°C) — bring a layer" },
        ],
        tips: [
          { es: "La Feria de San Telmo es los domingos — imperdible si hay escala o estadía", en: "San Telmo market is on Sundays — unmissable for a layover or stay" },
        ],
        activities: [
          { name: "Feria de San Telmo", nameEn: "San Telmo Sunday Market", desc: "Feria al aire libre los domingos con tango en vivo, antigüedades y artesanías", descEn: "Open-air Sunday market with live tango, antiques and handicrafts" },
          { name: "Palermo Soho y Hollywood", nameEn: "Palermo Soho & Hollywood", desc: "Los barrios más trendy de BA — restaurantes, bares, diseño y vida nocturna", descEn: "BA's trendiest neighborhoods — restaurants, bars, design and nightlife" },
        ],
      },
    },
  },

};

/**
 * Returns the destination profile for a given IATA code and date.
 * Falls back to the closest available month if the exact month is not defined.
 */
export function getDestinationProfile(
  iata: string,
  isoDate: string,
): DestinationMonthProfile | null {
  const config = DESTINATIONS[iata];
  if (!config) return null;

  const month = new Date(isoDate + "T00:00:00").getMonth() + 1; // 1-12
  return config.months[month] ?? null;
}

export function getDestinationConfig(iata: string): DestinationConfig | null {
  return DESTINATIONS[iata] ?? null;
}
