-- Restructure match_history table for proper doubles tracking
-- Drop existing table and recreate with new schema

DROP TABLE IF EXISTS match_history CASCADE;

CREATE TABLE match_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  team_a_player_1_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_a_player_2_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_b_player_1_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_b_player_2_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_a_score INTEGER,
  team_b_score INTEGER,
  winning_team TEXT CHECK (winning_team IN ('team_a', 'team_b', 'tie', 'incomplete')),
  played_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  played_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE match_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Everyone can view match history (for stats and leaderboard)
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

-- RLS Policy: Court officers can update match history (for corrections)
CREATE POLICY "Court officers can update match history"
  ON match_history FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM staff_roles
      WHERE user_id = auth.uid()
      AND role = 'court_officer'
    )
  );

-- Create indexes for daily cleanup and player lookups
CREATE INDEX idx_match_history_played_date ON match_history(played_date DESC);
CREATE INDEX idx_match_history_court_id ON match_history(court_id);
CREATE INDEX idx_match_history_team_a_player_1 ON match_history(team_a_player_1_id);
CREATE INDEX idx_match_history_team_a_player_2 ON match_history(team_a_player_2_id);
CREATE INDEX idx_match_history_team_b_player_1 ON match_history(team_b_player_1_id);
CREATE INDEX idx_match_history_team_b_player_2 ON match_history(team_b_player_2_id);

-- Constraint: Team members must be different
ALTER TABLE match_history ADD CONSTRAINT unique_team_members CHECK (
  team_a_player_1_id != team_a_player_2_id AND
  team_b_player_1_id != team_b_player_2_id AND
  team_a_player_1_id != team_b_player_1_id AND
  team_a_player_1_id != team_b_player_2_id AND
  team_a_player_2_id != team_b_player_1_id AND
  team_a_player_2_id != team_b_player_2_id
);
