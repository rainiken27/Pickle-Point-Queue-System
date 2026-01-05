-- Update skill_level to support 4 distinct levels
-- beginner, novice, intermediate, advanced
-- Preferences will still group them as beginner (beginner+novice) and intermediate_advanced (intermediate+advanced)

-- Update players table constraint
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_skill_level_check;
ALTER TABLE players ADD CONSTRAINT players_skill_level_check
  CHECK (skill_level IN ('beginner', 'novice', 'intermediate', 'advanced'));

-- Note: player_preferences.skill_level_pref remains as 'beginner' or 'intermediate_advanced'
-- This represents the preference for matching, not the actual skill level
