"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronDown, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { createClient } from "@/utils/supabase/client";

interface PassportExpiryTrackerProps {
  userId: string;
}

type ExpiryStatus = "valid" | "renew_soon" | "urgent" | "expired";

function getStorageKey(userId: string): string {
  return `tc-passport-expiry-${userId}`;
}

function computeStatus(daysUntilExpiry: number): ExpiryStatus {
  if (daysUntilExpiry < 0) return "expired";
  if (daysUntilExpiry < 90) return "urgent";
  if (daysUntilExpiry < 180) return "renew_soon";
  return "valid";
}

// 10 years in days — used as the progress bar denominator
const TEN_YEARS_DAYS = 10 * 365;

export function PassportExpiryTracker({ userId }: PassportExpiryTrackerProps) {
  const { locale } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [expiryDate, setExpiryDate] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(getStorageKey(userId));
    if (stored) {
      setExpiryDate(stored);
    }
  }, [userId]);

  const daysUntilExpiry: number | null = (() => {
    if (!expiryDate) return null;
    const expiry = new Date(expiryDate);
    if (isNaN(expiry.getTime())) return null;
    const now = new Date();
    // Normalize to midnight to avoid time-of-day drift
    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const expiryMidnight = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());
    return Math.ceil((expiryMidnight.getTime() - nowMidnight.getTime()) / (1000 * 60 * 60 * 24));
  })();

  const status: ExpiryStatus | null = daysUntilExpiry !== null ? computeStatus(daysUntilExpiry) : null;

  // Progress bar: how many days remain out of 10 years, clamped [0, 1]
  const progressFraction: number = (() => {
    if (daysUntilExpiry === null) return 0;
    return Math.min(1, Math.max(0, daysUntilExpiry / TEN_YEARS_DAYS));
  })();

  const handleSave = useCallback(async () => {
    if (!expiryDate) return;
    setSaving(true);
    setSaved(false);

    // Persist to localStorage
    localStorage.setItem(getStorageKey(userId), expiryDate);

    // Persist to Supabase user_metadata
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.auth.updateUser({
          data: { passport_expiry: expiryDate },
        });
      }
    } catch {
      // Non-fatal: localStorage is the primary store
    } finally {
      setSaving(false);
      setSaved(true);
      // Reset saved indicator after 2 seconds
      setTimeout(() => setSaved(false), 2000);
    }
  }, [expiryDate, userId]);

  // Labels
  const label = {
    title:        locale === "en" ? "Passport Expiry"                     : "Vencimiento de pasaporte",
    subtitle:     locale === "en" ? "Track your passport validity"         : "Controlá la vigencia de tu pasaporte",
    noDate:       locale === "en" ? "No expiry date saved"                 : "Sin fecha guardada",
    setDate:      locale === "en" ? "Set expiry date"                      : "Guardá la fecha de vencimiento",
    saveBtn:      locale === "en" ? "Save"                                 : "Guardar",
    savingBtn:    locale === "en" ? "Saving…"                              : "Guardando…",
    savedBtn:     locale === "en" ? "Saved!"                              : "¡Guardado!",
    daysLeft:     (d: number) => locale === "en" ? `${d} days remaining`  : `${d} días restantes`,
    expired:      locale === "en" ? "Expired!"                             : "¡Expirado!",
    badgeValid:   locale === "en" ? "Valid"                                : "Válido",
    badgeRenew:   locale === "en" ? "Renew soon"                           : "Renovar pronto",
    badgeUrgent:  locale === "en" ? "Expires soon"                         : "Expira pronto",
    badgeExpired: locale === "en" ? "Expired!"                             : "¡Expirado!",
  } as const;

  function statusBadge() {
    if (!status) return null;
    const configs: Record<ExpiryStatus, { text: string; className: string }> = {
      valid:      { text: label.badgeValid,   className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
      renew_soon: { text: label.badgeRenew,   className: "bg-yellow-500/20  text-yellow-300  border-yellow-500/30"  },
      urgent:     { text: label.badgeUrgent,  className: "bg-red-500/20     text-red-300     border-red-500/30"     },
      expired:    { text: label.badgeExpired, className: "bg-red-600/30     text-red-200     border-red-600/40"     },
    };
    const { text, className } = configs[status];
    return (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${className}`}>
        {text}
      </span>
    );
  }

  function progressBarColor(): string {
    if (!status) return "bg-gray-600";
    const map: Record<ExpiryStatus, string> = {
      valid:      "bg-emerald-400",
      renew_soon: "bg-yellow-400",
      urgent:     "bg-red-400",
      expired:    "bg-red-600",
    };
    return map[status];
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] overflow-hidden">
      {/* Collapsible header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[#FFB800] shrink-0" />
          <span className="text-sm font-semibold text-white">{label.title}</span>
          {status && <div className="ml-1">{statusBadge()}</div>}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-gray-500 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-white/[0.06]">
          {/* Current status summary */}
          <div className="pt-3 space-y-2">
            {daysUntilExpiry !== null ? (
              <>
                {/* Progress bar */}
                <div className="w-full h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${progressBarColor()}`}
                    style={{ width: `${progressFraction * 100}%` }}
                  />
                </div>

                {/* Days label */}
                <p className="text-xs text-gray-400">
                  {daysUntilExpiry < 0
                    ? label.expired
                    : label.daysLeft(daysUntilExpiry)}
                  {" · "}
                  <span className="text-gray-500">
                    {new Date(expiryDate).toLocaleDateString(
                      locale === "en" ? "en-US" : "es-AR",
                      { year: "numeric", month: "long", day: "numeric" },
                    )}
                  </span>
                </p>
              </>
            ) : (
              <p className="text-xs text-gray-500">{label.noDate}</p>
            )}
          </div>

          {/* Date picker + save */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {label.setDate}
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => {
                  setExpiryDate(e.target.value);
                  setSaved(false);
                }}
                className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#FFB800]/60"
                style={{ colorScheme: "dark" }}
              />
              <button
                onClick={handleSave}
                disabled={!expiryDate || saving}
                className={`shrink-0 px-3 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  saved
                    ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300"
                    : "bg-[rgba(255,184,0,0.12)] border border-[rgba(255,184,0,0.25)] text-[#FFB800] hover:bg-[rgba(255,184,0,0.20)]"
                }`}
              >
                {saving ? label.savingBtn : saved ? label.savedBtn : label.saveBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
