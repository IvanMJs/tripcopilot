import { NextResponse } from "next/server";

// 10.000 ARS is the monthly plan price
const ARS_AMOUNT = 10_000;

export async function GET() {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 3600 }, // cache for 1 hour
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as { rates?: Record<string, number> };
    const arsPerUsd = data.rates?.ARS;
    if (!arsPerUsd) throw new Error("No ARS rate in response");
    const usd = Math.round((ARS_AMOUNT / arsPerUsd) * 10) / 10;
    return NextResponse.json({ usd, ars: ARS_AMOUNT });
  } catch {
    return NextResponse.json({ usd: null, ars: ARS_AMOUNT });
  }
}
