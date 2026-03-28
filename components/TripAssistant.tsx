"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageCircle,
  X,
  Send,
  Bot,
  Loader2,
  ChevronDown,
} from "lucide-react";
import {
  useTripAssistant,
  buildTripContextFromTrip,
  TripContext,
} from "@/hooks/useTripAssistant";
import { TripTab, AirportStatusMap } from "@/lib/types";
import { Locale } from "@/lib/i18n";

interface TripAssistantProps {
  trip: TripTab;
  statusMap: AirportStatusMap;
  locale: Locale;
  deviceTz: string;
  hasNewAlert?: boolean;
  userLocation?: { lat: number; lng: number } | null;
  currentWeather?: { temperature: number; description: string } | null;
}

const QUICK_ACTIONS: Record<Locale, [string, string, string]> = {
  es: [
    "¿Cómo están mis vuelos?",
    "¿Qué hago hoy donde estoy?",
    "¿Cuándo salgo para el aeropuerto?",
  ],
  en: [
    "How are my flights?",
    "What to do here today?",
    "When should I leave for the airport?",
  ],
};

export function TripAssistant({
  trip,
  statusMap,
  locale,
  deviceTz,
  hasNewAlert = false,
  userLocation,
  currentWeather,
}: TripAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { messages, isLoading, error, sendMessage, clearMessages } =
    useTripAssistant();

  const quickActions = QUICK_ACTIONS[locale];

  const tripContext: TripContext = buildTripContextFromTrip(
    trip.name,
    trip.flights,
    statusMap,
    deviceTz,
    userLocation,
    currentWeather,
  );

  // Scroll to bottom whenever messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleSend = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;
      setInputText("");
      await sendMessage(trimmed, tripContext);
    },
    [isLoading, sendMessage, tripContext],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend(inputText);
      }
    },
    [handleSend, inputText],
  );

  return (
    <>
      {/* FAB button — z-[45] sits above BottomNav (z-50) minus modals */}
      {/* bottom offset = nav height (60px) + safe-area-inset-bottom + 16px gap */}
      <div className="fixed bottom-[calc(60px+env(safe-area-inset-bottom)+16px)] right-4 z-[45] md:bottom-6 md:right-6">
        {!isOpen && (
          <button
            onClick={handleOpen}
            aria-label={
              locale === "es" ? "Abrir asistente de viaje" : "Open travel assistant"
            }
            className={[
              "relative flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-transform hover:scale-105 active:scale-95",
              "bg-gradient-to-br from-blue-600 to-violet-600",
              hasNewAlert ? "animate-pulse" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <MessageCircle className="h-6 w-6 text-white" />
            {hasNewAlert && (
              <span className="absolute right-0 top-0 h-3 w-3 rounded-full bg-red-500 ring-2 ring-gray-950" />
            )}
          </button>
        )}
      </div>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-[calc(60px+env(safe-area-inset-bottom)+16px)] right-4 z-[45] flex w-[calc(100vw-2rem)] max-w-sm flex-col rounded-2xl border border-white/10 bg-gray-900 shadow-2xl md:bottom-6 md:right-6">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 rounded-t-2xl border-b border-white/10 bg-gray-800/80 px-4 py-3 backdrop-blur-sm">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-violet-600">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  TripCopilot AI
                </p>
                <p className="truncate text-xs text-gray-400">{trip.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {messages.length > 0 && (
                <button
                  onClick={clearMessages}
                  className="rounded-md px-2 py-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  title={locale === "es" ? "Limpiar chat" : "Clear chat"}
                >
                  {locale === "es" ? "Limpiar" : "Clear"}
                </button>
              )}
              <button
                onClick={handleClose}
                className="rounded-md p-1.5 text-gray-500 hover:text-gray-200 transition-colors"
                aria-label="Close"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex h-80 flex-col gap-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 py-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-600/20 to-violet-600/20 ring-1 ring-white/10">
                  <Bot className="h-6 w-6 text-blue-400" />
                </div>
                <p className="text-xs text-gray-400">
                  {locale === "es"
                    ? `Hola! Soy tu asistente para el viaje "${trip.name}". ¿En qué te ayudo?`
                    : `Hi! I'm your assistant for the "${trip.name}" trip. How can I help?`}
                </p>
                {/* Quick action chips */}
                <div className="flex flex-wrap justify-center gap-2">
                  {quickActions.map((action) => (
                    <button
                      key={action}
                      onClick={() => handleSend(action)}
                      disabled={isLoading}
                      className="rounded-full border border-blue-700/50 bg-blue-900/20 px-3 py-1 text-xs text-blue-300 transition-colors hover:bg-blue-900/40 disabled:opacity-50"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-2`}
              >
                {msg.role === "assistant" && (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center self-end rounded-full bg-gradient-to-br from-blue-600 to-violet-600">
                    <Bot className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
                <div
                  className={[
                    "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                    msg.role === "user"
                      ? "rounded-br-sm bg-blue-600 text-white"
                      : "rounded-bl-sm bg-gray-800 text-gray-100",
                    msg.role === "assistant" && !msg.content
                      ? "flex items-center gap-1.5"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {msg.role === "assistant" && !msg.content ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />
                      <span className="text-xs text-gray-400">
                        {locale === "es" ? "Pensando..." : "Thinking..."}
                      </span>
                    </>
                  ) : (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  )}
                </div>
              </div>
            ))}

            {error && (
              <div className="rounded-lg border border-red-800/60 bg-red-950/40 px-3 py-2 text-xs text-red-400">
                {locale === "es"
                  ? "Error al obtener respuesta. Intenta de nuevo."
                  : "Error getting response. Please try again."}
              </div>
            )}

            {/* Quick actions after first message */}
            {messages.length > 0 && !isLoading && (
              <div className="flex flex-wrap gap-1.5">
                {quickActions.map((action) => (
                  <button
                    key={action}
                    onClick={() => handleSend(action)}
                    disabled={isLoading}
                    className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-gray-400 transition-colors hover:bg-white/10 hover:text-gray-200 disabled:opacity-50"
                  >
                    {action}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="flex items-center gap-2 rounded-b-2xl border-t border-white/10 px-3 py-3">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder={
                locale === "es"
                  ? "Preguntame sobre tu viaje..."
                  : "Ask me about your trip..."
              }
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-gray-800 px-3.5 py-2 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-blue-600/60 focus:ring-1 focus:ring-blue-600/30 disabled:opacity-50"
            />
            <button
              onClick={() => handleSend(inputText)}
              disabled={isLoading || !inputText.trim()}
              aria-label={locale === "es" ? "Enviar" : "Send"}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition-colors hover:bg-blue-500 disabled:opacity-40"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[44] bg-black/30 md:hidden"
          onClick={handleClose}
        />
      )}
    </>
  );
}
