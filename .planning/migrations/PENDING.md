# Pending Migrations

These migrations need to be applied manually in the Supabase SQL editor
(https://app.supabase.com/project/kqudfvmrlbvnveaoyhrb/sql/new).

The Supabase Management API requires a personal access token (not the service role key),
so automated application is not available from this environment.

## Migrations to apply (in order)

| File | Table created | Status |
|------|--------------|--------|
| `004-trip-expenses.sql` | `trip_expenses` | PENDING |
| `007-price-alerts.sql` | `price_alerts` | PENDING |
| `008-shared-trips.sql` | `trip_collaborators` | PENDING |

## How to apply

1. Open the Supabase SQL editor for project `kqudfvmrlbvnveaoyhrb`
2. Paste the contents of each file in order
3. Click "Run"

Migration `008-shared-trips.sql` depends on the `trips` table already existing (migration 001 created `trip_share_tokens` which references `trips`, so `trips` is assumed to exist).
