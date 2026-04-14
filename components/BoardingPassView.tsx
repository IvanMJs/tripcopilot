"use client";

import { useRef, useState } from "react";
import { X, Plane, Trash2, Loader2, Camera } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TripFlight } from "@/lib/types";
import { AIRPORTS } from "@/lib/airports";

interface BoardingPassViewProps {
  flight: TripFlight;
  gate?: string;
  onClose: () => void;
  imageUrl?: string | null;
  uploading?: boolean;
  onUpload?: (file: File) => Promise<void>;
  onDelete?: () => Promise<void>;
  locale?: "es" | "en";
}

export function BoardingPassView({
  flight,
  gate,
  onClose,
  imageUrl,
  uploading,
  onUpload,
  onDelete,
  locale = "es",
}: BoardingPassViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Track whether the flip animation has played for the current imageUrl
  const [flipped, setFlipped] = useState(false);
  const [prevImageUrl, setPrevImageUrl] = useState<string | null | undefined>(imageUrl);

  // When a new imageUrl arrives (new upload), trigger the flip animation
  if (imageUrl !== prevImageUrl) {
    setPrevImageUrl(imageUrl);
    if (imageUrl && !prevImageUrl) {
      setFlipped(false);
    }
  }

  const originInfo = AIRPORTS[flight.originCode];
  const destInfo   = AIRPORTS[flight.destinationCode];
  const originCity = originInfo?.city ?? flight.originCode;
  const destCity   = destInfo?.city   ?? flight.destinationCode;

  const dateLabel = flight.isoDate
    ? new Date(flight.isoDate + "T00:00:00").toLocaleDateString("es-AR", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && onUpload) {
      await onUpload(file);
    }
    e.target.value = "";
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "linear-gradient(160deg, #1e0a3c 0%, #0f172a 100%)",
          border: "1px solid rgba(139,92,246,0.25)",
        }}
      >
        {/* Star background */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          {Array.from({length: 30}).map((_, i) => (
            <div key={i} className="absolute rounded-full bg-white"
              style={{
                width: i % 3 === 0 ? '2px' : '1px',
                height: i % 3 === 0 ? '2px' : '1px',
                opacity: 0.1 + (i % 5) * 0.05,
                left: `${(i * 37) % 100}%`,
                top: `${(i * 23) % 100}%`,
              }}
            />
          ))}
        </div>

        {/* Header */}
        <div className="relative px-6 pt-6 pb-4">
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4 text-white" />
          </button>

          <p className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-1">
            {flight.airlineName}
          </p>
          <p className="text-6xl font-black text-white tracking-tight leading-none">
            {flight.flightCode.replace(/\s+/g, "")}
          </p>
          <p className="text-xs text-gray-500 mt-1">{dateLabel}</p>
        </div>

        {/* Route */}
        <div className="px-6 py-4 flex items-center justify-between gap-3">
          <div className="text-center">
            <p className="text-4xl font-black text-white">{flight.originCode}</p>
            <p className="text-xs text-gray-400 mt-1 truncate max-w-[90px]">{originCity}</p>
          </div>
          <div className="flex flex-col items-center gap-1 flex-1">
            <Plane className="h-5 w-5 text-violet-400 rotate-0" />
            <div className="h-px w-full bg-violet-800/50" />
          </div>
          <div className="text-center">
            <p className="text-4xl font-black text-white">{flight.destinationCode}</p>
            <p className="text-xs text-gray-400 mt-1 truncate max-w-[90px]">{destCity}</p>
          </div>
        </div>

        {/* Details row */}
        <div className="px-6 pb-4 grid grid-cols-3 gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-0.5">
              {locale === "es" ? "Salida" : "Departure"}
            </p>
            <p className="text-lg font-black text-white">
              {flight.departureTime ?? "--:--"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-0.5">
              {locale === "es" ? "Clase" : "Class"}
            </p>
            <p className="text-lg font-black text-white">ECO</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-0.5">
              {gate ? (locale === "es" ? "Puerta" : "Gate") : "Terminal"}
            </p>
            <p className={`text-lg font-black ${gate ? "text-emerald-400" : "text-gray-600"}`}>
              {gate ?? "--"}
            </p>
          </div>
        </div>

        {/* Tear line */}
        <div className="relative flex items-center px-3 py-1">
          <div className="absolute -left-3 h-6 w-6 rounded-full bg-black/80" />
          <div
            className="flex-1 h-px"
            style={{
              backgroundImage: "repeating-linear-gradient(90deg, rgba(139,92,246,0.3) 0, rgba(139,92,246,0.3) 6px, transparent 6px, transparent 12px)",
            }}
          />
          <div className="absolute -right-3 h-6 w-6 rounded-full bg-black/80" />
        </div>

        {/* Boarding pass image or upload area */}
        <div className="px-6 py-5 flex flex-col items-center gap-3">
          {imageUrl ? (
            <>
              {/* Flip animation wrapper */}
              <div
                className="w-full"
                style={{ perspective: "800px" }}
              >
                <AnimatePresence mode="wait">
                  {!flipped ? (
                    <motion.div
                      key="back"
                      initial={{ rotateY: 0 }}
                      animate={{ rotateY: 90 }}
                      transition={{ duration: 0.3, ease: "easeIn" }}
                      onAnimationComplete={() => setFlipped(true)}
                      style={{ backfaceVisibility: "hidden" }}
                      className="w-full h-48 rounded-xl bg-violet-950/50 border border-violet-700/30 flex items-center justify-center overflow-hidden"
                    >
                      {/* Boarding pass back pattern */}
                      <div className="absolute inset-0 opacity-20"
                        style={{
                          backgroundImage: "repeating-linear-gradient(45deg, rgba(139,92,246,0.4) 0, rgba(139,92,246,0.4) 1px, transparent 1px, transparent 12px), repeating-linear-gradient(-45deg, rgba(139,92,246,0.4) 0, rgba(139,92,246,0.4) 1px, transparent 1px, transparent 12px)",
                        }}
                      />
                      <Plane className="h-10 w-10 text-violet-400/60" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="front"
                      initial={{ rotateY: -90 }}
                      animate={{ rotateY: 0 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      style={{ backfaceVisibility: "hidden" }}
                      className="w-full relative"
                    >
                      <div className="w-full rounded-xl overflow-hidden border border-violet-800/30 relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imageUrl}
                          alt="Boarding pass"
                          className="w-full object-contain max-h-64"
                        />
                        {/* Scanned stamp overlay */}
                        <div
                          className="absolute inset-0 flex items-center justify-center pointer-events-none"
                          style={{ transform: "rotate(-15deg)" }}
                        >
                          <span className="text-emerald-400/30 font-black text-3xl tracking-widest border-4 border-emerald-400/30 rounded px-3 py-1 uppercase select-none">
                            Scanned
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {onDelete && (
                <button
                  onClick={onDelete}
                  className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  {locale === "es" ? "Eliminar imagen" : "Remove image"}
                </button>
              )}
            </>
          ) : (
            <>
              {/* Inviting upload area */}
              {onUpload ? (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full group flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-violet-700/40 hover:border-violet-500/60 bg-violet-950/20 hover:bg-violet-950/40 py-8 transition-all disabled:opacity-50"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
                        <span className="text-xs font-semibold text-violet-300">
                          {locale === "es" ? "Subiendo…" : "Uploading…"}
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="h-14 w-14 rounded-2xl bg-violet-900/40 border border-violet-700/40 group-hover:bg-violet-800/50 flex items-center justify-center transition-colors">
                          <Camera className="h-7 w-7 text-violet-400 group-hover:text-violet-300 transition-colors" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold text-violet-300 group-hover:text-violet-200 transition-colors">
                            {locale === "es" ? "Subir boarding pass" : "Upload boarding pass"}
                          </p>
                          <p className="text-xs text-gray-600 mt-0.5">
                            {locale === "es" ? "Toca para seleccionar foto" : "Tap to select photo"}
                          </p>
                        </div>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  {/* Decorative QR placeholder when no upload handler */}
                  <div className="h-24 w-24 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <div className="grid grid-cols-5 gap-0.5">
                      {Array.from({ length: 25 }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-3.5 w-3.5 rounded-sm ${
                            [0,1,5,6,10,4,9,14,20,21,24,19,23,12,7,17].includes(i)
                              ? "bg-white/60"
                              : "bg-white/10"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs uppercase tracking-widest text-gray-600">
                    Scan at gate
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
