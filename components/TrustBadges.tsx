interface Props {
  lang: "es" | "en";
}

const BADGES = {
  es: [
    { icon: "🔒", label: "Datos cifrados SSL" },
    { icon: "📱", label: "Funciona offline · PWA" },
    { icon: "✈️", label: "Datos FAA oficiales" },
    { icon: "💳", label: "Sin tarjeta requerida" },
  ],
  en: [
    { icon: "🔒", label: "SSL Encrypted" },
    { icon: "📱", label: "Works offline · PWA" },
    { icon: "✈️", label: "Official FAA data" },
    { icon: "💳", label: "No credit card required" },
  ],
};

export function TrustBadges({ lang }: Props) {
  const badges = BADGES[lang];

  return (
    <div className="py-6 px-4">
      <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-center gap-3">
        {badges.map((badge) => (
          <div
            key={badge.label}
            className="inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] px-4 py-2"
          >
            <span className="text-sm leading-none" aria-hidden="true">
              {badge.icon}
            </span>
            <span className="text-xs text-gray-400 font-medium whitespace-nowrap">
              {badge.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
