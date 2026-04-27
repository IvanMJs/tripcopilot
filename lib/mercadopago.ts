import { MercadoPagoConfig, PreApproval } from "mercadopago";

// Server-side MP client — lazy singleton
let _mp: MercadoPagoConfig | null = null;
export function getMP(): MercadoPagoConfig {
  if (!_mp) {
    if (!process.env.MP_ACCESS_TOKEN) {
      throw new Error("MP_ACCESS_TOKEN is not set");
    }
    try {
      _mp = new MercadoPagoConfig({
        accessToken: process.env.MP_ACCESS_TOKEN,
        options: { timeout: 5000 },
      });
    } catch (error) {
      console.error("Error initializing MercadoPagoConfig", error);
      throw error;
    }
  }
  return _mp;
}

export interface Plan {
  name: string;
  maxTrips?: number;
  maxFlightsPerTrip?: number;
  features?: string[];
  mpAmount?: number;
  mpAnnualAmount?: number;
  mpCurrencyId?: string;
  annualPriceARS?: number;
}

export const PLANS = {
  free: {
    name: "Free",
    maxTrips: 5,
    maxFlightsPerTrip: 10,
    features: ["5 viajes", "10 vuelos por viaje", "Alertas básicas de check-in"],
  },
  explorer: {
    name: "Explorer",
    mpAmount: Number(process.env.MP_EXPLORER_AMOUNT ?? "500000"),
    // Annual: 10 months price (2 months free = 17% off)
    mpAnnualAmount: Number(process.env.MP_EXPLORER_ANNUAL_AMOUNT ?? "5000000"),
    mpCurrencyId: process.env.MP_CURRENCY_ID ?? "ARS",
    annualPriceARS: 5_000_000,
    maxTrips: 10,
    maxFlightsPerTrip: 15,
    features: [
      "10 viajes · 15 vuelos c/u",
      "Todas las notificaciones push",
      "AI TripAdvisor",
      "Mapa mundial de viajes",
      "Travel Wrapped compartible",
      "Trip Debrief",
      "Export .ics / CSV",
    ],
  },
  pilot: {
    name: "Pilot",
    mpAmount: Number(process.env.MP_PILOT_AMOUNT ?? "1000000"),
    // Annual: 10 months price (2 months free = 17% off)
    mpAnnualAmount: Number(process.env.MP_PILOT_ANNUAL_AMOUNT ?? "10000000"),
    mpCurrencyId: process.env.MP_CURRENCY_ID ?? "ARS",
    annualPriceARS: 10_000_000,
    maxTrips: Infinity,
    maxFlightsPerTrip: Infinity,
    features: [
      "Viajes y vuelos ilimitados",
      "Todo lo de Explorer",
      "AI Health Check 48h antes",
      "Viajes compartidos",
      "Morning Briefing semanal",
      "Soporte prioritario",
    ],
  },
} as const;

export type PlanId = keyof typeof PLANS;

// Re-export PreApproval so consumers don't need to import from mercadopago directly
export { PreApproval };