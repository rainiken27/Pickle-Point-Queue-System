-- Add unlimited_time column to players table
-- This allows certain players (staff, VIPs) to have sessions without time limits

ALTER TABLE players
ADD COLUMN IF NOT EXISTS unlimited_time BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN players.unlimited_time IS 'If true, player sessions will not be subject to time limits or expiration';
