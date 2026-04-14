"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { TripChatMessage } from "@/lib/types";

interface UseTripChatResult {
  messages: TripChatMessage[];
  sendMessage: (body: string) => Promise<void>;
  loading: boolean;
}

export function useTripChat(tripId: string): UseTripChatResult {
  const [messages, setMessages] = useState<TripChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // Keep a stable ref to avoid stale closures in the realtime handler
  const messagesRef = useRef<TripChatMessage[]>(messages);
  messagesRef.current = messages;

  // Fetch initial messages
  useEffect(() => {
    if (!tripId) return;

    let cancelled = false;

    async function fetchMessages() {
      setLoading(true);
      try {
        const res = await fetch(`/api/trip-chat?tripId=${encodeURIComponent(tripId)}`);
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const json = (await res.json()) as { data?: TripChatMessage[]; error?: string };
        if (!cancelled) {
          setMessages(json.data ?? []);
        }
      } catch {
        // Graceful degradation — table may not exist yet
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchMessages();

    return () => {
      cancelled = true;
    };
  }, [tripId]);

  // Supabase Realtime subscription for new messages
  useEffect(() => {
    if (!tripId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`trip-chat-${tripId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trip_chat_messages",
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          const newMsg = payload.new as TripChatMessage;
          // Avoid duplicates (optimistic messages are already in state)
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [tripId]);

  const sendMessage = useCallback(
    async (body: string): Promise<void> => {
      const trimmed = body.trim();
      if (!trimmed) return;

      const res = await fetch("/api/trip-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId, body: trimmed }),
      });

      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error ?? "Failed to send message");
      }

      // The Realtime subscription will append the persisted message;
      // no need to manually push it here to avoid duplicates.
    },
    [tripId],
  );

  return { messages, sendMessage, loading };
}
