import { Lock, Smartphone, Plane, CreditCard } from "lucide-react";

interface Props {
  lang: "es" | "en";
}

const BADGES_ES = [
  { icon: Lock,        label: "Datos cifrados SSL"    },
  { icon: Smartphone,  label: "Funciona offline · PWA" },
  { icon: Plane,       label: "Datos FAA oficiales"    },
  { icon: CreditCard,  label: "Sin tarjeta requerida"  },
] as const;

const BADGES_EN = [
  { icon: Lock,        label: "SSL Encrypted"           },
  { icon: Smartphone,  label: "Works offline · PWA"     },
  { icon: Plane,       label: "Official FAA data"        },
  { icon: CreditCard,  label: "No credit card required"  },
] as const;

export function TrustBadges({ lang }: Props) {
  const badges = lang === "es" ? BADGES_ES : BADGES_EN;

  return (
    <div className="py-6 px-4">
      <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-center gap-3">
        {badges.map((badge) => {
          const Icon = badge.icon;
          return (
            <div
              key={badge.label}
              className="inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] px-4 py-2"
            >
              <Icon className="h-3.5 w-3.5 text-gray-500 shrink-0" aria-hidden="true" />
              <span className="text-xs text-gray-400 font-medium whitespace-nowrap">
                {badge.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
