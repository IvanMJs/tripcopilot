-- Add segment_type column to flights table for ground transportation support
ALTER TABLE flights ADD COLUMN IF NOT EXISTS segment_type text NOT NULL DEFAULT 'flight';

ALTER TABLE flights ADD CONSTRAINT flights_segment_type_check
  CHECK (segment_type IN ('flight','bus','train','car_rental','ferry','transfer'));

-- Update save_draft_trip to include segment_type
CREATE OR REPLACE FUNCTION "public"."save_draft_trip"("p_name" "text", "p_flights" "jsonb", "p_accommodations" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
  DECLARE
    v_user_id    uuid := auth.uid();
    v_trip_id    uuid;
    v_flight     jsonb;
    v_acc        jsonb;
    v_flight_id  uuid;
    v_draft_id   text;
    v_flight_map jsonb := '{}';
    v_n_flights  int;
    v_n_accs     int;
    i            int;
  BEGIN
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'not authenticated';
    END IF;

    INSERT INTO trips (name, user_id)
    VALUES (p_name, v_user_id)
    RETURNING id INTO v_trip_id;

    v_n_flights := jsonb_array_length(p_flights);
    FOR i IN 0 .. v_n_flights - 1 LOOP
      v_flight   := p_flights->i;
      v_draft_id := v_flight->>'id';

      INSERT INTO flights (
        trip_id, flight_code, airline_code, airline_name, airline_icao,
        flight_number, origin_code, destination_code, iso_date,
        departure_time, arrival_date, arrival_time, arrival_buffer, sort_order,
        segment_type
      ) VALUES (
        v_trip_id,
        v_flight->>'flightCode',
        v_flight->>'airlineCode',
        v_flight->>'airlineName',
        COALESCE(v_flight->>'airlineIcao', ''),
        v_flight->>'flightNumber',
        v_flight->>'originCode',
        v_flight->>'destinationCode',
        (v_flight->>'isoDate')::date,
        NULLIF(v_flight->>'departureTime', ''),
        NULLIF(v_flight->>'arrivalDate', ''),
        NULLIF(v_flight->>'arrivalTime', ''),
        COALESCE((v_flight->>'arrivalBuffer')::int, 0),
        i,
        COALESCE(v_flight->>'segmentType', 'flight')
      ) RETURNING id INTO v_flight_id;

      -- COALESCE ensures the key is never null even when client omits the `id` field.
      -- If v_draft_id is null the fallback key (v_flight_id) will never be looked up by
      -- any accommodation, so the entry is harmless.
      v_flight_map := v_flight_map || jsonb_build_object(COALESCE(v_draft_id, v_flight_id::text), v_flight_id::text);
    END LOOP;

    v_n_accs := jsonb_array_length(p_accommodations);
    FOR i IN 0 .. v_n_accs - 1 LOOP
      v_acc      := p_accommodations->i;
      v_draft_id := v_acc->>'flightId';

      INSERT INTO accommodations (
        trip_id, flight_id, name,
        check_in_date, check_in_time, check_out_date, check_out_time,
        confirmation_code, address
      ) VALUES (
        v_trip_id,
        CASE
          WHEN v_draft_id IS NOT NULL AND v_draft_id <> ''
          THEN (v_flight_map->>v_draft_id)::uuid
          ELSE NULL
        END,
        v_acc->>'name',
        NULLIF(v_acc->>'checkInDate', '')::date,
        NULLIF(v_acc->>'checkInTime', ''),
        NULLIF(v_acc->>'checkOutDate', '')::date,
        NULLIF(v_acc->>'checkOutTime', ''),
        NULLIF(v_acc->>'confirmationCode', ''),
        NULLIF(v_acc->>'address', '')
      );
    END LOOP;

    RETURN v_trip_id;
  END;
$$;
