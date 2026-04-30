


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."check_rate_limit"("p_user_id" "uuid", "p_endpoint" "text", "p_max_per_hour" integer) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$                                                                       
  DECLARE                                                                                                           v_window timestamptz := date_trunc('hour', now());                                                          
    v_count  int;                                                                                               
  BEGIN                                                                                                         
    INSERT INTO rate_limits (user_id, endpoint, window_start, count)
    VALUES (p_user_id, p_endpoint, v_window, 1)                                                                     ON CONFLICT (user_id, endpoint, window_start)
    DO UPDATE SET count = rate_limits.count + 1                                                                 
    RETURNING count INTO v_count;                                                                                   RETURN v_count <= p_max_per_hour;                                                                           
  END;                                                                                                          
  $$;


ALTER FUNCTION "public"."check_rate_limit"("p_user_id" "uuid", "p_endpoint" "text", "p_max_per_hour" integer) OWNER TO "postgres";


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
        departure_time, arrival_date, arrival_time, arrival_buffer, sort_order
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
        i
      ) RETURNING id INTO v_flight_id;

      v_flight_map := v_flight_map || jsonb_build_object(v_draft_id, v_flight_id::text);
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


ALTER FUNCTION "public"."save_draft_trip"("p_name" "text", "p_flights" "jsonb", "p_accommodations" "jsonb") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."accommodations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "check_in_date" "date",
    "check_in_time" "text",
    "check_out_date" "date",
    "confirmation_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "flight_id" "uuid",
    "check_out_time" "text",
    "address" "text"
);


ALTER TABLE "public"."accommodations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."airport_status_cache" (
    "iata" "text" NOT NULL,
    "data" "jsonb" NOT NULL,
    "cached_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."airport_status_cache" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."boarding_passes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "flight_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "passenger_name" "text",
    "seat" "text",
    "gate" "text",
    "boarding_group" "text",
    "barcode_data" "text",
    "barcode_format" "text",
    "storage_path" "text",
    "extracted_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."boarding_passes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cron_runs" (
    "id" bigint NOT NULL,
    "ran_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "flights_processed" integer DEFAULT 0 NOT NULL,
    "notifications_sent" integer DEFAULT 0 NOT NULL,
    "errors" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "duration_ms" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."cron_runs" OWNER TO "postgres";


ALTER TABLE "public"."cron_runs" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."cron_runs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."flight_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "flight_key" "text" NOT NULL,
    "pnr" "text",
    "seat" "text",
    "notes" "text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."flight_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."flights" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "flight_code" "text" NOT NULL,
    "airline_code" "text" NOT NULL,
    "airline_name" "text" NOT NULL,
    "airline_icao" "text",
    "flight_number" "text" NOT NULL,
    "origin_code" "text" NOT NULL,
    "destination_code" "text" NOT NULL,
    "iso_date" "date" NOT NULL,
    "departure_time" "text",
    "arrival_buffer" numeric(3,1) DEFAULT 2,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "arrival_date" "text",
    "arrival_time" "text",
    "gate" "text",
    "boarding_pass_url" "text",
    "wants_upgrade" boolean DEFAULT false,
    "cabin_class" "text" DEFAULT 'economy'::"text",
    "booking_code" "text",
    "fa_alert_id" integer
);


ALTER TABLE "public"."flights" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."follows" (
    "follower_id" "uuid" NOT NULL,
    "following_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."follows" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."friendships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "requester_id" "uuid" NOT NULL,
    "addressee_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "friendships_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'declined'::"text"])))
);


ALTER TABLE "public"."friendships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "flight_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "accommodation_id" "uuid"
);


ALTER TABLE "public"."notification_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."passengers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "passport_expiry" "date"
);


ALTER TABLE "public"."passengers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."price_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "origin_code" "text" NOT NULL,
    "destination_code" "text" NOT NULL,
    "target_date" "text" NOT NULL,
    "max_price" numeric,
    "currency" "text" DEFAULT 'USD'::"text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."price_alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "endpoint" "text" NOT NULL,
    "p256dh" "text" NOT NULL,
    "auth" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."push_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rate_limits" (
    "user_id" "uuid" NOT NULL,
    "endpoint" "text" NOT NULL,
    "window_start" timestamp with time zone NOT NULL,
    "count" integer DEFAULT 1 NOT NULL
);


ALTER TABLE "public"."rate_limits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."social_reactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "emoji" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "social_reactions_emoji_check" CHECK (("emoji" = ANY (ARRAY['❤️'::"text", '🔥'::"text", '😍'::"text", '✈️'::"text", '🌍'::"text"])))
);


ALTER TABLE "public"."social_reactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tracked_flights" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "airline_code" "text" NOT NULL,
    "flight_number" "text" NOT NULL,
    "airport_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tracked_flights" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trip_chat_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "user_email" "text" NOT NULL,
    "body" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."trip_chat_messages" REPLICA IDENTITY FULL;


ALTER TABLE "public"."trip_chat_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trip_collaborators" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "inviter_id" "uuid" NOT NULL,
    "invitee_email" "text" NOT NULL,
    "invitee_id" "uuid",
    "role" "text" DEFAULT 'viewer'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "invite_token" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "invited_at" timestamp with time zone DEFAULT "now"(),
    "accepted_at" timestamp with time zone,
    CONSTRAINT "trip_collaborators_role_check" CHECK (("role" = ANY (ARRAY['viewer'::"text", 'editor'::"text"]))),
    CONSTRAINT "trip_collaborators_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'declined'::"text"])))
);


ALTER TABLE "public"."trip_collaborators" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trip_expenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount" numeric NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "category" "text" DEFAULT 'other'::"text" NOT NULL,
    "description" "text",
    "expense_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."trip_expenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trip_reactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "share_token" "text" NOT NULL,
    "user_fingerprint" "text" NOT NULL,
    "emoji" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."trip_reactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trip_share_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "token" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone DEFAULT ("now"() + '30 days'::interval)
);


ALTER TABLE "public"."trip_share_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trips" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "passengers" "jsonb" DEFAULT '[]'::"jsonb"
);


ALTER TABLE "public"."trips" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "plan" "text" DEFAULT 'free'::"text" NOT NULL,
    "stripe_customer_id" "text",
    "notification_prefs" "jsonb" DEFAULT '{"priceDrops": true, "gateChanges": true, "flightDelays": true, "weeklyDigest": false, "weatherAlerts": false, "checkInReminders": true}'::"jsonb" NOT NULL,
    "last_seen_at" timestamp with time zone,
    "referral_code" "text",
    "referral_bonus_trips" integer DEFAULT 0,
    "referral_applied" boolean DEFAULT false,
    "referral_count" integer DEFAULT 0,
    "welcome_sent" boolean DEFAULT false NOT NULL,
    "social_settings" "jsonb" DEFAULT '{"showMap": true, "showStats": true, "showTrips": true, "showPersona": false, "acceptRequests": true, "profileVisible": "friends", "showCurrentLocation": true}'::"jsonb" NOT NULL,
    "username" "text",
    "display_name" "text",
    CONSTRAINT "user_profiles_plan_check" CHECK (("plan" = ANY (ARRAY['free'::"text", 'explorer'::"text", 'pilot'::"text"])))
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."visited_places" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "city" "text" NOT NULL,
    "country" "text" NOT NULL,
    "date_visited" "date" NOT NULL,
    "source" "text" DEFAULT 'manual'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "visited_places_source_check" CHECK (("source" = ANY (ARRAY['inferred'::"text", 'manual'::"text", 'detected'::"text"])))
);


ALTER TABLE "public"."visited_places" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."watched_airports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "iata_code" "text" NOT NULL,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."watched_airports" OWNER TO "postgres";


ALTER TABLE ONLY "public"."accommodations"
    ADD CONSTRAINT "accommodations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."airport_status_cache"
    ADD CONSTRAINT "airport_status_cache_pkey" PRIMARY KEY ("iata");



ALTER TABLE ONLY "public"."boarding_passes"
    ADD CONSTRAINT "boarding_passes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cron_runs"
    ADD CONSTRAINT "cron_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."flight_notes"
    ADD CONSTRAINT "flight_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."flight_notes"
    ADD CONSTRAINT "flight_notes_user_id_flight_key_key" UNIQUE ("user_id", "flight_key");



ALTER TABLE ONLY "public"."flights"
    ADD CONSTRAINT "flights_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_pkey" PRIMARY KEY ("follower_id", "following_id");



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_requester_id_addressee_id_key" UNIQUE ("requester_id", "addressee_id");



ALTER TABLE ONLY "public"."notification_log"
    ADD CONSTRAINT "notification_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."passengers"
    ADD CONSTRAINT "passengers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."price_alerts"
    ADD CONSTRAINT "price_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_endpoint_key" UNIQUE ("endpoint");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rate_limits"
    ADD CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("user_id", "endpoint", "window_start");



ALTER TABLE ONLY "public"."social_reactions"
    ADD CONSTRAINT "social_reactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."social_reactions"
    ADD CONSTRAINT "social_reactions_trip_id_user_id_emoji_key" UNIQUE ("trip_id", "user_id", "emoji");



ALTER TABLE ONLY "public"."tracked_flights"
    ADD CONSTRAINT "tracked_flights_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tracked_flights"
    ADD CONSTRAINT "tracked_flights_user_id_airline_code_flight_number_key" UNIQUE ("user_id", "airline_code", "flight_number");



ALTER TABLE ONLY "public"."trip_chat_messages"
    ADD CONSTRAINT "trip_chat_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trip_collaborators"
    ADD CONSTRAINT "trip_collaborators_invite_token_key" UNIQUE ("invite_token");



ALTER TABLE ONLY "public"."trip_collaborators"
    ADD CONSTRAINT "trip_collaborators_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trip_expenses"
    ADD CONSTRAINT "trip_expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trip_reactions"
    ADD CONSTRAINT "trip_reactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trip_reactions"
    ADD CONSTRAINT "trip_reactions_share_token_user_fingerprint_key" UNIQUE ("share_token", "user_fingerprint");



ALTER TABLE ONLY "public"."trip_share_tokens"
    ADD CONSTRAINT "trip_share_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trip_share_tokens"
    ADD CONSTRAINT "trip_share_tokens_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."trips"
    ADD CONSTRAINT "trips_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."visited_places"
    ADD CONSTRAINT "visited_places_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."watched_airports"
    ADD CONSTRAINT "watched_airports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."watched_airports"
    ADD CONSTRAINT "watched_airports_user_id_iata_code_key" UNIQUE ("user_id", "iata_code");



CREATE INDEX "accommodations_trip_id_idx" ON "public"."accommodations" USING "btree" ("trip_id");



CREATE UNIQUE INDEX "boarding_passes_flight_user" ON "public"."boarding_passes" USING "btree" ("flight_id", "user_id");



CREATE INDEX "follows_following_id_idx" ON "public"."follows" USING "btree" ("following_id");



CREATE INDEX "friendships_addressee_id_idx" ON "public"."friendships" USING "btree" ("addressee_id");



CREATE INDEX "friendships_requester_id_idx" ON "public"."friendships" USING "btree" ("requester_id");



CREATE INDEX "idx_boarding_passes_flight_id" ON "public"."boarding_passes" USING "btree" ("flight_id");



CREATE UNIQUE INDEX "idx_referral_code" ON "public"."user_profiles" USING "btree" ("referral_code") WHERE ("referral_code" IS NOT NULL);



CREATE INDEX "idx_tc_email" ON "public"."trip_collaborators" USING "btree" ("invitee_email");



CREATE INDEX "idx_tc_token" ON "public"."trip_collaborators" USING "btree" ("invite_token");



CREATE INDEX "idx_tc_trip" ON "public"."trip_collaborators" USING "btree" ("trip_id");



CREATE INDEX "idx_trip_chat_trip" ON "public"."trip_chat_messages" USING "btree" ("trip_id");



CREATE INDEX "idx_trip_reactions_token" ON "public"."trip_reactions" USING "btree" ("share_token");



CREATE INDEX "idx_trip_share_tokens_token" ON "public"."trip_share_tokens" USING "btree" ("token");



CREATE INDEX "idx_user_profiles_stripe_customer" ON "public"."user_profiles" USING "btree" ("stripe_customer_id") WHERE ("stripe_customer_id" IS NOT NULL);



CREATE INDEX "notification_log_accommodation_id_type_idx" ON "public"."notification_log" USING "btree" ("accommodation_id", "type") WHERE ("accommodation_id" IS NOT NULL);



CREATE INDEX "notification_log_flight_id_type_idx" ON "public"."notification_log" USING "btree" ("flight_id", "type") WHERE ("flight_id" IS NOT NULL);



CREATE INDEX "notification_log_lookup_idx" ON "public"."notification_log" USING "btree" ("flight_id", "type", "sent_at");



CREATE INDEX "push_subscriptions_user_id_idx" ON "public"."push_subscriptions" USING "btree" ("user_id");



CREATE INDEX "rate_limits_window_idx" ON "public"."rate_limits" USING "btree" ("window_start");



CREATE UNIQUE INDEX "user_profiles_username_idx" ON "public"."user_profiles" USING "btree" ("lower"("username"));



ALTER TABLE ONLY "public"."accommodations"
    ADD CONSTRAINT "accommodations_flight_id_fkey" FOREIGN KEY ("flight_id") REFERENCES "public"."flights"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."accommodations"
    ADD CONSTRAINT "accommodations_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."boarding_passes"
    ADD CONSTRAINT "boarding_passes_flight_id_fkey" FOREIGN KEY ("flight_id") REFERENCES "public"."flights"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."boarding_passes"
    ADD CONSTRAINT "boarding_passes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."flight_notes"
    ADD CONSTRAINT "flight_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."flights"
    ADD CONSTRAINT "flights_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."flights"
    ADD CONSTRAINT "flights_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_addressee_id_fkey" FOREIGN KEY ("addressee_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_log"
    ADD CONSTRAINT "notification_log_accommodation_id_fkey" FOREIGN KEY ("accommodation_id") REFERENCES "public"."accommodations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notification_log"
    ADD CONSTRAINT "notification_log_flight_id_fkey" FOREIGN KEY ("flight_id") REFERENCES "public"."flights"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notification_log"
    ADD CONSTRAINT "notification_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."passengers"
    ADD CONSTRAINT "passengers_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."price_alerts"
    ADD CONSTRAINT "price_alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."social_reactions"
    ADD CONSTRAINT "social_reactions_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."social_reactions"
    ADD CONSTRAINT "social_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tracked_flights"
    ADD CONSTRAINT "tracked_flights_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_chat_messages"
    ADD CONSTRAINT "trip_chat_messages_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_chat_messages"
    ADD CONSTRAINT "trip_chat_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."trip_collaborators"
    ADD CONSTRAINT "trip_collaborators_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_expenses"
    ADD CONSTRAINT "trip_expenses_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_expenses"
    ADD CONSTRAINT "trip_expenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_share_tokens"
    ADD CONSTRAINT "trip_share_tokens_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trips"
    ADD CONSTRAINT "trips_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."visited_places"
    ADD CONSTRAINT "visited_places_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."watched_airports"
    ADD CONSTRAINT "watched_airports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Authenticated users delete own share tokens" ON "public"."trip_share_tokens" FOR DELETE TO "authenticated" USING (("trip_id" IN ( SELECT "trips"."id"
   FROM "public"."trips"
  WHERE ("trips"."user_id" = "auth"."uid"()))));



CREATE POLICY "Authenticated users insert share tokens" ON "public"."trip_share_tokens" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Public read share tokens" ON "public"."trip_share_tokens" FOR SELECT USING (true);



CREATE POLICY "Trip members can insert messages" ON "public"."trip_chat_messages" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) AND (("trip_id" IN ( SELECT "trip_collaborators"."trip_id"
   FROM "public"."trip_collaborators"
  WHERE (("trip_chat_messages"."user_id" = "auth"."uid"()) AND ("trip_collaborators"."status" = 'accepted'::"text")))) OR ("trip_id" IN ( SELECT "trips"."id"
   FROM "public"."trips"
  WHERE ("trips"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Trip members can read messages" ON "public"."trip_chat_messages" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("trip_id" IN ( SELECT "trip_collaborators"."trip_id"
   FROM "public"."trip_collaborators"
  WHERE (("trip_chat_messages"."user_id" = "auth"."uid"()) AND ("trip_collaborators"."status" = 'accepted'::"text")))) OR ("trip_id" IN ( SELECT "trips"."id"
   FROM "public"."trips"
  WHERE ("trips"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can manage their own accommodations" ON "public"."accommodations" USING (("trip_id" IN ( SELECT "trips"."id"
   FROM "public"."trips"
  WHERE ("trips"."user_id" = "auth"."uid"())))) WITH CHECK (("trip_id" IN ( SELECT "trips"."id"
   FROM "public"."trips"
  WHERE ("trips"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users manage own boarding passes" ON "public"."boarding_passes" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users manage own expenses" ON "public"."trip_expenses" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own passengers" ON "public"."passengers" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users manage own price alerts" ON "public"."price_alerts" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own profile" ON "public"."user_profiles" TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "Users manage own push subscriptions" ON "public"."push_subscriptions" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."accommodations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."boarding_passes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."flight_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."flights" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."follows" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "follows_delete_own" ON "public"."follows" FOR DELETE USING (("follower_id" = "auth"."uid"()));



CREATE POLICY "follows_insert_own" ON "public"."follows" FOR INSERT WITH CHECK (("follower_id" = "auth"."uid"()));



CREATE POLICY "follows_select_public" ON "public"."follows" FOR SELECT USING (true);



ALTER TABLE "public"."friendships" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "friendships_delete" ON "public"."friendships" FOR DELETE USING ((("requester_id" = "auth"."uid"()) OR ("addressee_id" = "auth"."uid"())));



CREATE POLICY "friendships_insert" ON "public"."friendships" FOR INSERT WITH CHECK (("requester_id" = "auth"."uid"()));



CREATE POLICY "friendships_select" ON "public"."friendships" FOR SELECT USING ((("requester_id" = "auth"."uid"()) OR ("addressee_id" = "auth"."uid"())));



CREATE POLICY "friendships_update" ON "public"."friendships" FOR UPDATE USING ((("requester_id" = "auth"."uid"()) OR ("addressee_id" = "auth"."uid"())));



CREATE POLICY "invitee_select" ON "public"."trip_collaborators" FOR SELECT TO "authenticated" USING (("invitee_id" = "auth"."uid"()));



CREATE POLICY "invitee_update" ON "public"."trip_collaborators" FOR UPDATE TO "authenticated" USING (("invitee_id" = "auth"."uid"())) WITH CHECK (("invitee_id" = "auth"."uid"()));



ALTER TABLE "public"."passengers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."price_alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."push_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."social_reactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "social_reactions_delete" ON "public"."social_reactions" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "social_reactions_insert" ON "public"."social_reactions" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "social_reactions_select" ON "public"."social_reactions" FOR SELECT USING (true);



ALTER TABLE "public"."tracked_flights" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trip_chat_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trip_collaborators" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trip_expenses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "trip_owner_all" ON "public"."trip_collaborators" TO "authenticated" USING (("trip_id" IN ( SELECT "trips"."id"
   FROM "public"."trips"
  WHERE ("trips"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."trip_share_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trips" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users manage own airports" ON "public"."watched_airports" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "users manage own flights" ON "public"."flights" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "users manage own notes" ON "public"."flight_notes" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "users manage own tracked flights" ON "public"."tracked_flights" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "users manage own trips" ON "public"."trips" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."visited_places" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "visited_places_self" ON "public"."visited_places" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."watched_airports" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_user_id" "uuid", "p_endpoint" "text", "p_max_per_hour" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_user_id" "uuid", "p_endpoint" "text", "p_max_per_hour" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_user_id" "uuid", "p_endpoint" "text", "p_max_per_hour" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."save_draft_trip"("p_name" "text", "p_flights" "jsonb", "p_accommodations" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."save_draft_trip"("p_name" "text", "p_flights" "jsonb", "p_accommodations" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_draft_trip"("p_name" "text", "p_flights" "jsonb", "p_accommodations" "jsonb") TO "service_role";


















GRANT ALL ON TABLE "public"."accommodations" TO "anon";
GRANT ALL ON TABLE "public"."accommodations" TO "authenticated";
GRANT ALL ON TABLE "public"."accommodations" TO "service_role";



GRANT ALL ON TABLE "public"."airport_status_cache" TO "anon";
GRANT ALL ON TABLE "public"."airport_status_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."airport_status_cache" TO "service_role";



GRANT ALL ON TABLE "public"."boarding_passes" TO "anon";
GRANT ALL ON TABLE "public"."boarding_passes" TO "authenticated";
GRANT ALL ON TABLE "public"."boarding_passes" TO "service_role";



GRANT ALL ON TABLE "public"."cron_runs" TO "anon";
GRANT ALL ON TABLE "public"."cron_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."cron_runs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."cron_runs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cron_runs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cron_runs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."flight_notes" TO "anon";
GRANT ALL ON TABLE "public"."flight_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."flight_notes" TO "service_role";



GRANT ALL ON TABLE "public"."flights" TO "anon";
GRANT ALL ON TABLE "public"."flights" TO "authenticated";
GRANT ALL ON TABLE "public"."flights" TO "service_role";



GRANT ALL ON TABLE "public"."follows" TO "anon";
GRANT ALL ON TABLE "public"."follows" TO "authenticated";
GRANT ALL ON TABLE "public"."follows" TO "service_role";



GRANT ALL ON TABLE "public"."friendships" TO "anon";
GRANT ALL ON TABLE "public"."friendships" TO "authenticated";
GRANT ALL ON TABLE "public"."friendships" TO "service_role";



GRANT ALL ON TABLE "public"."notification_log" TO "anon";
GRANT ALL ON TABLE "public"."notification_log" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_log" TO "service_role";



GRANT ALL ON TABLE "public"."passengers" TO "anon";
GRANT ALL ON TABLE "public"."passengers" TO "authenticated";
GRANT ALL ON TABLE "public"."passengers" TO "service_role";



GRANT ALL ON TABLE "public"."price_alerts" TO "anon";
GRANT ALL ON TABLE "public"."price_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."price_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."push_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."rate_limits" TO "anon";
GRANT ALL ON TABLE "public"."rate_limits" TO "authenticated";
GRANT ALL ON TABLE "public"."rate_limits" TO "service_role";



GRANT ALL ON TABLE "public"."social_reactions" TO "anon";
GRANT ALL ON TABLE "public"."social_reactions" TO "authenticated";
GRANT ALL ON TABLE "public"."social_reactions" TO "service_role";



GRANT ALL ON TABLE "public"."tracked_flights" TO "anon";
GRANT ALL ON TABLE "public"."tracked_flights" TO "authenticated";
GRANT ALL ON TABLE "public"."tracked_flights" TO "service_role";



GRANT ALL ON TABLE "public"."trip_chat_messages" TO "anon";
GRANT ALL ON TABLE "public"."trip_chat_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."trip_chat_messages" TO "service_role";



GRANT ALL ON TABLE "public"."trip_collaborators" TO "anon";
GRANT ALL ON TABLE "public"."trip_collaborators" TO "authenticated";
GRANT ALL ON TABLE "public"."trip_collaborators" TO "service_role";



GRANT ALL ON TABLE "public"."trip_expenses" TO "anon";
GRANT ALL ON TABLE "public"."trip_expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."trip_expenses" TO "service_role";



GRANT ALL ON TABLE "public"."trip_reactions" TO "anon";
GRANT ALL ON TABLE "public"."trip_reactions" TO "authenticated";
GRANT ALL ON TABLE "public"."trip_reactions" TO "service_role";



GRANT ALL ON TABLE "public"."trip_share_tokens" TO "anon";
GRANT ALL ON TABLE "public"."trip_share_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."trip_share_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."trips" TO "anon";
GRANT ALL ON TABLE "public"."trips" TO "authenticated";
GRANT ALL ON TABLE "public"."trips" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."visited_places" TO "anon";
GRANT ALL ON TABLE "public"."visited_places" TO "authenticated";
GRANT ALL ON TABLE "public"."visited_places" TO "service_role";



GRANT ALL ON TABLE "public"."watched_airports" TO "anon";
GRANT ALL ON TABLE "public"."watched_airports" TO "authenticated";
GRANT ALL ON TABLE "public"."watched_airports" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































