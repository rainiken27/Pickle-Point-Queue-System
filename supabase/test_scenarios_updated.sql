-- ============================================
-- UPDATED TEST SCENARIOS - Skill > Gender Priority
-- ============================================
-- New hierarchy: Groups > Time > SKILL > Gender > Variety
-- Run seed.sql first to load 20 test players
-- ============================================

-- SCENARIO 1: Skill Preference Over Gender
-- Expected: Skill-matched players cluster BEFORE gender-matched players
-- ============================================
BEGIN;

TRUNCATE queue CASCADE;
DELETE FROM player_preferences;
DELETE FROM sessions;

-- Start sessions for all test players
INSERT INTO sessions (player_id, building, status, start_time)
SELECT id, 'building_a', 'active', NOW()
FROM players LIMIT 8;

-- Set preferences: All want different gender matches, but same skill levels in groups
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

-- Add to queue in INTERLEAVED order (alternating skill levels)
INSERT INTO queue (player_id, building, status, position) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'building_a', 'waiting', 1), -- beginner
('550e8400-e29b-41d4-a716-446655440008', 'building_a', 'waiting', 2), -- intermediate
('550e8400-e29b-41d4-a716-446655440002', 'building_a', 'waiting', 3), -- beginner
('550e8400-e29b-41d4-a716-446655440009', 'building_a', 'waiting', 4), -- intermediate
('550e8400-e29b-41d4-a716-446655440004', 'building_a', 'waiting', 5), -- beginner (novice)
('550e8400-e29b-41d4-a716-446655440013', 'building_a', 'waiting', 6), -- advanced
('550e8400-e29b-41d4-a716-446655440005', 'building_a', 'waiting', 7), -- beginner (novice)
('550e8400-e29b-41d4-a716-446655440014', 'building_a', 'waiting', 8); -- advanced

SELECT
  q.position,
  p.name,
  p.skill_level AS actual_skill,
  pp.skill_level_pref AS wants_skill_level,
  pp.gender_pref AS wants_gender,
  p.gender
FROM queue q
JOIN players p ON q.player_id = p.id
JOIN player_preferences pp ON p.id = pp.player_id
ORDER BY q.position;

-- EXPECTED MATCH:
-- Alice (pos 1, beginner), Bob (pos 3, beginner), David (pos 5, novice), Emma (pos 7, novice)
-- All have "beginner" skill preference - they match FIRST even though genders are mixed

-- If you click "Call Next" again:
-- Henry (pos 2), Isabel (pos 4), Maya (pos 6), Nathan (pos 8)
-- All have "intermediate_advanced" preference

ROLLBACK;


-- ============================================
-- SCENARIO 2: Gender Matters WITHIN Skill Level
-- Expected: Same skill level + same gender preference = perfect match
-- ============================================
BEGIN;

TRUNCATE queue CASCADE;
DELETE FROM player_preferences;
DELETE FROM sessions;

INSERT INTO sessions (player_id, building, status, start_time)
SELECT id, 'building_a', 'active', NOW()
FROM players LIMIT 8;

-- All players want beginner/novice matches, but gender preferences differ
INSERT INTO player_preferences (player_id, skill_level_pref, gender_pref, match_type) VALUES
-- 4 beginner/novice females wanting women's only
('550e8400-e29b-41d4-a716-446655440001', 'beginner', 'womens', 'solo'), -- Alice (beginner, f)
('550e8400-e29b-41d4-a716-446655440003', 'beginner', 'womens', 'solo'), -- Carol (beginner, f)
('550e8400-e29b-41d4-a716-446655440005', 'beginner', 'womens', 'solo'), -- Emma (novice, f)
('550e8400-e29b-41d4-a716-446655440007', 'beginner', 'womens', 'solo'), -- Grace (novice, f)

-- 4 beginner/novice males wanting men's only
('550e8400-e29b-41d4-a716-446655440002', 'beginner', 'mens', 'solo'),  -- Bob (beginner, m)
('550e8400-e29b-41d4-a716-446655440004', 'beginner', 'mens', 'solo'),  -- David (novice, m)
('550e8400-e29b-41d4-a716-446655440006', 'beginner', 'mens', 'solo'),  -- Frank (novice, m)
('550e8400-e29b-41d4-a716-446655440019', 'beginner', 'mens', 'solo'); -- Sam (beginner, m)

-- Add to queue in random order
INSERT INTO queue (player_id, building, status, position) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'building_a', 'waiting', 1),
('550e8400-e29b-41d4-a716-446655440002', 'building_a', 'waiting', 2),
('550e8400-e29b-41d4-a716-446655440003', 'building_a', 'waiting', 3),
('550e8400-e29b-41d4-a716-446655440004', 'building_a', 'waiting', 4),
('550e8400-e29b-41d4-a716-446655440005', 'building_a', 'waiting', 5),
('550e8400-e29b-41d4-a716-446655440006', 'building_a', 'waiting', 6),
('550e8400-e29b-41d4-a716-446655440007', 'building_a', 'waiting', 7),
('550e8400-e29b-41d4-a716-446655440019', 'building_a', 'waiting', 8);

SELECT
  q.position,
  p.name,
  p.skill_level,
  pp.skill_level_pref,
  pp.gender_pref,
  p.gender
FROM queue q
JOIN players p ON q.player_id = p.id
JOIN player_preferences pp ON p.id = pp.player_id
ORDER BY q.position;

-- EXPECTED:
-- Match 1: Alice, Carol, Emma, Grace (all beginner skill + women's gender)
-- Match 2: Bob, David, Frank, Sam (all beginner skill + men's gender)

ROLLBACK;


-- ============================================
-- SCENARIO 3: CRITICAL TEST - Skill Beats Gender Across Levels
-- Expected: Skill preference overrides gender preference
-- ============================================
BEGIN;

TRUNCATE queue CASCADE;
DELETE FROM player_preferences;
DELETE FROM sessions;

INSERT INTO sessions (player_id, building, status, start_time)
SELECT id, 'building_a', 'active', NOW()
FROM players LIMIT 8;

-- Setup: Could form a perfect women's-only match OR perfect skill-level matches
INSERT INTO player_preferences (player_id, skill_level_pref, gender_pref, match_type) VALUES
-- 2 beginner females wanting women's only
('550e8400-e29b-41d4-a716-446655440001', 'beginner', 'womens', 'solo'), -- Alice (beginner, f)
('550e8400-e29b-41d4-a716-446655440003', 'beginner', 'womens', 'solo'), -- Carol (beginner, f)

-- 2 intermediate females wanting women's only
('550e8400-e29b-41d4-a716-446655440009', 'intermediate_advanced', 'womens', 'solo'), -- Isabel (int, f)
('550e8400-e29b-41d4-a716-446655440013', 'intermediate_advanced', 'womens', 'solo'), -- Maya (adv, f)

-- 2 beginner males wanting random
('550e8400-e29b-41d4-a716-446655440002', 'beginner', 'random', 'solo'), -- Bob (beginner, m)
('550e8400-e29b-41d4-a716-446655440004', 'beginner', 'random', 'solo'), -- David (novice, m)

-- 2 intermediate males wanting random
('550e8400-e29b-41d4-a716-446655440008', 'intermediate_advanced', 'random', 'solo'), -- Henry (int, m)
('550e8400-e29b-41d4-a716-446655440014', 'intermediate_advanced', 'random', 'solo'); -- Nathan (adv, m)

-- Add to queue - women first (to tempt a women's-only match)
INSERT INTO queue (player_id, building, status, position) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'building_a', 'waiting', 1), -- beginner f
('550e8400-e29b-41d4-a716-446655440003', 'building_a', 'waiting', 2), -- beginner f
('550e8400-e29b-41d4-a716-446655440009', 'building_a', 'waiting', 3), -- intermediate f
('550e8400-e29b-41d4-a716-446655440013', 'building_a', 'waiting', 4), -- advanced f
('550e8400-e29b-41d4-a716-446655440002', 'building_a', 'waiting', 5), -- beginner m
('550e8400-e29b-41d4-a716-446655440004', 'building_a', 'waiting', 6), -- novice m
('550e8400-e29b-41d4-a716-446655440008', 'building_a', 'waiting', 7), -- intermediate m
('550e8400-e29b-41d4-a716-446655440014', 'building_a', 'waiting', 8); -- advanced m

SELECT
  q.position,
  p.name,
  p.skill_level,
  pp.skill_level_pref,
  pp.gender_pref,
  p.gender
FROM queue q
JOIN players p ON q.player_id = p.id
JOIN player_preferences pp ON p.id = pp.player_id
ORDER BY q.position;

-- CRITICAL EXPECTED BEHAVIOR:
-- Match 1: Alice, Carol, Bob, David (all beginner skill preference)
--   Even though Alice+Carol want women's and could match with Isabel+Maya!
--   Skill preference wins over gender preference
--
-- Match 2: Isabel, Maya, Henry, Nathan (all intermediate/advanced skill preference)

ROLLBACK;


-- ============================================
-- SCENARIO 4: Friend Group Overrides Everything
-- Expected: Groups match before perfect solo skill/gender matches
-- ============================================
BEGIN;

TRUNCATE queue CASCADE;
DELETE FROM player_preferences;
DELETE FROM sessions;
DELETE FROM group_members WHERE group_id IN ('550e8400-e29b-41d4-a716-446655440100');
DELETE FROM groups WHERE id = '550e8400-e29b-41d4-a716-446655440100';

INSERT INTO sessions (player_id, building, status, start_time)
SELECT id, 'building_a', 'active', NOW()
FROM players LIMIT 10;

-- Create the friend group first
INSERT INTO groups (id, name) VALUES ('550e8400-e29b-41d4-a716-446655440100', 'Test Friend Group');

-- Add members to the group
INSERT INTO group_members (group_id, player_id) VALUES
('550e8400-e29b-41d4-a716-446655440100', '550e8400-e29b-41d4-a716-446655440001'), -- Alice
('550e8400-e29b-41d4-a716-446655440100', '550e8400-e29b-41d4-a716-446655440002'), -- Bob
('550e8400-e29b-41d4-a716-446655440100', '550e8400-e29b-41d4-a716-446655440004'), -- David
('550e8400-e29b-41d4-a716-446655440100', '550e8400-e29b-41d4-a716-446655440005'); -- Emma

INSERT INTO player_preferences (player_id, skill_level_pref, gender_pref, match_type) VALUES
-- 2 perfect solo advanced players (entered queue first!)
('550e8400-e29b-41d4-a716-446655440013', 'intermediate_advanced', 'womens', 'solo'), -- Maya (adv, f)
('550e8400-e29b-41d4-a716-446655440015', 'intermediate_advanced', 'womens', 'solo'), -- Olivia (adv, f)

-- Group of 4 beginners (mixed skills within group)
('550e8400-e29b-41d4-a716-446655440001', 'beginner', 'random', 'group'), -- Alice (beginner)
('550e8400-e29b-41d4-a716-446655440002', 'beginner', 'random', 'group'), -- Bob (beginner)
('550e8400-e29b-41d4-a716-446655440004', 'beginner', 'random', 'group'), -- David (novice)
('550e8400-e29b-41d4-a716-446655440005', 'beginner', 'random', 'group'), -- Emma (novice)

-- 2 more perfect solo advanced players (to complete potential match)
('550e8400-e29b-41d4-a716-446655440014', 'intermediate_advanced', 'random', 'solo'), -- Nathan (adv, m)
('550e8400-e29b-41d4-a716-446655440016', 'intermediate_advanced', 'random', 'solo'); -- Paul (adv, m)

-- Queue: solos FIRST, then group, then more solos (set group_id for group members)
INSERT INTO queue (player_id, building, status, position, group_id) VALUES
('550e8400-e29b-41d4-a716-446655440013', 'building_a', 'waiting', 1, NULL),
('550e8400-e29b-41d4-a716-446655440015', 'building_a', 'waiting', 2, NULL),
('550e8400-e29b-41d4-a716-446655440001', 'building_a', 'waiting', 3, '550e8400-e29b-41d4-a716-446655440100'),
('550e8400-e29b-41d4-a716-446655440002', 'building_a', 'waiting', 4, '550e8400-e29b-41d4-a716-446655440100'),
('550e8400-e29b-41d4-a716-446655440004', 'building_a', 'waiting', 5, '550e8400-e29b-41d4-a716-446655440100'),
('550e8400-e29b-41d4-a716-446655440005', 'building_a', 'waiting', 6, '550e8400-e29b-41d4-a716-446655440100'),
('550e8400-e29b-41d4-a716-446655440014', 'building_a', 'waiting', 7, NULL),
('550e8400-e29b-41d4-a716-446655440016', 'building_a', 'waiting', 8, NULL);

SELECT
  q.position,
  p.name,
  p.skill_level,
  CASE WHEN gm.group_id IS NOT NULL THEN 'GROUP' ELSE 'SOLO' END as type,
  g.name as group_name
FROM queue q
JOIN players p ON q.player_id = p.id
LEFT JOIN group_members gm ON p.id = gm.player_id
LEFT JOIN groups g ON gm.group_id = g.id
ORDER BY q.position;

-- EXPECTED:
-- Match 1: Alice, Bob, David, Emma (the GROUP - positions 3-6)
--   Even though Maya+Olivia entered queue first!
--   Friend groups have absolute priority
--
-- Match 2: Maya, Olivia, Nathan, Paul (the solos - positions 1,2,7,8)

ROLLBACK;


-- ============================================
-- SCENARIO 5: Complex Realistic Full Test
-- Expected: All priorities work together correctly
-- ============================================
BEGIN;

TRUNCATE queue CASCADE;
DELETE FROM player_preferences;
DELETE FROM sessions;
DELETE FROM group_members WHERE group_id IN ('550e8400-e29b-41d4-a716-446655440101');
DELETE FROM groups WHERE id = '550e8400-e29b-41d4-a716-446655440101';

INSERT INTO sessions (player_id, building, status, start_time) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'building_a', 'active', NOW()), -- Alice
('550e8400-e29b-41d4-a716-446655440003', 'building_a', 'active', NOW()), -- Carol
('550e8400-e29b-41d4-a716-446655440008', 'building_a', 'active', NOW()), -- Henry
('550e8400-e29b-41d4-a716-446655440009', 'building_a', 'active', NOW()), -- Isabel
('550e8400-e29b-41d4-a716-446655440013', 'building_a', 'active', NOW()), -- Maya
('550e8400-e29b-41d4-a716-446655440014', 'building_a', 'active', NOW()), -- Nathan
('550e8400-e29b-41d4-a716-446655440005', 'building_a', 'active', NOW()), -- Emma
('550e8400-e29b-41d4-a716-446655440007', 'building_a', 'active', NOW()), -- Grace
('550e8400-e29b-41d4-a716-446655440002', 'building_a', 'active', NOW()), -- Bob
('550e8400-e29b-41d4-a716-446655440004', 'building_a', 'active', NOW()), -- David
('550e8400-e29b-41d4-a716-446655440006', 'building_a', 'active', NOW()), -- Frank
('550e8400-e29b-41d4-a716-446655440019', 'building_a', 'active', NOW()), -- Sam
('550e8400-e29b-41d4-a716-446655440010', 'building_a', 'active', NOW()), -- Jack
('550e8400-e29b-41d4-a716-446655440011', 'building_a', 'active', NOW()), -- Karen
('550e8400-e29b-41d4-a716-446655440015', 'building_a', 'active', NOW()), -- Olivia
('550e8400-e29b-41d4-a716-446655440016', 'building_a', 'active', NOW()); -- Paul

-- Create the friend group first
INSERT INTO groups (id, name) VALUES ('550e8400-e29b-41d4-a716-446655440101', 'Complex Test Group');

-- Add members to the group
INSERT INTO group_members (group_id, player_id) VALUES
('550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440008'), -- Henry
('550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440009'), -- Isabel
('550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440013'), -- Maya
('550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440014'); -- Nathan

INSERT INTO player_preferences (player_id, skill_level_pref, gender_pref, match_type) VALUES
-- Positions 1-2: beginner females, women's only
('550e8400-e29b-41d4-a716-446655440001', 'beginner', 'womens', 'solo'), -- Alice
('550e8400-e29b-41d4-a716-446655440003', 'beginner', 'womens', 'solo'), -- Carol

-- Positions 3-6: GROUP of intermediate/advanced
('550e8400-e29b-41d4-a716-446655440008', 'intermediate_advanced', 'random', 'group'), -- Henry
('550e8400-e29b-41d4-a716-446655440009', 'intermediate_advanced', 'random', 'group'), -- Isabel
('550e8400-e29b-41d4-a716-446655440013', 'intermediate_advanced', 'random', 'group'), -- Maya
('550e8400-e29b-41d4-a716-446655440014', 'intermediate_advanced', 'random', 'group'), -- Nathan

-- Positions 7-8: beginner females, women's only (to complete first match after group)
('550e8400-e29b-41d4-a716-446655440005', 'beginner', 'womens', 'solo'), -- Emma
('550e8400-e29b-41d4-a716-446655440007', 'beginner', 'womens', 'solo'), -- Grace

-- Positions 9-12: beginner males, men's only
('550e8400-e29b-41d4-a716-446655440002', 'beginner', 'mens', 'solo'),  -- Bob
('550e8400-e29b-41d4-a716-446655440004', 'beginner', 'mens', 'solo'),  -- David
('550e8400-e29b-41d4-a716-446655440006', 'beginner', 'mens', 'solo'),  -- Frank
('550e8400-e29b-41d4-a716-446655440019', 'beginner', 'mens', 'solo'), -- Sam

-- Positions 13-16: intermediate/advanced random
('550e8400-e29b-41d4-a716-446655440010', 'intermediate_advanced', 'random', 'solo'), -- Jack
('550e8400-e29b-41d4-a716-446655440011', 'intermediate_advanced', 'random', 'solo'), -- Karen
('550e8400-e29b-41d4-a716-446655440015', 'intermediate_advanced', 'random', 'solo'), -- Olivia
('550e8400-e29b-41d4-a716-446655440016', 'intermediate_advanced', 'random', 'solo'); -- Paul

-- Add players to queue (set group_id for group members)
INSERT INTO queue (player_id, building, status, position, group_id) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'building_a', 'waiting', 1, NULL),
('550e8400-e29b-41d4-a716-446655440003', 'building_a', 'waiting', 2, NULL),
('550e8400-e29b-41d4-a716-446655440008', 'building_a', 'waiting', 3, '550e8400-e29b-41d4-a716-446655440101'),
('550e8400-e29b-41d4-a716-446655440009', 'building_a', 'waiting', 4, '550e8400-e29b-41d4-a716-446655440101'),
('550e8400-e29b-41d4-a716-446655440013', 'building_a', 'waiting', 5, '550e8400-e29b-41d4-a716-446655440101'),
('550e8400-e29b-41d4-a716-446655440014', 'building_a', 'waiting', 6, '550e8400-e29b-41d4-a716-446655440101'),
('550e8400-e29b-41d4-a716-446655440005', 'building_a', 'waiting', 7, NULL),
('550e8400-e29b-41d4-a716-446655440007', 'building_a', 'waiting', 8, NULL),
('550e8400-e29b-41d4-a716-446655440002', 'building_a', 'waiting', 9, NULL),
('550e8400-e29b-41d4-a716-446655440004', 'building_a', 'waiting', 10, NULL),
('550e8400-e29b-41d4-a716-446655440006', 'building_a', 'waiting', 11, NULL),
('550e8400-e29b-41d4-a716-446655440019', 'building_a', 'waiting', 12, NULL),
('550e8400-e29b-41d4-a716-446655440010', 'building_a', 'waiting', 13, NULL),
('550e8400-e29b-41d4-a716-446655440011', 'building_a', 'waiting', 14, NULL),
('550e8400-e29b-41d4-a716-446655440015', 'building_a', 'waiting', 15, NULL),
('550e8400-e29b-41d4-a716-446655440016', 'building_a', 'waiting', 16, NULL);

SELECT
  q.position,
  p.name,
  p.skill_level,
  pp.skill_level_pref,
  pp.gender_pref,
  q.group_id as queue_group_id,
  CASE WHEN q.group_id IS NOT NULL THEN 'GROUP' ELSE 'SOLO' END as type,
  g.name as group_name
FROM queue q
JOIN players p ON q.player_id = p.id
JOIN player_preferences pp ON p.id = pp.player_id
LEFT JOIN groups g ON q.group_id = g.id
ORDER BY q.position;

-- EXPECTED MATCHING ORDER:
-- 1st: Positions 3-6 (Henry, Isabel, Maya, Nathan) - GROUP wins!
-- 2nd: Positions 1,2,7,8 (Alice, Carol, Emma, Grace) - beginner skill + women's gender
-- 3rd: Positions 9-12 (Bob, David, Frank, Sam) - beginner skill + men's gender
-- 4th: Positions 13-16 (Jack, Karen, Olivia, Paul) - int/adv skill + random gender

ROLLBACK;
