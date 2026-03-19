"use client";

import { useState, useCallback } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, A11y } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";

import "swiper/css";
import "swiper/css/pagination";

const SLIDES = [
  {
    src:   "/responsive-intuitivo-mobile.jpg",
    alt:   "Vista de vuelo con estado FAA",
    label: "Estado por vuelo",
    accent: false,
  },
  {
    src:   "/planifica-tu-viaje.jpg",
    alt:   "Gestión de viajes",
    label: "Gestión de viajes",
    accent: true,
  },
  {
    src:   "/tripcopilot-ia.jpg",
    alt:   "TripCopilot IA",
    label: "IA integrada",
    accent: false,
  },
];

export function AppScreenshotCarousel() {
  const [activeIndex, setActiveIndex] = useState(1); // start centered
  const [swiperRef, setSwiperRef] = useState<SwiperType | null>(null);

  const handleSlideChange = useCallback((sw: SwiperType) => {
    setActiveIndex(sw.realIndex);
  }, []);

  const goTo = useCallback(
    (i: number) => swiperRef?.slideTo(i),
    [swiperRef],
  );

  return (
    <div className="select-none">
      <Swiper
        modules={[Pagination, A11y]}
        onSwiper={(sw) => { setSwiperRef(sw); sw.slideTo(1, 0); }}
        onSlideChange={handleSlideChange}
        initialSlide={1}
        centeredSlides
        grabCursor
        loop={false}
        spaceBetween={16}
        a11y={{ prevSlideMessage: "Anterior", nextSlideMessage: "Siguiente" }}
        breakpoints={{
          // mobile: show 1.25 slides (peek effect)
          0:   { slidesPerView: 1.25 },
          // tablet: show 2.2
          640: { slidesPerView: 2.2 },
          // desktop: show all 3
          900: { slidesPerView: 3, spaceBetween: 24 },
        }}
        style={{ paddingBottom: "1rem" }}
      >
        {SLIDES.map((slide, i) => {
          const isActive = i === activeIndex;
          return (
            <SwiperSlide
              key={slide.src}
              onClick={() => goTo(i)}
              style={{ cursor: "pointer" }}
            >
              <div
                className="flex flex-col items-center"
                style={{
                  // On desktop all 3 are visible — keep the centre slightly bigger
                  transition: "transform 0.4s cubic-bezier(.4,0,.2,1), opacity 0.4s",
                  transform:  isActive ? "translateY(0)   scale(1)"    : "translateY(12px) scale(0.94)",
                  opacity:    isActive ? 1 : 0.65,
                }}
              >
                <div
                  className="relative w-full rounded-3xl overflow-hidden shadow-2xl"
                  style={{
                    border: isActive
                      ? "1.5px solid rgba(59,130,246,0.35)"
                      : "1px solid rgba(255,255,255,0.10)",
                    boxShadow: isActive
                      ? "0 20px 60px rgba(59,130,246,0.18), 0 8px 32px rgba(0,0,0,0.55)"
                      : "0 8px 24px rgba(0,0,0,0.45)",
                  }}
                >
                  {isActive && (
                    <div className="absolute inset-0 rounded-3xl border-2 border-blue-500/10 pointer-events-none z-10" />
                  )}
                  <img
                    src={slide.src}
                    alt={slide.alt}
                    className="w-full h-auto block"
                    draggable={false}
                  />
                </div>
                <p
                  className={`text-center text-xs mt-3 font-medium transition-colors duration-300 ${
                    isActive ? "text-blue-400" : "text-gray-600"
                  }`}
                >
                  {slide.label}
                </p>
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>

      {/* Custom dot pagination */}
      <div className="flex justify-center gap-1.5 mt-2">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={SLIDES[i].label}
            className={`rounded-full transition-all duration-300 ${
              i === activeIndex
                ? "w-5 h-1.5 bg-blue-500"
                : "w-1.5 h-1.5 bg-white/20 hover:bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
