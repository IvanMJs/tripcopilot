"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { TripExpense } from "@/lib/types";

interface DbExpense {
  id: string;
  trip_id: string;
  amount: number;
  currency: string;
  category: string;
  description: string | null;
  expense_date: string | null;
}

function toTripExpense(e: DbExpense): TripExpense {
  return {
    id:          e.id,
    tripId:      e.trip_id,
    amount:      e.amount,
    currency:    e.currency,
    category:    e.category as TripExpense["category"],
    description: e.description ?? undefined,
    expenseDate: e.expense_date ?? undefined,
  };
}

export function useTripExpenses(tripId: string) {
  const [expenses, setExpenses] = useState<TripExpense[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    if (!tripId) return;

    async function load() {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("trip_expenses")
        .select("id, trip_id, amount, currency, category, description, expense_date")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: true });

      if (fetchError) {
        setError(fetchError.message);
      } else if (data) {
        setExpenses((data as DbExpense[]).map(toTripExpense));
      }
      setLoading(false);
    }

    load();
  }, [tripId]);

  const addExpense = useCallback(async (
    expense: Omit<TripExpense, "id" | "tripId">,
  ): Promise<boolean> => {
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("trip_expenses")
      .insert({
        trip_id:      tripId,
        amount:       expense.amount,
        currency:     expense.currency,
        category:     expense.category,
        description:  expense.description ?? null,
        expense_date: expense.expenseDate ?? null,
      })
      .select("id, trip_id, amount, currency, category, description, expense_date")
      .single();

    if (insertError) {
      setError(insertError.message);
      return false;
    }
    if (data) {
      setExpenses((prev) => [...prev, toTripExpense(data as DbExpense)]);
    }
    return true;
  }, [tripId]);

  const removeExpense = useCallback(async (expenseId: string): Promise<void> => {
    const snapshot = expenses;
    setExpenses((prev) => prev.filter((e) => e.id !== expenseId));

    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("trip_expenses")
      .delete()
      .eq("id", expenseId);

    if (deleteError) {
      setExpenses(snapshot);
    }
  }, [expenses]);

  const totalByCurrency = useCallback((): Record<string, number> => {
    return expenses.reduce<Record<string, number>>((acc, e) => {
      acc[e.currency] = (acc[e.currency] ?? 0) + e.amount;
      return acc;
    }, {});
  }, [expenses]);

  return { expenses, loading, error, addExpense, removeExpense, totalByCurrency };
}
