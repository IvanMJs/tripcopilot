-- Push notifications that failed delivery and are pending retry
CREATE TABLE failed_push_notifications (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           uuid        REFERENCES auth.users ON DELETE CASCADE,
  endpoint          text        NOT NULL,
  payload           jsonb       NOT NULL,
  attempts          int         DEFAULT 0 NOT NULL,
  last_attempted_at timestamptz,
  created_at        timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE failed_push_notifications IS 'Push notifications that failed delivery and are pending retry';

-- Index for efficient querying of retryable rows by attempt count
CREATE INDEX failed_push_notifications_attempts_idx
  ON failed_push_notifications (attempts);

-- Row-level security
ALTER TABLE failed_push_notifications ENABLE ROW LEVEL SECURITY;

-- Service role has full access (used by the cron retry job)
CREATE POLICY "service role full access"
  ON failed_push_notifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT ALL ON TABLE failed_push_notifications TO service_role;
