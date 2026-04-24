"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Check } from "lucide-react";

// ── Template definitions ────────────────────────────────────────────────────────

export interface TripTemplateData {
  id: string;
  emoji: string;
  nameEs: string;
  nameEn: string;
  descEs: string;
  descEn: string;
  /** Default trip name (Spanish) */
  defaultNameEs: string;
  /** Default trip name (English) */
  defaultNameEn: string;
  /** Checklist type to pre-fill */
  checklistType: "domestic" | "international" | "business" | "family";
  /** Suggested number of flight slots */
  flightSlots: number;
  /** Approximate duration label */
  durationEs: string;
  durationEn: string;
  gradient: string;
}

const TEMPLATES: TripTemplateData[] = [
  {
    id: "weekend",
    emoji: "🏖️",
    nameEs: "Escapada de fin de semana",
    nameEn: "Weekend Getaway",
    descEs: "2-3 días, vuelo ida y vuelta",
    descEn: "2-3 days, round-trip flight",
    defaultNameEs: "Escapada de fin de semana",
    defaultNameEn: "Weekend Getaway",
    checklistType: "domestic",
    flightSlots: 2,
    durationEs: "2-3 días",
    durationEn: "2-3 days",
    gradient: "from-cyan-700/60 to-blue-900/60",
  },
  {
    id: "business",
    emoji: "💼",
    nameEs: "Viaje de negocios",
    nameEn: "Business Trip",
    descEs: "2-5 días, ida y vuelta, hotel",
    descEn: "2-5 days, round-trip, hotel included",
    defaultNameEs: "Viaje de negocios",
    defaultNameEn: "Business Trip",
    checklistType: "business",
    flightSlots: 2,
    durationEs: "2-5 días",
    durationEn: "2-5 days",
    gradient: "from-slate-700/60 to-gray-900/60",
  },
  {
    id: "multidestination",
    emoji: "🌍",
    nameEs: "Aventura multi-destino",
    nameEn: "Multi-destination Adventure",
    descEs: "7-14 días, 3+ vuelos",
    descEn: "7-14 days, 3+ flights",
    defaultNameEs: "Aventura multi-destino",
    defaultNameEn: "Multi-destination Adventure",
    checklistType: "international",
    flightSlots: 3,
    durationEs: "7-14 días",
    durationEn: "7-14 days",
    gradient: "from-[#FFB800]/60 to-indigo-900/60",
  },
  {
    id: "family",
    emoji: "👨‍👩‍👧‍👦",
    nameEs: "Vacaciones familiares",
    nameEn: "Family Vacation",
    descEs: "5-10 días, 2 vuelos, 2 pasajeros",
    descEn: "5-10 days, 2 flights, 2 passengers",
    defaultNameEs: "Vacaciones en familia",
    defaultNameEn: "Family Vacation",
    checklistType: "family",
    flightSlots: 2,
    durationEs: "5-10 días",
    durationEn: "5-10 days",
    gradient: "from-amber-700/60 to-orange-900/60",
  },
  {
    id: "oneway",
    emoji: "✈️",
    nameEs: "Solo ida",
    nameEn: "One-way",
    descEs: "1 vuelo, sin vuelta definida",
    descEn: "1 flight, open-ended return",
    defaultNameEs: "Viaje solo ida",
    defaultNameEn: "One-way trip",
    checklistType: "international",
    flightSlots: 1,
    durationEs: "Abierto",
    durationEn: "Open-ended",
    gradient: "from-emerald-700/60 to-teal-900/60",
  },
];

// ── Props ──────────────────────────────────────────────────────────────────────

export interface SelectedTemplate {
  templateId: string;
  name: string;
  checklistType: TripTemplateData["checklistType"];
  flightSlots: number;
}

interface Props {
  locale: "es" | "en";
  onSelectTemplate: (template: SelectedTemplate) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TripTemplates({ locale, onSelectTemplate }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function handleSelect(t: TripTemplateData) {
    setSelectedId(t.id);
    onSelectTemplate({
      templateId: t.id,
      name: locale === "es" ? t.defaultNameEs : t.defaultNameEn,
      checklistType: t.checklistType,
      flightSlots: t.flightSlots,
    });
  }

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-[#FFB800] shrink-0" />
        <h3 className="text-sm font-bold text-white">
          {locale === "es" ? "Plantillas de viaje" : "Trip templates"}
        </h3>
      </div>

      {/* Horizontal scroll strip */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide snap-x snap-mandatory">
        {TEMPLATES.map((t, i) => {
          const isSelected = selectedId === t.id;
          const name = locale === "es" ? t.nameEs : t.nameEn;
          const desc = locale === "es" ? t.descEs : t.descEn;
          const duration = locale === "es" ? t.durationEs : t.durationEn;

          return (
            <motion.button
              key={t.id}
              onClick={() => handleSelect(t)}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: i * 0.05 }}
              whileTap={{ scale: 0.96 }}
              className={`snap-start relative flex-none w-48 rounded-2xl border overflow-hidden text-left transition-all ${
                isSelected
                  ? "border-[rgba(255,184,0,0.25)] ring-2 ring-[#FFB800]/30"
                  : "border-white/[0.07] hover:border-white/[0.14]"
              }`}
            >
              {/* Gradient background */}
              <div className={`h-28 bg-gradient-to-br ${t.gradient} flex items-center justify-center`}>
                <span className="text-4xl drop-shadow-lg select-none" aria-hidden>
                  {t.emoji}
                </span>

                {/* Selected checkmark */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      key="check"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[rgba(255,184,0,0.12)] flex items-center justify-center"
                    >
                      <Check className="w-3.5 h-3.5 text-white" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Text content */}
              <div
                className="p-3 space-y-1"
                style={{ background: "linear-gradient(150deg, rgba(14,14,24,0.97) 0%, rgba(9,9,18,0.99) 100%)" }}
              >
                <p className="text-xs font-bold text-white leading-tight line-clamp-1">{name}</p>
                <p className="text-[11px] text-gray-400 leading-tight">{desc}</p>
                <p className="text-[10px] text-gray-600 tabular-nums">{duration}</p>
              </div>

              {/* CTA */}
              <div
                className="px-3 pb-3"
                style={{ background: "linear-gradient(150deg, rgba(14,14,24,0.97) 0%, rgba(9,9,18,0.99) 100%)" }}
              >
                <span
                  className={`block w-full text-center rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                    isSelected
                      ? "bg-[#FFB800] text-[#07070d]"
                      : "bg-white/[0.06] text-gray-300 hover:bg-white/[0.10] hover:text-white"
                  }`}
                >
                  {isSelected
                    ? locale === "es" ? "Seleccionado" : "Selected"
                    : locale === "es" ? "Usar template" : "Use template"}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
