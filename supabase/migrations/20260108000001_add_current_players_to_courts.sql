-- Add current_players column to courts table to store player data during matches
-- This ensures match completion works even if player sessions expire

ALTER TABLE courts
ADD COLUMN IF NOT EXISTS current_players JSONB DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN courts.current_players IS 'Stores array of player objects currently playing on this court: [{"id": "uuid", "name": "string", "photo_url": "string"}]';

-- ROLLBACK INSTRUCTIONS (manual):
-- To rollback: ALTER TABLE courts DROP COLUMN current_players;