"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import { createClient } from "@/utils/supabase/client";
import { TripTab, TripFlight, Accommodation, Passenger } from "@/lib/types";
import { cacheTrips, getCachedTrips } from "@/lib/tripsCache";
import { haptics } from "@/lib/haptics";

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
  arrival_date: string | null;
  arrival_time: string | null;
  arrival_buffer: number;
  sort_order: number;
  boarding_pass_url: string | null;
  wants_upgrade: boolean | null;
  cabin_class: string | null;
  booking_code: string | null;
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
    arrivalDate:      f.arrival_date ?? undefined,
    arrivalTime:      f.arrival_time ?? undefined,
    arrivalBuffer:    f.arrival_buffer,
    boardingPassUrl:  f.boarding_pass_url ?? undefined,
    wantsUpgrade:    f.wants_upgrade ?? false,
    bookingCode:     f.booking_code ?? undefined,
    cabinClass: (
      f.cabin_class === "economy" ||
      f.cabin_class === "premium_economy" ||
      f.cabin_class === "business" ||
      f.cabin_class === "first"
    ) ? f.cabin_class : "economy",
  };
}

// ── Trip urgency sort ─────────────────────────────────────────────────────────

function sortTripsByUrgency(trips: TripTab[]): TripTab[] {
  const today = new Date().toISOString().slice(0, 10);

  function getTripPriority(trip: TripTab): { bucket: number; sortKey: string } {
    const flights = trip.flights;
    if (flights.length === 0) {
      // No flights — sort by created_at desc (bucket 2)
      return { bucket: 2, sortKey: "" };
    }

    const flightsToday = flights.filter((f) => f.isoDate === today);
    if (flightsToday.length > 0) {
      // Has flight today — first bucket, sort by earliest departure time
      const earliest = flightsToday
        .map((f) => f.departureTime ?? "99:99")
        .sort()[0];
      return { bucket: 0, sortKey: earliest };
    }

    const upcomingFlights = flights.filter((f) => f.isoDate > today);
    if (upcomingFlights.length > 0) {
      // Has upcoming flights — sort by nearest isoDate
      const nearest = upcomingFlights.map((f) => f.isoDate).sort()[0];
      return { bucket: 1, sortKey: nearest };
    }

    // All past flights — last bucket
    return { bucket: 3, sortKey: "" };
  }

  return [...trips].sort((a, b) => {
    const pa = getTripPriority(a);
    const pb = getTripPriority(b);
    if (pa.bucket !== pb.bucket) return pa.bucket - pb.bucket;
    if (pa.sortKey && pb.sortKey) return pa.sortKey.localeCompare(pb.sortKey);
    return 0;
  });
}

// ── Itinerary inconsistency checker ───────────────────────────────────────────

function checkItineraryConsistency(trips: TripTab[]) {
  for (const trip of trips) {
    const flights = trip.flights;
    if (flights.length < 2) continue;

    // Check 1: date+time order issues (flights not in chronological order)
    for (let i = 0; i < flights.length - 1; i++) {
      const a = flights[i];
      const b = flights[i + 1];
      const aDateTime = `${a.isoDate} ${a.departureTime || "00:00"}`;
      const bDateTime = `${b.isoDate} ${b.departureTime || "00:00"}`;

      if (aDateTime > bDateTime) {
        toast(
          `"${trip.name}": los vuelos no están en orden cronológico. Considerá reordenarlos.`,
          {
            icon: "ℹ️",
            duration: 5000,
            style: { background: "#1e293b", color: "#cbd5e1", fontSize: "13px" },
          },
        );
        break; // one info toast per trip is enough
      }
    }

    // Check 2: duplicate flights (same flightCode + isoDate)
    const seen = new Set<string>();
    for (const f of flights) {
      const key = `${f.flightCode}|${f.isoDate}`;
      if (seen.has(key)) {
        toast.error(
          `"${trip.name}": vuelo duplicado ${f.flightCode} el ${f.isoDate}.`,
          { duration: 6000 },
        );
        break;
      }
      seen.add(key);
    }

    // Check 3: impossible connections (< 45 min between consecutive flights at same airport)
    for (let i = 0; i < flights.length - 1; i++) {
      const curr = flights[i];
      const next = flights[i + 1];

      // Only relevant if the connection is at the same airport
      if (curr.destinationCode !== next.originCode) continue;

      // Need both times to compare
      const arrDate = curr.arrivalDate ?? curr.isoDate;
      const arrTime = curr.arrivalTime;
      const depTime = next.departureTime;

      if (!arrTime || !depTime) continue;

      const arrMs = new Date(`${arrDate}T${arrTime}:00`).getTime();
      const depMs = new Date(`${next.isoDate}T${depTime}:00`).getTime();

      if (isNaN(arrMs) || isNaN(depMs)) continue;

      const diffMin = (depMs - arrMs) / 60000;

      if (diffMin < 45 && diffMin >= 0) {
        toast.error(
          `"${trip.name}": conexión imposible en ${curr.destinationCode} — solo ${Math.round(diffMin)} min entre ${curr.flightCode} y ${next.flightCode}.`,
          { duration: 7000 },
        );
      } else if (diffMin < 0) {
        // Arrival after next departure
        toast.error(
          `"${trip.name}": ${curr.flightCode} llega después de que sale ${next.flightCode} en ${curr.destinationCode}.`,
          { duration: 7000 },
        );
      }
    }
  }
}

export function useUserTrips() {
  const [trips, setTrips] = useState<TripTab[]>([]);
  const [loading, setLoading] = useState(true);
  const consistencyChecked = useRef(false);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      // Offline: serve from IndexedDB cache
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        const cached = await getCachedTrips();
        if (cached) {
          setTrips(cached);
          toast("Sin conexión — mostrando datos guardados", {
            icon: "📴",
            duration: 4000,
            style: { background: "#1e293b", color: "#cbd5e1", fontSize: "13px" },
          });
        }
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("trips")
        .select("id, name, passengers, flights(*), accommodations(*)")
        .order("created_at", { ascending: true });

      const ownedTrips: TripTab[] = (!error && data)
        ? data.map((t) => ({
            id:   t.id,
            name: t.name,
            flights: [...(t.flights as DbFlight[])]
              .sort((a, b) => a.sort_order - b.sort_order)
              .map(toTripFlight),
            accommodations: (t.accommodations as DbAccommodation[])
              .sort((a, b) => (a.check_in_date ?? "").localeCompare(b.check_in_date ?? ""))
              .map(toAccommodation),
            passengers: (t.passengers as Passenger[] | null) ?? [],
            collaboratorRole: "owner" as const,
          }))
        : [];

      // Fetch trips shared with the current user as an accepted collaborator
      const { data: { user } } = await supabase.auth.getUser();
      let sharedTrips: TripTab[] = [];

      if (user) {
        const { data: collabRows } = await supabase
          .from("trip_collaborators")
          .select("trip_id, role")
          .eq("invitee_id", user.id)
          .eq("status", "accepted");

        if (collabRows && collabRows.length > 0) {
          const sharedIds = collabRows.map((c) => c.trip_id as string);
          const roleMap = new Map(collabRows.map((c) => [c.trip_id as string, c.role as "viewer" | "editor"]));

          const { data: sharedData } = await supabase
            .from("trips")
            .select("id, name, passengers, flights(*), accommodations(*)")
            .in("id", sharedIds);

          if (sharedData) {
            sharedTrips = sharedData.map((t) => ({
              id:   t.id,
              name: t.name,
              flights: [...(t.flights as DbFlight[])]
                .sort((a, b) => a.sort_order - b.sort_order)
                .map(toTripFlight),
              accommodations: (t.accommodations as DbAccommodation[])
                .sort((a, b) => (a.check_in_date ?? "").localeCompare(b.check_in_date ?? ""))
                .map(toAccommodation),
              passengers: (t.passengers as Passenger[] | null) ?? [],
              isShared: true,
              collaboratorRole: roleMap.get(t.id) ?? "viewer",
            }));
          }
        }
      }

      const allTrips = [...ownedTrips, ...sharedTrips];
      const sorted = sortTripsByUrgency(allTrips);
      setTrips(sorted);
      // Update the offline cache in the background
      cacheTrips(sorted).catch(() => {/* best-effort */});

      setLoading(false);
    }

    load();
  }, []);

  // Run inconsistency check once after trips first load
  useEffect(() => {
    if (loading || consistencyChecked.current || trips.length === 0) return;
    consistencyChecked.current = true;
    checkItineraryConsistency(trips);
  }, [loading, trips]);

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const createTrip = useCallback(async (name: string, locale?: "es" | "en"): Promise<string | null> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("trips")
      .insert({ name })
      .select("id")
      .single();

    if (!error && data) {
      setTrips((prev) => [...prev, { id: data.id, name, flights: [], accommodations: [] }]);
      haptics.success();
      toast.success(locale === "es" ? "Viaje creado" : "Trip created");
      return data.id;
    }
    return null;
  }, []);

  const deleteTrip = useCallback(async (id: string) => {
    const snapshot = trips;
    setTrips((prev) => prev.filter((t) => t.id !== id));

    haptics.delete();
    const supabase = createClient();
    // Flights cascade on delete via FK
    const { error } = await supabase.from("trips").delete().eq("id", id);
    if (error) {
      setTrips(snapshot);
      haptics.error();
      toast.error("No se pudo eliminar el viaje / Could not delete trip");
    }
  }, [trips]);

  const renameTrip = useCallback(async (id: string, name: string, locale?: "es" | "en") => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setTrips((prev) => prev.map((t) => (t.id === id ? { ...t, name: trimmed } : t)));

    const supabase = createClient();
    await supabase.from("trips").update({ name: trimmed }).eq("id", id);
    toast.success(locale === "es" ? "Nombre actualizado" : "Name updated");
  }, []);

  const addFlight = useCallback(async (tripId: string, flight: TripFlight): Promise<string | null> => {
    const supabase = createClient();

    // Fetch all existing flights ordered by sort_order
    const { data: existingFlights } = await supabase
      .from("flights")
      .select("id, sort_order, iso_date, departure_time")
      .eq("trip_id", tripId)
      .order("sort_order", { ascending: true });

    // Find chronological insert position
    const newDateTime = `${flight.isoDate} ${flight.departureTime || "00:00"}`;
    const insertAt = (existingFlights ?? []).findIndex((f) => {
      const fDateTime = `${f.iso_date} ${f.departure_time || "00:00"}`;
      return newDateTime < fDateTime;
    });

    // insertAt === -1 means append to end
    const sort_order = insertAt === -1 ? (existingFlights?.length ?? 0) : insertAt;

    // Shift sort_order of flights that come after the insert position
    if (insertAt !== -1 && existingFlights?.length) {
      await Promise.all(
        existingFlights.slice(insertAt).map((f) =>
          supabase
            .from("flights")
            .update({ sort_order: f.sort_order + 1 })
            .eq("id", f.id)
        )
      );
    }

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
        arrival_date:     flight.arrivalDate ?? null,
        arrival_time:     flight.arrivalTime ?? null,
        arrival_buffer:   flight.arrivalBuffer,
        sort_order,
        cabin_class:      flight.cabinClass ?? "economy",
        booking_code:     flight.bookingCode ?? null,
      })
      .select("id")
      .single();

    if (!error && data) {
      const newFlight: TripFlight = { ...flight, id: data.id };
      setTrips((prev) =>
        prev.map((t) => {
          if (t.id !== tripId) return t;
          const updated = [...t.flights];
          const pos = updated.findIndex(
            (f) => `${f.isoDate} ${f.departureTime || "00:00"}` > `${flight.isoDate} ${flight.departureTime || "00:00"}`
          );
          if (pos === -1) updated.push(newFlight);
          else updated.splice(pos, 0, newFlight);
          return { ...t, flights: updated };
        }),
      );
      return data.id;
    }
    return null;
  }, []);

  const removeFlight = useCallback(async (tripId: string, flightId: string) => {
    const snapshot = trips;
    setTrips((prev) =>
      prev.map((t) =>
        t.id === tripId
          ? { ...t, flights: t.flights.filter((f) => f.id !== flightId) }
          : t,
      ),
    );

    haptics.delete();
    const supabase = createClient();
    const { error } = await supabase.from("flights").delete().eq("id", flightId);
    if (error) {
      setTrips(snapshot);
      haptics.error();
      toast.error("No se pudo eliminar el vuelo / Could not delete flight");
    }
  }, [trips]);

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
    const snapshot = trips;
    setTrips((prev) =>
      prev.map((t) =>
        t.id === tripId
          ? { ...t, accommodations: t.accommodations.filter((a) => a.id !== accId) }
          : t,
      ),
    );
    const supabase = createClient();
    const { error } = await supabase.from("accommodations").delete().eq("id", accId);
    if (error) {
      setTrips(snapshot);
      toast.error("No se pudo eliminar el alojamiento / Could not delete accommodation");
    }
  }, [trips]);

  const updateAccommodation = useCallback(async (
    tripId: string,
    accId: string,
    updates: Pick<Accommodation, "name" | "checkInTime" | "checkOutTime" | "confirmationCode" | "address">,
  ) => {
    const trimmedName = updates.name?.trim();
    if (!trimmedName) return; // reject empty name silently

    const timeRx = /^\d{2}:\d{2}$/;
    const validatedUpdates = {
      ...updates,
      name:         trimmedName,
      checkInTime:  updates.checkInTime  && timeRx.test(updates.checkInTime)  ? updates.checkInTime  : undefined,
      checkOutTime: updates.checkOutTime && timeRx.test(updates.checkOutTime) ? updates.checkOutTime : undefined,
    };

    setTrips((prev) =>
      prev.map((t) =>
        t.id === tripId
          ? {
              ...t,
              accommodations: t.accommodations.map((a) =>
                a.id === accId ? { ...a, ...validatedUpdates } : a,
              ),
            }
          : t,
      ),
    );
    const supabase = createClient();
    await supabase.from("accommodations").update({
      name:              validatedUpdates.name,
      check_in_time:     validatedUpdates.checkInTime  ?? null,
      check_out_time:    validatedUpdates.checkOutTime ?? null,
      confirmation_code: validatedUpdates.confirmationCode ?? null,
      address:           validatedUpdates.address ?? null,
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
  ): Promise<{ id: string } | { error: "auth" | "rpc"; message?: string } | null> => {
    const supabase = createClient();

    // Validate & refresh auth token before RPC — prevents silent failures on mobile
    // getUser() contacts Supabase server (unlike getSession() which is local-only)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user) {
      console.error("[saveDraftTrip] No authenticated user:", authError?.message);
      return { error: "auth" };
    }

    // Normalize flights before RPC:
    // - Exclude client-generated temp IDs (not valid UUIDs — let DB generate them)
    // - Convert empty strings to null for time/date fields (Postgres rejects "" for TIME cols)
    // - Ensure new optional fields have safe defaults
    const normalizedFlights = flights.map(({ id: _clientId, boardingPassUrl: _bp, ...f }) => ({
      ...f,
      departureTime: f.departureTime || null,
      arrivalDate:   f.arrivalDate   || null,
      arrivalTime:   f.arrivalTime   || null,
      wantsUpgrade:  f.wantsUpgrade  ?? false,
      cabinClass:    f.cabinClass    ?? "economy",
    }));

    const { data, error } = await supabase.rpc("save_draft_trip", {
      p_name:           name,
      p_flights:        normalizedFlights,
      p_accommodations: accommodations,
    });

    if (error || !data) {
      console.error("[saveDraftTrip] RPC error:", error?.message, "code:", error?.code);
      return { error: "rpc", message: error?.message };
    }

    haptics.success();
    const newTripId = data as string;

    // Fetch the newly created trip with its real DB IDs
    const { data: tripRow } = await supabase
      .from("trips")
      .select("id, name, passengers, flights(*), accommodations(*)")
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
        passengers: (tripRow.passengers as Passenger[] | null) ?? [],
      };
      setTrips((prev) => [...prev, newTrip]);
    }

    return { id: newTripId };
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

    const newTripId = newTrip.id;

    // Helper: cleanup partial trip on any failure
    async function rollbackTrip() {
      await supabase.from("trips").delete().eq("id", newTripId);
      toast.error("No se pudo duplicar el viaje / Could not duplicate trip");
    }

    const flightIdMap: Record<string, string> = {};
    for (const flight of source.flights) {
      const { data: last } = await supabase
        .from("flights")
        .select("sort_order")
        .eq("trip_id", newTripId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      const sort_order = (last?.sort_order ?? -1) + 1;
      const { data: f, error: fErr } = await supabase.from("flights").insert({
        trip_id: newTripId,
        flight_code: flight.flightCode,
        airline_code: flight.airlineCode,
        airline_name: flight.airlineName,
        airline_icao: flight.airlineIcao,
        flight_number: flight.flightNumber,
        origin_code: flight.originCode,
        destination_code: flight.destinationCode,
        iso_date: flight.isoDate,
        departure_time: flight.departureTime || null,
        arrival_date: flight.arrivalDate ?? null,
        arrival_time: flight.arrivalTime ?? null,
        arrival_buffer: flight.arrivalBuffer,
        sort_order,
        booking_code: flight.bookingCode ?? null,
      }).select("id").single();
      if (fErr || !f) { await rollbackTrip(); return null; }
      flightIdMap[flight.id] = f.id;
    }

    for (const acc of source.accommodations) {
      const realFlightId = acc.flightId ? flightIdMap[acc.flightId] : null;
      const { error: aErr } = await supabase.from("accommodations").insert({
        trip_id: newTripId,
        flight_id: realFlightId ?? null,
        name: acc.name,
        check_in_date: acc.checkInDate ?? null,
        check_in_time: acc.checkInTime ?? null,
        check_out_date: acc.checkOutDate ?? null,
        check_out_time: acc.checkOutTime ?? null,
      });
      if (aErr) { await rollbackTrip(); return null; }
    }

    const newFlights = source.flights.map((f) => ({ ...f, id: flightIdMap[f.id] ?? f.id }));
    setTrips((prev) => [...prev, {
      id: newTripId,
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

  const duplicateTripWithLocale = useCallback(async (tripId: string, locale?: "es" | "en"): Promise<string | null> => {
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

    const newTripId = newTrip.id;

    async function rollbackTrip() {
      await supabase.from("trips").delete().eq("id", newTripId);
      toast.error("No se pudo duplicar el viaje / Could not duplicate trip");
    }

    const flightIdMap: Record<string, string> = {};
    for (const flight of source.flights) {
      const { data: last } = await supabase
        .from("flights")
        .select("sort_order")
        .eq("trip_id", newTripId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      const sort_order = (last?.sort_order ?? -1) + 1;
      const { data: f, error: fErr } = await supabase.from("flights").insert({
        trip_id: newTripId,
        flight_code: flight.flightCode,
        airline_code: flight.airlineCode,
        airline_name: flight.airlineName,
        airline_icao: flight.airlineIcao,
        flight_number: flight.flightNumber,
        origin_code: flight.originCode,
        destination_code: flight.destinationCode,
        iso_date: flight.isoDate,
        departure_time: flight.departureTime || null,
        arrival_date: flight.arrivalDate ?? null,
        arrival_time: flight.arrivalTime ?? null,
        arrival_buffer: flight.arrivalBuffer,
        sort_order,
        booking_code: flight.bookingCode ?? null,
      }).select("id").single();
      if (fErr || !f) { await rollbackTrip(); return null; }
      flightIdMap[flight.id] = f.id;
    }

    for (const acc of source.accommodations) {
      const realFlightId = acc.flightId ? flightIdMap[acc.flightId] : null;
      const { error: aErr } = await supabase.from("accommodations").insert({
        trip_id: newTripId,
        flight_id: realFlightId ?? null,
        name: acc.name,
        check_in_date: acc.checkInDate ?? null,
        check_in_time: acc.checkInTime ?? null,
        check_out_date: acc.checkOutDate ?? null,
        check_out_time: acc.checkOutTime ?? null,
      });
      if (aErr) { await rollbackTrip(); return null; }
    }

    const newFlights = source.flights.map((f) => ({ ...f, id: flightIdMap[f.id] ?? f.id }));
    setTrips((prev) => [...prev, {
      id: newTripId,
      name: newName,
      flights: newFlights,
      accommodations: source.accommodations.map((a) => ({
        ...a,
        tripId: newTrip.id,
        flightId: a.flightId ? flightIdMap[a.flightId] : undefined,
      })),
    }]);

    toast.success(locale === "es" ? "Viaje duplicado ✓" : "Trip duplicated ✓");
    return newTrip.id;
  }, [trips]);

  const updatePassengers = useCallback(async (tripId: string, passengers: Passenger[]) => {
    const prevPassengers = trips.find((t) => t.id === tripId)?.passengers ?? [];
    setTrips((prev) =>
      prev.map((t) => (t.id === tripId ? { ...t, passengers } : t)),
    );
    const supabase = createClient();
    const { error } = await supabase.from("trips").update({ passengers }).eq("id", tripId);
    if (error) {
      setTrips((prev) =>
        prev.map((t) => (t.id === tripId ? { ...t, passengers: prevPassengers } : t)),
      );
      console.error("Error updating passengers:", error.message);
    }
  }, [trips]);

  const toggleUpgradeWish = useCallback(async (tripId: string, flightId: string, wants: boolean) => {
    const prevWants = trips.find((t) => t.id === tripId)?.flights.find((f) => f.id === flightId)?.wantsUpgrade ?? !wants;
    setTrips((prev) =>
      prev.map((t) =>
        t.id !== tripId ? t : {
          ...t,
          flights: t.flights.map((f) =>
            f.id !== flightId ? f : { ...f, wantsUpgrade: wants },
          ),
        },
      ),
    );
    const supabase = createClient();
    const { error } = await supabase.from("flights").update({ wants_upgrade: wants }).eq("id", flightId);
    if (error) {
      setTrips((prev) =>
        prev.map((t) =>
          t.id !== tripId ? t : {
            ...t,
            flights: t.flights.map((f) =>
              f.id !== flightId ? f : { ...f, wantsUpgrade: prevWants },
            ),
          },
        ),
      );
      console.error("Error updating upgrade wish:", error.message);
    }
  }, [trips]);

  const updateCabinClass = useCallback(async (
    tripId: string,
    flightId: string,
    cabinClass: TripFlight["cabinClass"],
  ) => {
    setTrips((prev) =>
      prev.map((t) =>
        t.id !== tripId ? t : {
          ...t,
          flights: t.flights.map((f) =>
            f.id !== flightId ? f : { ...f, cabinClass },
          ),
        },
      ),
    );
    const supabase = createClient();
    await supabase.from("flights").update({ cabin_class: cabinClass ?? "economy" }).eq("id", flightId);
  }, []);

  const updateBoardingPass = useCallback(async (
    tripId: string,
    flightId: string,
    url: string | null,
  ) => {
    setTrips((prev) =>
      prev.map((t) =>
        t.id !== tripId ? t : {
          ...t,
          flights: t.flights.map((f) =>
            f.id !== flightId ? f : { ...f, boardingPassUrl: url ?? undefined },
          ),
        },
      ),
    );
    const supabase = createClient();
    await supabase.from("flights").update({ boarding_pass_url: url }).eq("id", flightId);
  }, []);

  return { trips, loading, createTrip, deleteTrip, renameTrip, addFlight, removeFlight, addAccommodation, removeAccommodation, updateAccommodation, saveDraftTrip, duplicateTrip, duplicateTripWithLocale, updateBoardingPass, updatePassengers, toggleUpgradeWish, updateCabinClass };
}
