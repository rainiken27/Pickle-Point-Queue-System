-- Add photo display preference to sessions table
-- This allows players to choose whether to display their photo or initials during check-in

ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS display_photo BOOLEAN DEFAULT true;

-- Add comment for clarity
COMMENT ON COLUMN sessions.display_photo IS 'Whether to display the player photo (true) or initials (false) on screens during this session';

-- Make photo_url required in players table (it should be provided during registration)
ALTER TABLE players 
ALTER COLUMN photo_url SET NOT NULL;

-- ROLLBACK INSTRUCTIONS (manual):
-- To rollback: 
-- ALTER TABLE sessions DROP COLUMN display_photo;
-- ALTER TABLE players ALTER COLUMN photo_url DROP NOT NULL;