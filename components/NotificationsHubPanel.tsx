"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Cloud, Trophy, Clock, X } from "lucide-react";
import {
  HubNotification,
  getHubNotifications,
  markAllRead,
  clearAll,
} from "@/lib/notificationsHub";

// ── Labels ─────────────────────────────────────────────────────────────────

const LABELS = {
  es: {
    title: "Notificaciones",
    markAllRead: "Marcar todo leído",
    clearAll: "Limpiar todo",
    empty: "No hay notificaciones",
    emptyHint: "Tus alertas de vuelos y clima aparecerán aquí",
    close: "Cerrar",
    // Relative time
    justNow: "ahora",
    minutesAgo: (m: number) => `hace ${m}m`,
    hoursAgo: (h: number) => `hace ${h}h`,
    daysAgo: (d: number) => `hace ${d}d`,
  },
  en: {
    title: "Notifications",
    markAllRead: "Mark all read",
    clearAll: "Clear all",
    empty: "No notifications",
    emptyHint: "Your flight and weather alerts will appear here",
    close: "Close",
    justNow: "just now",
    minutesAgo: (m: number) => `${m}m ago`,
    hoursAgo: (h: number) => `${h}h ago`,
    daysAgo: (d: number) => `${d}d ago`,
  },
} as const;

// ── Relative time ───────────────────────────────────────────────────────────

function relativeTime(
  timestamp: number,
  L: (typeof LABELS)[keyof typeof LABELS],
): string {
  const diffMs = Date.now() - timestamp;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return L.justNow;
  if (diffMin < 60) return L.minutesAgo(diffMin);
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return L.hoursAgo(diffH);
  return L.daysAgo(Math.floor(diffH / 24));
}

// ── Icon by type ────────────────────────────────────────────────────────────

function NotifIcon({ type }: { type: HubNotification["type"] }) {
  const base = "h-4 w-4 shrink-0";
  switch (type) {
    case "flight":
      return <Bell className={`${base} text-blue-400`} />;
    case "weather":
      return <Cloud className={`${base} text-sky-400`} />;
    case "badge":
      return <Trophy className={`${base} text-amber-400`} />;
    case "checkin":
      return <Clock className={`${base} text-emerald-400`} />;
    default:
      return <Bell className={`${base} text-gray-400`} />;
  }
}

// ── NotifRow ────────────────────────────────────────────────────────────────

function NotifRow({
  notification,
  locale,
}: {
  notification: HubNotification;
  locale: "es" | "en";
}) {
  const L = LABELS[locale];

  return (
    <div className="flex items-start gap-3 py-3 px-4">
      <div className="mt-0.5 w-7 h-7 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0">
        <NotifIcon type={notification.type} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-bold text-white leading-snug">
            {notification.title}
          </p>
          <span className="text-[10px] text-gray-600 whitespace-nowrap shrink-0">
            {relativeTime(notification.timestamp, L)}
          </span>
        </div>
        <p className="text-[11px] text-gray-400 leading-snug mt-0.5 line-clamp-2">
          {notification.body}
        </p>
      </div>
      {/* Unread dot */}
      {!notification.read && (
        <div className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
      )}
    </div>
  );
}

// ── NotificationsHubPanel ───────────────────────────────────────────────────

interface NotificationsHubPanelProps {
  open: boolean;
  onClose: () => void;
  locale: "es" | "en";
}

export function NotificationsHubPanel({
  open,
  onClose,
  locale,
}: NotificationsHubPanelProps) {
  const L = LABELS[locale];
  const [notifications, setNotifications] = useState<HubNotification[]>([]);

  // Read notifications when panel opens
  useEffect(() => {
    if (open) {
      setNotifications(getHubNotifications());
    }
  }, [open]);

  function handleMarkAllRead() {
    markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function handleClearAll() {
    clearAll();
    setNotifications([]);
  }

  const hasUnread = notifications.some((n) => !n.read);
  const isEmpty = notifications.length === 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50"
            onClick={onClose}
            aria-hidden
          />

          {/* Panel — slide up from bottom */}
          <motion.div
            key="panel"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[80vh] flex flex-col rounded-t-3xl bg-[#0e0e1a] border-t border-white/[0.08] overflow-hidden"
            role="dialog"
            aria-modal
            aria-label={L.title}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-9 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 shrink-0 border-b border-white/[0.06]">
              <h2 className="text-base font-black text-white">{L.title}</h2>
              <div className="flex items-center gap-2">
                {hasUnread && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {L.markAllRead}
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-white/[0.08] hover:bg-white/[0.14] transition-colors"
                  aria-label={L.close}
                >
                  <X className="h-3.5 w-3.5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {isEmpty ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 px-6">
                  <span className="text-5xl" aria-hidden>
                    🔔
                  </span>
                  <p className="text-sm font-bold text-gray-400">{L.empty}</p>
                  <p className="text-xs text-gray-600 text-center leading-relaxed">
                    {L.emptyHint}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.05]">
                  {notifications.map((n) => (
                    <NotifRow key={n.id} notification={n} locale={locale} />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {!isEmpty && (
              <div className="shrink-0 px-4 py-3 border-t border-white/[0.06]">
                <button
                  onClick={handleClearAll}
                  className="w-full rounded-xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08] text-gray-400 hover:text-white text-xs font-bold py-2.5 transition-all"
                >
                  {L.clearAll}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
