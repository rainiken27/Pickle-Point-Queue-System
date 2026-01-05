-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  building TEXT CHECK (building IN ('building_a', 'building_b', 'building_c')),
  status TEXT CHECK (status IN ('active', 'completed', 'expired', 'grace_period')) DEFAULT 'active',
  team1_score INTEGER,
  team2_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Players can view their own sessions
CREATE POLICY "Players can view their own sessions"
  ON sessions FOR SELECT
  USING (auth.uid() = player_id);

-- RLS Policy: Staff can view all sessions
CREATE POLICY "Staff can view all sessions"
  ON sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff_roles
      WHERE user_id = auth.uid()
      AND role IN ('court_officer', 'cashier')
    )
  );

-- RLS Policy: Cashiers can insert sessions
CREATE POLICY "Cashiers can insert sessions"
  ON sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_roles
      WHERE user_id = auth.uid()
      AND role = 'cashier'
    )
  );

-- RLS Policy: Court officers can update sessions
CREATE POLICY "Court officers can update sessions"
  ON sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM staff_roles
      WHERE user_id = auth.uid()
      AND role = 'court_officer'
    )
  );

-- Create indexes for performance
CREATE INDEX idx_sessions_player_id ON sessions(player_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_start_time ON sessions(start_time);
