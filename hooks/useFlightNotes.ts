"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

export interface FlightNote {
  pnr: string;
  seat: string;
  notes: string;
}

export function useFlightNotes() {
  const [notesMap, setNotesMap] = useState<Record<string, FlightNote>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);

        const { data, error } = await supabase
          .from("flight_notes")
          .select("flight_key, pnr, seat, notes");

        if (error) {
          throw new Error(error.message);
        }

        if (!data) return;

        const map: Record<string, FlightNote> = {};
        for (const r of data) {
          map[r.flight_key] = { pnr: r.pnr ?? "", seat: r.seat ?? "", notes: r.notes ?? "" };
        }
        setNotesMap(map);
      } catch (error) {
        console.error("Failed to load flight notes:", error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const updateNote = useCallback(
    (flightKey: string, field: keyof FlightNote, value: string) => {
      let nextNote: FlightNote;

      setNotesMap((prev) => {
        const current = prev[flightKey] ?? { pnr: "", seat: "", notes: "" };
        nextNote = { ...current, [field]: value };
        return { ...prev, [flightKey]: nextNote };
      });

      if (!userId) return;

      // Fire-and-forget upsert
      createClient()
        .from("flight_notes")
        .upsert(
          { user_id: userId, flight_key: flightKey, ...nextNote! },
          { onConflict: "user_id,flight_key" },
        )
        .then(() => {});
    },
    [userId],
  );

  return {
    notesMap,
    updateNote,
    loading,
  };
}