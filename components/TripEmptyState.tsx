"use client";

interface TripEmptyStateProps {
  locale: "es" | "en";
  onCreateTrip?: () => void;
  onImport?: () => void;
}

const STEPS = [
  {
    icon: "➕",
    es: { title: "Creá tu viaje", desc: "Nombralo como quieras: \"Vacaciones 2025\", \"Viaje de negocios\"…" },
    en: { title: "Create your trip", desc: "Name it whatever you like: \"Vacation 2025\", \"Business trip\"…" },
  },
  {
    icon: "🤖",
    es: { title: "Importá tus vuelos con IA", desc: "Pegá el email de confirmación o subí una captura — TripCopilot extrae todo solo." },
    en: { title: "Import flights with AI", desc: "Paste your confirmation email or upload a screenshot — TripCopilot extracts everything automatically." },
  },
  {
    icon: "🔔",
    es: { title: "Recibí alertas en tiempo real", desc: "Demoras, check-in a las 24h, estado del aeropuerto 3 horas antes y el día del vuelo." },
    en: { title: "Get real-time alerts", desc: "Delays, 24h check-in reminder, airport status 3 hours before, and a morning briefing on departure day." },
  },
];

function PlaneSVG() {
  return (
    <svg
      viewBox="0 0 200 100"
      className="w-48 h-24 opacity-80"
      aria-hidden="true"
    >
      {/* Dotted flight path arc */}
      <path
        d="M 20 80 Q 100 10 180 80"
        fill="none"
        stroke="rgba(99,102,241,0.3)"
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />
      {/* Destination dot */}
      <circle cx="180" cy="80" r="3" fill="rgba(99,102,241,0.5)" />
      {/* Origin dot */}
      <circle cx="20" cy="80" r="3" fill="rgba(99,102,241,0.5)" />

      {/* Animated plane along the arc */}
      <g>
        <animateMotion
          dur="4s"
          repeatCount="indefinite"
          path="M 20 80 Q 100 10 180 80"
          rotate="auto"
        />
        {/* Plane body */}
        <g transform="translate(-8, -5)">
          <path
            d="M8 5 L14 3 L16 5 L14 7 Z"
            fill="rgba(129,140,248,0.9)"
          />
          <path
            d="M6 5 L10 2 L11 5 L10 8 Z"
            fill="rgba(129,140,248,0.7)"
          />
          <path
            d="M8 5 L4 4 L4 6 Z"
            fill="rgba(129,140,248,0.6)"
          />
        </g>
      </g>
    </svg>
  );
}

export function TripEmptyState({ locale, onCreateTrip, onImport }: TripEmptyStateProps) {
  return (
    <div
      className="empty-state-card rounded-2xl border border-white/[0.06] overflow-hidden"
    >
      <div className="px-6 pt-10 pb-6 flex flex-col items-center text-center">

        {/* Animated SVG illustration */}
        <div className="mb-4">
          <PlaneSVG />
        </div>

        {/* Headline */}
        <h2 className="text-lg font-bold text-gray-100 mb-2 leading-snug">
          {locale === "es" ? "Tu primer viaje en 3 pasos" : "Your first trip in 3 steps"}
        </h2>

        <p className="text-sm text-gray-500 mb-4 max-w-xs leading-relaxed">
          {locale === "es"
            ? "TripCopilot monitorea aeropuertos, conexiones y clima — y te avisa antes de que algo salga mal."
            : "TripCopilot monitors airports, connections, and weather — and alerts you before anything goes wrong."}
        </p>
      </div>

      {/* Steps */}
      <div className="border-t border-white/[0.05] divide-y divide-white/[0.04]">
        {STEPS.map((step, i) => (
          <div key={i} className="flex items-start gap-4 px-6 py-4 stagger-item">
            <div className="shrink-0 w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.07] flex items-center justify-center text-base">
              {step.icon}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-100 mb-0.5">
                {step[locale].title}
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">
                {step[locale].desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA with shimmer */}
      {(onCreateTrip || onImport) && (
        <div className="px-6 py-6 space-y-3">
          {onImport && (
            <button
              onClick={onImport}
              className="shimmer-btn w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#FFB800] hover:bg-[#FFC933] active:scale-95 text-[#07070d] text-sm font-semibold px-6 py-3 transition-all"
            >
              {locale === "es" ? "📷 Importar mi primer vuelo con IA" : "📷 Import my first flight with AI"}
            </button>
          )}
          {onCreateTrip && !onImport && (
            <button
              onClick={onCreateTrip}
              className="shimmer-btn w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#FFB800] hover:bg-[#FFC933] active:scale-95 text-[#07070d] text-sm font-semibold px-6 py-3 transition-all"
            >
              {locale === "es" ? "Agregar mi primer viaje →" : "Add my first trip →"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
