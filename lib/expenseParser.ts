// ── Expense OCR — parsing types and constants ────────────────────────────────
// V1: manual entry + camera capture (OCR not yet wired).
// All data lives in localStorage; no Supabase integration in this module.

export interface Expense {
  id: string;
  tripId: string;
  amount: number;
  currency: string;
  category:
    | "food"
    | "transport"
    | "accommodation"
    | "shopping"
    | "entertainment"
    | "other";
  description: string;
  date: string;      // ISO date — YYYY-MM-DD
  imageUrl?: string; // base64 data URL (camera capture)
  createdAt: string; // ISO timestamp
}

export type ExpenseCategory = Expense["category"];

export const EXPENSE_CATEGORIES: {
  id: ExpenseCategory;
  emoji: string;
  label: { es: string; en: string };
}[] = [
  { id: "food",          emoji: "🍽️", label: { es: "Comida",          en: "Food"          } },
  { id: "transport",     emoji: "🚕", label: { es: "Transporte",       en: "Transport"     } },
  { id: "accommodation", emoji: "🏨", label: { es: "Alojamiento",      en: "Accommodation" } },
  { id: "shopping",      emoji: "🛍️", label: { es: "Compras",          en: "Shopping"      } },
  { id: "entertainment", emoji: "🎭", label: { es: "Entretenimiento",  en: "Entertainment" } },
  { id: "other",         emoji: "📋", label: { es: "Otro",             en: "Other"         } },
];

export const CURRENCIES = [
  "USD", "EUR", "ARS", "BRL", "MXN", "CLP", "COP", "PEN", "GBP",
];

// ── localStorage helpers ─────────────────────────────────────────────────────

const storageKey = (tripId: string) => `tc-expenses-${tripId}`;

/** Returns all expenses for a trip from localStorage. */
export function loadExpenses(tripId: string): Expense[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(tripId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Expense[];
  } catch {
    return [];
  }
}

/** Persists the full expense array for a trip to localStorage. */
export function saveExpenses(tripId: string, expenses: Expense[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(tripId), JSON.stringify(expenses));
}

/** Appends one expense and persists. */
export function appendExpense(tripId: string, expense: Expense): void {
  const current = loadExpenses(tripId);
  saveExpenses(tripId, [expense, ...current]);
}

/** Removes an expense by id and persists. */
export function deleteExpense(tripId: string, id: string): void {
  const current = loadExpenses(tripId);
  saveExpenses(tripId, current.filter((e) => e.id !== id));
}

// ── Image size guard ──────────────────────────────────────────────────────────

/** Approximate byte threshold for a single receipt image (500 KB). */
const IMAGE_SIZE_LIMIT_BYTES = 500 * 1024;

/** Returns true if a base64 data URL exceeds the storage limit. */
export function imageExceedsLimit(dataUrl: string): boolean {
  // base64 → raw bytes ≈ length × 0.75
  const approxBytes = Math.floor((dataUrl.length * 3) / 4);
  return approxBytes > IMAGE_SIZE_LIMIT_BYTES;
}
