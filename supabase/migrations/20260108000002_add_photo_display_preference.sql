-- Add photo display preference to sessions table
-- This allows players to choose whether to display their photo or initials during check-in

ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS display_photo BOOLEAN DEFAULT true;

-- Add comment for clarity
COMMENT ON COLUMN sessions.display_photo IS 'Whether to display the player photo (true) or initials (false) on screens during this session';

-- Update any NULL photo_url values to empty string before making it NOT NULL
-- This prevents migration failures in production where players might not have photos
UPDATE players 
SET photo_url = '' 
WHERE photo_url IS NULL;

-- Make photo_url NOT NULL (but allow empty string for players without photos)
ALTER TABLE players 
ALTER COLUMN photo_url SET NOT NULL,
ALTER COLUMN photo_url SET DEFAULT '';

-- ROLLBACK INSTRUCTIONS (manual):
-- To rollback: 
-- ALTER TABLE sessions DROP COLUMN display_photo;
-- ALTER TABLE players ALTER COLUMN photo_url DROP NOT NULL;