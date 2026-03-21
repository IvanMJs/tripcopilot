import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

// ── DB row types ───────────────────────────────────────────────────────────────

interface DbFlight {
  id: string;
  flight_code: string;
  airline_name: string;
  origin_code: string;
  destination_code: string;
  iso_date: string;
  departure_time: string | null;
  arrival_date: string | null;
  arrival_time: string | null;
}

interface DbAccommodation {
  id: string;
  name: string;
  check_in_date: string | null;
  check_in_time: string | null;
  check_out_date: string | null;
  check_out_time: string | null;
  confirmation_code: string | null;
  address: string | null;
  flight_id: string | null;
}

interface TripData {
  id: string;
  name: string;
  flights: DbFlight[];
  accommodations: DbAccommodation[];
}

// ── Data fetching ──────────────────────────────────────────────────────────────

async function getTripById(tripId: string): Promise<TripData | null> {
  const supabase = await createClient();

  const { data: trip, error } = await supabase
    .from("trips")
    .select("id, name, flights(*), accommodations(*)")
    .eq("id", tripId)
    .single();

  if (error || !trip) return null;
  return trip as TripData;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(isoDate: string): string {
  return new Date(isoDate + "T00:00:00").toLocaleDateString("es-AR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function formatDateShort(isoDate: string): string {
  return new Date(isoDate + "T00:00:00").toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

// ── Page ───────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ tripId: string }>;
}

export default async function PrintTripPage({ params }: PageProps) {
  const { tripId } = await params;
  const trip = await getTripById(tripId);

  if (!trip) notFound();

  const sortedFlights = [...trip.flights].sort((a, b) => {
    const d = a.iso_date.localeCompare(b.iso_date);
    return d !== 0 ? d : (a.departure_time ?? "").localeCompare(b.departure_time ?? "");
  });

  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{trip.name} — TripCopilot</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 13px;
            color: #111;
            background: #fff;
            padding: 24px;
            max-width: 800px;
            margin: 0 auto;
          }
          h1 { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
          h2 { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #666; margin-bottom: 12px; }
          .header { border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
          .header-meta { font-size: 11px; color: #666; text-align: right; }
          .flight-card { border: 1px solid #ddd; border-radius: 8px; margin-bottom: 12px; overflow: hidden; page-break-inside: avoid; }
          .flight-header { background: #f5f5f5; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
          .flight-code { font-size: 18px; font-weight: 900; letter-spacing: 0.04em; }
          .flight-route { font-size: 15px; font-weight: 700; }
          .flight-airline { font-size: 11px; color: #555; margin-top: 2px; }
          .flight-date { text-align: right; font-size: 12px; color: #333; }
          .flight-time { font-size: 14px; font-weight: 700; margin-top: 2px; }
          .flight-body { padding: 10px 14px; display: flex; gap: 20px; flex-wrap: wrap; }
          .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #888; margin-bottom: 2px; }
          .value { font-size: 12px; font-weight: 600; }
          .acc-card { border: 1px solid #ddd; border-left: 3px solid #6366f1; border-radius: 8px; margin-bottom: 12px; padding: 10px 14px; page-break-inside: avoid; }
          .acc-name { font-size: 15px; font-weight: 700; margin-bottom: 4px; }
          .acc-meta { font-size: 12px; color: #555; display: flex; gap: 16px; flex-wrap: wrap; }
          .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #888; margin: 16px 0 8px; }
          .footer { border-top: 1px solid #eee; margin-top: 24px; padding-top: 10px; font-size: 11px; color: #aaa; display: flex; justify-content: space-between; }
          .print-btn { display: inline-flex; align-items: center; gap: 6px; background: #111; color: #fff; border: none; border-radius: 8px; padding: 10px 18px; font-size: 13px; font-weight: 600; cursor: pointer; margin-bottom: 20px; }
          .print-btn:hover { background: #333; }
          @media print {
            body { margin: 0; padding: 16px; }
            .no-print { display: none !important; }
            @page { margin: 1cm; }
          }
        `}</style>
      </head>
      <body>
        {/* Print / Save PDF button */}
        <div className="no-print">
          <button
            className="print-btn"
            onClick={() => { /* handled inline below */ }}
          >
            🖨️ Imprimir / Guardar PDF
          </button>
          <script
            dangerouslySetInnerHTML={{
              __html: `
                document.querySelector('.print-btn').addEventListener('click', function() {
                  window.print();
                });
              `,
            }}
          />
        </div>

        {/* Header */}
        <div className="header">
          <div>
            <h1>{trip.name}</h1>
            <p style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>
              {sortedFlights.length} vuelo{sortedFlights.length !== 1 ? "s" : ""}
              {trip.accommodations.length > 0
                ? ` · ${trip.accommodations.length} alojamiento${trip.accommodations.length !== 1 ? "s" : ""}`
                : ""}
            </p>
          </div>
          <div className="header-meta">
            <p>TripCopilot</p>
            <p>Generado el {new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })}</p>
          </div>
        </div>

        {/* Flights */}
        {sortedFlights.length > 0 && (
          <>
            <p className="section-title">Vuelos</p>
            {sortedFlights.map((flight, idx) => (
              <div key={flight.id} className="flight-card">
                <div className="flight-header">
                  <div>
                    <div className="flight-code">{flight.flight_code}</div>
                    <div className="flight-airline">{flight.airline_name}</div>
                  </div>
                  <div style={{ flex: 1, textAlign: "center" }}>
                    <div className="flight-route">
                      {flight.origin_code} → {flight.destination_code}
                    </div>
                  </div>
                  <div className="flight-date">
                    <div>{formatDate(flight.iso_date)}</div>
                    {flight.departure_time && (
                      <div className="flight-time">
                        Sale {flight.departure_time}
                        {flight.arrival_time && (
                          <span style={{ color: "#555", fontWeight: 500 }}>
                            {" "}→ Llega {flight.arrival_time}
                            {flight.arrival_date && flight.arrival_date !== flight.iso_date
                              ? ` (${formatDateShort(flight.arrival_date)})`
                              : ""}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flight-body">
                  <div>
                    <div className="label">Vuelo #</div>
                    <div className="value">{idx + 1} de {sortedFlights.length}</div>
                  </div>
                  <div>
                    <div className="label">Fecha de salida</div>
                    <div className="value">{formatDateShort(flight.iso_date)}</div>
                  </div>
                  {flight.departure_time && (
                    <div>
                      <div className="label">Hora de salida</div>
                      <div className="value">{flight.departure_time}</div>
                    </div>
                  )}
                  {flight.arrival_time && (
                    <div>
                      <div className="label">Hora de llegada</div>
                      <div className="value">
                        {flight.arrival_time}
                        {flight.arrival_date && flight.arrival_date !== flight.iso_date
                          ? ` (+1 día)`
                          : ""}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        {/* Accommodations */}
        {trip.accommodations.length > 0 && (
          <>
            <p className="section-title">Alojamientos</p>
            {trip.accommodations.map((acc) => (
              <div key={acc.id} className="acc-card">
                <div className="acc-name">{acc.name}</div>
                <div className="acc-meta">
                  {acc.check_in_date && (
                    <span>Check-in: {formatDateShort(acc.check_in_date)}{acc.check_in_time ? ` ${acc.check_in_time}` : ""}</span>
                  )}
                  {acc.check_out_date && (
                    <span>Check-out: {formatDateShort(acc.check_out_date)}{acc.check_out_time ? ` ${acc.check_out_time}` : ""}</span>
                  )}
                  {acc.confirmation_code && (
                    <span>Confirmación: {acc.confirmation_code}</span>
                  )}
                  {acc.address && (
                    <span>📍 {acc.address}</span>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        {/* Footer */}
        <div className="footer">
          <span>TripCopilot — tripcopliot.vercel.app</span>
          <span>{trip.name}</span>
        </div>
      </body>
    </html>
  );
}
