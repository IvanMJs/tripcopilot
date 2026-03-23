-- Migration 008: Shared trips with role-based access
-- Allows users to invite others to view or co-edit their trips

CREATE TABLE IF NOT EXISTS trip_collaborators (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  inviter_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_email text NOT NULL,
  invitee_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  role        text NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor')),
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  invite_token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  invited_at  timestamptz DEFAULT now(),
  accepted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_trip_collaborators_trip_id ON trip_collaborators(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_collaborators_invitee_email ON trip_collaborators(invitee_email);
CREATE INDEX IF NOT EXISTS idx_trip_collaborators_token ON trip_collaborators(invite_token);

ALTER TABLE trip_collaborators ENABLE ROW LEVEL SECURITY;

-- Trip owner can see all collaborators for their trips
CREATE POLICY "Trip owner manages collaborators"
  ON trip_collaborators FOR ALL
  TO authenticated
  USING (
    trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
  );

-- Collaborators can see and update their own invites
CREATE POLICY "Invitee manages own invite"
  ON trip_collaborators FOR SELECT
  TO authenticated
  USING (invitee_id = auth.uid() OR invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Invitee updates own invite status"
  ON trip_collaborators FOR UPDATE
  TO authenticated
  USING (invitee_id = auth.uid())
  WITH CHECK (invitee_id = auth.uid());
