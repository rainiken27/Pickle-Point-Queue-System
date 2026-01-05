-- ============================================
-- SCENARIO 1: Skill Preference Over Gender
-- WITH ACTUAL MATCH RESULTS
-- ============================================

-- BEGIN;

-- Ensure courts exist
INSERT INTO courts (court_number, building, status) VALUES
  (1, 'building_a', 'available'),
  (2, 'building_a', 'available'),
  (3, 'building_a', 'available'),
  (4, 'building_a', 'available')
ON CONFLICT (court_number, building) DO UPDATE SET status = 'available';

TRUNCATE queue CASCADE;
DELETE FROM player_preferences;
DELETE FROM sessions;

-- Start sessions for all test players in this scenario
INSERT INTO sessions (player_id, building, status, start_time) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'building_a', 'active', NOW()), -- Alice
('550e8400-e29b-41d4-a716-446655440002', 'building_a', 'active', NOW()), -- Bob
('550e8400-e29b-41d4-a716-446655440004', 'building_a', 'active', NOW()), -- David
('550e8400-e29b-41d4-a716-446655440005', 'building_a', 'active', NOW()), -- Emma
('550e8400-e29b-41d4-a716-446655440008', 'building_a', 'active', NOW()), -- Henry
('550e8400-e29b-41d4-a716-446655440009', 'building_a', 'active', NOW()), -- Isabel
('550e8400-e29b-41d4-a716-446655440013', 'building_a', 'active', NOW()), -- Maya
('550e8400-e29b-41d4-a716-446655440014', 'building_a', 'active', NOW()); -- Nathan

-- Set preferences
INSERT INTO player_preferences (player_id, skill_level_pref, gender_pref, match_type) VALUES
-- 4 players: beginner/novice skill level, mixed gender preferences
('550e8400-e29b-41d4-a716-446655440001', 'beginner', 'womens', 'solo'),  -- Alice (beginner, female)
('550e8400-e29b-41d4-a716-446655440002', 'beginner', 'mens', 'solo'),    -- Bob (beginner, male)
('550e8400-e29b-41d4-a716-446655440004', 'beginner', 'random', 'solo'),  -- David (novice, male)
('550e8400-e29b-41d4-a716-446655440005', 'beginner', 'random', 'solo'),  -- Emma (novice, female)

-- 4 players: intermediate/advanced skill level, mixed gender preferences
('550e8400-e29b-41d4-a716-446655440008', 'intermediate_advanced', 'mens', 'solo'),    -- Henry (intermediate, male)
('550e8400-e29b-41d4-a716-446655440009', 'intermediate_advanced', 'womens', 'solo'),  -- Isabel (intermediate, female)
('550e8400-e29b-41d4-a716-446655440013', 'intermediate_advanced', 'random', 'solo'),  -- Maya (advanced, female)
('550e8400-e29b-41d4-a716-446655440014', 'intermediate_advanced', 'random', 'solo'); -- Nathan (advanced, male)

-- Add to queue in INTERLEAVED order
INSERT INTO queue (player_id, building, status, position) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'building_a', 'waiting', 1), -- beginner
('550e8400-e29b-41d4-a716-446655440008', 'building_a', 'waiting', 2), -- intermediate
('550e8400-e29b-41d4-a716-446655440002', 'building_a', 'waiting', 3), -- beginner
('550e8400-e29b-41d4-a716-446655440009', 'building_a', 'waiting', 4), -- intermediate
('550e8400-e29b-41d4-a716-446655440004', 'building_a', 'waiting', 5), -- beginner (novice)
('550e8400-e29b-41d4-a716-446655440013', 'building_a', 'waiting', 6), -- advanced
('550e8400-e29b-41d4-a716-446655440005', 'building_a', 'waiting', 7), -- beginner (novice)
('550e8400-e29b-41d4-a716-446655440014', 'building_a', 'waiting', 8); -- advanced

-- ============================================
-- SHOW QUEUE STATE (BEFORE MATCHING)
-- ============================================
SELECT
  '📋 QUEUE STATE (Before Matching)' AS "═══════════════════════════════════";

SELECT
  q.position,
  p.name,
  p.skill_level AS actual_skill,
  pp.skill_level_pref AS wants_skill,
  pp.gender_pref AS wants_gender,
  p.gender
FROM queue q
JOIN players p ON q.player_id = p.id
JOIN player_preferences pp ON p.id = pp.player_id
ORDER BY q.position;

-- ============================================
-- SIMULATE MATCHMAKING LOGIC
-- ============================================
SELECT
  '🎯 SIMULATED MATCH (Top 4 by Skill Preference)' AS "═══════════════════════════════════";

-- This query simulates what the matchmaking algorithm should do
-- It groups players by skill preference and selects the top 4
WITH RankedPlayers AS (
  SELECT
    q.position,
    q.player_id,
    p.name,
    p.skill_level,
    pp.skill_level_pref,
    pp.gender_pref,
    p.gender,
    -- Score based on skill preference matching
    CASE
      WHEN pp.skill_level_pref = 'beginner' THEN 1
      WHEN pp.skill_level_pref = 'intermediate_advanced' THEN 2
      ELSE 3
    END AS skill_group,
    -- Count how many players want the same skill level
    COUNT(*) OVER (PARTITION BY pp.skill_level_pref) AS group_size,
    -- Rank within skill group by queue position
    ROW_NUMBER() OVER (PARTITION BY pp.skill_level_pref ORDER BY q.position) AS rank_in_group
  FROM queue q
  JOIN players p ON q.player_id = p.id
  JOIN player_preferences pp ON p.id = pp.player_id
  WHERE q.status = 'waiting'
)
SELECT
  position,
  name,
  skill_level AS actual_skill,
  skill_level_pref AS wants_skill,
  gender_pref AS wants_gender,
  gender,
  '✅ MATCH 1' AS match_number
FROM RankedPlayers
WHERE skill_group = (
  -- Find the skill group with 4+ players that comes first in queue
  SELECT skill_group
  FROM RankedPlayers
  WHERE group_size >= 4
  GROUP BY skill_group
  ORDER BY MIN(position)
  LIMIT 1
)
AND rank_in_group <= 4
ORDER BY position;

-- ============================================
-- EXPECTED RESULT VALIDATION
-- ============================================
SELECT
  '✅ EXPECTED MATCH' AS "═══════════════════════════════════";

SELECT
  'Alice, Bob, David, Emma' AS "Expected Players (all want beginner skill level)",
  'Skill preference groups them together despite mixed genders' AS "Why This Match";

SELECT
  '❌ WRONG MATCH WOULD BE' AS "═══════════════════════════════════";

SELECT
  'Alice + 3 other women from queue' AS "Wrong Match",
  'Gender should NOT override skill preference' AS "Why Wrong";

ROLLBACK;
