"use client";

import { useState, useCallback } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, A11y } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";

// Swiper core styles
import "swiper/css";

interface NotifCarouselProps {
  screenshots: { src: string; label: string }[];
}

export function NotifCarousel({ screenshots }: NotifCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [swiperRef, setSwiperRef] = useState<SwiperType | null>(null);

  const handleSlideChange = useCallback((sw: SwiperType) => {
    setActiveIndex(sw.realIndex);
  }, []);

  const goTo = useCallback(
    (i: number) => swiperRef?.slideToLoop(i),
    [swiperRef],
  );

  return (
    <div className="select-none">
      {/* Dot indicators */}
      <div className="flex justify-center gap-1.5 mb-8">
        {screenshots.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={screenshots[i].label}
            className={`rounded-full transition-all duration-300 ${
              i === activeIndex
                ? "w-5 h-1.5 bg-blue-500"
                : "w-1.5 h-1.5 bg-white/20 hover:bg-white/40"
            }`}
          />
        ))}
      </div>

      {/* Swiper */}
      <div className="pb-10">
        <Swiper
          modules={[Autoplay, A11y]}
          onSwiper={setSwiperRef}
          onSlideChange={handleSlideChange}
          centeredSlides
          loop
          grabCursor
          slidesPerView="auto"
          spaceBetween={20}
          autoplay={{ delay: 3200, disableOnInteraction: false, pauseOnMouseEnter: true }}
          a11y={{ prevSlideMessage: "Anterior", nextSlideMessage: "Siguiente" }}
          style={{ overflow: "visible" }}
        >
          {screenshots.map((s, i) => {
            const isActive = i === activeIndex;
            return (
              <SwiperSlide
                key={s.src}
                onClick={() => goTo(i)}
                style={{ width: "clamp(160px, 28vw, 260px)", cursor: "pointer" }}
              >
                <div className="flex flex-col items-center">
                  <div
                    className="relative w-full rounded-3xl overflow-hidden shadow-2xl"
                    style={{
                      transform:  isActive ? "scale(1.12)" : "scale(0.82)",
                      transition: "transform 0.4s cubic-bezier(.4,0,.2,1), opacity 0.4s, box-shadow 0.4s",
                      opacity:    isActive ? 1 : 0.45,
                      border:     isActive
                        ? "2px solid rgba(59,130,246,0.6)"
                        : "1px solid rgba(255,255,255,0.08)",
                      boxShadow: isActive
                        ? "0 20px 60px rgba(59,130,246,0.25), 0 8px 24px rgba(0,0,0,0.6)"
                        : "0 4px 16px rgba(0,0,0,0.4)",
                    }}
                  >
                    <img
                      src={s.src}
                      alt={s.label}
                      className="w-full h-auto block"
                      draggable={false}
                    />
                    {isActive && (
                      <div
                        className="absolute bottom-0 inset-x-0 py-3 px-3 text-center"
                        style={{
                          background:
                            "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)",
                        }}
                      >
                        <p className="text-xs font-bold text-white">{s.label}</p>
                      </div>
                    )}
                  </div>
                  {!isActive && (
                    <p className="text-[10px] text-gray-600 mt-3 transition-opacity duration-300">
                      {s.label}
                    </p>
                  )}
                </div>
              </SwiperSlide>
            );
          })}
        </Swiper>
      </div>
    </div>
  );
}
