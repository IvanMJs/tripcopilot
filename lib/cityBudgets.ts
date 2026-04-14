export interface CityBudget {
  city: string;
  country: string;
  /** Average hotel cost per night in USD */
  hotelPerNight: number;
  /** Average meals cost per day in USD */
  mealsPerDay: number;
  /** Average local transport cost per day in USD */
  transportPerDay: number;
}

export const CITY_BUDGETS: Record<string, CityBudget> = {
  // ── Latin America ─────────────────────────────────────────────────────────
  EZE: { city: "Buenos Aires",   country: "Argentina",  hotelPerNight: 80,  mealsPerDay: 25,  transportPerDay: 5  },
  GRU: { city: "São Paulo",      country: "Brazil",     hotelPerNight: 90,  mealsPerDay: 30,  transportPerDay: 6  },
  GIG: { city: "Rio de Janeiro", country: "Brazil",     hotelPerNight: 95,  mealsPerDay: 30,  transportPerDay: 6  },
  SCL: { city: "Santiago",       country: "Chile",      hotelPerNight: 85,  mealsPerDay: 28,  transportPerDay: 6  },
  BOG: { city: "Bogotá",         country: "Colombia",   hotelPerNight: 65,  mealsPerDay: 22,  transportPerDay: 5  },
  LIM: { city: "Lima",           country: "Peru",       hotelPerNight: 70,  mealsPerDay: 20,  transportPerDay: 5  },
  MEX: { city: "Mexico City",    country: "Mexico",     hotelPerNight: 75,  mealsPerDay: 22,  transportPerDay: 5  },
  CUN: { city: "Cancún",         country: "Mexico",     hotelPerNight: 110, mealsPerDay: 30,  transportPerDay: 10 },
  PTY: { city: "Panama City",    country: "Panama",     hotelPerNight: 85,  mealsPerDay: 25,  transportPerDay: 8  },
  MVD: { city: "Montevideo",     country: "Uruguay",    hotelPerNight: 80,  mealsPerDay: 25,  transportPerDay: 5  },

  // ── Europe ────────────────────────────────────────────────────────────────
  BCN: { city: "Barcelona",      country: "Spain",          hotelPerNight: 130, mealsPerDay: 45,  transportPerDay: 12 },
  MAD: { city: "Madrid",         country: "Spain",          hotelPerNight: 120, mealsPerDay: 42,  transportPerDay: 12 },
  FCO: { city: "Rome",           country: "Italy",          hotelPerNight: 130, mealsPerDay: 45,  transportPerDay: 10 },
  CDG: { city: "Paris",          country: "France",         hotelPerNight: 180, mealsPerDay: 60,  transportPerDay: 14 },
  LHR: { city: "London",         country: "United Kingdom", hotelPerNight: 200, mealsPerDay: 65,  transportPerDay: 18 },
  AMS: { city: "Amsterdam",      country: "Netherlands",    hotelPerNight: 160, mealsPerDay: 55,  transportPerDay: 12 },
  BER: { city: "Berlin",         country: "Germany",        hotelPerNight: 110, mealsPerDay: 40,  transportPerDay: 10 },
  LIS: { city: "Lisbon",         country: "Portugal",       hotelPerNight: 110, mealsPerDay: 38,  transportPerDay: 10 },
  ATH: { city: "Athens",         country: "Greece",         hotelPerNight: 100, mealsPerDay: 35,  transportPerDay: 8  },
  PRG: { city: "Prague",         country: "Czech Republic", hotelPerNight: 90,  mealsPerDay: 30,  transportPerDay: 8  },
  VIE: { city: "Vienna",         country: "Austria",        hotelPerNight: 130, mealsPerDay: 45,  transportPerDay: 12 },
  DUB: { city: "Dublin",         country: "Ireland",        hotelPerNight: 160, mealsPerDay: 55,  transportPerDay: 14 },

  // ── North America ─────────────────────────────────────────────────────────
  JFK: { city: "New York",       country: "USA",            hotelPerNight: 250, mealsPerDay: 70,  transportPerDay: 15 },
  MIA: { city: "Miami",          country: "USA",            hotelPerNight: 200, mealsPerDay: 60,  transportPerDay: 15 },
  LAX: { city: "Los Angeles",    country: "USA",            hotelPerNight: 220, mealsPerDay: 60,  transportPerDay: 20 },
  SFO: { city: "San Francisco",  country: "USA",            hotelPerNight: 240, mealsPerDay: 65,  transportPerDay: 18 },
  ORD: { city: "Chicago",        country: "USA",            hotelPerNight: 180, mealsPerDay: 55,  transportPerDay: 12 },
  YYZ: { city: "Toronto",        country: "Canada",         hotelPerNight: 170, mealsPerDay: 55,  transportPerDay: 13 },
  YVR: { city: "Vancouver",      country: "Canada",         hotelPerNight: 180, mealsPerDay: 55,  transportPerDay: 12 },

  // ── Asia ──────────────────────────────────────────────────────────────────
  NRT: { city: "Tokyo",          country: "Japan",          hotelPerNight: 120, mealsPerDay: 35,  transportPerDay: 12 },
  HND: { city: "Tokyo",          country: "Japan",          hotelPerNight: 120, mealsPerDay: 35,  transportPerDay: 12 },
  ICN: { city: "Seoul",          country: "South Korea",    hotelPerNight: 100, mealsPerDay: 30,  transportPerDay: 10 },
  BKK: { city: "Bangkok",        country: "Thailand",       hotelPerNight: 60,  mealsPerDay: 18,  transportPerDay: 8  },
  SIN: { city: "Singapore",      country: "Singapore",      hotelPerNight: 160, mealsPerDay: 40,  transportPerDay: 10 },
  HKG: { city: "Hong Kong",      country: "Hong Kong",      hotelPerNight: 150, mealsPerDay: 45,  transportPerDay: 10 },
  DXB: { city: "Dubai",          country: "UAE",            hotelPerNight: 130, mealsPerDay: 40,  transportPerDay: 12 },
  DEL: { city: "New Delhi",      country: "India",          hotelPerNight: 70,  mealsPerDay: 20,  transportPerDay: 6  },

  // ── Oceania ───────────────────────────────────────────────────────────────
  SYD: { city: "Sydney",         country: "Australia",      hotelPerNight: 180, mealsPerDay: 55,  transportPerDay: 14 },
  AKL: { city: "Auckland",       country: "New Zealand",    hotelPerNight: 150, mealsPerDay: 50,  transportPerDay: 12 },
};
