"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Sun } from "lucide-react";
import { BoardingPass } from "@/lib/boardingPassStore";

interface BoardingPassViewerProps {
  passes: BoardingPass[];
  initialIndex: number;
  onClose: () => void;
}

export function BoardingPassViewer({
  passes,
  initialIndex,
  onClose,
}: BoardingPassViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [brightness, setBrightness] = useState(100);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const touchStartXRef = useRef<number | null>(null);

  const currentPass = passes[currentIndex];

  // Request screen wake lock on mount so the screen stays on at the gate
  useEffect(() => {
    if ("wakeLock" in navigator) {
      navigator.wakeLock.request("screen").then((lock) => {
        wakeLockRef.current = lock;
      }).catch(() => {
        // Wake lock not granted — non-fatal
      });
    }
    return () => {
      wakeLockRef.current?.release().catch(() => {/* best-effort */});
    };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goToPrev();
      if (e.key === "ArrowRight") goToNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, passes.length]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((i) => (i > 0 ? i - 1 : i));
  }, []);

  const goToNext = useCallback(() => {
    setCurrentIndex((i) => (i < passes.length - 1 ? i + 1 : i));
  }, [passes.length]);

  // Swipe gesture handling
  function handleTouchStart(e: React.TouchEvent) {
    touchStartXRef.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartXRef.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartXRef.current;
    touchStartXRef.current = null;
    if (delta < -50) goToNext();
    else if (delta > 50) goToPrev();
  }

  if (!currentPass) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <div className="flex flex-col">
          <span className="text-white font-bold text-sm">
            {currentPass.flightNumber}
          </span>
          <span className="text-gray-400 text-xs">{currentPass.route}</span>
        </div>

        {passes.length > 1 && (
          <span className="text-gray-400 text-xs">
            {currentIndex + 1} / {passes.length}
          </span>
        )}

        <button
          onClick={onClose}
          aria-label="Cerrar / Close"
          className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          <X className="h-5 w-5 text-white" />
        </button>
      </div>

      {/* Image area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden px-2">
        {/* Prev button */}
        {currentIndex > 0 && (
          <button
            onClick={goToPrev}
            aria-label="Anterior / Previous"
            className="absolute left-2 z-10 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>
        )}

        {/* Boarding pass image */}
        <div
          className="max-w-full max-h-full"
          style={{ touchAction: "pinch-zoom" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentPass.imageData}
            alt={`Boarding pass ${currentPass.flightNumber}`}
            className="max-w-full max-h-full object-contain rounded-lg select-none"
            style={{
              filter: `brightness(${brightness}%)`,
              maxHeight: "calc(100vh - 160px)",
            }}
            draggable={false}
          />
        </div>

        {/* Next button */}
        {currentIndex < passes.length - 1 && (
          <button
            onClick={goToNext}
            aria-label="Siguiente / Next"
            className="absolute right-2 z-10 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-white" />
          </button>
        )}
      </div>

      {/* Bottom controls — brightness slider */}
      <div className="flex-shrink-0 px-6 py-4 flex items-center gap-3">
        <Sun className="h-4 w-4 text-gray-400 flex-shrink-0" />
        <input
          type="range"
          min={50}
          max={200}
          value={brightness}
          onChange={(e) => setBrightness(Number(e.target.value))}
          aria-label="Brillo / Brightness"
          className="flex-1 h-1.5 appearance-none rounded-full bg-white/20 accent-white cursor-pointer"
        />
        <Sun className="h-5 w-5 text-white flex-shrink-0" />
      </div>

      {/* Pagination dots */}
      {passes.length > 1 && (
        <div className="flex-shrink-0 flex justify-center gap-1.5 pb-4">
          {passes.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              aria-label={`Boarding pass ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === currentIndex
                  ? "w-6 bg-white"
                  : "w-1.5 bg-white/30"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
