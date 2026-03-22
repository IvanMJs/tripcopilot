ALTER TABLE trips ADD COLUMN IF NOT EXISTS passengers jsonb DEFAULT '[]'::jsonb;
