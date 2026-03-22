import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { TripFlight } from "@/lib/types";
import { AIRPORTS } from "@/lib/airports";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { flight?: TripFlight; passengerName?: string };
  try {
    body = await request.json() as { flight?: TripFlight; passengerName?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { flight, passengerName } = body;

  if (!flight || !flight.flightCode || !flight.originCode || !flight.destinationCode) {
    return NextResponse.json({ error: "Missing required flight fields" }, { status: 400 });
  }

  const originInfo = AIRPORTS[flight.originCode];
  const destInfo   = AIRPORTS[flight.destinationCode];
  const originCity = originInfo?.city ?? flight.originCode;
  const destCity   = destInfo?.city   ?? flight.destinationCode;

  const cabinLabels: Record<string, string> = {
    economy:         "Economy",
    premium_economy: "Premium Economy",
    business:        "Business",
    first:           "First Class",
  };
  const cabinLabel = cabinLabels[flight.cabinClass ?? "economy"] ?? "Economy";

  const [year, month, day] = (flight.isoDate ?? "").split("-");
  const dateFormatted = year && month && day
    ? new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        .toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : flight.isoDate ?? "";

  const displayName = passengerName?.trim() || "PASSENGER";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Boarding Pass — ${flight.flightCode}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f0f4f8;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }
    .ticket {
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.12);
      max-width: 680px;
      width: 100%;
      overflow: hidden;
    }
    .ticket-header {
      background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%);
      color: #fff;
      padding: 20px 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .ticket-header .airline {
      font-size: 13px;
      font-weight: 600;
      opacity: 0.8;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .ticket-header .flight-num {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .ticket-header .bp-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      opacity: 0.7;
      text-align: right;
    }
    .ticket-body {
      padding: 24px 28px;
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 16px;
      align-items: center;
    }
    .airport-block { }
    .airport-code {
      font-size: 48px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.03em;
      line-height: 1;
    }
    .airport-city {
      font-size: 13px;
      color: #64748b;
      font-weight: 500;
      margin-top: 4px;
    }
    .airport-name {
      font-size: 11px;
      color: #94a3b8;
      margin-top: 2px;
    }
    .route-arrow {
      text-align: center;
      color: #2563eb;
    }
    .route-arrow svg { display: block; margin: 0 auto; }
    .ticket-details {
      padding: 0 28px 24px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      border-top: 1px dashed #e2e8f0;
      padding-top: 20px;
    }
    .detail-block { }
    .detail-label {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #94a3b8;
      margin-bottom: 4px;
    }
    .detail-value {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
    }
    .ticket-footer {
      padding: 20px 28px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .passenger-name {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .passenger-sub {
      font-size: 11px;
      color: #94a3b8;
      margin-top: 2px;
    }
    .qr-placeholder {
      width: 80px;
      height: 80px;
      flex-shrink: 0;
    }
    .notice {
      background: #fef9c3;
      border: 1px solid #fde047;
      border-radius: 8px;
      padding: 10px 16px;
      font-size: 11px;
      color: #713f12;
      margin: 0 28px 20px;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .ticket { box-shadow: none; max-width: 100%; border-radius: 0; }
      .notice { display: none; }
    }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="ticket-header">
      <div>
        <div class="airline">${flight.airlineName ?? flight.airlineCode ?? ""}</div>
        <div class="flight-num">${flight.flightCode}</div>
      </div>
      <div class="bp-label">Boarding<br/>Pass</div>
    </div>

    <div class="ticket-body">
      <div class="airport-block">
        <div class="airport-code">${flight.originCode}</div>
        <div class="airport-city">${originCity}</div>
        <div class="airport-name">${originInfo?.name ?? ""}</div>
      </div>
      <div class="route-arrow">
        <svg width="40" height="24" viewBox="0 0 40 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 12H38M28 4L38 12L28 20" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="airport-block" style="text-align:right">
        <div class="airport-code">${flight.destinationCode}</div>
        <div class="airport-city">${destCity}</div>
        <div class="airport-name">${destInfo?.name ?? ""}</div>
      </div>
    </div>

    <div class="ticket-details">
      <div class="detail-block">
        <div class="detail-label">Date</div>
        <div class="detail-value">${dateFormatted}</div>
      </div>
      <div class="detail-block">
        <div class="detail-label">Departure</div>
        <div class="detail-value">${flight.departureTime || "—"}</div>
      </div>
      <div class="detail-block">
        <div class="detail-label">Class</div>
        <div class="detail-value">${cabinLabel}</div>
      </div>
      <div class="detail-block">
        <div class="detail-label">Arrival</div>
        <div class="detail-value">${flight.arrivalTime || "—"}</div>
      </div>
    </div>

    <div class="ticket-footer">
      <div>
        <div class="passenger-name">${displayName}</div>
        <div class="passenger-sub">Passenger</div>
      </div>
      <svg class="qr-placeholder" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
        <rect width="80" height="80" fill="#f1f5f9"/>
        <rect x="4" y="4" width="28" height="28" rx="2" fill="none" stroke="#0f172a" stroke-width="2"/>
        <rect x="9" y="9" width="18" height="18" fill="#0f172a"/>
        <rect x="48" y="4" width="28" height="28" rx="2" fill="none" stroke="#0f172a" stroke-width="2"/>
        <rect x="53" y="9" width="18" height="18" fill="#0f172a"/>
        <rect x="4" y="48" width="28" height="28" rx="2" fill="none" stroke="#0f172a" stroke-width="2"/>
        <rect x="9" y="53" width="18" height="18" fill="#0f172a"/>
        <rect x="48" y="48" width="8" height="8" fill="#0f172a"/>
        <rect x="60" y="48" width="8" height="8" fill="#0f172a"/>
        <rect x="48" y="60" width="8" height="8" fill="#0f172a"/>
        <rect x="60" y="60" width="8" height="8" fill="#0f172a"/>
        <rect x="38" y="38" width="4" height="4" fill="#0f172a"/>
      </svg>
    </div>

    <div class="notice">
      This is a visual summary generated by TripCopilot. It is not a valid boarding pass. Use the official boarding pass provided by your airline.
    </div>
  </div>
</body>
</html>`;

  return NextResponse.json({ html });
}
