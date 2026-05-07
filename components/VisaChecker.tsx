"use client";

import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  checkVisa,
  getCountryFromAirport,
  VisaInfo,
  VisaStatus,
} from "@/lib/visaData";

// ── Constants ──────────────────────────────────────────────────────────────

const STORAGE_KEY = "tc-passport-country";

const PASSPORT_OPTIONS: { iso: string; label: string; flag: string }[] = [
  { iso: "AR", label: "Argentina",       flag: "🇦🇷" },
  { iso: "BR", label: "Brasil / Brazil", flag: "🇧🇷" },
  { iso: "CL", label: "Chile",           flag: "🇨🇱" },
  { iso: "CO", label: "Colombia",        flag: "🇨🇴" },
  { iso: "ES", label: "España / Spain",  flag: "🇪🇸" },
  { iso: "MX", label: "México",          flag: "🇲🇽" },
  { iso: "PE", label: "Perú",            flag: "🇵🇪" },
  { iso: "US", label: "United States",   flag: "🇺🇸" },
];

// Country ISO → display name (bilingual)
const COUNTRY_DISPLAY: Record<string, { es: string; en: string }> = {
  AR: { es: "Argentina",        en: "Argentina" },
  AU: { es: "Australia",        en: "Australia" },
  BR: { es: "Brasil",           en: "Brazil" },
  CA: { es: "Canadá",           en: "Canada" },
  CL: { es: "Chile",            en: "Chile" },
  CN: { es: "China",            en: "China" },
  CO: { es: "Colombia",         en: "Colombia" },
  CR: { es: "Costa Rica",       en: "Costa Rica" },
  CU: { es: "Cuba",             en: "Cuba" },
  DE: { es: "Alemania",         en: "Germany" },
  DO: { es: "Rep. Dominicana",  en: "Dominican Republic" },
  EC: { es: "Ecuador",          en: "Ecuador" },
  EG: { es: "Egipto",           en: "Egypt" },
  ES: { es: "España",           en: "Spain" },
  FR: { es: "Francia",          en: "France" },
  GB: { es: "Reino Unido",      en: "United Kingdom" },
  GH: { es: "Ghana",            en: "Ghana" },
  GR: { es: "Grecia",           en: "Greece" },
  GT: { es: "Guatemala",        en: "Guatemala" },
  ID: { es: "Indonesia",        en: "Indonesia" },
  IL: { es: "Israel",           en: "Israel" },
  IN: { es: "India",            en: "India" },
  IT: { es: "Italia",           en: "Italy" },
  JM: { es: "Jamaica",          en: "Jamaica" },
  JP: { es: "Japón",            en: "Japan" },
  KE: { es: "Kenia",            en: "Kenya" },
  KR: { es: "Corea del Sur",    en: "South Korea" },
  MA: { es: "Marruecos",        en: "Morocco" },
  MX: { es: "México",           en: "Mexico" },
  MY: { es: "Malasia",          en: "Malaysia" },
  NL: { es: "Países Bajos",     en: "Netherlands" },
  NZ: { es: "Nueva Zelanda",    en: "New Zealand" },
  PA: { es: "Panamá",           en: "Panama" },
  PE: { es: "Perú",             en: "Peru" },
  PH: { es: "Filipinas",        en: "Philippines" },
  PT: { es: "Portugal",         en: "Portugal" },
  PY: { es: "Paraguay",         en: "Paraguay" },
  QA: { es: "Qatar",            en: "Qatar" },
  SA: { es: "Arabia Saudita",   en: "Saudi Arabia" },
  SE: { es: "Suecia",           en: "Sweden" },
  SG: { es: "Singapur",         en: "Singapore" },
  SV: { es: "El Salvador",      en: "El Salvador" },
  TH: { es: "Tailandia",        en: "Thailand" },
  TR: { es: "Turquía",          en: "Turkey" },
  TW: { es: "Taiwán",           en: "Taiwan" },
  AE: { es: "Emiratos Árabes",  en: "UAE" },
  US: { es: "Estados Unidos",   en: "United States" },
  UY: { es: "Uruguay",          en: "Uruguay" },
  VN: { es: "Vietnam",          en: "Vietnam" },
  ZA: { es: "Sudáfrica",        en: "South Africa" },
};

// Country ISO → flag emoji
const COUNTRY_FLAG: Record<string, string> = {
  AR: "🇦🇷", AU: "🇦🇺", BR: "🇧🇷", CA: "🇨🇦", CL: "🇨🇱", CN: "🇨🇳",
  CO: "🇨🇴", CR: "🇨🇷", CU: "🇨🇺", DE: "🇩🇪", DO: "🇩🇴", EC: "🇪🇨",
  EG: "🇪🇬", ES: "🇪🇸", FR: "🇫🇷", GB: "🇬🇧", GH: "🇬🇭", GR: "🇬🇷",
  GT: "🇬🇹", ID: "🇮🇩", IL: "🇮🇱", IN: "🇮🇳", IT: "🇮🇹", JM: "🇯🇲",
  JP: "🇯🇵", KE: "🇰🇪", KR: "🇰🇷", MA: "🇲🇦", MX: "🇲🇽", MY: "🇲🇾",
  NL: "🇳🇱", NZ: "🇳🇿", PA: "🇵🇦", PE: "🇵🇪", PH: "🇵🇭", PT: "🇵🇹",
  PY: "🇵🇾", QA: "🇶🇦", SA: "🇸🇦", SE: "🇸🇪", SG: "🇸🇬", SV: "🇸🇻",
  TH: "🇹🇭", TR: "🇹🇷", TW: "🇹🇼", AE: "🇦🇪", US: "🇺🇸", UY: "🇺🇾",
  VN: "🇻🇳", ZA: "🇿🇦",
};

// ── Labels ─────────────────────────────────────────────────────────────────

const LABELS = {
  es: {
    title:           "Requisitos de visa",
    passport:        "Pasaporte:",
    noDestinations:  "Sin destinos en el viaje",
    unknown:         "Verificar con consulado",
    sameCountry:     "Destino local",
    visaFree:        "Sin visa",
    visaOnArrival:   "Visa a la llegada",
    etaRequired:     "ETA requerida",
    visaRequired:    "Visa requerida",
    days:            (n: number) => `hasta ${n} días`,
    notes:           "Nota:",
  },
  en: {
    title:           "Visa Requirements",
    passport:        "Passport:",
    noDestinations:  "No destinations in trip",
    unknown:         "Check with consulate",
    sameCountry:     "Local destination",
    visaFree:        "Visa free",
    visaOnArrival:   "Visa on arrival",
    etaRequired:     "ETA required",
    visaRequired:    "Visa required",
    days:            (n: number) => `up to ${n} days`,
    notes:           "Note:",
  },
} as const;

// ── Status badge config ────────────────────────────────────────────────────

interface BadgeConfig {
  text: string;
  className: string;
}

function getStatusBadge(
  status: VisaStatus,
  locale: "es" | "en",
  maxDays?: number,
): BadgeConfig {
  const L = LABELS[locale];
  const daysLabel = maxDays ? ` · ${L.days(maxDays)}` : "";

  const configs: Record<VisaStatus, BadgeConfig> = {
    visa_free: {
      text:      `${L.visaFree}${daysLabel}`,
      className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    },
    visa_on_arrival: {
      text:      `${L.visaOnArrival}${daysLabel}`,
      className: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    },
    eta_required: {
      text:      L.etaRequired,
      className: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    },
    visa_required: {
      text:      L.visaRequired,
      className: "bg-red-500/20 text-red-300 border-red-500/30",
    },
  };

  return configs[status];
}

// ── Props ──────────────────────────────────────────────────────────────────

interface VisaCheckerProps {
  /** IATA airport codes from the trip */
  destinations: string[];
  /** ISO 3166-1 alpha-2 code; falls back to localStorage then "AR" */
  passportCountry?: string;
}

// ── Derived destination entry ──────────────────────────────────────────────

interface DestinationEntry {
  iata: string;
  countryIso: string | null;
  visaInfo: VisaInfo | null;
  isSameCountry: boolean;
}

// ── Component ──────────────────────────────────────────────────────────────

export function VisaChecker({ destinations, passportCountry }: VisaCheckerProps) {
  const { locale } = useLanguage();
  const L = LABELS[locale];

  // Passport country state — init from prop → localStorage → "AR"
  const [passport, setPassport] = useState<string>(() => {
    if (passportCountry) return passportCountry.toUpperCase();
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return stored.toUpperCase();
    }
    return "AR";
  });

  const [expanded, setExpanded] = useState(true);

  // Persist passport preference
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, passport);
    } catch {
      // quota exceeded — ignore
    }
  }, [passport]);

  // Deduplicate destination countries (skip origin equals passport country)
  const seen = new Set<string>();
  const entries: DestinationEntry[] = destinations
    .map((iata): DestinationEntry => {
      const countryIso = getCountryFromAirport(iata);
      const isSameCountry = countryIso !== null && countryIso === passport;
      const visaInfo =
        countryIso && !isSameCountry ? checkVisa(passport, countryIso) : null;
      return { iata, countryIso, visaInfo, isSameCountry };
    })
    .filter((entry) => {
      // Deduplicate by country ISO (or IATA if no country resolved)
      const key = entry.countryIso ?? entry.iata;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  // Overall status dot: red if any visa_required, yellow if eta/voa, green otherwise
  function overallDot(): string {
    const statuses = entries.map((e) => e.visaInfo?.status);
    if (statuses.some((s) => s === "visa_required")) return "bg-red-400";
    if (statuses.some((s) => s === "eta_required" || s === "visa_on_arrival"))
      return "bg-yellow-400";
    return "bg-emerald-400";
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] overflow-hidden">
      {/* Collapsible header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <span className="text-base leading-none" aria-hidden>🛂</span>
          <span className="text-sm font-semibold text-white">{L.title}</span>
          {entries.length > 0 && (
            <span className={`h-2 w-2 rounded-full shrink-0 ${overallDot()}`} />
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-gray-500 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/[0.06]">
          {/* Passport selector */}
          <div className="pt-3 flex items-center gap-2">
            <span className="text-xs text-gray-500 shrink-0">{L.passport}</span>
            <select
              value={passport}
              onChange={(e) => setPassport(e.target.value)}
              className="flex-1 min-w-0 bg-white/[0.06] border border-white/[0.08] rounded-lg px-2 py-1 text-xs text-white outline-none cursor-pointer hover:bg-white/[0.09] transition-colors"
              aria-label={L.passport}
            >
              {PASSPORT_OPTIONS.map(({ iso, label, flag }) => (
                <option key={iso} value={iso} className="bg-[#0e0e20] text-white">
                  {flag} {label}
                </option>
              ))}
            </select>
          </div>

          {/* Destination list */}
          {entries.length === 0 ? (
            <p className="text-xs text-gray-600 text-center py-2">{L.noDestinations}</p>
          ) : (
            <ul className="space-y-2">
              {entries.map((entry) => (
                <DestinationRow
                  key={entry.iata}
                  entry={entry}
                  locale={locale}
                  L={L}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ── Destination row sub-component ──────────────────────────────────────────

interface DestinationRowProps {
  entry: DestinationEntry;
  locale: "es" | "en";
  L: (typeof LABELS)["es"] | (typeof LABELS)["en"];
}

function DestinationRow({ entry, locale, L }: DestinationRowProps) {
  const { iata, countryIso, visaInfo, isSameCountry } = entry;

  const flag = countryIso ? (COUNTRY_FLAG[countryIso] ?? "🏳️") : "🏳️";
  const countryName = countryIso
    ? (COUNTRY_DISPLAY[countryIso]?.[locale] ?? countryIso)
    : iata;

  if (isSameCountry) {
    return (
      <li className="flex items-center gap-2 py-1">
        <span className="text-base leading-none" aria-hidden>{flag}</span>
        <span className="text-xs text-gray-400 flex-1">{countryName}</span>
        <span className="text-[10px] text-gray-600 italic">{L.sameCountry}</span>
      </li>
    );
  }

  if (!visaInfo) {
    return (
      <li className="flex items-center gap-2 py-1">
        <span className="text-base leading-none" aria-hidden>{flag}</span>
        <span className="text-xs text-gray-300 flex-1">{countryName}</span>
        <span className="text-[10px] text-gray-500 italic flex items-center gap-1">
          <span aria-hidden>ℹ️</span>
          {L.unknown}
        </span>
      </li>
    );
  }

  const badge = getStatusBadge(visaInfo.status, locale, visaInfo.maxDays);
  const note = visaInfo.notes?.[locale];

  return (
    <li className="space-y-1 py-1">
      <div className="flex items-center gap-2">
        <span className="text-base leading-none" aria-hidden>{flag}</span>
        <span className="text-xs text-gray-300 flex-1 font-medium">{countryName}</span>
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${badge.className}`}
        >
          {badge.text}
        </span>
      </div>
      {note && (
        <p className="text-[10px] text-gray-500 pl-7">
          {note}
        </p>
      )}
    </li>
  );
}
