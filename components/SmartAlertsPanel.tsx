"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Clock, AlertTriangle, CheckCircle, Navigation, X } from "lucide-react";
import { SmartAlert } from "@/hooks/useSmartAlerts";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SmartAlertsPanelProps {
  alerts: SmartAlert[];
  onDismiss: (id: string) => void;
  locale?: "es" | "en";
}

// ── Style maps ────────────────────────────────────────────────────────────────

const BORDER_COLOR: Record<SmartAlert["type"], string> = {
  departure_soon:   "border-l-amber-400",
  delay_active:     "border-l-red-500",
  checkin_reminder: "border-l-blue-500",
  gate_change:      "border-l-[#FFB800]",
};

const ICON_COLOR: Record<SmartAlert["type"], string> = {
  departure_soon:   "text-amber-400",
  delay_active:     "text-red-400",
  checkin_reminder: "text-blue-400",
  gate_change:      "text-[#FFB800]",
};

// ── Icon component ────────────────────────────────────────────────────────────

function AlertIcon({ icon, className }: { icon: SmartAlert["icon"]; className: string }) {
  const props = { className: `h-4 w-4 shrink-0 ${className}` };
  switch (icon) {
    case "Clock":         return <Clock {...props} />;
    case "AlertTriangle": return <AlertTriangle {...props} />;
    case "CheckCircle":   return <CheckCircle {...props} />;
    case "Navigation":    return <Navigation {...props} />;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SmartAlertsPanel({ alerts, onDismiss, locale = "en" }: SmartAlertsPanelProps) {
  if (alerts.length === 0) return null;

  return (
    <div
      className="flex gap-3 overflow-x-auto pb-1 scrollbar-none"
      role="region"
      aria-label="Smart alerts"
      style={{ scrollbarWidth: "none" }}
    >
      <AnimatePresence initial={false}>
        {alerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12, scale: 0.96 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className={[
              "relative flex shrink-0 items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04]",
              "border-l-2 px-3 py-2.5 min-w-[220px] max-w-[280px]",
              BORDER_COLOR[alert.type],
            ].join(" ")}
          >
            <AlertIcon icon={alert.icon} className={ICON_COLOR[alert.type]} />

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white leading-tight truncate">
                {alert.message}
              </p>
              <p className="mt-0.5 text-xs text-gray-400 leading-snug line-clamp-2">
                {alert.detail}
              </p>
            </div>

            <button
              onClick={() => onDismiss(alert.id)}
              className="shrink-0 -mr-1 -mt-0.5 rounded-md p-1 text-gray-600 hover:text-gray-300 transition-colors"
              aria-label={locale === "es" ? "Descartar alerta" : "Dismiss alert"}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
