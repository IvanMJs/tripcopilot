// ── Trip PDF Report ────────────────────────────────────────────────────────────
// Generates a print-optimized HTML string for a trip summary.
// Opens in a new window for printing/saving as PDF via window.print().

import { TripTab, TripFlight, Accommodation, Passenger, TripExpense } from "@/lib/types";

export interface TripReportOptions {
  trip: TripTab;
  locale: "es" | "en";
  expenses?: TripExpense[];
  checklistDone?: number;
  checklistTotal?: number;
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDate(isoDate: string, locale: "es" | "en"): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(
    locale === "es" ? "es-AR" : "en-US",
    { weekday: "short", day: "2-digit", month: "short", year: "numeric" },
  );
}

function maskPassport(doc: string | undefined): string {
  if (!doc) return "—";
  if (doc.length <= 4) return "*".repeat(doc.length);
  return "*".repeat(doc.length - 4) + doc.slice(-4);
}

function buildFlightsTable(flights: TripFlight[], locale: "es" | "en"): string {
  const thFlight   = locale === "es" ? "Vuelo"      : "Flight";
  const thRoute    = locale === "es" ? "Ruta"        : "Route";
  const thDate     = locale === "es" ? "Fecha"       : "Date";
  const thDep      = locale === "es" ? "Salida"      : "Departure";
  const thArr      = locale === "es" ? "Llegada"     : "Arrival";
  const thAirline  = locale === "es" ? "Aerolínea"   : "Airline";

  const rows = flights.map((f) => `
    <tr>
      <td>${escHtml(f.flightCode)}</td>
      <td>${escHtml(f.originCode)} → ${escHtml(f.destinationCode)}</td>
      <td>${escHtml(fmtDate(f.isoDate, locale))}</td>
      <td>${escHtml(f.departureTime || "—")}</td>
      <td>${escHtml(f.arrivalTime || "—")}</td>
      <td>${escHtml(f.airlineName)}</td>
    </tr>`).join("");

  return `
    <table>
      <thead>
        <tr>
          <th>${thFlight}</th><th>${thRoute}</th><th>${thDate}</th>
          <th>${thDep}</th><th>${thArr}</th><th>${thAirline}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function buildAccommodationList(accommodations: Accommodation[], locale: "es" | "en"): string {
  if (accommodations.length === 0) return `<p class="empty">${locale === "es" ? "Sin alojamientos" : "No accommodations"}</p>`;
  const items = accommodations.map((a) => `
    <div class="accom-item">
      <strong>${escHtml(a.name)}</strong>
      ${a.address ? `<div class="detail">${escHtml(a.address)}</div>` : ""}
      ${a.checkInDate && a.checkOutDate
        ? `<div class="detail">${escHtml(fmtDate(a.checkInDate, locale))} → ${escHtml(fmtDate(a.checkOutDate, locale))}</div>`
        : ""}
      ${a.confirmationCode ? `<div class="detail">${locale === "es" ? "Conf." : "Conf."}: ${escHtml(a.confirmationCode)}</div>` : ""}
    </div>`).join("");
  return `<div class="accom-list">${items}</div>`;
}

function buildExpensesTable(expenses: TripExpense[], locale: "es" | "en"): string {
  if (expenses.length === 0) return `<p class="empty">${locale === "es" ? "Sin gastos registrados" : "No expenses recorded"}</p>`;

  // Group by currency
  const totals: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  for (const e of expenses) {
    totals[e.currency] = (totals[e.currency] ?? 0) + e.amount;
    byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
  }

  const categoryRows = Object.entries(byCategory).map(([cat, amt]) => {
    const label = locale === "es"
      ? { flight: "Vuelo", hotel: "Hotel", food: "Comida", transport: "Transporte", activity: "Actividad", other: "Otro" }[cat] ?? cat
      : cat.charAt(0).toUpperCase() + cat.slice(1);
    return `<tr><td>${escHtml(label)}</td><td>${amt.toFixed(2)}</td></tr>`;
  }).join("");

  const totalRows = Object.entries(totals).map(([cur, amt]) =>
    `<tr class="total-row"><td>${escHtml(cur)} Total</td><td>${amt.toFixed(2)}</td></tr>`,
  ).join("");

  return `
    <table class="expenses-table">
      <thead><tr><th>${locale === "es" ? "Categoría" : "Category"}</th><th>${locale === "es" ? "Monto" : "Amount"}</th></tr></thead>
      <tbody>${categoryRows}${totalRows}</tbody>
    </table>`;
}

function buildPassengerList(passengers: Passenger[], locale: "es" | "en"): string {
  if (!passengers || passengers.length === 0) {
    return `<p class="empty">${locale === "es" ? "Sin pasajeros registrados" : "No passengers recorded"}</p>`;
  }
  const rows = passengers.map((p) => `
    <tr>
      <td>${escHtml(p.name)}</td>
      <td>${escHtml(p.email ?? "—")}</td>
    </tr>`).join("");
  return `
    <table>
      <thead><tr><th>${locale === "es" ? "Nombre" : "Name"}</th><th>Email</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function tripDateRange(flights: TripFlight[], locale: "es" | "en"): string {
  if (flights.length === 0) return "";
  const sorted = [...flights].sort((a, b) => a.isoDate.localeCompare(b.isoDate));
  const first = sorted[0].isoDate;
  const last  = sorted[sorted.length - 1].isoDate;
  if (first === last) return fmtDate(first, locale);
  return `${fmtDate(first, locale)} — ${fmtDate(last, locale)}`;
}

export function generateTripReportHtml(opts: TripReportOptions): string {
  const { trip, locale, expenses = [], checklistDone, checklistTotal } = opts;

  const L = {
    flights:      locale === "es" ? "Vuelos"        : "Flights",
    accommodations: locale === "es" ? "Alojamientos" : "Accommodations",
    expenses:     locale === "es" ? "Gastos"         : "Expenses",
    passengers:   locale === "es" ? "Pasajeros"      : "Passengers",
    checklist:    locale === "es" ? "Checklist"      : "Checklist",
    checklistSummary: (done: number, total: number) =>
      locale === "es"
        ? `${done} de ${total} ítems completados`
        : `${done} of ${total} items completed`,
    generated:    locale === "es" ? "Generado con TripCopilot" : "Generated with TripCopilot",
    printTitle:   locale === "es" ? "Imprimir / Guardar PDF"   : "Print / Save as PDF",
  };

  const dateRange = tripDateRange(trip.flights, locale);
  const flightsHtml = buildFlightsTable(trip.flights, locale);
  const accomHtml   = buildAccommodationList(trip.accommodations, locale);
  const expensesHtml = buildExpensesTable(expenses, locale);
  const passengersHtml = buildPassengerList(trip.passengers ?? [], locale);

  const checklistHtml = checklistTotal != null && checklistTotal > 0
    ? `<p>${L.checklistSummary(checklistDone ?? 0, checklistTotal)}</p>`
    : `<p class="empty">${locale === "es" ? "Sin ítems de checklist" : "No checklist items"}</p>`;

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(trip.name)} — TripCopilot</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 12px;
      color: #111;
      background: #fff;
      margin: 0;
      padding: 32px;
    }
    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      border-bottom: 2px solid #111;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .brand {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #6366f1;
    }
    h1 { font-size: 22px; margin: 4px 0; font-weight: 800; }
    .date-range { color: #555; font-size: 12px; }
    h2 {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #555;
      margin: 20px 0 8px;
      border-bottom: 1px solid #e5e5e5;
      padding-bottom: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 4px;
    }
    th, td {
      text-align: left;
      padding: 6px 8px;
      border-bottom: 1px solid #e5e5e5;
    }
    th {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #888;
      background: #fafafa;
    }
    tr:last-child td { border-bottom: none; }
    .total-row td { font-weight: 700; background: #f5f5f5; }
    .accom-list { display: flex; flex-direction: column; gap: 8px; }
    .accom-item { padding: 8px 0; border-bottom: 1px solid #e5e5e5; }
    .accom-item strong { display: block; font-size: 13px; }
    .detail { color: #666; margin-top: 2px; }
    .empty { color: #aaa; font-style: italic; margin: 4px 0; }
    .footer {
      margin-top: 32px;
      padding-top: 12px;
      border-top: 1px solid #e5e5e5;
      display: flex;
      justify-content: space-between;
      color: #aaa;
      font-size: 10px;
    }
    .print-btn {
      display: block;
      margin: 0 auto 24px;
      padding: 10px 24px;
      background: #6366f1;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
    }
    @media print {
      .print-btn { display: none; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">${L.printTitle}</button>

  <div class="header">
    <div>
      <div class="brand">TripCopilot</div>
      <h1>${escHtml(trip.name)}</h1>
      ${dateRange ? `<div class="date-range">${escHtml(dateRange)}</div>` : ""}
    </div>
    <div class="date-range">${new Date().toLocaleDateString(locale === "es" ? "es-AR" : "en-US", { year: "numeric", month: "short", day: "numeric" })}</div>
  </div>

  <h2>${L.flights} (${trip.flights.length})</h2>
  ${flightsHtml}

  <h2>${L.accommodations} (${trip.accommodations.length})</h2>
  ${accomHtml}

  <h2>${L.expenses}</h2>
  ${expensesHtml}

  <h2>${L.passengers}</h2>
  ${passengersHtml}

  <h2>${L.checklist}</h2>
  ${checklistHtml}

  <div class="footer">
    <span>${L.generated}</span>
    <span>TripCopilot &copy; ${new Date().getFullYear()}</span>
  </div>

  <script>
    setTimeout(function() { window.print(); }, 600);
  <\/script>
</body>
</html>`;
}

/**
 * Opens the trip report in a new window and triggers the print dialog.
 * Returns false if the popup was blocked.
 */
export function openTripReportPrint(opts: TripReportOptions): boolean {
  const html = generateTripReportHtml(opts);
  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  return true;
}
