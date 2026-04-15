"use client";

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, CheckCircle, AlertCircle, FileText, ImagePlus,
  ArrowRight, Camera, Trash2,
} from "lucide-react";
import Image from "next/image";
import { ParsedFlight } from "@/lib/importFlights";
import { AIRLINES } from "@/lib/flightUtils";

// ── i18n ──────────────────────────────────────────────────────────────────────

const LABELS = {
  es: {
    title:           "Importar itinerario",
    aiPowered:       "Extracción automática con Claude IA",
    tabPaste:        "Pegar texto",
    tabUpload:       "Subir imagen",
    tabCamera:       "Cámara",
    textPlaceholder: `Pegá el texto de tu email de confirmación...

Funciona con cualquier formato:
• "AA 900 · EZE → MIA · 29 Mar 2026 · Salida 20:30"
• Texto copiado de Gmail, Outlook o la web de la aerolínea
• Itinerarios completos con múltiples tramos`,
    imageTip:        "Arrastrá y soltá una imagen o hacé clic para elegir",
    imageBtn:        "Elegir imagen",
    imageHint:       "JPG, PNG, WEBP o GIF · máx 5 MB",
    cameraTip:       "Tomá una foto de tu email o boarding pass",
    cameraBtn:       "Abrir cámara",
    analyze:         "Analizar",
    analyzing:       "Analizando tu itinerario...",
    reviewTitle:     (n: number) =>
      `${n} vuelo${n !== 1 ? "s" : ""} detectado${n !== 1 ? "s" : ""}`,
    reviewSub:       "Revisá y editá los datos antes de agregar",
    noFlights:       "No se detectaron vuelos. Verificá el texto o la imagen.",
    addAll:          (n: number) => `Agregar ${n} vuelo${n !== 1 ? "s" : ""}`,
    cancel:          "Cancelar",
    tryAgain:        "Intentar de nuevo",
    remove:          "Eliminar",
    flightCode:      "Código",
    origin:          "Origen",
    dest:            "Destino",
    date:            "Fecha (AAAA-MM-DD)",
    depTime:         "Hora salida",
    arrTime:         "Hora llegada",
    arrDate:         "Fecha llegada",
    buffer:          "Buffer arr. (hs)",
    missingWarning:  "Completá los campos marcados en naranja antes de agregar.",
    errorConnect:    "Error al conectar con la IA. Intentá de nuevo.",
    errorGeneric:    "Ocurrió un error inesperado.",
  },
  en: {
    title:           "Import itinerary",
    aiPowered:       "Automatic extraction with Claude AI",
    tabPaste:        "Paste text",
    tabUpload:       "Upload image",
    tabCamera:       "Camera",
    textPlaceholder: `Paste your booking confirmation text...

Works with any format:
• "AA 900 · EZE → MIA · Mar 29, 2026 · Dep. 8:30 PM"
• Text copied from Gmail, Outlook or the airline's website
• Full itineraries with multiple legs`,
    imageTip:        "Drag and drop an image or click to choose",
    imageBtn:        "Choose image",
    imageHint:       "JPG, PNG, WEBP or GIF · max 5 MB",
    cameraTip:       "Take a photo of your email or boarding pass",
    cameraBtn:       "Open camera",
    analyze:         "Analyze",
    analyzing:       "Analyzing your itinerary...",
    reviewTitle:     (n: number) => `${n} flight${n !== 1 ? "s" : ""} detected`,
    reviewSub:       "Review and edit the details before adding",
    noFlights:       "No flights detected. Check your text or image.",
    addAll:          (n: number) => `Add ${n} flight${n !== 1 ? "s" : ""}`,
    cancel:          "Cancel",
    tryAgain:        "Try again",
    remove:          "Remove",
    flightCode:      "Code",
    origin:          "Origin",
    dest:            "Destination",
    date:            "Date (YYYY-MM-DD)",
    depTime:         "Dep. time",
    arrTime:         "Arrival time",
    arrDate:         "Arrival date",
    buffer:          "Arr. buffer (hrs)",
    missingWarning:  "Fill in the orange fields before adding.",
    errorConnect:    "Failed to reach AI. Please try again.",
    errorGeneric:    "An unexpected error occurred.",
  },
} as const;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ItineraryImportModalProps {
  isOpen:   boolean;
  onClose:  () => void;
  onImport: (flights: ParsedFlight[]) => void;
  locale:   "es" | "en";
  tripId:   string;
}

interface ParsedFlightRaw {
  flightCode:      string;
  airlineCode:     string;
  airlineName:     string;
  flightNumber:    string;
  originCode:      string;
  destinationCode: string;
  isoDate:         string;
  departureTime:   string;
  arrivalDate?:    string;
  arrivalTime?:    string;
  cabinClass?:     string;
  seatNumber?:     string;
  bookingCode?:    string;
  confidence:      "high" | "medium" | "low";
  missing:         string[];
}

interface EditableFlight extends ParsedFlight {
  missing: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildEditableFlight(raw: ParsedFlightRaw): EditableFlight {
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
    arrivalDate:     raw.arrivalDate  || undefined,
    arrivalTime:     raw.arrivalTime  || undefined,
    arrivalBuffer:   2,
    bookingCode:     raw.bookingCode  || undefined,
    confidence:      raw.confidence   ?? "medium",
    missing:         raw.missing,
  };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

type TabMode = "paste" | "upload" | "camera";
type Phase   = "input" | "parsing" | "review";

// ── ItineraryImportModal ──────────────────────────────────────────────────────

export function ItineraryImportModal({
  isOpen,
  onClose,
  onImport,
  locale,
}: ItineraryImportModalProps) {
  const t       = LABELS[locale];
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef  = useRef<HTMLInputElement>(null);

  const [tab,          setTab]          = useState<TabMode>("paste");
  const [text,         setText]         = useState("");
  const [imageFile,    setImageFile]    = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [phase,        setPhase]        = useState<Phase>("input");
  const [flights,      setFlights]      = useState<EditableFlight[]>([]);
  const [apiError,     setApiError]     = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setTab("paste");
      setText("");
      setImageFile(null);
      setImagePreview(null);
      setPhase("input");
      setFlights([]);
      setApiError(null);
    }
  }, [isOpen]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleImagePick(file: File) {
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleAnalyze() {
    setPhase("parsing");
    setApiError(null);
    try {
      let body: Record<string, string>;
      if ((tab === "upload" || tab === "camera") && imageFile) {
        const base64 = await fileToBase64(imageFile);
        body = { imageBase64: base64, mimeType: imageFile.type, locale };
      } else {
        body = { text, locale };
      }

      const res  = await fetch("/api/parse-itinerary", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });

      if (!res.ok) {
        setApiError(t.errorConnect);
        setPhase("input");
        return;
      }

      const data = (await res.json()) as { flights?: ParsedFlightRaw[] };
      const parsed = (data.flights ?? []).map(buildEditableFlight);
      setFlights(parsed);
      setPhase("review");
    } catch {
      setApiError(t.errorGeneric);
      setPhase("input");
    }
  }

  function updateFlight(
    idx:   number,
    field: keyof EditableFlight,
    value: string | number,
  ) {
    setFlights((prev) =>
      prev.map((f, i) => {
        if (i !== idx) return f;
        const updated = { ...f, [field]: value };
        if (typeof value === "string" && value.trim()) {
          updated.missing = updated.missing.filter((m) => m !== field);
        }
        return updated;
      }),
    );
  }

  function removeFlight(idx: number) {
    setFlights((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleImport() {
    const exportable = flights.map(({ missing: _, ...rest }) => rest as ParsedFlight);
    onImport(exportable);
    onClose();
  }

  const canAnalyze =
    tab === "paste" ? text.trim().length > 0 : imageFile !== null;

  const hasMissingRequired = flights.some((f) =>
    f.missing.some((m) =>
      ["originCode", "destinationCode", "isoDate", "flightCode"].includes(m),
    ),
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="itinerary-import-modal-title"
            className="relative w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl border border-white/[0.07] bg-surface-card shadow-2xl max-h-[92dvh] flex flex-col"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-white/6 shrink-0">
              <div>
                <h2
                  id="itinerary-import-modal-title"
                  className="text-lg font-bold text-white flex items-center gap-2"
                >
                  <Image
                    src="/tripcopliot-avatar.svg"
                    alt="TripCopilot"
                    width={24}
                    height={24}
                    className="rounded-full shrink-0"
                  />
                  {t.title}
                </h2>
                <p className="text-[11px] text-gray-500 mt-0.5">{t.aiPowered}</p>
              </div>
              <button
                onClick={onClose}
                aria-label={locale === "es" ? "Cerrar importación" : "Close import"}
                className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/8 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">

              {/* INPUT PHASE */}
              <AnimatePresence mode="wait">
                {phase === "input" && (
                  <motion.div
                    key="input"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-4"
                  >
                    {/* Tab selector */}
                    <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/6 w-fit">
                      {(["paste", "upload", "camera"] as const).map((mode) => {
                        const icons: Record<TabMode, React.ReactNode> = {
                          paste:  <FileText  className="h-3.5 w-3.5" />,
                          upload: <ImagePlus className="h-3.5 w-3.5" />,
                          camera: <Camera    className="h-3.5 w-3.5" />,
                        };
                        const labels: Record<TabMode, string> = {
                          paste:  t.tabPaste,
                          upload: t.tabUpload,
                          camera: t.tabCamera,
                        };
                        return (
                          <button
                            key={mode}
                            onClick={() => setTab(mode)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                              tab === mode
                                ? "bg-violet-600 text-white shadow"
                                : "text-gray-500 hover:text-gray-300"
                            }`}
                          >
                            {icons[mode]}
                            <span className="hidden sm:inline">{labels[mode]}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Paste tab */}
                    {tab === "paste" && (
                      <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder={t.textPlaceholder}
                        rows={9}
                        className="w-full rounded-xl border border-white/[0.07] bg-surface-darker px-4 py-3 text-sm text-gray-200 placeholder-gray-700 focus:outline-none focus:ring-1 focus:ring-violet-500/60 resize-none font-mono leading-relaxed"
                      />
                    )}

                    {/* Upload tab */}
                    {tab === "upload" && (
                      <div
                        role="button"
                        tabIndex={0}
                        aria-label={locale === "es" ? "Zona para soltar imagen" : "Image drop zone"}
                        className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-white/10 bg-surface-darker p-6 cursor-pointer hover:border-violet-500/40 transition-colors"
                        onClick={() => fileRef.current?.click()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            fileRef.current?.click();
                          }
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const file = e.dataTransfer.files[0];
                          if (file && file.type.startsWith("image/"))
                            handleImagePick(file);
                        }}
                      >
                        {imagePreview ? (
                          <img
                            src={imagePreview}
                            alt="preview"
                            className="max-h-44 rounded-lg object-contain border border-white/10"
                          />
                        ) : (
                          <>
                            <ImagePlus className="h-10 w-10 text-gray-700" />
                            <p className="text-sm text-gray-400 text-center">{t.imageTip}</p>
                            <p className="text-xs text-gray-600">{t.imageHint}</p>
                          </>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            fileRef.current?.click();
                          }}
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

                    {/* Camera tab */}
                    {tab === "camera" && (
                      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-white/10 bg-surface-darker p-8">
                        {imagePreview ? (
                          <img
                            src={imagePreview}
                            alt="capture preview"
                            className="max-h-44 rounded-lg object-contain border border-white/10"
                          />
                        ) : (
                          <>
                            <Camera className="h-12 w-12 text-gray-700" />
                            <p className="text-sm text-gray-400 text-center">{t.cameraTip}</p>
                          </>
                        )}
                        <button
                          onClick={() => camRef.current?.click()}
                          className="rounded-lg border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-gray-300 hover:bg-white/10 transition-colors flex items-center gap-2"
                        >
                          <Camera className="h-3.5 w-3.5" />
                          {t.cameraBtn}
                        </button>
                        <input
                          ref={camRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
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
                  </motion.div>
                )}

                {/* PARSING PHASE */}
                {phase === "parsing" && (
                  <motion.div
                    key="parsing"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-16 gap-5"
                  >
                    <div className="relative h-16 w-16">
                      <div className="absolute inset-0 rounded-full border-2 border-violet-500/30 animate-ping" />
                      <div
                        className="animate-spin spin-always w-16 h-16"
                        style={{ animationDuration: "2s", willChange: "transform" }}
                      >
                        <div className="rounded-full overflow-hidden w-16 h-16">
                          <Image
                            src="/tripcopliot-avatar.svg"
                            alt="TripCopilot"
                            width={64}
                            height={64}
                          />
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-400 animate-pulse">{t.analyzing}</p>
                  </motion.div>
                )}

                {/* REVIEW PHASE */}
                {phase === "review" && (
                  <motion.div
                    key="review"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
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

                        <div className="space-y-3">
                          <AnimatePresence>
                            {flights.map((f, idx) => (
                              <motion.div
                                key={idx}
                                layout
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                              >
                                <FlightReviewCard
                                  flight={f}
                                  locale={locale}
                                  t={t}
                                  onRemove={() => removeFlight(idx)}
                                  onChange={(field, value) =>
                                    updateFlight(idx, field, value)
                                  }
                                />
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-white/6 shrink-0">
              <button
                onClick={onClose}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                {t.cancel}
              </button>

              {phase === "input" && (
                <button
                  onClick={handleAnalyze}
                  disabled={!canAnalyze}
                  className="flex items-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed px-5 py-2 text-sm font-semibold text-white transition-colors"
                >
                  <Image
                    src="/tripcopliot-avatar.svg"
                    alt=""
                    width={16}
                    height={16}
                    className="rounded-full"
                  />
                  {t.analyze}
                </button>
              )}

              {phase === "review" && flights.length > 0 && !hasMissingRequired && (
                <button
                  onClick={handleImport}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-5 py-2 text-sm font-semibold text-white transition-colors"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  {t.addAll(flights.length)}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── FlightReviewCard ──────────────────────────────────────────────────────────

function FlightReviewCard({
  flight,
  locale,
  t,
  onRemove,
  onChange,
}: {
  flight:   EditableFlight;
  locale:   "es" | "en";
  t:        (typeof LABELS)["es"] | (typeof LABELS)["en"];
  onRemove: () => void;
  onChange: (field: keyof EditableFlight, value: string | number) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const isMissing = (field: string) => flight.missing.includes(field);
  const fieldCls  = (field: string) =>
    `w-full rounded-lg border px-2.5 py-1.5 text-xs text-gray-200 bg-surface-darker focus:outline-none focus:ring-1 transition-colors ${
      isMissing(field)
        ? "border-orange-600/60 focus:ring-orange-500/50 placeholder-orange-800"
        : "border-white/[0.07] focus:ring-violet-500/40 placeholder-gray-700"
    }`;

  const confidenceColor: Record<string, string> = {
    high:   "text-emerald-400",
    medium: "text-yellow-400",
    low:    "text-red-400",
  };

  return (
    <div className="rounded-xl border border-violet-600/25 bg-violet-950/10">
      {/* Card header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full shrink-0 ${
            flight.confidence === "high"
              ? "bg-emerald-400"
              : flight.confidence === "medium"
              ? "bg-yellow-400"
              : "bg-red-400"
          }`}
        />
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="font-bold text-white text-sm">
            {flight.flightCode || "—"}
          </span>
          <span className="text-gray-600">·</span>
          <span className="text-sm font-semibold text-gray-200">
            {flight.originCode || "?"}
          </span>
          <ArrowRight className="h-3 w-3 text-gray-600 shrink-0" />
          <span className="text-sm font-semibold text-gray-200">
            {flight.destinationCode || "?"}
          </span>
          <span className="text-gray-600">·</span>
          <span className="text-xs text-gray-500">{flight.isoDate || "—"}</span>
          {flight.departureTime && (
            <>
              <span className="text-gray-600">·</span>
              <span className="text-xs text-blue-400 font-medium">
                {flight.departureTime}
              </span>
            </>
          )}
          {flight.arrivalTime && (
            <>
              <span className="text-gray-600">→</span>
              <span className="text-xs text-emerald-400 font-medium">
                {flight.arrivalTime}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {flight.missing.length > 0 && (
            <span className="text-xs font-semibold text-orange-400 bg-orange-950/40 border border-orange-800/30 rounded-full px-2 py-0.5">
              {flight.missing.length}{" "}
              {locale === "es" ? "faltan" : "missing"}
            </span>
          )}
          {flight.confidence && (
            <span
              className={`text-[10px] font-semibold uppercase ${
                confidenceColor[flight.confidence] ?? "text-gray-400"
              }`}
            >
              {flight.confidence}
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            aria-label={locale === "es" ? "Eliminar vuelo" : "Remove flight"}
            className="p-1 rounded text-gray-600 hover:text-red-400 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Editable fields */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-3 gap-2 border-t border-white/4 pt-3">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">{t.flightCode}</label>
                <input
                  value={flight.flightCode}
                  onChange={(e) =>
                    onChange("flightCode", e.target.value.toUpperCase())
                  }
                  placeholder="AA900"
                  className={fieldCls("flightCode")}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">{t.origin}</label>
                <input
                  value={flight.originCode}
                  onChange={(e) =>
                    onChange("originCode", e.target.value.toUpperCase().slice(0, 3))
                  }
                  placeholder="EZE"
                  maxLength={3}
                  className={fieldCls("originCode")}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">{t.dest}</label>
                <input
                  value={flight.destinationCode}
                  onChange={(e) =>
                    onChange(
                      "destinationCode",
                      e.target.value.toUpperCase().slice(0, 3),
                    )
                  }
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
                <label className="text-xs text-gray-600 mb-1 block">{t.depTime}</label>
                <input
                  value={flight.departureTime}
                  onChange={(e) => onChange("departureTime", e.target.value)}
                  placeholder="20:30"
                  className={fieldCls("departureTime")}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">{t.arrTime}</label>
                <input
                  value={flight.arrivalTime ?? ""}
                  onChange={(e) => onChange("arrivalTime", e.target.value)}
                  placeholder="06:45"
                  className={fieldCls("arrivalTime")}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">{t.arrDate}</label>
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
                  onChange={(e) =>
                    onChange("arrivalBuffer", parseFloat(e.target.value) || 2)
                  }
                  min={0.5}
                  max={12}
                  step={0.5}
                  className={fieldCls("arrivalBuffer")}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
