"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookMarked,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Pencil,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { TripFlight } from "@/lib/types";
import { useTripJournal } from "@/hooks/useTripJournal";

export interface TripJournalProps {
  tripId: string;
  flights: TripFlight[];
  tripName: string;
  locale?: "es" | "en";
}

const L = {
  es: {
    title: "Diario de viaje",
    subtitle: "Entrada generada por IA",
    generate: "Generar diario",
    regenerate: "Regenerar",
    generating: "Escribiendo tu historia…",
    copy: "Copiar",
    copied: "¡Copiado!",
    edit: "Editar",
    save: "Guardar",
    noFlights: "Agregá vuelos al viaje para generar tu diario.",
    error: "No se pudo generar el diario. Intentá de nuevo.",
    collapse: "Colapsar",
    expand: "Ver diario",
  },
  en: {
    title: "Trip Journal",
    subtitle: "AI-generated entry",
    generate: "Generate journal",
    regenerate: "Regenerate",
    generating: "Writing your story…",
    copy: "Copy",
    copied: "Copied!",
    edit: "Edit",
    save: "Save",
    noFlights: "Add flights to the trip to generate your journal.",
    error: "Could not generate the journal. Please try again.",
    collapse: "Collapse",
    expand: "View journal",
  },
};

function TypingDots() {
  return (
    <span className="flex items-center gap-1 px-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-violet-400"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </span>
  );
}

export function TripJournal({
  tripId,
  flights,
  tripName,
  locale = "es",
}: TripJournalProps) {
  const labels = L[locale];
  const { journal, isGenerating, error, generate, updateJournal } =
    useTripJournal(tripId);

  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  const hasFlights = flights.length > 0;

  function handleGenerate() {
    void generate({ tripId, tripName, flights, locale });
  }

  async function handleCopy() {
    if (!journal) return;
    await navigator.clipboard.writeText(journal);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleEdit() {
    setEditText(journal ?? "");
    setIsEditing(true);
  }

  function handleSave() {
    updateJournal(editText.trim());
    setIsEditing(false);
  }

  return (
    <div className="px-4 pb-6">
      <div className="rounded-2xl border border-violet-700/30 bg-gradient-to-br from-violet-950/30 via-indigo-950/20 to-purple-950/20 overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="w-full flex items-center gap-3 px-4 pt-4 pb-3 border-b border-violet-700/20 text-left"
        >
          <div className="w-8 h-8 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
            <BookMarked className="w-4 h-4 text-violet-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white/90">{labels.title}</p>
            <p className="text-xs text-gray-400">{labels.subtitle}</p>
          </div>
          {collapsed ? (
            <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
          ) : (
            <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" />
          )}
        </button>

        {/* Body */}
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              key="body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 py-4">
                <AnimatePresence mode="wait">
                  {isGenerating ? (
                    <motion.div
                      key="generating"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 text-sm text-violet-400/80 py-4"
                    >
                      <TypingDots />
                      <span>{labels.generating}</span>
                    </motion.div>
                  ) : isEditing ? (
                    <motion.div
                      key="editing"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={8}
                        className="w-full rounded-xl bg-white/5 border border-violet-700/30 text-sm text-gray-200 leading-relaxed p-3 resize-none focus:outline-none focus:ring-1 focus:ring-violet-500/60"
                      />
                      <button
                        onClick={handleSave}
                        className="mt-3 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-95 px-4 py-2 text-xs text-white font-semibold transition-all"
                      >
                        {labels.save}
                      </button>
                    </motion.div>
                  ) : journal ? (
                    <motion.div
                      key="journal"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      {/* Journal text */}
                      <p className="text-sm text-gray-300 leading-relaxed italic whitespace-pre-wrap">
                        {journal}
                      </p>

                      {/* Action row */}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          onClick={handleCopy}
                          className="flex items-center gap-1.5 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 px-3 py-1.5 text-xs text-gray-300 transition-all"
                        >
                          {copied ? (
                            <Check className="w-3.5 h-3.5 text-green-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          {copied ? labels.copied : labels.copy}
                        </button>
                        <button
                          onClick={handleEdit}
                          className="flex items-center gap-1.5 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 px-3 py-1.5 text-xs text-gray-300 transition-all"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          {labels.edit}
                        </button>
                        <button
                          onClick={handleGenerate}
                          className="flex items-center gap-1.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 active:scale-95 px-3 py-1.5 text-xs text-violet-400 font-medium transition-all"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          {labels.regenerate}
                        </button>
                      </div>
                    </motion.div>
                  ) : error ? (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <p className="text-sm text-red-400 mb-3">{labels.error}</p>
                      <button
                        onClick={handleGenerate}
                        className="rounded-xl bg-violet-600/80 hover:bg-violet-500/80 active:scale-95 text-white text-sm font-semibold px-4 py-2 transition-all"
                      >
                        {labels.generate}
                      </button>
                    </motion.div>
                  ) : !hasFlights ? (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <p className="text-sm text-gray-500 italic">
                        {labels.noFlights}
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="cta"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <button
                        onClick={handleGenerate}
                        className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 active:scale-95 text-white text-sm font-semibold py-2.5 transition-all flex items-center justify-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        {labels.generate}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
