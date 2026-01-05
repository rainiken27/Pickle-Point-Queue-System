-- Create player_preferences table
CREATE TABLE IF NOT EXISTS player_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  skill_level_pref TEXT CHECK (skill_level_pref IN ('beginner', 'intermediate_advanced')) DEFAULT 'beginner',
  gender_pref TEXT CHECK (gender_pref IN ('mens', 'womens', 'mixed', 'random')) DEFAULT 'random',
  match_type TEXT CHECK (match_type IN ('solo', 'group')) DEFAULT 'solo',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE player_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Players can read/update their own preferences
CREATE POLICY "Players can view their own preferences"
  ON player_preferences FOR SELECT
  USING (auth.uid() = player_id);

CREATE POLICY "Players can update their own preferences"
  ON player_preferences FOR UPDATE
  USING (auth.uid() = player_id);

-- RLS Policy: Staff can view/update all preferences
CREATE POLICY "Staff can view all preferences"
  ON player_preferences FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff_roles
      WHERE user_id = auth.uid()
      AND role IN ('court_officer', 'cashier')
    )
  );

CREATE POLICY "Staff can insert preferences"
  ON player_preferences FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_roles
      WHERE user_id = auth.uid()
      AND role IN ('court_officer', 'cashier')
    )
  );

CREATE POLICY "Staff can update preferences"
  ON player_preferences FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM staff_roles
      WHERE user_id = auth.uid()
      AND role IN ('court_officer', 'cashier')
    )
  );

-- Create index on player_id for fast lookups
CREATE INDEX idx_player_preferences_player_id ON player_preferences(player_id);

-- Create updated_at trigger
CREATE TRIGGER update_player_preferences_updated_at
  BEFORE UPDATE ON player_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
