"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

export interface PriceAlert {
  id: string;
  userId: string;
  originCode: string;
  destinationCode: string;
  targetDate: string;
  maxPrice: number | null;
  currency: string;
  isActive: boolean;
  createdAt: string;
}

interface DbPriceAlert {
  id: string;
  user_id: string;
  origin_code: string;
  destination_code: string;
  target_date: string;
  max_price: number | null;
  currency: string;
  is_active: boolean;
  created_at: string;
}

function toAlert(row: DbPriceAlert): PriceAlert {
  return {
    id:              row.id,
    userId:          row.user_id,
    originCode:      row.origin_code,
    destinationCode: row.destination_code,
    targetDate:      row.target_date,
    maxPrice:        row.max_price,
    currency:        row.currency,
    isActive:        row.is_active,
    createdAt:       row.created_at,
  };
}

export function usePriceAlerts() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("price_alerts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Error loading price alerts:", error.message);
      }
      if (data) setAlerts((data as DbPriceAlert[]).map(toAlert));
      setLoading(false);
    }

    load();
  }, []);

  const addAlert = useCallback(async (
    alert: Omit<PriceAlert, "id" | "userId" | "createdAt" | "isActive">,
  ) => {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data, error } = await supabase
      .from("price_alerts")
      .insert({
        origin_code:      alert.originCode.toUpperCase().trim(),
        destination_code: alert.destinationCode.toUpperCase().trim(),
        target_date:      alert.targetDate,
        max_price:        alert.maxPrice ?? null,
        currency:         alert.currency,
        is_active:        true,
      })
      .select("*")
      .single();

    if (!error && data) {
      setAlerts((prev) => [toAlert(data as DbPriceAlert), ...prev]);
    }
  }, []);

  const removeAlert = useCallback(async (id: string) => {
    const snapshot = alerts;
    setAlerts((prev) => prev.filter((a) => a.id !== id));

    const supabase = createClient();
    const { error } = await supabase.from("price_alerts").delete().eq("id", id);
    if (error) {
      setAlerts(snapshot);
    }
  }, [alerts]);

  const toggleAlert = useCallback(async (id: string) => {
    let nextValue: boolean | undefined;
    setAlerts((prev) => {
      const updated = prev.map((a) => {
        if (a.id !== id) return a;
        nextValue = !a.isActive;
        return { ...a, isActive: nextValue };
      });
      return updated;
    });
    if (nextValue === undefined) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("price_alerts")
      .update({ is_active: nextValue })
      .eq("id", id);
    if (error) {
      // rollback
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isActive: !nextValue } : a))
      );
      console.error("Error toggling alert:", error.message);
    }
  }, []); // sin deps

  return { alerts, loading, addAlert, removeAlert, toggleAlert };
}
