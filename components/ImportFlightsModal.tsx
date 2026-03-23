"use client";

import { useRef, useState, useEffect } from "react";
import {
  X, CheckCircle, AlertCircle,
  FileText, ImagePlus, ArrowRight, Sparkles,
} from "lucide-react";
import Image from "next/image";
import { ParsedFlight } from "@/lib/importFlights";
import { AIRLINES } from "@/lib/flightUtils";

interface ImportFlightsModalProps {
  onImport: (flights: ParsedFlight[]) => void;
  onClose: () => void;
  locale: "es" | "en";
}

// ── i18n ─────────────────────────────────────────────────────────────────────
const L = {
  es: {
    title: "TripCopilot Import",
    tabText: "Texto",
    tabImage: "Imagen",
    textPlaceholder: `Pegá el texto de tu email de confirmación...

Funciona con cualquier formato:
• "AA 900 · EZE → MIA · 29 Mar 2026 · Salida 20:30"
• Texto copiado de Gmail, Outlook o la web de la aerolínea
• Itinerarios completos con múltiples tramos`,
    imageTip: "Subí una captura de pantalla, email o boarding pass",
    imageBtn: "Elegir imagen",
    imageHint: "JPG, PNG, WEBP o GIF · máx 5 MB",
    parse: "TripCopilot IA",
    parsing: "Analizando...",
    reviewTitle: (n: number) => `${n} vuelo${n !== 1 ? "s" : ""} detectado${n !== 1 ? "s" : ""}`,
    reviewSub: "Revisá y editá los datos antes de agregar",
    noFlights: "No se detectaron vuelos. Verificá el texto o la imagen.",
    addBtn: (n: number) => `Agregar ${n} vuelo${n !== 1 ? "s" : ""}`,
    cancel: "Cancelar",
    tryAgain: "Intentar de nuevo",
    flightCode: "Código",
    origin: "Origen",
    dest: "Destino",
    date: "Fecha (AAAA-MM-DD)",
    time: "Hora salida",
    buffer: "Buffer arr. (hs)",
    fieldRequired: "Requerido",
    missingWarning: "Completá los campos marcados en naranja antes de agregar.",
    aiPowered: "Extracción automática con Claude IA",
  },
  en: {
    title: "TripCopilot Import",
    tabText: "Text",
    tabImage: "Image",
    textPlaceholder: `Paste your booking confirmation text...

Works with any format:
• "AA 900 · EZE → MIA · Mar 29, 2026 · Dep. 8:30 PM"
• Text copied from Gmail, Outlook or the airline's website
• Full itineraries with multiple legs`,
    imageTip: "Upload a screenshot, email or boarding pass photo",
    imageBtn: "Choose image",
    imageHint: "JPG, PNG, WEBP or GIF · max 5 MB",
    parse: "TripCopilot AI",
    parsing: "Analyzing...",
    reviewTitle: (n: number) => `${n} flight${n !== 1 ? "s" : ""} detected`,
    reviewSub: "Review and edit the details before adding",
    noFlights: "No flights detected. Check your text or image.",
    addBtn: (n: number) => `Add ${n} flight${n !== 1 ? "s" : ""}`,
    cancel: "Cancel",
    tryAgain: "Try again",
    flightCode: "Code",
    origin: "Origin",
    dest: "Destination",
    date: "Date (YYYY-MM-DD)",
    time: "Dep. time",
    buffer: "Arr. buffer (hrs)",
    fieldRequired: "Required",
    missingWarning: "Fill in the orange fields before adding.",
    aiPowered: "Automatic extraction with Claude AI",
  },
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface EditableFlight extends ParsedFlight {
  selected: boolean;
  missing: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildParsedFlight(raw: {
  flightCode: string;
  airlineCode: string;
  airlineName: string;
  flightNumber: string;
  originCode: string;
  destinationCode: string;
  isoDate: string;
  departureTime: string;
  arrivalDate?: string;
  arrivalTime?: string;
  missing: string[];
}): EditableFlight {
  const airline = AIRLINES[raw.airlineCode.toUpperCase()];
  return {
    flightCode:      raw.flightCode,
    airlineCode:     raw.airlineCode.toUpperCase(),
    airlineName:     raw.airlineName || airline?.name || raw.airlineCode,
    airlineIcao:     airline?.icao ?? "",
    flightNumber:    raw.flightNumber,
    originCode:      raw.originCode.toUpperCase(),
    destinationCode: raw.destinationCode.toUpperCase(),
    isoDate:         raw.isoDate,
    departureTime:   raw.departureTime ?? "",
    arrivalDate:     raw.arrivalDate || undefined,
    arrivalTime:     raw.arrivalTime || undefined,
    arrivalBuffer:   2,
    confidence:      raw.missing.length === 0 ? "high"
                   : raw.missing.length <= 1   ? "medium"
                   : "low",
    selected: true,
    missing:  raw.missing,
  };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Component ─────────────────────────────────────────────────────────────────
export function ImportFlightsModal({ onImport, onClose, locale }: ImportFlightsModalProps) {
  const t = L[locale];
  const fileRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<"text" | "image">("text");
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [phase, setPhase] = useState<"input" | "parsing" | "review">("input");
  const [flights, setFlights] = useState<EditableFlight[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (flights.length > 0) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [flights.length]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  function handleImagePick(file: File) {
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleParse() {
    setPhase("parsing");
    setApiError(null);
    try {
      let body: Record<string, string>;
      if (tab === "image" && imageFile) {
        const base64 = await fileToBase64(imageFile);
        body = { imageBase64: base64, mimeType: imageFile.type };
      } else {
        body = { text };
      }

      const res = await fetch("/api/parse-flight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      const raw: ReturnType<typeof buildParsedFlight>[] = (data.flights ?? []).map(buildParsedFlight);
      setFlights(raw);
      setPhase("review");
    } catch {
      setApiError("Error al conectar con la IA. Intentá de nuevo.");
      setPhase("input");
    }
  }

  function updateFlight(idx: number, field: keyof EditableFlight, value: string | number | boolean) {
    setFlights((prev) =>
      prev.map((f, i) => {
        if (i !== idx) return f;
        const updated = { ...f, [field]: value };
        // Remove from missing if the field is now filled
        if (typeof value === "string" && value.trim()) {
          updated.missing = updated.missing.filter((m) => m !== field);
        }
        return updated;
      })
    );
  }

  function toggleSelect(idx: number) {
    setFlights((prev) =>
      prev.map((f, i) => (i === idx ? { ...f, selected: !f.selected } : f))
    );
  }

  function handleImport() {
    const selected = flights.filter((f) => f.selected);
    onImport(selected.map(({ selected: _s, missing: _m, ...rest }) => rest as ParsedFlight));
    onClose();
  }

  const selectedFlights = flights.filter((f) => f.selected);
  const hasMissingRequired = selectedFlights.some(
    (f) => f.missing.some((m) => ["originCode", "destinationCode", "isoDate", "flightCode"].includes(m))
  );
  const canParse = tab === "text" ? text.trim().length > 0 : imageFile !== null;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-2xl rounded-2xl border border-white/8 bg-[#0f0f17] shadow-2xl animate-fade-in-up max-h-[90vh] flex flex-col">

        {/* Confetti burst on successful import */}
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
            {Array.from({length: 16}).map((_, i) => (
              <div key={i} className="absolute w-1.5 h-1.5 rounded-sm"
                style={{
                  left: `${10 + (i * 5.5)}%`,
                  top: "20%",
                  background: ["#7c3aed","#f59e0b","#22c55e","#ec4899","#06b6d4"][i % 5],
                  animation: `confetti-fall ${0.6 + (i % 4) * 0.1}s ease-out ${(i * 0.04)}s forwards`,
                }}
              />
            ))}
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-white/6 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Image
                src="/tripcopliot-avatar.svg"
                alt="TripCopilot"
                width={24}
                height={24}
                className="rounded-full shrink-0"
              />
              TripCopilot Import
            </h2>
            <p className="text-[11px] text-gray-500 mt-0.5">{t.aiPowered}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/8 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* ── INPUT PHASE ── */}
          {phase === "input" && (
            <>
              {/* Mode tabs */}
              <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/6 w-fit">
                {(["text", "image"] as const).map((t_) => (
                  <button
                    key={t_}
                    onClick={() => setTab(t_)}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      tab === t_
                        ? "bg-violet-600 text-white shadow"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    {t_ === "text" ? <FileText className="h-3.5 w-3.5" /> : <ImagePlus className="h-3.5 w-3.5" />}
                    {t_ === "text" ? t.tabText : t.tabImage}
                  </button>
                ))}
              </div>

              {/* Text input */}
              {tab === "text" && (
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={t.textPlaceholder}
                  rows={9}
                  className="w-full rounded-xl border border-white/8 bg-[#080810] px-4 py-3 text-sm text-gray-200 placeholder-gray-700 focus:outline-none focus:ring-1 focus:ring-violet-500/60 resize-none font-mono leading-relaxed"
                />
              )}

              {/* Image input */}
              {tab === "image" && (
                <div
                  className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-white/10 bg-[#080810] p-6 cursor-pointer hover:border-violet-500/40 transition-colors"
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file && file.type.startsWith("image/")) handleImagePick(file);
                  }}
                >
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="preview"
                      className="max-h-48 rounded-lg object-contain border border-white/10"
                    />
                  ) : (
                    <>
                      <ImagePlus className="h-10 w-10 text-gray-700" />
                      <p className="text-sm text-gray-400">{t.imageTip}</p>
                      <p className="text-xs text-gray-600">{t.imageHint}</p>
                    </>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
                    className="mt-1 rounded-lg border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-gray-300 hover:bg-white/10 transition-colors"
                  >
                    {t.imageBtn}
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImagePick(file);
                    }}
                  />
                </div>
              )}

              {apiError && (
                <p className="text-xs text-red-400 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {apiError}
                </p>
              )}
            </>
          )}

          {/* ── PARSING PHASE ── */}
          {phase === "parsing" && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="relative h-16 w-16">
                {/* Glow ring */}
                <div className="absolute inset-0 rounded-full border-2 border-violet-500/30 animate-ping" />
                {/* Spinning avatar — wrapper div ensures animate-spin works on all mobile browsers */}
                <div
                  className="rounded-full animate-spin spin-always overflow-hidden"
                  style={{ animationDuration: "2s" }}
                >
                  <Image
                    src="/tripcopliot-avatar.svg"
                    alt="TripCopilot"
                    width={64}
                    height={64}
                    className="rounded-full"
                  />
                </div>
              </div>
              <p className="text-sm text-gray-400 animate-pulse">{t.parsing}</p>
            </div>
          )}

          {/* ── REVIEW PHASE ── */}
          {phase === "review" && (
            <div className="space-y-4">
              {flights.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <AlertCircle className="h-8 w-8 text-red-400" />
                  <p className="text-sm text-red-400">{t.noFlights}</p>
                  <button
                    onClick={() => setPhase("input")}
                    className="text-xs text-gray-500 hover:text-gray-300 underline"
                  >
                    {t.tryAgain}
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        {t.reviewTitle(flights.length)}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{t.reviewSub}</p>
                    </div>
                    <button
                      onClick={() => setPhase("input")}
                      className="text-xs text-gray-600 hover:text-gray-400 underline"
                    >
                      {t.tryAgain}
                    </button>
                  </div>

                  {hasMissingRequired && (
                    <p className="text-xs text-orange-400 bg-orange-950/30 border border-orange-800/30 rounded-lg px-3 py-2 flex items-center gap-2">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      {t.missingWarning}
                    </p>
                  )}

                  {/* Editable flight cards */}
                  <div className="space-y-3">
                    {flights.map((f, idx) => (
                      <FlightEditCard
                        key={idx}
                        flight={f}
                        locale={locale}
                        t={t}
                        onToggle={() => toggleSelect(idx)}
                        onChange={(field, value) => updateFlight(idx, field, value)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-white/6 shrink-0">
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            {t.cancel}
          </button>

          {phase === "input" && (
            <button
              onClick={handleParse}
              disabled={!canParse}
              className="flex items-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 px-5 py-2 text-sm font-semibold text-white transition-colors"
            >
              <Image
                src="/tripcopliot-avatar.svg"
                alt=""
                width={16}
                height={16}
                className="rounded-full"
              />
              {t.parse}
            </button>
          )}

          {phase === "review" && selectedFlights.length > 0 && !hasMissingRequired && (
            <button
              onClick={handleImport}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-5 py-2 text-sm font-semibold text-white transition-colors"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              {t.addBtn(selectedFlights.length)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Editable flight card ──────────────────────────────────────────────────────
function FlightEditCard({
  flight,
  locale,
  t,
  onToggle,
  onChange,
}: {
  flight: EditableFlight;
  locale: "es" | "en";
  t: typeof L["es"];
  onToggle: () => void;
  onChange: (field: keyof EditableFlight, value: string | number) => void;
}) {
  const isMissing = (field: string) => flight.missing.includes(field);
  const fieldCls = (field: string) =>
    `w-full rounded-lg border px-2.5 py-1.5 text-xs text-gray-200 bg-[#080810] focus:outline-none focus:ring-1 transition-colors ${
      isMissing(field)
        ? "border-orange-600/60 focus:ring-orange-500/50 placeholder-orange-800"
        : "border-white/8 focus:ring-violet-500/40 placeholder-gray-700"
    }`;

  return (
    <div className={`rounded-xl border transition-all ${
      flight.selected
        ? "border-violet-600/30 bg-violet-950/10"
        : "border-white/6 bg-[#080810] opacity-50"
    }`}>
      {/* Card header with checkbox + route summary */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={onToggle}
      >
        <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
          flight.selected ? "border-violet-500 bg-violet-500" : "border-gray-600"
        }`}>
          {flight.selected && (
            <svg viewBox="0 0 10 8" fill="none" className="h-2.5 w-2.5">
              <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-white text-sm">{flight.flightCode || "—"}</span>
          <span className="text-gray-600">·</span>
          <span className="text-sm font-semibold text-gray-200">{flight.originCode || "?"}</span>
          <ArrowRight className="h-3 w-3 text-gray-600 shrink-0" />
          <span className="text-sm font-semibold text-gray-200">{flight.destinationCode || "?"}</span>
          <span className="text-gray-600">·</span>
          <span className="text-xs text-gray-500">{flight.isoDate || "—"}</span>
          {flight.departureTime && (
            <>
              <span className="text-gray-600">·</span>
              <span className="text-xs text-blue-400 font-medium">{flight.departureTime}</span>
            </>
          )}
          {flight.arrivalTime && (
            <>
              <span className="text-gray-600">→</span>
              <span className="text-xs text-emerald-400 font-medium">{flight.arrivalTime}</span>
            </>
          )}
        </div>
        {flight.missing.length > 0 && (
          <span className="ml-auto text-xs font-semibold text-orange-400 bg-orange-950/40 border border-orange-800/30 rounded-full px-2 py-0.5 shrink-0">
            {flight.missing.length} {locale === "es" ? "faltan" : "missing"}
          </span>
        )}
      </div>

      {/* Editable fields grid */}
      {flight.selected && (
        <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-3 gap-2 border-t border-white/4 pt-3">
          <div>
            <label className="text-xs text-gray-600 mb-1 block">{t.flightCode}</label>
            <input
              value={flight.flightCode}
              onChange={(e) => onChange("flightCode", e.target.value.toUpperCase())}
              placeholder="AA900"
              className={fieldCls("flightCode")}
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1 block">{t.origin}</label>
            <input
              value={flight.originCode}
              onChange={(e) => onChange("originCode", e.target.value.toUpperCase().slice(0, 3))}
              placeholder="EZE"
              maxLength={3}
              className={fieldCls("originCode")}
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1 block">{t.dest}</label>
            <input
              value={flight.destinationCode}
              onChange={(e) => onChange("destinationCode", e.target.value.toUpperCase().slice(0, 3))}
              placeholder="MIA"
              maxLength={3}
              className={fieldCls("destinationCode")}
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1 block">{t.date}</label>
            <input
              value={flight.isoDate}
              onChange={(e) => onChange("isoDate", e.target.value)}
              placeholder="2026-03-29"
              className={fieldCls("isoDate")}
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1 block">{t.time}</label>
            <input
              value={flight.departureTime}
              onChange={(e) => onChange("departureTime", e.target.value)}
              placeholder="20:30"
              className={fieldCls("departureTime")}
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1 block">
              {locale === "es" ? "Llegada (hora)" : "Arrival time"}
            </label>
            <input
              value={flight.arrivalTime ?? ""}
              onChange={(e) => onChange("arrivalTime", e.target.value)}
              placeholder="06:45"
              className={fieldCls("arrivalTime")}
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1 block">
              {locale === "es" ? "Llegada (fecha)" : "Arrival date"}
            </label>
            <input
              value={flight.arrivalDate ?? ""}
              onChange={(e) => onChange("arrivalDate", e.target.value)}
              placeholder="2026-03-30"
              className={fieldCls("arrivalDate")}
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1 block">{t.buffer}</label>
            <input
              type="number"
              value={flight.arrivalBuffer}
              onChange={(e) => onChange("arrivalBuffer", parseFloat(e.target.value) || 2)}
              min={0.5}
              max={12}
              step={0.5}
              className={fieldCls("arrivalBuffer")}
            />
          </div>
        </div>
      )}
    </div>
  );
}
