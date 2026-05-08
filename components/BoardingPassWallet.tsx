"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, ImagePlus, Trash2, Loader2, WifiOff, ChevronDown } from "lucide-react";
import {
  BoardingPass,
  saveBoardingPass,
  getBoardingPasses,
  deleteBoardingPass,
  compressImage,
} from "@/lib/boardingPassStore";
import { BoardingPassViewer } from "./BoardingPassViewer";

interface FlightOption {
  id: string;
  flight_number: string;
  origin: string;
  destination: string;
  iso_date: string;
}

interface BoardingPassWalletProps {
  tripId: string;
  flights: FlightOption[];
}

type AddMode = "camera" | "gallery" | null;

export function BoardingPassWallet({ tripId, flights }: BoardingPassWalletProps) {
  const [passes, setPasses] = useState<BoardingPass[]>([]);
  const [loading, setLoading] = useState(true);
  const [addMode, setAddMode] = useState<AddMode>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [selectedFlightId, setSelectedFlightId] = useState<string>("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);

  // Load passes from IndexedDB on mount
  useEffect(() => {
    let cancelled = false;
    getBoardingPasses(tripId)
      .then((stored) => {
        if (!cancelled) {
          // Sort nearest date first
          const sorted = [...stored].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          );
          setPasses(sorted);
        }
      })
      .catch(() => {
        if (!cancelled) setError("No se pudo cargar el wallet. / Could not load wallet.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [tripId]);

  // Close add menu when clicking outside
  useEffect(() => {
    if (!addMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setAddMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [addMenuOpen]);

  // When an add mode is selected, auto-trigger the hidden input
  useEffect(() => {
    if (addMode === "camera") {
      cameraInputRef.current?.click();
      setAddMode(null);
    } else if (addMode === "gallery") {
      galleryInputRef.current?.click();
      setAddMode(null);
    }
  }, [addMode]);

  const handleFileSelected = useCallback(
    async (file: File) => {
      setError(null);

      const flightId = selectedFlightId || flights[0]?.id;
      if (!flightId) {
        setError(
          "Selecciona un vuelo primero. / Select a flight first."
        );
        return;
      }

      const flight = flights.find((f) => f.id === flightId);
      if (!flight) {
        setError("Vuelo no encontrado. / Flight not found.");
        return;
      }

      setProcessing(true);
      try {
        const imageData = await compressImage(file);
        const pass: BoardingPass = {
          id: `${flightId}-${Date.now()}`,
          tripId,
          flightId,
          flightNumber: flight.flight_number,
          route: `${flight.origin}→${flight.destination}`,
          date: flight.iso_date,
          imageData,
          addedAt: new Date().toISOString(),
        };
        await saveBoardingPass(pass);
        setPasses((prev) => {
          const updated = [...prev, pass].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          );
          return updated;
        });
      } catch {
        setError(
          "Error al guardar el boarding pass. / Error saving boarding pass."
        );
      } finally {
        setProcessing(false);
      }
    },
    [tripId, flights, selectedFlightId]
  );

  async function handleDelete(id: string) {
    try {
      await deleteBoardingPass(id);
      setPasses((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setError("Error al eliminar. / Error deleting.");
    }
  }

  function formatDate(isoDate: string) {
    return new Date(isoDate + "T00:00:00").toLocaleDateString("es-AR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });
  }

  // Passes to show in the viewer (same sorted order)
  const viewerPasses = passes;

  return (
    <div className="bg-[#0f172a] rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-white">
            Boarding Passes
          </span>
          {passes.length > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 rounded-full bg-violet-600 text-white text-xs font-bold">
              {passes.length}
            </span>
          )}
        </div>

        {/* Offline badge */}
        <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
          <WifiOff className="h-3 w-3" />
          <span>Disponible offline / Available offline</span>
        </div>
      </div>

      {/* Flight selector + Add button */}
      <div className="px-4 pb-3 flex flex-col gap-2">
        {flights.length > 0 && (
          <div className="relative">
            <select
              value={selectedFlightId || flights[0]?.id || ""}
              onChange={(e) => setSelectedFlightId(e.target.value)}
              className="w-full appearance-none bg-white/5 border border-white/10 text-white text-sm rounded-xl px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-violet-500"
              aria-label="Seleccionar vuelo / Select flight"
            >
              {flights.map((f) => (
                <option key={f.id} value={f.id} className="bg-gray-900">
                  {f.flight_number} — {f.origin}→{f.destination} ({f.iso_date})
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
        )}

        {/* Add button with camera / gallery sub-menu */}
        <div className="relative" ref={addMenuRef}>
          <button
            onClick={() => setAddMenuOpen((o) => !o)}
            disabled={processing}
            className="flex items-center gap-2 w-full justify-center rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold py-2 px-4 transition-colors"
          >
            {processing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
            {processing
              ? "Procesando… / Processing…"
              : "Agregar boarding pass / Add pass"}
          </button>

          {addMenuOpen && !processing && (
            <div className="absolute top-full mt-1 left-0 right-0 z-20 bg-gray-900 border border-white/10 rounded-xl overflow-hidden shadow-xl">
              <button
                onClick={() => {
                  setAddMenuOpen(false);
                  setAddMode("camera");
                }}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-white hover:bg-white/5 transition-colors"
              >
                <Camera className="h-4 w-4 text-violet-400" />
                <span>Tomar foto / Take photo</span>
              </button>
              <div className="h-px bg-white/5" />
              <button
                onClick={() => {
                  setAddMenuOpen(false);
                  setAddMode("gallery");
                }}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-white hover:bg-white/5 transition-colors"
              >
                <ImagePlus className="h-4 w-4 text-violet-400" />
                <span>Galería / Gallery</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelected(file);
          e.target.value = "";
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelected(file);
          e.target.value = "";
        }}
      />

      {/* Error */}
      {error && (
        <div className="mx-4 mb-3 rounded-xl bg-red-900/30 border border-red-500/30 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Pass list */}
      <div className="px-4 pb-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
          </div>
        ) : passes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center">
              <span className="text-2xl select-none" aria-hidden>
                🎫
              </span>
            </div>
            <p className="text-sm text-gray-400">
              Agrega tus boarding passes para acceder sin internet
            </p>
            <p className="text-xs text-gray-600">
              Add your boarding passes for offline access
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {passes.map((pass, idx) => (
              <div
                key={pass.id}
                className="flex gap-3 bg-white/5 hover:bg-white/8 rounded-xl p-3 transition-colors cursor-pointer"
                onClick={() => setViewerIndex(idx)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setViewerIndex(idx);
                }}
                aria-label={`Ver boarding pass ${pass.flightNumber} / View boarding pass`}
              >
                {/* Thumbnail */}
                <div className="flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden bg-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pass.imageData}
                    alt={`Thumbnail ${pass.flightNumber}`}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm leading-tight truncate">
                    {pass.flightNumber}
                  </p>
                  <p className="text-gray-400 text-xs truncate">{pass.route}</p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {formatDate(pass.date)}
                  </p>
                </div>

                {/* Delete */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(pass.id);
                  }}
                  aria-label="Eliminar / Delete"
                  className="flex-shrink-0 h-8 w-8 rounded-full bg-red-900/30 hover:bg-red-900/60 flex items-center justify-center transition-colors self-center"
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Full-screen viewer */}
      {viewerIndex !== null && viewerPasses.length > 0 && (
        <BoardingPassViewer
          passes={viewerPasses}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </div>
  );
}
