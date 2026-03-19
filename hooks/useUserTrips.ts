"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { TripTab, TripFlight, Accommodation } from "@/lib/types";

interface DbAccommodation {
  id: string;
  trip_id: string;
  flight_id: string | null;
  name: string;
  check_in_date: string | null;
  check_in_time: string | null;
  check_out_date: string | null;
  check_out_time: string | null;
  confirmation_code: string | null;
  address: string | null;
}

function toAccommodation(a: DbAccommodation): Accommodation {
  return {
    id:               a.id,
    tripId:           a.trip_id,
    flightId:         a.flight_id ?? undefined,
    name:             a.name,
    checkInDate:      a.check_in_date ?? undefined,
    checkInTime:      a.check_in_time ?? undefined,
    checkOutDate:     a.check_out_date ?? undefined,
    checkOutTime:     a.check_out_time ?? undefined,
    confirmationCode: a.confirmation_code ?? undefined,
    address:          a.address ?? undefined,
  };
}

// Shape of a flights row returned by Supabase
interface DbFlight {
  id: string;
  flight_code: string;
  airline_code: string;
  airline_name: string;
  airline_icao: string;
  flight_number: string;
  origin_code: string;
  destination_code: string;
  iso_date: string;
  departure_time: string | null;
  arrival_buffer: number;
  sort_order: number;
}

function toTripFlight(f: DbFlight): TripFlight {
  return {
    id:              f.id,
    flightCode:      f.flight_code,
    airlineCode:     f.airline_code,
    airlineName:     f.airline_name,
    airlineIcao:     f.airline_icao,
    flightNumber:    f.flight_number,
    originCode:      f.origin_code,
    destinationCode: f.destination_code,
    isoDate:         f.iso_date,
    departureTime:   f.departure_time ?? "",
    arrivalBuffer:   f.arrival_buffer,
  };
}

export function useUserTrips() {
  const [trips, setTrips] = useState<TripTab[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data, error } = await supabase
        .from("trips")
        .select("id, name, flights(*), accommodations(*)")
        .order("created_at", { ascending: true });

      if (!error && data) {
        const userTrips: TripTab[] = data.map((t) => ({
          id:   t.id,
          name: t.name,
          flights: [...(t.flights as DbFlight[])]
            .sort((a, b) => a.sort_order - b.sort_order)
            .map(toTripFlight),
          accommodations: (t.accommodations as DbAccommodation[])
            .sort((a, b) => (a.check_in_date ?? "").localeCompare(b.check_in_date ?? ""))
            .map(toAccommodation),
        }));
        setTrips(userTrips);
      }

      setLoading(false);
    }

    load();
  }, []);

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const createTrip = useCallback(async (name: string): Promise<string | null> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("trips")
      .insert({ name })
      .select("id")
      .single();

    if (!error && data) {
      setTrips((prev) => [...prev, { id: data.id, name, flights: [], accommodations: [] }]);
      return data.id;
    }
    return null;
  }, []);

  const deleteTrip = useCallback(async (id: string) => {
    setTrips((prev) => prev.filter((t) => t.id !== id));

    const supabase = createClient();
    // Flights cascade on delete via FK
    await supabase.from("trips").delete().eq("id", id);
  }, []);

  const renameTrip = useCallback(async (id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setTrips((prev) => prev.map((t) => (t.id === id ? { ...t, name: trimmed } : t)));

    const supabase = createClient();
    await supabase.from("trips").update({ name: trimmed }).eq("id", id);
  }, []);

  const addFlight = useCallback(async (tripId: string, flight: TripFlight): Promise<string | null> => {
    const supabase = createClient();

    const { data: last } = await supabase
      .from("flights")
      .select("sort_order")
      .eq("trip_id", tripId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const sort_order = (last?.sort_order ?? -1) + 1;

    const { data, error } = await supabase
      .from("flights")
      .insert({
        trip_id:          tripId,
        flight_code:      flight.flightCode,
        airline_code:     flight.airlineCode,
        airline_name:     flight.airlineName,
        airline_icao:     flight.airlineIcao,
        flight_number:    flight.flightNumber,
        origin_code:      flight.originCode,
        destination_code: flight.destinationCode,
        iso_date:         flight.isoDate,
        departure_time:   flight.departureTime || null,
        arrival_buffer:   flight.arrivalBuffer,
        sort_order,
      })
      .select("id")
      .single();

    if (!error && data) {
      const newFlight: TripFlight = { ...flight, id: data.id };
      setTrips((prev) =>
        prev.map((t) =>
          t.id === tripId ? { ...t, flights: [...t.flights, newFlight] } : t,
        ),
      );
      return data.id;
    }
    return null;
  }, []);

  const removeFlight = useCallback(async (tripId: string, flightId: string) => {
    setTrips((prev) =>
      prev.map((t) =>
        t.id === tripId
          ? { ...t, flights: t.flights.filter((f) => f.id !== flightId) }
          : t,
      ),
    );

    const supabase = createClient();
    await supabase.from("flights").delete().eq("id", flightId);
  }, []);

  const addAccommodation = useCallback(async (
    tripId: string,
    acc: Omit<Accommodation, "id" | "tripId">,
  ) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("accommodations")
      .insert({
        trip_id:           tripId,
        flight_id:         acc.flightId ?? null,
        name:              acc.name,
        check_in_date:     acc.checkInDate ?? null,
        check_in_time:     acc.checkInTime ?? null,
        check_out_date:    acc.checkOutDate ?? null,
        check_out_time:    acc.checkOutTime ?? null,
        confirmation_code: acc.confirmationCode ?? null,
        address:           acc.address ?? null,
      })
      .select("id")
      .single();

    if (!error && data) {
      const newAcc: Accommodation = { ...acc, id: data.id, tripId };
      setTrips((prev) =>
        prev.map((t) =>
          t.id === tripId
            ? {
                ...t,
                accommodations: [...t.accommodations, newAcc].sort((a, b) =>
                  (a.checkInDate ?? "").localeCompare(b.checkInDate ?? ""),
                ),
              }
            : t,
        ),
      );
    }
  }, []);

  const removeAccommodation = useCallback(async (tripId: string, accId: string) => {
    setTrips((prev) =>
      prev.map((t) =>
        t.id === tripId
          ? { ...t, accommodations: t.accommodations.filter((a) => a.id !== accId) }
          : t,
      ),
    );
    const supabase = createClient();
    await supabase.from("accommodations").delete().eq("id", accId);
  }, []);

  const updateAccommodation = useCallback(async (
    tripId: string,
    accId: string,
    updates: Pick<Accommodation, "name" | "checkInTime" | "checkOutTime" | "confirmationCode" | "address">,
  ) => {
    setTrips((prev) =>
      prev.map((t) =>
        t.id === tripId
          ? {
              ...t,
              accommodations: t.accommodations.map((a) =>
                a.id === accId ? { ...a, ...updates } : a,
              ),
            }
          : t,
      ),
    );
    const supabase = createClient();
    await supabase.from("accommodations").update({
      name:              updates.name,
      check_in_time:     updates.checkInTime ?? null,
      check_out_time:    updates.checkOutTime ?? null,
      confirmation_code: updates.confirmationCode ?? null,
      address:           updates.address ?? null,
    }).eq("id", accId);
  }, []);

  /**
   * Saves a draft trip atomically via a Postgres RPC (single transaction).
   * Returns the new trip ID, or null on failure.
   */
  const saveDraftTrip = useCallback(async (
    name: string,
    flights: TripFlight[],
    accommodations: Accommodation[],
  ): Promise<string | null> => {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("save_draft_trip", {
      p_name:           name,
      p_flights:        flights,
      p_accommodations: accommodations,
    });

    if (error || !data) return null;

    const newTripId = data as string;

    // Fetch the newly created trip with its real DB IDs
    const { data: tripRow } = await supabase
      .from("trips")
      .select("id, name, flights(*), accommodations(*)")
      .eq("id", newTripId)
      .single();

    if (tripRow) {
      const newTrip: TripTab = {
        id:   tripRow.id,
        name: tripRow.name,
        flights: [...(tripRow.flights as DbFlight[])]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map(toTripFlight),
        accommodations: (tripRow.accommodations as DbAccommodation[])
          .sort((a, b) => (a.check_in_date ?? "").localeCompare(b.check_in_date ?? ""))
          .map(toAccommodation),
      };
      setTrips((prev) => [...prev, newTrip]);
    }

    return newTripId;
  }, []);

  const duplicateTrip = useCallback(async (tripId: string): Promise<string | null> => {
    const supabase = createClient();
    const source = trips.find((t) => t.id === tripId);
    if (!source) return null;

    const newName = `${source.name} (copia)`;
    const { data: newTrip, error } = await supabase
      .from("trips")
      .insert({ name: newName })
      .select("id")
      .single();
    if (error || !newTrip) return null;

    const flightIdMap: Record<string, string> = {};
    for (const flight of source.flights) {
      const { data: last } = await supabase
        .from("flights")
        .select("sort_order")
        .eq("trip_id", newTrip.id)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      const sort_order = (last?.sort_order ?? -1) + 1;
      const { data: f } = await supabase.from("flights").insert({
        trip_id: newTrip.id,
        flight_code: flight.flightCode,
        airline_code: flight.airlineCode,
        airline_name: flight.airlineName,
        airline_icao: flight.airlineIcao,
        flight_number: flight.flightNumber,
        origin_code: flight.originCode,
        destination_code: flight.destinationCode,
        iso_date: flight.isoDate,
        departure_time: flight.departureTime || null,
        arrival_buffer: flight.arrivalBuffer,
        sort_order,
      }).select("id").single();
      if (f) flightIdMap[flight.id] = f.id;
    }

    const newFlights = source.flights.map((f) => ({ ...f, id: flightIdMap[f.id] ?? f.id }));

    for (const acc of source.accommodations) {
      const realFlightId = acc.flightId ? flightIdMap[acc.flightId] : null;
      await supabase.from("accommodations").insert({
        trip_id: newTrip.id,
        flight_id: realFlightId ?? null,
        name: acc.name,
        check_in_date: acc.checkInDate ?? null,
        check_in_time: acc.checkInTime ?? null,
        check_out_date: acc.checkOutDate ?? null,
        check_out_time: acc.checkOutTime ?? null,
      });
    }

    setTrips((prev) => [...prev, {
      id: newTrip.id,
      name: newName,
      flights: newFlights,
      accommodations: source.accommodations.map((a) => ({
        ...a,
        tripId: newTrip.id,
        flightId: a.flightId ? flightIdMap[a.flightId] : undefined,
      })),
    }]);

    return newTrip.id;
  }, [trips]);

  return { trips, loading, createTrip, deleteTrip, renameTrip, addFlight, removeFlight, addAccommodation, removeAccommodation, updateAccommodation, saveDraftTrip, duplicateTrip };
}
