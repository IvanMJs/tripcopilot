CREATE TABLE IF NOT EXISTS trip_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  category text NOT NULL DEFAULT 'other',
  description text,
  expense_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE trip_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own expenses" ON trip_expenses
  FOR ALL USING (auth.uid() = user_id);
