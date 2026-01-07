-- Create player_stats_yearly table for historical yearly data
CREATE TABLE IF NOT EXISTS player_stats_yearly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  wins INTEGER NOT NULL DEFAULT 0,
  games_played INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(player_id, year)
);

-- Enable Row Level Security
ALTER TABLE player_stats_yearly ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Everyone can view yearly stats
CREATE POLICY "Public can view yearly stats"
  ON player_stats_yearly FOR SELECT
  USING (true);

-- RLS Policy: Court officers can update yearly stats
CREATE POLICY "Court officers can update yearly stats"
  ON player_stats_yearly FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staff_roles
      WHERE user_id = auth.uid()
      AND role = 'court_officer'
    )
  );

-- Create indexes for performance
CREATE INDEX idx_player_stats_yearly_player_year ON player_stats_yearly(player_id, year DESC);
CREATE INDEX idx_player_stats_yearly_year ON player_stats_yearly(year DESC);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_player_stats_yearly_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on changes
CREATE TRIGGER player_stats_yearly_updated_at
  BEFORE UPDATE ON player_stats_yearly
  FOR EACH ROW
  EXECUTE FUNCTION update_player_stats_yearly_updated_at();
