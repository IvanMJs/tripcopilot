import type { TripExpense, TripTab } from "./types";

// UTF-8 BOM for Excel compatibility
const BOM = "\uFEFF";

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function triggerDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportExpensesCSV(expenses: TripExpense[], tripName: string): void {
  const header = ["Date", "Category", "Description", "Amount", "Currency"];
  const rows = expenses.map((e) => [
    e.expenseDate ?? "",
    e.category,
    e.description ?? "",
    e.amount.toString(),
    e.currency,
  ]);

  const csvContent =
    BOM +
    [header, ...rows]
      .map((row) => row.map(escapeCsvField).join(","))
      .join("\n");

  const safeName = tripName.replace(/[^a-zA-Z0-9\s-_]/g, "").replace(/\s+/g, "-");
  triggerDownload(csvContent, `${safeName}-expenses.csv`, "text/csv;charset=utf-8");
}

export function exportTripJSON(trip: TripTab): void {
  const data = JSON.stringify(trip, null, 2);
  const safeName = trip.name.replace(/[^a-zA-Z0-9\s-_]/g, "").replace(/\s+/g, "-");
  triggerDownload(data, `${safeName}-backup.json`, "application/json");
}

export function exportAllTripsJSON(trips: TripTab[]): void {
  const data = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      tripCount: trips.length,
      trips,
    },
    null,
    2,
  );
  triggerDownload(data, "tripcopilot-all-trips.json", "application/json");
}
