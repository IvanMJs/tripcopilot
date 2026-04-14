"use client";

import { useEffect, useRef, useState } from "react";
import { motion, type Variants } from "framer-motion";

interface Props {
  lang: "es" | "en";
}

const LABELS = {
  es: {
    eyebrow: "Viajeros reales",
    heading: "Viajeros que confían en TripCopilot",
    stats: [
      { value: 1200, suffix: "+", label: "viajes trackeados" },
      { value: 340, suffix: "+", label: "viajeros activos" },
      { value: 18, suffix: "", label: "países" },
    ],
    testimonials: [
      {
        initials: "MG",
        gradient: "from-pink-500 to-violet-600",
        name: "María G.",
        location: "Buenos Aires",
        quote:
          "TripCopilot me salvó cuando cambiaron la puerta en JFK. La alerta llegó antes que el anuncio del aeropuerto.",
      },
      {
        initials: "CR",
        gradient: "from-blue-500 to-cyan-500",
        name: "Carlos R.",
        location: "Ciudad de México",
        quote:
          "Viajo por trabajo cada semana y no puedo vivir sin el War Room. Todo lo que necesito en una pantalla.",
      },
      {
        initials: "LF",
        gradient: "from-emerald-500 to-teal-500",
        name: "Laura F.",
        location: "Madrid",
        quote:
          "Compartí el viaje con mi familia y todos pudieron seguir los vuelos en tiempo real. Increíble.",
      },
    ],
  },
  en: {
    eyebrow: "Real travellers",
    heading: "Travelers who trust TripCopilot",
    stats: [
      { value: 1200, suffix: "+", label: "trips tracked" },
      { value: 340, suffix: "+", label: "active travellers" },
      { value: 18, suffix: "", label: "countries" },
    ],
    testimonials: [
      {
        initials: "MG",
        gradient: "from-pink-500 to-violet-600",
        name: "Maria G.",
        location: "Buenos Aires",
        quote:
          "TripCopilot saved me when my gate changed at JFK. The alert arrived before the airport announcement.",
      },
      {
        initials: "CR",
        gradient: "from-blue-500 to-cyan-500",
        name: "Carlos R.",
        location: "Mexico City",
        quote:
          "I travel for work every week and I can't live without the War Room. Everything I need in one screen.",
      },
      {
        initials: "LF",
        gradient: "from-emerald-500 to-teal-500",
        name: "Laura F.",
        location: "Madrid",
        quote:
          "I shared the trip with my family and everyone could follow the flights in real time. Incredible.",
      },
    ],
  },
};

function useCountUp(target: number, isVisible: boolean, duration = 1600) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isVisible) return;

    startTimeRef.current = null;

    function tick(now: number) {
      if (startTimeRef.current === null) startTimeRef.current = now;
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [isVisible, target, duration]);

  return count;
}

function StatCounter({
  value,
  suffix,
  label,
  isVisible,
}: {
  value: number;
  suffix: string;
  label: string;
  isVisible: boolean;
}) {
  const count = useCountUp(value, isVisible);
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <span className="text-4xl sm:text-5xl font-black text-white tabular-nums">
        {count.toLocaleString()}
        {suffix}
      </span>
      <span className="text-sm text-gray-500">{label}</span>
    </div>
  );
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.45, ease: "easeOut" as const },
  }),
};

export function SocialProofSection({ lang }: Props) {
  const t = LABELS[lang];
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-16 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Eyebrow + heading */}
        <div className="text-center mb-12">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-600 mb-3">
            {t.eyebrow}
          </p>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            {t.heading}
          </h2>
        </div>

        {/* Stat counters */}
        <div className="grid grid-cols-3 gap-6 sm:gap-10 mb-14">
          {t.stats.map((stat) => (
            <StatCounter
              key={stat.label}
              value={stat.value}
              suffix={stat.suffix}
              label={stat.label}
              isVisible={isVisible}
            />
          ))}
        </div>

        {/* Testimonial cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {t.testimonials.map((item, i) => (
            <motion.div
              key={item.name}
              custom={i}
              initial="hidden"
              animate={isVisible ? "visible" : "hidden"}
              variants={cardVariants}
              className="rounded-2xl border border-white/[0.06] p-5 flex flex-col gap-4 bg-[linear-gradient(150deg,rgba(14,14,24,0.97)_0%,rgba(9,9,18,0.99)_100%)]"
            >
              {/* Avatar + name */}
              <div className="flex items-center gap-3">
                <div
                  className={`h-10 w-10 rounded-full bg-gradient-to-br ${item.gradient} flex items-center justify-center text-sm font-black text-white shrink-0`}
                >
                  {item.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white leading-none">
                    {item.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.location}</p>
                </div>
              </div>

              {/* Stars */}
              <p className="text-yellow-400 text-sm leading-none" aria-label="5 stars">
                ★★★★★
              </p>

              {/* Quote */}
              <p className="text-sm text-gray-400 leading-relaxed italic flex-1">
                &ldquo;{item.quote}&rdquo;
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
