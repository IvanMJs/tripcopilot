"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const EMOJI_OPTIONS = ["✈️", "🌍", "🔥", "😍", "👏"] as const;
type Emoji = (typeof EMOJI_OPTIONS)[number];

interface ReactionCount {
  emoji: string;
  count: number;
}

interface SharedTripReactionsProps {
  shareToken: string;
}

function generateFingerprint(): string {
  const raw = `${navigator.userAgent}${screen.width}${screen.height}`;
  // Simple djb2-style hash to avoid crypto API dependency
  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash * 33) ^ raw.charCodeAt(i);
  }
  return Math.abs(hash).toString(36);
}

function getStorageKey(token: string): string {
  return `tc-reactions-${token}`;
}

function getUsedEmoji(token: string): string | null {
  try {
    return localStorage.getItem(getStorageKey(token));
  } catch {
    return null;
  }
}

function setUsedEmoji(token: string, emoji: string): void {
  try {
    localStorage.setItem(getStorageKey(token), emoji);
  } catch {
    // localStorage unavailable — silently ignore
  }
}

export function SharedTripReactions({ shareToken }: SharedTripReactionsProps) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [usedEmoji, setUsedEmojiState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load stored emoji (client-only)
    setUsedEmojiState(getUsedEmoji(shareToken));

    // Fetch current counts
    fetch(`/api/reactions/${encodeURIComponent(shareToken)}`)
      .then((r) => r.json())
      .then((data: { reactions: ReactionCount[] }) => {
        const map: Record<string, number> = {};
        for (const r of data.reactions ?? []) {
          map[r.emoji] = r.count;
        }
        setCounts(map);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [shareToken]);

  async function handleReact(emoji: Emoji) {
    if (usedEmoji) return; // already reacted

    const fingerprint = generateFingerprint();

    // Optimistic update
    setCounts((prev) => ({ ...prev, [emoji]: (prev[emoji] ?? 0) + 1 }));
    setUsedEmojiState(emoji);
    setUsedEmoji(shareToken, emoji);

    try {
      await fetch(`/api/reactions/${encodeURIComponent(shareToken)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji, fingerprint }),
      });
    } catch {
      // Network error — keep optimistic state
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-4">
        {EMOJI_OPTIONS.map((e) => (
          <div
            key={e}
            className="flex flex-col items-center gap-1 animate-pulse"
          >
            <div className="h-10 w-10 rounded-full bg-white/[0.06]" />
            <div className="h-3 w-5 rounded bg-white/[0.04]" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {EMOJI_OPTIONS.map((emoji) => {
        const count = counts[emoji] ?? 0;
        const isSelected = usedEmoji === emoji;
        const isDisabled = usedEmoji !== null;

        return (
          <div key={emoji} className="flex flex-col items-center gap-1">
            <motion.button
              whileTap={isDisabled ? {} : { scale: 1.3 }}
              onClick={() => void handleReact(emoji)}
              disabled={isDisabled}
              aria-label={`React with ${emoji}`}
              className={[
                "h-11 w-11 flex items-center justify-center rounded-full text-xl",
                "border transition-all duration-150",
                isSelected
                  ? "border-violet-500/60 bg-violet-900/50 shadow-md shadow-violet-900/40"
                  : isDisabled
                    ? "border-white/[0.06] bg-white/[0.03] opacity-50 cursor-default"
                    : "border-white/[0.08] bg-white/[0.05] hover:bg-white/[0.10] hover:border-white/20 cursor-pointer",
              ].join(" ")}
            >
              {emoji}
            </motion.button>
            <span
              className={`text-[11px] font-bold tabular-nums ${
                isSelected ? "text-violet-300" : "text-gray-500"
              }`}
            >
              {count > 0 ? count : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}
