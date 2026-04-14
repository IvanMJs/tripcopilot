-- Add retention tracking fields to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS referral_bonus_trips INT DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS referral_applied BOOLEAN DEFAULT FALSE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS referral_count INT DEFAULT 0;

-- Unique index on referral codes
CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_code ON user_profiles(referral_code) WHERE referral_code IS NOT NULL;

-- Trip reactions table (for shared trip emoji reactions)
CREATE TABLE IF NOT EXISTS trip_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  share_token TEXT NOT NULL,
  user_fingerprint TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(share_token, user_fingerprint)
);

-- Index for fast reaction lookups
CREATE INDEX IF NOT EXISTS idx_trip_reactions_token ON trip_reactions(share_token);
