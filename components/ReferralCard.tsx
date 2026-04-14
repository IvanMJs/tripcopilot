"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Users, Gift } from "lucide-react";

interface ReferralInfo {
  referralCode: string;
  referralCount: number;
}

interface ReferralCardProps {
  locale: "es" | "en";
}

const LABELS = {
  es: {
    title: "✈️ Invitá a un amigo",
    subtitle: "Ambos reciben 30 días de Explorer gratis",
    rewardBadge: "🎁 30 días gratis",
    copyBtn: "Copiar link",
    copied: "¡Copiado!",
    whatsapp: "Compartir por WhatsApp",
    friendsInvited: (n: number) => `${n} amigo${n !== 1 ? "s" : ""} invitado${n !== 1 ? "s" : ""}`,
    rewardEarned: (n: number) => `${n * 30} días ganados`,
    waMessage: (code: string, url: string) =>
      `¡Probá TripCopilot! Es la mejor app para monitorear tus vuelos. Usá mi código ${code} y ambos ganamos 30 días gratis de Explorer. ${url}`,
  },
  en: {
    title: "✈️ Invite a friend",
    subtitle: "Both get 30 days of Explorer free",
    rewardBadge: "🎁 30 days free",
    copyBtn: "Copy link",
    copied: "Copied!",
    whatsapp: "Share via WhatsApp",
    friendsInvited: (n: number) => `${n} friend${n !== 1 ? "s" : ""} invited`,
    rewardEarned: (n: number) => `${n * 30} days earned`,
    waMessage: (code: string, url: string) =>
      `Try TripCopilot! The best app for flight monitoring. Use my code ${code} and we both get 30 days of Explorer free. ${url}`,
  },
} as const;

export function ReferralCard({ locale }: ReferralCardProps) {
  const L = LABELS[locale];
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/referral/info")
      .then((r) => r.json())
      .then((data: ReferralInfo) => setInfo(data))
      .catch(() => null);
  }, []);

  const inviteUrl = info
    ? `https://tripcopilot.vercel.app/?ref=${info.referralCode}`
    : "";

  async function handleCopy() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — silently ignore
    }
  }

  function handleWhatsApp() {
    if (!inviteUrl || !info) return;
    const text = encodeURIComponent(L.waMessage(info.referralCode, inviteUrl));
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  }

  if (!info) {
    return (
      <div className="mx-4 mb-4 rounded-2xl border border-violet-700/20 bg-gradient-to-br from-violet-950/40 via-purple-950/30 to-indigo-950/40 p-5 animate-pulse">
        <div className="h-4 w-1/3 rounded bg-white/[0.06] mb-3" />
        <div className="h-3 w-2/3 rounded bg-white/[0.04] mb-5" />
        <div className="h-9 w-full rounded-xl bg-white/[0.05] mb-2" />
        <div className="grid grid-cols-2 gap-2">
          <div className="h-9 rounded-xl bg-white/[0.04]" />
          <div className="h-9 rounded-xl bg-white/[0.04]" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="mx-4 mb-4 rounded-2xl border border-violet-700/30 bg-gradient-to-br from-violet-950/50 via-purple-950/30 to-indigo-950/50 p-5 overflow-hidden relative"
    >
      {/* Background glow */}
      <div
        aria-hidden="true"
        className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-violet-600/10 blur-2xl pointer-events-none"
      />

      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="rounded-xl bg-violet-500/15 p-2 shrink-0">
          <Gift className="h-5 w-5 text-violet-400" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white leading-tight">{L.title}</p>
          <p className="text-xs text-gray-400 mt-0.5">{L.subtitle}</p>
        </div>
        <span className="shrink-0 rounded-full bg-violet-600/20 border border-violet-500/30 px-2.5 py-1 text-[10px] font-bold text-violet-300 whitespace-nowrap">
          {L.rewardBadge}
        </span>
      </div>

      {/* Invite URL */}
      <div className="flex items-center gap-2 rounded-xl bg-white/[0.05] border border-white/[0.08] px-3 py-2 mb-3">
        <p className="flex-1 min-w-0 text-xs text-violet-300 font-mono truncate">
          {inviteUrl}
        </p>
        <button
          onClick={handleCopy}
          aria-label={copied ? L.copied : L.copyBtn}
          className="shrink-0 p-1 rounded-lg text-gray-400 hover:text-white transition-colors"
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          ) : (
            <Copy className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={handleCopy}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-violet-700/40 bg-violet-900/30 px-3 py-2 text-xs font-semibold text-violet-300 hover:bg-violet-900/50 transition-colors"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {copied ? L.copied : L.copyBtn}
        </button>

        <button
          onClick={handleWhatsApp}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-800/50 bg-emerald-950/30 px-3 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-950/50 transition-colors"
        >
          <span aria-hidden="true" className="text-sm leading-none">💬</span>
          {L.whatsapp}
        </button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 pt-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-gray-500 shrink-0" aria-hidden="true" />
          <span className="text-xs font-semibold text-gray-300">
            {L.friendsInvited(info.referralCount)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Gift className="h-3.5 w-3.5 text-violet-400 shrink-0" aria-hidden="true" />
          <span className="text-xs font-semibold text-violet-300">
            {L.rewardEarned(info.referralCount)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
