CREATE TABLE IF NOT EXISTS trip_chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  user_email TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trip_chat_trip ON trip_chat_messages(trip_id);
ALTER TABLE trip_chat_messages REPLICA IDENTITY FULL;
-- RLS
ALTER TABLE trip_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trip members can read messages" ON trip_chat_messages FOR SELECT USING (
  user_id = auth.uid() OR trip_id IN (SELECT trip_id FROM trip_collaborators WHERE user_id = auth.uid() AND status = 'accepted')
  OR trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
);
CREATE POLICY "Trip members can insert messages" ON trip_chat_messages FOR INSERT WITH CHECK (
  user_id = auth.uid() AND (
    trip_id IN (SELECT trip_id FROM trip_collaborators WHERE user_id = auth.uid() AND status = 'accepted')
    OR trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
  )
);
