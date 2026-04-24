"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { AIRPORTS } from "@/lib/airports";
import type { TripFlight } from "@/lib/types";

export interface BoardFlight {
  id: string;
  airline: string;  // "AA"
  num: string;      // "900"
  orig: string;     // "EZE"
  dest: string;     // "MIA"
  city: string;     // "MIAMI"
  time: string;     // "20:30"
  gate: string;     // "E11" or "—"
  status: "ontime" | "delayed" | "boarding" | "landed";
  delay?: number;   // minutes
  cd: string;       // countdown: "en 2h 15m" / "Embarcando" / "Aterrizó"
  isoDate: string;  // kept for countdown refresh accuracy
}

function computeStatus(
  isoDate: string,
  departureTime: string,
  liveStatus?: string,
  delayMinutes?: number,
): BoardFlight["status"] {
  const now = new Date();
  const depMs = new Date(`${isoDate}T${departureTime}`).getTime();
  const diffMin = (depMs - now.getTime()) / 60000;

  if (liveStatus === "landed" || diffMin < -20) return "landed";
  if (liveStatus === "delayed" || (delayMinutes && delayMinutes > 0)) return "delayed";
  if (diffMin <= 30) return "boarding";
  return "ontime";
}

function computeCountdown(isoDate: string, departureTime: string, status: BoardFlight["status"]): string {
  const now = new Date();
  const depMs = new Date(`${isoDate}T${departureTime}`).getTime();
  const diffMin = Math.round((depMs - now.getTime()) / 60000);

  if (status === "landed") {
    const agoMin = -diffMin;
    if (agoMin < 60) return `Aterrizó hace ${agoMin}m`;
    return `Aterrizó hace ${Math.floor(agoMin / 60)}h`;
  }
  if (status === "boarding") return "Embarcando ahora";
  if (diffMin <= 0) return "Salió";

  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return h > 0 ? `en ${h}h ${m}m` : `en ${m}m`;
}

function mapToBoard(f: TripFlight, gate?: string, liveStatus?: string, delayMin?: number): BoardFlight {
  const status = computeStatus(f.isoDate, f.departureTime, liveStatus, delayMin);
  const cd = computeCountdown(f.isoDate, f.departureTime, status);
  const destInfo = AIRPORTS[f.destinationCode];

  return {
    id: f.id,
    airline: f.airlineCode,
    num: f.flightNumber,
    orig: f.originCode,
    dest: f.destinationCode,
    city: (destInfo?.city ?? f.destinationCode).toUpperCase(),
    time: f.departureTime,
    gate: gate ?? f.terminal ?? "—",
    status,
    delay: delayMin,
    cd,
    isoDate: f.isoDate,
  };
}

interface DbFlight {
  id: string;
  airline_code: string;
  flight_number: string;
  origin_code: string;
  destination_code: string;
  iso_date: string;
  departure_time: string | null;
  arrival_buffer: number;
  sort_order: number;
  terminal?: string | null;
}

function dbToTripFlight(r: DbFlight): TripFlight {
  return {
    id: r.id,
    flightCode: `${r.airline_code}${r.flight_number}`,
    airlineCode: r.airline_code,
    airlineName: r.airline_code,
    airlineIcao: r.airline_code,
    flightNumber: r.flight_number,
    originCode: r.origin_code,
    destinationCode: r.destination_code,
    isoDate: r.iso_date,
    departureTime: r.departure_time ?? "00:00",
    arrivalBuffer: r.arrival_buffer,
    terminal: r.terminal ?? undefined,
  };
}

export function useBoardFlights() {
  const [flights, setFlights] = useState<BoardFlight[]>([]);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data: trips } = await supabase
        .from("trips")
        .select("id, created_at, flights(*)")
        .order("created_at", { ascending: false });

      if (!trips || trips.length === 0) {
        setLoading(false);
        return;
      }

      const todayStr = new Date().toISOString().split("T")[0];

      // Collect all flights across all trips
      const allFlights: (DbFlight & { tripCreatedAt: string })[] = trips.flatMap((trip) =>
        ((trip.flights ?? []) as DbFlight[]).map((f) => ({ ...f, tripCreatedAt: trip.created_at as string }))
      );

      // Prefer upcoming flights (date >= today); fall back to most recent trip's flights
      const upcoming = allFlights.filter((f) => f.iso_date >= todayStr);
      const source = upcoming.length > 0
        ? upcoming
        : (trips[0].flights as DbFlight[] ?? []);

      const dbFlights = [...source].sort((a, b) => {
        const dateDiff = a.iso_date.localeCompare(b.iso_date);
        return dateDiff !== 0 ? dateDiff : a.sort_order - b.sort_order;
      });

      const tripFlights = dbFlights.map(dbToTripFlight);

      // Fetch live gate/status for today's and tomorrow's flights
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];

      const liveMap: Record<string, { gate?: string; status?: string; delay?: number }> = {};

      await Promise.all(
        tripFlights
          .filter((f) => f.isoDate === todayStr || f.isoDate === tomorrowStr)
          .map(async (f) => {
            try {
              const res = await fetch(
                `/api/flight-live?flight=${f.airlineCode}${f.flightNumber}&date=${f.isoDate}`,
              );
              if (res.ok) {
                const data = await res.json();
                liveMap[f.id] = {
                  gate: data.gate_origin ?? data.terminal_origin ?? undefined,
                  status: data.status,
                  delay: data.delay_minutes ?? 0,
                };
              }
            } catch {
              // non-critical
            }
          }),
      );

      const board = tripFlights.map((f) => {
        const live = liveMap[f.id];
        return mapToBoard(f, live?.gate, live?.status, live?.delay);
      });

      setFlights(board);
      setLoading(false);
    }

    load();

    // Refresh countdowns every minute using the flight's actual isoDate
    timerRef.current = setInterval(() => {
      setFlights((prev) =>
        prev.map((f) => ({
          ...f,
          cd: computeCountdown(f.isoDate, f.time, f.status),
        })),
      );
    }, 60_000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return { flights, loading };
}
