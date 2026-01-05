-- ============================================
-- CLEANUP TEST DATA
-- ============================================
-- This script removes all test players created
-- by seed.sql
-- ============================================

-- Temporarily disable RLS for cleanup
ALTER TABLE players DISABLE ROW LEVEL SECURITY;
ALTER TABLE player_preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE queue DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;

-- Delete test data (cascades to related tables)
DELETE FROM players WHERE name LIKE 'Test%';

-- Re-enable RLS
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Confirm cleanup
SELECT
  COUNT(*) AS remaining_test_players
FROM players
WHERE name LIKE 'Test%';
