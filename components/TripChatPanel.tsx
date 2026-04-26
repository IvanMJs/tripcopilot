"use client";

import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { MessageSquare, Send, Lock } from "lucide-react";
import { useTripChat } from "@/hooks/useTripChat";
import { TripChatMessage } from "@/lib/types";

// ── i18n ──────────────────────────────────────────────────────────────────────

const LABELS = {
  es: {
    title: "Chat del viaje",
    placeholder: "Escribe un mensaje…",
    send: "Enviar",
    noMessages: "Sin mensajes aún. ¡Sé el primero!",
    loading: "Cargando…",
    upgradeTitle: "Chat colaborativo",
    upgradeDescription: "Chateá con los colaboradores del viaje en tiempo real.",
    upgradeLabel: "Disponible en Pilot",
    upgradeCta: "Mejorar a Pilot →",
    needCollaborators: "Invitá colaboradores para habilitar el chat.",
  },
  en: {
    title: "Trip chat",
    placeholder: "Write a message…",
    send: "Send",
    noMessages: "No messages yet. Be the first!",
    loading: "Loading…",
    upgradeTitle: "Collaborative chat",
    upgradeDescription: "Chat with trip collaborators in real time.",
    upgradeLabel: "Available in Pilot",
    upgradeCta: "Upgrade to Pilot →",
    needCollaborators: "Invite collaborators to enable chat.",
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(email: string): string {
  const parts = email.split("@")[0].split(/[._-]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function formatTimestamp(iso: string, locale: "es" | "en"): string {
  return `${locale === "es" ? "Hace" : "Ago"} ${new Date(
    iso
  ).toLocaleString("es-ES", { hour12: false })}`;
}

// ── Teaser (non-pilot) ────────────────────────────────────────────────────────

function ChatTeaser({
  locale,
  onUpgrade,
}: {
  locale: "es" | "en";
  onUpgrade?: () => void;
}) {
  const L = LABELS[locale];

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex flex-col items-center text-center gap-2">
      <div className="w-9 h-9 rounded-full bg-[rgba(255,184,0,0.08)] flex items-center justify-center">
        <Lock className="h-4 w-4 text-[#FFB800]" />
      </div>
      <p className="text-sm font-bold text-white">{L.upgradeTitle}</p>
      <p className="text-xs text-gray-400">{L.upgradeDescription}</p>
      <p className="text-[11px] text-gray-600">{L.upgradeLabel}</p>
      {onUpgrade && (
        <button
          onClick={onUpgrade}
          className="mt-1 px-4 py-1.5 rounded-lg bg-[#FFB800] hover:bg-[#FFC933] text-xs font-bold text-[#07070d] transition-colors"
          aria-label={L.send}
        >
          {L.upgradeCta}
        </button>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface TripChatPanelProps {
  tripId: string;
  locale: "es" | "en";
  planType: string;
  hasCollaborators: boolean;
  onUpgrade?: () => void;
}

// Gate component: renders nothing (and avoids the hook) when there are no collaborators
export function TripChatPanel({ hasCollaborators, ...rest }: TripChatPanelProps) {
  if (!hasCollaborators) return null;
  return <ChatPanelInner {...rest} />;
}

// Inner component: only mounts (and runs useTripChat) when collaborators exist
function ChatPanelInner({
  tripId,
  locale,
  planType,
  onUpgrade,
}: Omit<TripChatPanelProps, "hasCollaborators">) {
  const L = LABELS[locale];
  const isPilot = planType === "pilot";

  const { messages, sendMessage, loading } = useTripChat(tripId);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const el = listRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  async function handleSend() {
    const trimmed = draft.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setDraft("");
    try {
      await sendMessage(trimmed);
    } catch {
      // Restore draft on failure
      setDraft(trimmed);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
        <MessageSquare className="h-4 w-4 text-[#FFB800]" />
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">{L.title}</span>
      </div>

      {!isPilot ? (
        <div className="p-4">
          <ChatTeaser locale={locale} onUpgrade={onUpgrade} />
        </div>
      ) : (
        <>
          {/* Message list */}
          <div
            ref={listRef}
            className="h-48 overflow-y-auto px-4 py-3 space-y-3 scroll-smooth"
          >
            {loading ? (
              <p className="text-xs text-gray-500 text-center py-6">{L.loading}</p>
            ) : messages.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-6">{L.noMessages}</p>
            ) : (
              messages.map((msg) => (
                <ChatBubble key={msg.id} message={msg} locale={locale} />
              ))
            )}
          </div>

          {/* Input */}
          <div className="flex items-end gap-2 px-4 py-3 border-t border-white/[0.06]">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={L.placeholder}
              rows={1}
              disabled={sending}
              className="flex-1 resize-none rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[rgba(255,184,0,0.45)]/50 disabled:opacity-50 min-h-[36px] max-h-[96px]"
            />
            <button
              onClick={() => void handleSend()}
              disabled={!draft.trim() || sending}
              aria-label={L.send}
              className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-[#FFB800] hover:bg-[#FFC933] disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <Send className="h-4 w-4 text-white" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Chat Bubble ───────────────────────────────────────────────────────────────

function ChatBubble({
  message,
  locale,
}: {
  message: TripChatMessage;
  locale: "es" | "en";
}) {
  return (
    <div className="flex items-start gap-2">
      {/* Initials avatar */}
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#E6A500]/50 flex items-center justify-center text-[10px] font-bold text-[#FFC933]">
        {getInitials(message.user_email)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[11px] font-semibold text-[#FFB800] truncate max-w-[140px]">
            {message.user_email}
          </span>
          <span className="text-[10px] text-gray-600 flex-shrink-0">
            {formatTimestamp(message.created_at, locale)}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-gray-200 break-words">{message.body}</p>
      </div>
    </div>
  );
}