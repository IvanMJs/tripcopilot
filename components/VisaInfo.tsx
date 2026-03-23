"use client";

import { useState } from "react";
import {
  getVisaRequirement,
  airportToCountry,
  VisaRequirement,
} from "@/lib/visaRequirements";

interface VisaInfoProps {
  originAirport: string;
  destinationAirport: string;
  passportCountry?: string;
  locale: "es" | "en";
}

const PASSPORT_OPTIONS: { code: string; label: string }[] = [
  { code: "AR", label: "Argentina" },
  { code: "US", label: "Estados Unidos / USA" },
  { code: "BR", label: "Brasil / Brazil" },
  { code: "MX", label: "México / Mexico" },
  { code: "ES", label: "España / Spain" },
  { code: "FR", label: "Francia / France" },
  { code: "DE", label: "Alemania / Germany" },
  { code: "GB", label: "Reino Unido / UK" },
  { code: "CN", label: "China" },
  { code: "JP", label: "Japón / Japan" },
  { code: "AU", label: "Australia" },
];

type RequirementKey = VisaRequirement["requirement"];

interface BadgeConfig {
  dot: string;
  label: { es: string; en: string };
  pill: string;
}

const BADGE: Record<RequirementKey, BadgeConfig> = {
  visa_free: {
    dot: "bg-green-500",
    label: { es: "Libre de visa", en: "Visa-free" },
    pill: "bg-green-950/50 border-green-700/40 text-green-300",
  },
  visa_on_arrival: {
    dot: "bg-yellow-400",
    label: { es: "Visa en llegada", en: "Visa on arrival" },
    pill: "bg-yellow-950/50 border-yellow-700/40 text-yellow-300",
  },
  e_visa: {
    dot: "bg-orange-400",
    label: { es: "e-Visa / Autorización electrónica", en: "e-Visa / Electronic authorization" },
    pill: "bg-orange-950/50 border-orange-700/40 text-orange-300",
  },
  visa_required: {
    dot: "bg-red-500",
    label: { es: "Visa requerida", en: "Visa required" },
    pill: "bg-red-950/50 border-red-700/40 text-red-300",
  },
};

export function VisaInfo({
  originAirport,
  destinationAirport,
  passportCountry = "AR",
  locale,
}: VisaInfoProps) {
  const [open, setOpen] = useState(false);
  const [passport, setPassport] = useState(passportCountry);

  const destCountry = airportToCountry(destinationAirport);
  const originCountry = airportToCountry(originAirport);

  // Only render for international routes
  if (!destCountry || !originCountry || originCountry === destCountry) {
    return null;
  }

  const info = getVisaRequirement(passport, destCountry);
  const badge = info ? BADGE[info.requirement] : null;

  const stayLabel =
    locale === "es"
      ? (days: number) => `Estancia máx. ${days} días`
      : (days: number) => `Max stay ${days} days`;

  return (
    <div className="px-4 py-2.5 border-t border-white/5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-400 hover:text-sky-300 transition-colors"
      >
        <span>🛂</span>
        {locale === "es" ? "Requisitos de visa" : "Visa requirements"}
        {badge && (
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-semibold ${badge.pill}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
            {badge.label[locale]}
          </span>
        )}
        <span className="text-gray-600">{open ? "↑" : "↓"}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {/* Passport selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-gray-500">
              {locale === "es" ? "¿Tenés pasaporte de otro país?" : "Different passport?"}
            </span>
            <select
              value={passport}
              onChange={(e) => setPassport(e.target.value)}
              className="text-[11px] bg-white/5 border border-white/10 text-gray-300 rounded-md px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-sky-500/50"
            >
              {PASSPORT_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code} className="bg-gray-900">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Requirement card */}
          {info && badge ? (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[11px] font-semibold ${badge.pill}`}
                >
                  <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                  {badge.label[locale]}
                </span>
                {info.maxStayDays !== null && (
                  <span className="text-[11px] text-gray-400">
                    {stayLabel(info.maxStayDays)}
                  </span>
                )}
              </div>
              {info.notes && (
                <p className="text-[11px] text-gray-500 leading-relaxed">{info.notes}</p>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-gray-500">
              {locale === "es"
                ? "No tenemos datos para este par de países. Verificá con el consulado correspondiente."
                : "No data available for this country pair. Check with the relevant consulate."}
            </p>
          )}

          <p className="text-[10px] text-gray-600">
            {locale === "es"
              ? "Información aproximada — verificá siempre antes de viajar."
              : "Approximate information — always verify before travel."}
          </p>
        </div>
      )}
    </div>
  );
}
