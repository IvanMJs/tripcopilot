"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PackingItem } from "@/lib/packingList";
import type { PackingListResponse } from "@/app/api/packing-list/route";

interface UsePackingListOptions {
  tripId: string;
  destination: string;
  durationDays: number;
  tempC: number;
  activities?: string[];
  locale: "es" | "en";
  /** If false, skip the API call (e.g. user is not authenticated). */
  enabled?: boolean;
}

interface UsePackingListResult {
  items: PackingItem[];
  checkedIds: Set<string>;
  loading: boolean;
  error: string | null;
  aiEnhanced: boolean;
  toggle: (id: string) => void;
  regenerate: () => void;
}

function storageKey(tripId: string): string {
  return `packing-${tripId}`;
}

function loadChecked(tripId: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(tripId));
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function saveChecked(tripId: string, ids: Set<string>): void {
  try {
    localStorage.setItem(storageKey(tripId), JSON.stringify(Array.from(ids)));
  } catch {
    // localStorage unavailable — silently ignore
  }
}

export function usePackingList({
  tripId,
  destination,
  durationDays,
  tempC,
  activities = [],
  locale,
  enabled = true,
}: UsePackingListOptions): UsePackingListResult {
  const [items, setItems] = useState<PackingItem[]>([]);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() =>
    loadChecked(tripId),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiEnhanced, setAiEnhanced] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const fetchList = useCallback(async () => {
    if (!enabled) return;

    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/packing-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination,
          durationDays,
          tempC,
          activities,
          locale,
          tripId,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const data: PackingListResponse = await res.json();
      setItems(data.items);
      setAiEnhanced(data.aiEnhanced);
    } catch (err) {
      if ((err as { name?: string }).name === "AbortError") return;
      setError(
        locale === "es"
          ? "Error al cargar la lista de equipaje"
          : "Failed to load packing list",
      );
    } finally {
      setLoading(false);
    }
  }, [destination, durationDays, tempC, activities, locale, tripId, enabled]);

  // Initial fetch
  useEffect(() => {
    void fetchList();
    return () => {
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  // Reload checked state when tripId changes
  useEffect(() => {
    setCheckedIds(loadChecked(tripId));
  }, [tripId]);

  const toggle = useCallback(
    (id: string) => {
      setCheckedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        saveChecked(tripId, next);
        return next;
      });
    },
    [tripId],
  );

  const regenerate = useCallback(() => {
    void fetchList();
  }, [fetchList]);

  return { items, checkedIds, loading, error, aiEnhanced, toggle, regenerate };
}
