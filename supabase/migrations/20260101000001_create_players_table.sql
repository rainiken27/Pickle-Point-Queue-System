-- Create players table
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  photo_url TEXT,
  skill_level TEXT CHECK (skill_level IN ('beginner', 'intermediate_advanced')) DEFAULT 'beginner',
  gender TEXT CHECK (gender IN ('male', 'female', 'other')) DEFAULT 'other',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Players can read/update only their own profiles
CREATE POLICY "Players can view their own profile"
  ON players FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Players can update their own profile"
  ON players FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policy: Staff can view all players
CREATE POLICY "Staff can view all players"
  ON players FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff_roles
      WHERE user_id = auth.uid()
      AND role IN ('court_officer', 'cashier')
    )
  );

-- RLS Policy: Staff can insert players
CREATE POLICY "Staff can insert players"
  ON players FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_roles
      WHERE user_id = auth.uid()
      AND role IN ('court_officer', 'cashier')
    )
  );

-- Create index on qr_uuid for fast lookups
CREATE INDEX idx_players_qr_uuid ON players(qr_uuid);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
