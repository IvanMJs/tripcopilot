"use client";

import { useEffect, useState, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

const SLIDES = [
  { src: "/responsive-intuitivo-mobile.jpg", alt: "Vista de vuelo con estado FAA", label: "Estado por vuelo" },
  { src: "/planifica-tu-viaje.jpg",          alt: "Gestión de viajes",              label: "Gestión de viajes" },
  { src: "/tripcopilot-ia.jpg",              alt: "TripCopilot IA",                 label: "IA integrada" },
];

export function AppScreenshotCarousel() {
  const mounted = useMounted();
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "center", containScroll: false },
    [Autoplay({ delay: 3500, stopOnInteraction: false, stopOnMouseEnter: true })],
  );
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi, onSelect]);

  if (!mounted) return <div style={{ height: 320 }} />;

  return (
    <div className="select-none">
      {/* Embla viewport */}
      <div ref={emblaRef} style={{ overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 20, paddingBottom: 24 }}>
          {SLIDES.map((slide, i) => {
            const isActive = i === selectedIndex;
            return (
              <div
                key={slide.src}
                style={{
                  flex: "0 0 220px",
                  transform: isActive ? "translateY(0) scale(1)" : "translateY(18px) scale(0.9)",
                  opacity: isActive ? 1 : 0.45,
                  transition: "transform 0.5s cubic-bezier(.4,0,.2,1), opacity 0.5s",
                  cursor: "grab",
                }}
              >
                <div
                  style={{
                    borderRadius: 22,
                    overflow: "hidden",
                    boxShadow: isActive
                      ? "0 24px 64px rgba(59,130,246,0.2), 0 8px 32px rgba(0,0,0,0.65)"
                      : "0 6px 20px rgba(0,0,0,0.4)",
                    border: isActive
                      ? "1.5px solid rgba(59,130,246,0.32)"
                      : "1px solid rgba(255,255,255,0.07)",
                    transition: "box-shadow 0.5s, border 0.5s",
                  }}
                >
                  <img
                    src={slide.src}
                    alt={slide.alt}
                    draggable={false}
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />
                </div>
                <p
                  style={{
                    textAlign: "center",
                    fontSize: 12,
                    fontWeight: 500,
                    marginTop: 10,
                    color: isActive ? "#60a5fa" : "#4b5563",
                    transition: "color 0.4s",
                  }}
                >
                  {slide.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dots */}
      <div style={{ display: "flex", justifyContent: "center", gap: 2, paddingBottom: 8 }}>
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => emblaApi?.scrollTo(i)}
            aria-label={SLIDES[i].label}
            style={{
              background: "transparent", border: "none",
              padding: "10px 4px", cursor: "pointer",
              WebkitAppearance: "none", appearance: "none",
              display: "flex", alignItems: "center",
            }}
          >
            <span
              style={{
                display: "block", borderRadius: 999,
                height: 6, width: i === selectedIndex ? 20 : 6,
                background: i === selectedIndex ? "#3b82f6" : "rgba(255,255,255,0.18)",
                transition: "all 0.35s ease", flexShrink: 0,
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
