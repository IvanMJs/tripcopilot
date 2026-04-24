"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { TripTab } from "@/lib/types";
import {
  TripSummary,
  DreamPlannerEntry,
  saveDreamPlan,
  loadDreamPlans,
} from "@/lib/dreamPlanner";

interface DreamTripPlannerProps {
  trips: TripTab[];
  locale: "es" | "en";
  onCreateTrip?: (destIata: string, destName: string) => void;
}

const LABELS = {
  es: {
    title: "Planificador de sueños ✨",
    subtitle: "Describí tu próximo viaje soñado y la IA arma el plan completo",
    placeholder: "Quiero ir a Japón en abril con $2,000...",
    button: "Armar mi viaje",
    buttonLoading: "Planificando...",
    createTrip: "Crear este viaje →",
    historyTitle: "Planes anteriores",
    rateLimited: "Límite alcanzado. Reintentá en 1 hora.",
    errorGeneric: "Algo salió mal. Intentá de nuevo.",
    charCount: (n: number) => `${n}/500`,
  },
  en: {
    title: "Dream Trip Planner ✨",
    subtitle: "Describe your dream trip and AI builds the complete plan",
    placeholder: "I want to go to Japan in April with $2,000...",
    button: "Plan my trip",
    buttonLoading: "Planning...",
    createTrip: "Create this trip →",
    historyTitle: "Previous plans",
    rateLimited: "Rate limit reached. Try again in 1 hour.",
    errorGeneric: "Something went wrong. Please try again.",
    charCount: (n: number) => `${n}/500`,
  },
} as const;

const SECTION_EMOJIS = ["✈️", "🗓️", "🏙️", "💰", "🛂", "🎒", "✨"];

function renderPlan(text: string): React.ReactNode[] {
  return text.split("\n").map((line, index) => {
    if (!line.trim()) return null;

    const startsWithSectionEmoji = SECTION_EMOJIS.some((emoji) =>
      line.startsWith(emoji)
    );

    if (startsWithSectionEmoji || line.startsWith("##")) {
      return (
        <h3 key={index} className="text-sm font-bold text-white mt-4 mb-1">
          {line.replace(/^##\s*/, "")}
        </h3>
      );
    }

    if (line.startsWith("**") && line.endsWith("**") && line.length > 4) {
      return (
        <p key={index} className="text-xs font-semibold text-gray-300">
          {line.slice(2, -2)}
        </p>
      );
    }

    if (line.startsWith("-") || line.startsWith("•")) {
      return (
        <p key={index} className="text-xs text-gray-400 ml-2">
          • {line.slice(1).trim()}
        </p>
      );
    }

    return (
      <p key={index} className="text-xs text-gray-400 leading-relaxed">
        {line}
      </p>
    );
  }).filter((node): node is React.ReactElement => node !== null);
}

export function DreamTripPlanner({
  trips,
  locale,
  onCreateTrip,
}: DreamTripPlannerProps) {
  const L = LABELS[locale];

  const [prompt, setPrompt] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [planText, setPlanText] = useState("");
  const [planDone, setPlanDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<DreamPlannerEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setHistory(loadDreamPlans());
  }, []);

  async function handleSubmit() {
    if (streaming) {
      abortRef.current?.abort();
    }

    const abortController = new AbortController();
    abortRef.current = abortController;

    setStreaming(true);
    setPlanText("");
    setPlanDone(false);
    setError(null);

    const pastTrips: TripSummary[] = trips
      .flatMap((t) =>
        t.flights.map((f) => ({
          originCode: f.originCode,
          destinationCode: f.destinationCode,
          isoDate: f.isoDate,
        }))
      )
      .slice(0, 20);

    try {
      const res = await fetch("/api/dream-planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, pastTrips, locale }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        if (res.status === 429) {
          setError(L.rateLimited);
        } else {
          setError(L.errorGeneric);
        }
        setStreaming(false);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setPlanText(acc);
      }

      setPlanDone(true);
      saveDreamPlan({
        id: Date.now().toString(),
        prompt,
        plan: acc,
        createdAt: new Date().toISOString(),
      });
      setHistory(loadDreamPlans());
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // User aborted — no error shown
      } else {
        setError(L.errorGeneric);
      }
    } finally {
      setStreaming(false);
    }
  }

  function handleCreateTrip() {
    // Look for first IATA-like code (3 uppercase letters) after the ✈️ section
    const flightSectionMatch = planText.match(/✈️[\s\S]*?([A-Z]{3})/);
    const code = flightSectionMatch ? flightSectionMatch[1] : "";
    onCreateTrip?.(code, code);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4"
    >
      {/* Header */}
      <h2 className="text-sm font-bold text-white mb-1">{L.title}</h2>
      <p className="text-xs text-gray-500 mb-3">{L.subtitle}</p>

      {/* Textarea */}
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value.slice(0, 500))}
        placeholder={L.placeholder}
        disabled={streaming}
        rows={3}
        className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-gray-200 placeholder-gray-600 px-3 py-2 resize-none focus:outline-none focus:border-[rgba(255,184,0,0.25)] disabled:opacity-50"
      />
      <div className="flex items-center justify-between mt-1 mb-3">
        <span className="text-[10px] text-gray-600">{L.charCount(prompt.length)}</span>
        <button
          onClick={handleSubmit}
          disabled={streaming || prompt.trim().length < 5}
          className="rounded-xl bg-[#FFB800] hover:bg-[#FFC933] disabled:opacity-40 disabled:cursor-not-allowed px-4 py-1.5 text-xs font-semibold text-[#07070d] transition-colors"
        >
          {streaming ? L.buttonLoading : L.button}
        </button>
      </div>

      {/* Error */}
      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

      {/* Streaming plan */}
      {(planText || streaming) && (
        <div className="mt-2 border-t border-white/[0.05] pt-3">
          {renderPlan(planText)}
          {streaming && (
            <span className="inline-block w-1.5 h-3 bg-[rgba(255,184,0,0.25)] animate-pulse ml-0.5" />
          )}
        </div>
      )}

      {/* Create trip CTA */}
      {planDone && onCreateTrip && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={handleCreateTrip}
          className="mt-3 w-full rounded-xl border border-[rgba(255,184,0,0.25)] bg-[#FFB800]/10 hover:bg-[#FFC933]/20 px-4 py-2 text-xs font-semibold text-[#FFB800] transition-colors"
        >
          {L.createTrip}
        </motion.button>
      )}

      {/* History accordion */}
      {history.length > 0 && (
        <div className="mt-4 border-t border-white/[0.05] pt-3">
          <button
            onClick={() => setHistoryOpen((o) => !o)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <span>{historyOpen ? "▾" : "▸"}</span>
            <span>{L.historyTitle} ({history.length})</span>
          </button>
          {historyOpen && (
            <div className="mt-2 space-y-2">
              {history.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => {
                    setPrompt(entry.prompt);
                    setPlanText(entry.plan);
                    setPlanDone(true);
                    setStreaming(false);
                  }}
                  className="w-full text-left rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2 hover:bg-white/[0.04] transition-colors"
                >
                  <p className="text-xs text-gray-400 truncate">{entry.prompt}</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">{entry.createdAt.slice(0, 10)}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
