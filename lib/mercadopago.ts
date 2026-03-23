import { MercadoPagoConfig, PreApproval } from "mercadopago";

// Server-side MP client — lazy singleton
let _mp: MercadoPagoConfig | null = null;
export function getMP(): MercadoPagoConfig {
  if (!_mp) {
    if (!process.env.MP_ACCESS_TOKEN) {
      throw new Error("MP_ACCESS_TOKEN is not set");
    }
    _mp = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN,
      options: { timeout: 5000 },
    });
  }
  return _mp;
}

export const PLANS = {
  free: {
    name: "Free",
    maxTrips: 2,
    maxFlightsPerTrip: 5,
    features: ["Alertas básicas", "Importar boarding pass"],
  },
  premium: {
    name: "Premium",
    mpAmount: Number(process.env.MP_PRICE_AMOUNT ?? "1000000"), // 10.000 ARS in centavos
    mpCurrencyId: process.env.MP_CURRENCY_ID ?? "ARS",
    maxTrips: Infinity,
    maxFlightsPerTrip: Infinity,
    features: [
      "Viajes ilimitados",
      "AI Travel Assistant",
      "Colaboradores",
      "Export PDF",
      "Alertas de precio",
    ],
  },
} as const;

export type PlanId = keyof typeof PLANS;

// Re-export PreApproval so consumers don't need to import from mercadopago directly
export { PreApproval };
