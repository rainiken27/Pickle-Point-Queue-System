-- Test script for unlimited time feature

-- Check if unlimited_time column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'players' AND column_name = 'unlimited_time';

-- Show all players and their unlimited_time status
SELECT id, name, unlimited_time
FROM players
ORDER BY name
LIMIT 10;

-- Example: Set unlimited time for a specific player (uncomment and update name to use)
-- UPDATE players SET unlimited_time = true WHERE name = 'Your Player Name Here';

-- Verify the change (uncomment after updating above)
-- SELECT id, name, unlimited_time FROM players WHERE unlimited_time = true;
