-- Add passport expiry date field to passengers table
-- Used by TripPassengers component to warn about expiring passports (< 6 months)
ALTER TABLE passengers ADD COLUMN IF NOT EXISTS passport_expiry DATE;
