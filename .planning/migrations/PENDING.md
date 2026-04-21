# Migration Status

All migrations have been applied directly to production Supabase via pg client.

| Migration | Table | Status |
|-----------|-------|--------|
| 004-trip-expenses.sql | trip_expenses | Applied (pre-existing) |
| 007-price-alerts.sql | price_alerts | Applied (pre-existing) |
| 008-shared-trips.sql | trip_collaborators | Applied 2026-03-22 via pg |
| (inline) | passengers | Applied 2026-03-22 via pg |
| 009-premium-and-prefs.sql | user_profiles | Applied 2026-03-23 via pg |

All 10 core tables verified in production.
