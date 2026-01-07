-- Create player_stats table for lifetime totals
CREATE TABLE IF NOT EXISTS player_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL UNIQUE REFERENCES players(id) ON DELETE CASCADE,
  lifetime_wins INTEGER NOT NULL DEFAULT 0,
  lifetime_games_played INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Everyone can view stats (for leaderboard)
CREATE POLICY "Public can view player stats"
  ON player_stats FOR SELECT
  USING (true);

-- RLS Policy: Court officers can update stats
CREATE POLICY "Court officers can update player stats"
  ON player_stats FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staff_roles
      WHERE user_id = auth.uid()
      AND role = 'court_officer'
    )
  );

-- Create indexes for performance
CREATE INDEX idx_player_stats_player_id ON player_stats(player_id);
CREATE INDEX idx_player_stats_lifetime_wins ON player_stats(lifetime_wins DESC);

-- Create index for leaderboard queries (deterministic tie-breaking)
CREATE INDEX idx_leaderboard ON player_stats(lifetime_wins DESC, lifetime_games_played ASC);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_player_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on changes
CREATE TRIGGER player_stats_updated_at
  BEFORE UPDATE ON player_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_player_stats_updated_at();
