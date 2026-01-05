-- Create match_history table
CREATE TABLE IF NOT EXISTS match_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  opponent_ids UUID[] NOT NULL,
  match_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE match_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Players can view their own match history
CREATE POLICY "Players can view their own match history"
  ON match_history FOR SELECT
  USING (auth.uid() = player_id);

-- RLS Policy: All users can view match history (for stats)
CREATE POLICY "Public can view match history"
  ON match_history FOR SELECT
  USING (true);

-- RLS Policy: Court officers can insert match history
CREATE POLICY "Court officers can insert match history"
  ON match_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_roles
      WHERE user_id = auth.uid()
      AND role = 'court_officer'
    )
  );

-- Create indexes for variety enforcement lookups
CREATE INDEX idx_match_history_player_id ON match_history(player_id);
CREATE INDEX idx_match_history_player_date ON match_history(player_id, match_date DESC);
CREATE INDEX idx_match_history_session_id ON match_history(session_id);

-- Function to get last N opponents for a player (for variety enforcement)
CREATE OR REPLACE FUNCTION get_recent_opponents(p_player_id UUID, p_limit INTEGER DEFAULT 3)
RETURNS UUID[] AS $$
DECLARE
  recent_opponents UUID[];
BEGIN
  SELECT ARRAY_AGG(DISTINCT unnest_opponent)
  INTO recent_opponents
  FROM (
    SELECT UNNEST(opponent_ids) as unnest_opponent
    FROM match_history
    WHERE player_id = p_player_id
    ORDER BY match_date DESC
    LIMIT p_limit
  ) subquery;

  RETURN COALESCE(recent_opponents, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql;
