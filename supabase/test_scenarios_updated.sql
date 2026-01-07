-- ============================================
-- CLEAN TEST SCENARIOS - Essential Tables Only
-- ============================================
-- Hierarchy: Groups > Time > SKILL > Gender > Variety
-- Uses only: players, sessions, queue, player_preferences, groups, group_members, courts
-- No building references (facility treated as monolith)
-- ============================================

-- SCENARIO 1: Skill Preference Over Gender
-- Expected: Skill-matched players cluster BEFORE gender-matched players
-- ============================================
BEGIN;

TRUNCATE queue CASCADE;
DELETE FROM player_preferences;
DELETE FROM sessions;

-- Start sessions for all test players
INSERT INTO sessions (player_id, status, start_time)
SELECT id, 'active', NOW()
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
INSERT INTO queue (player_id, status, position) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'waiting', 1), -- beginner
('550e8400-e29b-41d4-a716-446655440008', 'waiting', 2), -- intermediate
('550e8400-e29b-41d4-a716-446655440002', 'waiting', 3), -- beginner
('550e8400-e29b-41d4-a716-446655440009', 'waiting', 4), -- intermediate
('550e8400-e29b-41d4-a716-446655440004', 'waiting', 5), -- beginner (novice)
('550e8400-e29b-41d4-a716-446655440013', 'waiting', 6), -- advanced
('550e8400-e29b-41d4-a716-446655440005', 'waiting', 7), -- beginner (novice)
('550e8400-e29b-41d4-a716-446655440014', 'waiting', 8); -- advanced

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

ROLLBACK;


-- ============================================
-- SCENARIO 2: Gender Matters WITHIN Skill Level
-- Expected: Same skill level + same gender preference = perfect match
-- ============================================
BEGIN;

TRUNCATE queue CASCADE;
DELETE FROM player_preferences;
DELETE FROM sessions;

INSERT INTO sessions (player_id, status, start_time)
SELECT id, 'active', NOW()
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
INSERT INTO queue (player_id, status, position) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'waiting', 1),
('550e8400-e29b-41d4-a716-446655440002', 'waiting', 2),
('550e8400-e29b-41d4-a716-446655440003', 'waiting', 3),
('550e8400-e29b-41d4-a716-446655440004', 'waiting', 4),
('550e8400-e29b-41d4-a716-446655440005', 'waiting', 5),
('550e8400-e29b-41d4-a716-446655440006', 'waiting', 6),
('550e8400-e29b-41d4-a716-446655440007', 'waiting', 7),
('550e8400-e29b-41d4-a716-446655440019', 'waiting', 8);

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
-- SCENARIO 3: Friend Group Overrides Everything
-- Expected: Groups match before perfect solo skill/gender matches
-- ============================================
BEGIN;

TRUNCATE queue CASCADE;
DELETE FROM player_preferences;
DELETE FROM sessions;
DELETE FROM group_members WHERE group_id IN ('550e8400-e29b-41d4-a716-446655440100');
DELETE FROM groups WHERE id = '550e8400-e29b-41d4-a716-446655440100';

INSERT INTO sessions (player_id, status, start_time)
SELECT id, 'active', NOW()
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
INSERT INTO queue (player_id, status, position, group_id) VALUES
('550e8400-e29b-41d4-a716-446655440013', 'waiting', 1, NULL),
('550e8400-e29b-41d4-a716-446655440015', 'waiting', 2, NULL),
('550e8400-e29b-41d4-a716-446655440001', 'waiting', 3, '550e8400-e29b-41d4-a716-446655440100'),
('550e8400-e29b-41d4-a716-446655440002', 'waiting', 4, '550e8400-e29b-41d4-a716-446655440100'),
('550e8400-e29b-41d4-a716-446655440004', 'waiting', 5, '550e8400-e29b-41d4-a716-446655440100'),
('550e8400-e29b-41d4-a716-446655440005', 'waiting', 6, '550e8400-e29b-41d4-a716-446655440100'),
('550e8400-e29b-41d4-a716-446655440014', 'waiting', 7, NULL),
('550e8400-e29b-41d4-a716-446655440016', 'waiting', 8, NULL);

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

ROLLBACK;


-- ============================================
-- SCENARIO 4: Complex Realistic Full Test
-- Expected: All priorities work together correctly
-- ============================================
BEGIN;

TRUNCATE queue CASCADE;
DELETE FROM player_preferences;
DELETE FROM sessions;
DELETE FROM group_members WHERE group_id IN ('550e8400-e29b-41d4-a716-446655440101');
DELETE FROM groups WHERE id = '550e8400-e29b-41d4-a716-446655440101';

INSERT INTO sessions (player_id, status, start_time) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'active', NOW()), -- Alice
('550e8400-e29b-41d4-a716-446655440003', 'active', NOW()), -- Carol
('550e8400-e29b-41d4-a716-446655440008', 'active', NOW()), -- Henry
('550e8400-e29b-41d4-a716-446655440009', 'active', NOW()), -- Isabel
('550e8400-e29b-41d4-a716-446655440013', 'active', NOW()), -- Maya
('550e8400-e29b-41d4-a716-446655440014', 'active', NOW()), -- Nathan
('550e8400-e29b-41d4-a716-446655440005', 'active', NOW()), -- Emma
('550e8400-e29b-41d4-a716-446655440007', 'active', NOW()), -- Grace
('550e8400-e29b-41d4-a716-446655440002', 'active', NOW()), -- Bob
('550e8400-e29b-41d4-a716-446655440004', 'active', NOW()), -- David
('550e8400-e29b-41d4-a716-446655440006', 'active', NOW()), -- Frank
('550e8400-e29b-41d4-a716-446655440019', 'active', NOW()), -- Sam
('550e8400-e29b-41d4-a716-446655440010', 'active', NOW()), -- Jack
('550e8400-e29b-41d4-a716-446655440011', 'active', NOW()), -- Karen
('550e8400-e29b-41d4-a716-446655440015', 'active', NOW()), -- Olivia
('550e8400-e29b-41d4-a716-446655440016', 'active', NOW()); -- Paul

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
INSERT INTO queue (player_id, status, position, group_id) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'waiting', 1, NULL),
('550e8400-e29b-41d4-a716-446655440003', 'waiting', 2, NULL),
('550e8400-e29b-41d4-a716-446655440008', 'waiting', 3, '550e8400-e29b-41d4-a716-446655440101'),
('550e8400-e29b-41d4-a716-446655440009', 'waiting', 4, '550e8400-e29b-41d4-a716-446655440101'),
('550e8400-e29b-41d4-a716-446655440013', 'waiting', 5, '550e8400-e29b-41d4-a716-446655440101'),
('550e8400-e29b-41d4-a716-446655440014', 'waiting', 6, '550e8400-e29b-41d4-a716-446655440101'),
('550e8400-e29b-41d4-a716-446655440005', 'waiting', 7, NULL),
('550e8400-e29b-41d4-a716-446655440007', 'waiting', 8, NULL),
('550e8400-e29b-41d4-a716-446655440002', 'waiting', 9, NULL),
('550e8400-e29b-41d4-a716-446655440004', 'waiting', 10, NULL),
('550e8400-e29b-41d4-a716-446655440006', 'waiting', 11, NULL),
('550e8400-e29b-41d4-a716-446655440019', 'waiting', 12, NULL),
('550e8400-e29b-41d4-a716-446655440010', 'waiting', 13, NULL),
('550e8400-e29b-41d4-a716-446655440011', 'waiting', 14, NULL),
('550e8400-e29b-41d4-a716-446655440015', 'waiting', 15, NULL),
('550e8400-e29b-41d4-a716-446655440016', 'waiting', 16, NULL);

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