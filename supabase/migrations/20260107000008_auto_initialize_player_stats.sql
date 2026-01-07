-- Auto-initialize player stats when a new player is registered
-- This ensures:
-- 1. New players appear on leaderboards immediately
-- 2. Stats update functions don't fail on missing records
-- 3. Data integrity is maintained

-- Function to initialize player stats on registration
CREATE OR REPLACE FUNCTION initialize_player_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert initial lifetime stats record
  INSERT INTO player_stats (player_id, lifetime_wins, lifetime_games_played)
  VALUES (NEW.id, 0, 0);

  -- Insert initial yearly stats record for current year
  INSERT INTO player_stats_yearly (player_id, year, wins, games_played)
  VALUES (NEW.id, EXTRACT(YEAR FROM NOW())::INTEGER, 0, 0);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-initialize stats when a player is created
CREATE TRIGGER auto_initialize_player_stats
  AFTER INSERT ON players
  FOR EACH ROW
  EXECUTE FUNCTION initialize_player_stats();

-- Add comment
COMMENT ON FUNCTION initialize_player_stats IS 'Automatically initializes player_stats and player_stats_yearly records when a new player is registered';
