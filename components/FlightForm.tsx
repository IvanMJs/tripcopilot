"use client";

import { useState } from "react";
import { Plus, Search, AlertTriangle, Sparkles } from "lucide-react";
import { TripFlight } from "@/lib/types";
import { AIRLINES, parseFlightCode } from "@/lib/flightUtils";
import { analytics } from "@/lib/analytics";

// ── Airline preview map ────────────────────────────────────────────────────────
const AIRLINE_NAMES: Record<string, string> = {
  AA: "American Airlines", AR: "Aerolíneas Argentinas", LA: "LATAM",
  AV: "Avianca", CM: "Copa Airlines", UA: "United Airlines",
  DL: "Delta Air Lines", BA: "British Airways", IB: "Iberia",
  AF: "Air France", KL: "KLM", LH: "Lufthansa", EK: "Emirates",
  QR: "Qatar Airways", TK: "Turkish Airlines", G3: "Gol", JJ: "LATAM Brasil",
  AM: "Aeroméxico", VB: "VivaAerobus", Y4: "Volaris", FR: "Ryanair",
  U2: "easyJet", W6: "Wizz Air", NK: "Spirit", B6: "JetBlue", WN: "Southwest",
};

// ── Labels ────────────────────────────────────────────────────────────────────

// Subset of LABELS used by this component
type FlightFormLabels = {
  addTitle:           string;
  flightPlaceholder:  string;
  originPlaceholder:  string;
  destPlaceholder:    string;
  bufferLabel:        string;
  addBtn:             string;
  importBtn:          string;
  bufferOptions:      { value: number; label: string }[];
  errInvalidCode:     string;
  errUnknownAirline:  string;
  errUnknownOrigin:   string;
  errUnknownDest:     string;
  errSameAirport:     string;
  errMissingDate:     string;
  errDuplicateFlight: (code: string) => string;
  warnCloseTimeTitle: string;
  warnCloseTime:      (code: string, mins: number) => string;
  confirmAnyway:      string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const BLANK_FORM = {
  flightCode:    "",
  originCode:    "",
  destCode:      "",
  isoDate:       "",
  departureTime: "",
  arrivalBuffer: 2 as number,
};

function checkFlightConflicts(
  newFlight: TripFlight,
  existing: TripFlight[],
  L: FlightFormLabels,
): { type: "hard" | "soft"; message: string } | null {
  // Hard: exact duplicate (same code + same date)
  const dup = existing.find(
    (f) => f.flightCode.toUpperCase() === newFlight.flightCode.toUpperCase() && f.isoDate === newFlight.isoDate,
  );
  if (dup) return { type: "hard", message: L.errDuplicateFlight(newFlight.flightCode) };

  // Soft: same date, departure within 90 min
  if (newFlight.departureTime) {
    const [nh, nm] = newFlight.departureTime.split(":").map(Number);
    const newMins = nh * 60 + nm;
    for (const f of existing) {
      if (f.isoDate === newFlight.isoDate && f.departureTime) {
        const [fh, fm] = f.departureTime.split(":").map(Number);
        const diff = Math.abs(newMins - fh * 60 - fm);
        if (diff < 90) {
          return { type: "soft", message: L.warnCloseTime(f.flightCode, diff) };
        }
      }
    }
  }

  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface AddFlightFormProps {
  tripId: string;
  existingFlights: TripFlight[];
  onAdd: (tripId: string, flight: TripFlight) => void;
  onOpenImport: () => void;
  locale: "es" | "en";
  L: FlightFormLabels;
}

export function AddFlightForm({ tripId, existingFlights, onAdd, onOpenImport, locale, L }: AddFlightFormProps) {
  const [form, setForm] = useState(BLANK_FORM);
  const [error, setError] = useState("");
  const [pendingFlight, setPendingFlight] = useState<{ flight: TripFlight; message: string } | null>(null);

  function update(field: keyof typeof BLANK_FORM, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  }

  function handleAdd() {
    setError("");
    const parsed = parseFlightCode(form.flightCode);
    if (!parsed) {
      const clean = form.flightCode.trim().toUpperCase().replace(/\s+/g, "");
      const codeMatch = clean.match(/^([A-Z]{2,3}|[A-Z0-9]{2})\d+$/);
      setError(codeMatch && !AIRLINES[codeMatch[1]] ? L.errUnknownAirline : L.errInvalidCode);
      return;
    }
    const origin = form.originCode.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(origin)) { setError(L.errUnknownOrigin); return; }
    const dest = form.destCode.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(dest)) { setError(L.errUnknownDest); return; }
    if (origin === dest)  { setError(L.errSameAirport); return; }
    if (!form.isoDate)    { setError(L.errMissingDate); return; }

    const newFlight: TripFlight = {
      id:              `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
      flightCode:      parsed.fullCode,
      airlineCode:     parsed.airlineCode,
      airlineName:     parsed.airlineName,
      airlineIcao:     parsed.airlineIcao,
      flightNumber:    parsed.flightNumber,
      originCode:      origin,
      destinationCode: dest,
      isoDate:         form.isoDate,
      departureTime:   form.departureTime,
      arrivalBuffer:   form.arrivalBuffer,
    };

    const conflict = checkFlightConflicts(newFlight, existingFlights, L);
    if (conflict?.type === "hard") { setError(conflict.message); return; }
    if (conflict?.type === "soft") { setPendingFlight({ flight: newFlight, message: conflict.message }); return; }

    analytics.flightAdded({ airline: parsed.airlineCode, origin, destination: dest });
    onAdd(tripId, newFlight);
    setForm(BLANK_FORM);
  }

  function confirmPending() {
    if (!pendingFlight) return;
    analytics.flightAdded({
      airline: pendingFlight.flight.airlineCode,
      origin: pendingFlight.flight.originCode,
      destination: pendingFlight.flight.destinationCode,
    });
    onAdd(tripId, pendingFlight.flight);
    setForm(BLANK_FORM);
    setPendingFlight(null);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleAdd();
  }

  const isValidFlightCode = /^[A-Z]{2}\d{1,4}$/.test(form.flightCode);
  const showValidation = form.flightCode.length >= 3;
  const airlinePreviewCode = form.flightCode.slice(0, 2).toUpperCase();
  const airlinePreviewName = form.flightCode.length >= 2 ? AIRLINE_NAMES[airlinePreviewCode] : undefined;

  const inputClass =
    "w-full rounded-xl border border-white/[0.12] bg-[#080810] px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500/70";
  const labelClass =
    "block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5";

  return (
    <div
      className="rounded-xl border border-white/[0.08] p-4 space-y-4"
      style={{ background: "linear-gradient(135deg, rgba(15,15,23,0.8) 0%, rgba(10,10,18,0.9) 100%)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="h-3.5 w-3.5 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-300">{L.addTitle}</h3>
        </div>
        <button
          onClick={onOpenImport}
          className="btn-primary flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
        >
          <Sparkles className="h-3 w-3" />
          {L.importBtn}
        </button>
      </div>

      {/* Row 1: Flight code — full width */}
      <div>
        <label className={labelClass}>
          {locale === "es" ? "Código de vuelo" : "Flight code"}
        </label>
        <div className="relative">
          <input
            value={form.flightCode}
            onChange={(e) => update("flightCode", e.target.value.toUpperCase())}
            onKeyDown={handleKey}
            placeholder={L.flightPlaceholder}
            className={inputClass + " pr-16"}
          />
          {showValidation && (
            <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium ${isValidFlightCode ? "text-green-400" : "text-red-400"}`}>
              {isValidFlightCode ? "✓" : "AA1234"}
            </span>
          )}
        </div>
        {airlinePreviewName && (
          <p className="mt-1 text-xs text-violet-400">{airlinePreviewName}</p>
        )}
      </div>

      {/* Row 2: Origin · Destination · Date */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>
            {locale === "es" ? "Origen" : "Origin"}
          </label>
          <input
            value={form.originCode}
            onChange={(e) => update("originCode", e.target.value.toUpperCase())}
            onKeyDown={handleKey}
            placeholder="EZE"
            maxLength={3}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>
            {locale === "es" ? "Destino" : "Destination"}
          </label>
          <input
            value={form.destCode}
            onChange={(e) => update("destCode", e.target.value.toUpperCase())}
            onKeyDown={handleKey}
            placeholder="MIA"
            maxLength={3}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>
            {locale === "es" ? "Fecha" : "Date"}
          </label>
          <input
            type="date"
            value={form.isoDate}
            onChange={(e) => update("isoDate", e.target.value)}
            onKeyDown={handleKey}
            className={inputClass}
          />
        </div>
      </div>

      {/* Row 3: Time (optional) · Buffer */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>
            {locale === "es" ? "Hora de salida" : "Departure time"}
            {" "}<span className="normal-case font-normal tracking-normal text-gray-700">
              ({locale === "es" ? "opcional" : "optional"})
            </span>
          </label>
          <input
            type="time"
            value={form.departureTime}
            onChange={(e) => update("departureTime", e.target.value)}
            onKeyDown={handleKey}
            className={inputClass}
          />
        </div>
        {form.departureTime && (
          <div>
            <label className={labelClass}>
              {locale === "es" ? "Llegar al aeropuerto" : "Arrive at airport"}
            </label>
            <select
              value={form.arrivalBuffer}
              onChange={(e) => update("arrivalBuffer", Number(e.target.value))}
              className={inputClass}
            >
              {L.bufferOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Error */}
      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Add button — full width on mobile */}
      <button
        onClick={handleAdd}
        className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 px-5 py-2.5 text-sm font-semibold text-white transition-all tap-scale"
      >
        <Plus className="h-3.5 w-3.5" />
        {L.addBtn}
      </button>

      {/* Soft-conflict confirmation modal */}
      {pendingFlight && (
        <>
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={() => setPendingFlight(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none">
            <div
              className="w-full max-w-sm pointer-events-auto rounded-2xl border border-yellow-700/40 shadow-2xl p-5 space-y-4"
              style={{ background: "linear-gradient(160deg, rgba(18,18,32,0.99) 0%, rgba(10,10,20,1) 100%)" }}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-black text-white">{L.warnCloseTimeTitle}</h3>
                  <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{pendingFlight.message}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={confirmPending}
                  className="w-full rounded-xl bg-yellow-600 hover:bg-yellow-500 py-2.5 text-sm font-semibold text-white transition-colors"
                >
                  {L.confirmAnyway}
                </button>
                <button
                  onClick={() => setPendingFlight(null)}
                  className="w-full py-2 text-xs text-gray-600 hover:text-gray-400 transition-colors"
                >
                  {locale === "es" ? "Cancelar" : "Cancel"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
