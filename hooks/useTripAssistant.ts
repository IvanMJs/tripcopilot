import { useState, useCallback } from "react";
import { AirportStatusMap, TripFlight } from "@/lib/types";

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface TripContext {
  tripName: string;
  flights: Array<{
    flightCode: string;
    origin: string;
    destination: string;
    isoDate: string;
    departureTime: string;
    arrivalTime?: string;
    status?: string;
  }>;
  currentDateTime: string;
  userTimezone: string;
  airportStatuses?: Record<string, { status: string; delay?: number }>;
}

interface UseTripAssistantReturn {
  messages: AssistantMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (text: string, tripContext: TripContext) => Promise<void>;
  clearMessages: () => void;
}

function buildTripContext(
  tripName: string,
  flights: TripFlight[],
  statusMap: AirportStatusMap,
  userTimezone: string,
): TripContext {
  const airportStatuses: Record<string, { status: string; delay?: number }> = {};

  const relevantAirports = Array.from(
    new Set(flights.flatMap((f) => [f.originCode, f.destinationCode])),
  );

  for (const iata of relevantAirports) {
    const s = statusMap[iata];
    if (!s) continue;
    const delay =
      s.groundDelay?.avgMinutes ??
      s.delays?.maxMinutes ??
      (s.groundStop ? 90 : undefined);
    airportStatuses[iata] = { status: s.status, delay };
  }

  return {
    tripName,
    flights: flights.map((f) => ({
      flightCode: f.flightCode,
      origin: f.originCode,
      destination: f.destinationCode,
      isoDate: f.isoDate,
      departureTime: f.departureTime,
      arrivalTime: f.arrivalTime,
      status: statusMap[f.originCode]?.status,
    })),
    currentDateTime: new Date().toISOString(),
    userTimezone,
    airportStatuses,
  };
}

export function buildTripContextFromTrip(
  tripName: string,
  flights: TripFlight[],
  statusMap: AirportStatusMap,
  userTimezone: string,
): TripContext {
  return buildTripContext(tripName, flights, statusMap, userTimezone);
}

export function useTripAssistant(): UseTripAssistantReturn {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (text: string, tripContext: TripContext) => {
      if (!text.trim() || isLoading) return;

      const userMessage: AssistantMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);

      // Build history for multi-turn (last 10 exchanges = 20 messages max)
      const history = messages.slice(-20).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const assistantMessageId = `assistant-${Date.now()}`;

      // Optimistically add an empty assistant message that will be streamed into
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: "assistant",
          content: "",
          timestamp: new Date(),
        },
      ]);

      try {
        const res = await fetch("/api/trip-assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text.trim(),
            tripContext,
            history,
          }),
        });

        if (!res.ok) {
          const errData = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(errData.error ?? `HTTP ${res.status}`);
        }

        if (!res.body) throw new Error("No response body");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? { ...m, content: accumulated }
                : m,
            ),
          );
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown error";
        setError(message);
        // Remove the empty assistant placeholder on error
        setMessages((prev) =>
          prev.filter((m) => m.id !== assistantMessageId),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isLoading, error, sendMessage, clearMessages };
}
