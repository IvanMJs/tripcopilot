"use client";

import { useState } from "react";
import { Plus, Search, AlertTriangle, Sparkles, Plane, Train, Bus, Ship, Car, ArrowLeftRight, ChevronDown } from "lucide-react";
import { TripFlight, SegmentType } from "@/lib/types";
import { AIRLINES, parseFlightCode } from "@/lib/flightUtils";
import { analytics } from "@/lib/analytics";
import { AirportSearchInput } from "./AirportSearchInput";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FlightLookupInput } from "./FlightLookupInput";
import { CommonFlightInfo } from "@/lib/commonFlights";

const inputClass = [
  "w-full rounded-lg",
  "border border-white/[0.08] focus:border-[rgba(255,184,0,0.25)]",
  "bg-white/[0.04]",
  "px-3 py-2 text-sm text-white",
  "outline-none transition-colors",
  "disabled:opacity-50 disabled:cursor-not-allowed",
].join(" ");

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

const SEGMENT_TYPES = [
  { key: 'flight'     as const, icon: Plane,          label: 'Vuelo' },
  { key: 'train'      as const, icon: Train,          label: 'Tren' },
  { key: 'bus'        as const, icon: Bus,            label: 'Bus' },
  { key: 'ferry'      as const, icon: Ship,           label: 'Ferry' },
  { key: 'car_rental' as const, icon: Car,            label: 'Auto' },
  { key: 'transfer'   as const, icon: ArrowLeftRight, label: 'Transfer' },
] as const;

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
  const [segmentType, setSegmentType] = useState<SegmentType>('flight');

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

  function handleAutoFill(data: CommonFlightInfo) {
    setForm((prev) => ({
      ...prev,
      originCode:    data.origin,
      destCode:      data.destination,
      departureTime: data.departureTime,
    }));
    setError("");
  }

  const isValidFlightCode = /^[A-Z]{2}\d{1,4}$/.test(form.flightCode);
  const showValidation = form.flightCode.length >= 3;
  const airlinePreviewCode = form.flightCode.slice(0, 2).toUpperCase();
  const airlinePreviewName = form.flightCode.length >= 2 ? AIRLINE_NAMES[airlinePreviewCode] : undefined;

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

      {/* Segment type picker */}
      <div className="overflow-x-auto flex gap-2 pb-1">
        {SEGMENT_TYPES.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => { setSegmentType(key); setError(""); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold whitespace-nowrap transition-colors ${
              segmentType === key
                ? "bg-white/10 text-white border-white/20"
                : "text-gray-500 border-white/[0.08] hover:text-gray-300"
            }`}
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        ))}
      </div>

      {segmentType === 'flight' ? (
        <>
          {/* Auto-fill lookup */}
          <FlightLookupInput locale={locale} onAutoFill={handleAutoFill} />

          {/* Row 1: Flight code — full width */}
          <div>
            <label className={labelClass}>
              {locale === "es" ? "Código de vuelo" : "Flight code"}
            </label>
            <div className="relative">
              <Input
                value={form.flightCode}
                onChange={(e) => update("flightCode", e.target.value.toUpperCase())}
                onKeyDown={handleKey}
                placeholder={L.flightPlaceholder}
              />
              {showValidation && (
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium ${isValidFlightCode ? "text-green-400" : "text-red-400"}`}>
                  {isValidFlightCode ? "✓" : "AA1234"}
                </span>
              )}
            </div>
            {airlinePreviewName && (
              <p className="mt-1 text-xs text-[#FFB800]">{airlinePreviewName}</p>
            )}
          </div>

          {/* Row 2: Origin · Destination · Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>
                {locale === "es" ? "Origen" : "Origin"}
              </label>
              <AirportSearchInput
                value={form.originCode}
                onChange={(iata) => update("originCode", iata)}
                placeholder={locale === "es" ? "Buenos Aires…" : "New York…"}
                locale={locale}
              />
            </div>
            <div>
              <label className={labelClass}>
                {locale === "es" ? "Destino" : "Destination"}
              </label>
              <AirportSearchInput
                value={form.destCode}
                onChange={(iata) => update("destCode", iata)}
                placeholder={locale === "es" ? "Miami…" : "Miami…"}
                locale={locale}
              />
            </div>
            <div>
              <label className={labelClass}>
                {locale === "es" ? "Fecha" : "Date"}
              </label>
               <Input
                 type="date"
                 value={form.isoDate}
                 onChange={(e) => update("isoDate", e.target.value)}
                 onKeyDown={handleKey}
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
               <Input
                 type="time"
                 value={form.departureTime}
                 onChange={(e) => update("departureTime", e.target.value)}
                 onKeyDown={handleKey}
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
           <Button
             onClick={handleAdd}
             variant="primary"
             icon={<Plus className="h-3.5 w-3.5" />}
           >
             {L.addBtn}
           </Button>
        </>
      ) : (
        <GroundTransportForm
          segmentType={segmentType}
          tripId={tripId}
          onAdd={onAdd}
          locale={locale}
        />
      )}

      {/* Soft-conflict confirmation modal */}
      {pendingFlight && (
        <>
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={() => setPendingFlight(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none">
            <div
              className="w-full max-w-sm pointer-events-auto rounded-2xl border border-yellow-700/40 shadow-2xl p-5 space-y-4 self-center"
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

// ── GroundTransportForm ────────────────────────────────────────────────────────

interface GroundFormProps {
  segmentType: 'bus' | 'train' | 'car_rental' | 'ferry' | 'transfer';
  tripId: string;
  onAdd: (tripId: string, flight: TripFlight) => void;
  locale: 'es' | 'en';
}

const BLANK_GROUND = {
  origin:        "",
  dest:          "",
  date:          "",
  departureTime: "",
  arrivalTime:   "",
  operator:      "",
  serviceNumber: "",
  seat:          "",
};

function GroundTransportForm({ segmentType, tripId, onAdd, locale }: GroundFormProps) {
  const [form, setForm] = useState(BLANK_GROUND);
  const [error, setError] = useState("");
  const [showMore, setShowMore] = useState(false);

  const labelClass =
    "block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5";

  function update(field: keyof typeof BLANK_GROUND, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  }

  function handleSubmit() {
    if (!form.origin.trim()) { setError(locale === 'es' ? "Ingresá el origen." : "Enter origin."); return; }
    if (!form.dest.trim())   { setError(locale === 'es' ? "Ingresá el destino." : "Enter destination."); return; }
    if (!form.date)          { setError(locale === 'es' ? "Seleccioná una fecha." : "Select a date."); return; }

    const newSegment: TripFlight = {
      id:              `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
      flightCode:      form.operator
        ? form.operator.toUpperCase().slice(0, 8).replace(/\s/g, '')
        : segmentType.replace('_', ' ').toUpperCase(),
      airlineCode:     '',
      airlineName:     form.operator || '',
      airlineIcao:     '',
      flightNumber:    form.serviceNumber || '',
      originCode:      form.origin.trim(),
      destinationCode: form.dest.trim(),
      isoDate:         form.date,
      departureTime:   form.departureTime,
      arrivalTime:     form.arrivalTime || undefined,
      arrivalBuffer:   0,
      segmentType:     segmentType,
      seatNumber:      form.seat || undefined,
    };

    onAdd(tripId, newSegment);
    setForm(BLANK_GROUND);
    setShowMore(false);
  }

  const submitLabel = (() => {
    const found = SEGMENT_TYPES.find((s) => s.key === segmentType);
    return locale === 'es'
      ? `Agregar ${found?.label ?? segmentType}`
      : `Add ${segmentType}`;
  })();

  return (
    <div className="space-y-4">
      {/* Origin / Dest */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>{locale === 'es' ? 'Desde' : 'From'}</label>
          <input
            value={form.origin}
            onChange={(e) => update('origin', e.target.value)}
            placeholder={locale === 'es' ? 'Ciudad o estación de origen' : 'Origin city or station'}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>{locale === 'es' ? 'Hasta' : 'To'}</label>
          <input
            value={form.dest}
            onChange={(e) => update('dest', e.target.value)}
            placeholder={locale === 'es' ? 'Ciudad o estación de destino' : 'Destination city or station'}
            className={inputClass}
          />
        </div>
      </div>

      {/* Date / Departure time */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>{locale === 'es' ? 'Fecha' : 'Date'}</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => update('date', e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>
            {locale === 'es' ? 'Hora de salida' : 'Departure time'}
            {' '}<span className="normal-case font-normal tracking-normal text-gray-700">
              ({locale === 'es' ? 'opcional' : 'optional'})
            </span>
          </label>
          <input
            type="time"
            value={form.departureTime}
            onChange={(e) => update('departureTime', e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Collapsible extra details */}
      <div>
        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${showMore ? 'rotate-180' : ''}`} />
          {locale === 'es' ? 'Más detalles' : 'More details'}
        </button>

        {showMore && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>{locale === 'es' ? 'Hora de llegada' : 'Arrival time'}</label>
              <input
                type="time"
                value={form.arrivalTime}
                onChange={(e) => update('arrivalTime', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{locale === 'es' ? 'Operador' : 'Operator'}</label>
              <input
                value={form.operator}
                onChange={(e) => update('operator', e.target.value)}
                placeholder="Renfe, FlixBus, etc."
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{locale === 'es' ? 'Nro de servicio' : 'Service number'}</label>
              <input
                value={form.serviceNumber}
                onChange={(e) => update('serviceNumber', e.target.value)}
                placeholder="AVE 02251, etc."
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{locale === 'es' ? 'Asiento' : 'Seat'}</label>
              <input
                value={form.seat}
                onChange={(e) => update('seat', e.target.value)}
                placeholder="12A"
                className={inputClass}
              />
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && <p className="text-xs text-red-400">{error}</p>}

      <Button
        onClick={handleSubmit}
        variant="primary"
        icon={<Plus className="h-3.5 w-3.5" />}
      >
        {submitLabel}
      </Button>
    </div>
  );
}
