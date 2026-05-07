"use client";

import { useState, useEffect, useCallback } from "react";
import { TripFlight } from "@/lib/types";

export interface TripJournalState {
  journal: string | null;
  isGenerating: boolean;
  error: string | null;
}

interface GenerateOptions {
  tripId: string;
  tripName: string;
  flights: TripFlight[];
  locale: "es" | "en";
}

function storageKey(tripId: string): string {
  return `tc-journal-${tripId}`;
}

function buildFlightPayload(flights: TripFlight[]) {
  return flights.map((f) => ({
    originCode: f.originCode,
    destinationCode: f.destinationCode,
    isoDate: f.isoDate,
    airline: f.airlineName,
    flightNumber: f.flightNumber,
  }));
}

export interface UseTripJournalReturn {
  journal: string | null;
  isGenerating: boolean;
  error: string | null;
  generate: (opts: GenerateOptions) => Promise<void>;
  updateJournal: (text: string) => void;
  clearJournal: () => void;
}

export function useTripJournal(tripId: string): UseTripJournalReturn {
  const [journal, setJournal] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load persisted journal from localStorage on mount / tripId change
  useEffect(() => {
    if (!tripId) return;
    try {
      const stored = localStorage.getItem(storageKey(tripId));
      setJournal(stored ?? null);
    } catch {
      // localStorage unavailable (SSR guard — hooks are client-only but be safe)
    }
  }, [tripId]);

  const generate = useCallback(
    async ({ tripId: id, tripName, flights, locale }: GenerateOptions) => {
      if (isGenerating) return;
      setIsGenerating(true);
      setError(null);

      try {
        const res = await fetch("/api/trip-journal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tripId: id,
            tripName,
            flights: buildFlightPayload(flights),
            locale,
          }),
        });

        if (!res.ok) {
          const errData = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(errData.error ?? `HTTP ${res.status}`);
        }

        const data = (await res.json()) as { journal?: string };
        const text = data.journal ?? "";
        setJournal(text);
        try {
          localStorage.setItem(storageKey(id), text);
        } catch {
          // ignore storage errors
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsGenerating(false);
      }
    },
    [isGenerating],
  );

  const updateJournal = useCallback(
    (text: string) => {
      setJournal(text);
      try {
        localStorage.setItem(storageKey(tripId), text);
      } catch {
        // ignore storage errors
      }
    },
    [tripId],
  );

  const clearJournal = useCallback(() => {
    setJournal(null);
    setError(null);
    try {
      localStorage.removeItem(storageKey(tripId));
    } catch {
      // ignore storage errors
    }
  }, [tripId]);

  return { journal, isGenerating, error, generate, updateJournal, clearJournal };
}
