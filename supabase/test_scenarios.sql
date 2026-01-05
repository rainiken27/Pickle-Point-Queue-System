-- ============================================
-- MATCHMAKING HIERARCHY TEST SCENARIOS
-- ============================================
-- This file sets up specific queue scenarios to test matchmaking priority hierarchy:
-- 1. Friend Groups (highest priority)
-- 2. Gender Preference (mens/womens/mixed/random)
-- 3. Skill Level Preference (beginner/novice vs intermediate/advanced)
-- 4. Queue Position (FIFO)
-- ============================================

-- First, run the main seed.sql to get the 20 test players
-- Then run these scenarios one at a time to test different cases

-- ============================================
-- SCENARIO 1: Test Friend Group Priority
-- Expected: Groups should match before solo players even if solo players joined first
-- ============================================
BEGIN;

-- Clear queue
TRUNCATE queue CASCADE;

-- Start sessions for all players
INSERT INTO sessions (player_id, building, status, start_time)
SELECT id, 'building_a', 'active', NOW()
FROM players LIMIT 8;

-- Add 2 solo players first (position 1, 2)
INSERT INTO queue (player_id, building, status, position, group_id)
VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'building_a', 'waiting', 1, NULL), -- Alice (beginner, female)
  ('550e8400-e29b-41d4-a716-446655440002', 'building_a', 'waiting', 2, NULL); -- Bob (beginner, male)

-- Add a 4-person group (position 3-6)
INSERT INTO queue (player_id, building, status, position, group_id)
VALUES
  ('550e8400-e29b-41d4-a716-446655440003', 'building_a', 'waiting', 3, 'group-001'), -- Carol (beginner, female)
  ('550e8400-e29b-41d4-a716-446655440004', 'building_a', 'waiting', 4, 'group-001'), -- David (novice, male)
  ('550e8400-e29b-41d4-a716-446655440005', 'building_a', 'waiting', 5, 'group-001'), -- Emma (novice, female)
  ('550e8400-e29b-41d4-a716-446655440006', 'building_a', 'waiting', 6, 'group-001'); -- Frank (novice, male)

-- Add 2 more solo players (position 7, 8)
INSERT INTO queue (player_id, building, status, position, group_id)
VALUES
  ('550e8400-e29b-41d4-a716-446655440007', 'building_a', 'waiting', 7, NULL), -- Grace (novice, female)
  ('550e8400-e29b-41d4-a716-446655440008', 'building_a', 'waiting', 8, NULL); -- Henry (intermediate, male)

-- View queue
SELECT
  q.position,
  p.name,
  p.skill_level,
  p.gender,
  q.group_id,
  CASE WHEN q.group_id IS NOT NULL THEN 'GROUP' ELSE 'SOLO' END as type
FROM queue q
JOIN players p ON q.player_id = p.id
ORDER BY q.position;

-- EXPECTED BEHAVIOR:
-- When a court becomes available, the 4-person group (Carol, David, Emma, Frank)
-- should match FIRST even though Alice and Bob joined earlier
-- This tests friend group priority

ROLLBACK; -- Don't commit, just testing


-- ============================================
-- SCENARIO 2: Test Gender Preference Matching
-- Expected: Gender-specific preferences should match over random
-- ============================================
BEGIN;

TRUNCATE queue CASCADE;
DELETE FROM player_preferences;

-- Start sessions
INSERT INTO sessions (player_id, building, status, start_time)
SELECT id, 'building_a', 'active', NOW()
FROM players LIMIT 12;

-- Set specific gender preferences
INSERT INTO player_preferences (player_id, skill_level_pref, gender_pref, match_type) VALUES
-- 4 players want women's only
('550e8400-e29b-41d4-a716-446655440001', 'beginner', 'womens', 'solo'), -- Alice (female)
('550e8400-e29b-41d4-a716-446655440003', 'beginner', 'womens', 'solo'), -- Carol (female)
('550e8400-e29b-41d4-a716-446655440005', 'beginner', 'womens', 'solo'), -- Emma (female)
('550e8400-e29b-41d4-a716-446655440007', 'beginner', 'womens', 'solo'), -- Grace (female)

-- 4 players want men's only
('550e8400-e29b-41d4-a716-446655440002', 'beginner', 'mens', 'solo'), -- Bob (male)
('550e8400-e29b-41d4-a716-446655440004', 'beginner', 'mens', 'solo'), -- David (male)
('550e8400-e29b-41d4-a716-446655440006', 'beginner', 'mens', 'solo'), -- Frank (male)
('550e8400-e29b-41d4-a716-446655440008', 'intermediate_advanced', 'mens', 'solo'), -- Henry (male)

-- 4 players want random
('550e8400-e29b-41d4-a716-446655440009', 'intermediate_advanced', 'random', 'solo'), -- Isabel (female)
('550e8400-e29b-41d4-a716-446655440010', 'intermediate_advanced', 'random', 'solo'), -- Jack (male)
('550e8400-e29b-41d4-a716-446655440011', 'intermediate_advanced', 'random', 'solo'), -- Karen (female)
('550e8400-e29b-41d4-a716-446655440012', 'intermediate_advanced', 'random', 'solo'); -- Leo (male)

-- Add everyone to queue in interleaved order
INSERT INTO queue (player_id, building, status, position)
SELECT id, 'building_a', 'waiting', ROW_NUMBER() OVER (ORDER BY random())
FROM players
WHERE id IN (
  '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004',
  '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440006',
  '550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440008',
  '550e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440010',
  '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440012'
);

-- View queue with preferences
SELECT
  q.position,
  p.name,
  p.gender,
  p.skill_level,
  pp.gender_pref,
  pp.skill_level_pref
FROM queue q
JOIN players p ON q.player_id = p.id
JOIN player_preferences pp ON p.id = pp.player_id
ORDER BY q.position;

-- EXPECTED BEHAVIOR:
-- 1st match: Alice, Carol, Emma, Grace (all women's only - should match together)
-- 2nd match: Bob, David, Frank, Henry (all men's only - should match together)
-- 3rd match: Isabel, Jack, Karen, Leo (all random - should match together)

ROLLBACK;


-- ============================================
-- SCENARIO 3: Test Skill Level Preference
-- Expected: Skill-matched preferences should prioritize over mismatched
-- ============================================
BEGIN;

TRUNCATE queue CASCADE;
DELETE FROM player_preferences;

-- Start sessions
INSERT INTO sessions (player_id, building, status, start_time)
SELECT id, 'building_a', 'active', NOW()
FROM players LIMIT 12;

-- Set specific skill preferences
INSERT INTO player_preferences (player_id, skill_level_pref, gender_pref, match_type) VALUES
-- 4 beginner/novice players wanting beginner matches
('550e8400-e29b-41d4-a716-446655440001', 'beginner', 'random', 'solo'), -- Alice (beginner)
('550e8400-e29b-41d4-a716-446655440002', 'beginner', 'random', 'solo'), -- Bob (beginner)
('550e8400-e29b-41d4-a716-446655440004', 'beginner', 'random', 'solo'), -- David (novice)
('550e8400-e29b-41d4-a716-446655440005', 'beginner', 'random', 'solo'), -- Emma (novice)

-- 4 intermediate/advanced players wanting int/adv matches
('550e8400-e29b-41d4-a716-446655440008', 'intermediate_advanced', 'random', 'solo'), -- Henry (intermediate)
('550e8400-e29b-41d4-a716-446655440009', 'intermediate_advanced', 'random', 'solo'), -- Isabel (intermediate)
('550e8400-e29b-41d4-a716-446655440013', 'intermediate_advanced', 'random', 'solo'), -- Maya (advanced)
('550e8400-e29b-41d4-a716-446655440014', 'intermediate_advanced', 'random', 'solo'), -- Nathan (advanced)

-- 4 players with mismatched preferences (advanced players wanting beginner matches - shouldn't happen in real world but tests edge case)
('550e8400-e29b-41d4-a716-446655440015', 'beginner', 'random', 'solo'), -- Olivia (advanced - wants beginner)
('550e8400-e29b-41d4-a716-446655440016', 'beginner', 'random', 'solo'), -- Paul (advanced - wants beginner)
('550e8400-e29b-41d4-a716-446655440010', 'intermediate_advanced', 'random', 'solo'), -- Jack (intermediate)
('550e8400-e29b-41d4-a716-446655440011', 'intermediate_advanced', 'random', 'solo'); -- Karen (intermediate)

-- Add to queue in interleaved order
INSERT INTO queue (player_id, building, status, position)
SELECT id, 'building_a', 'waiting', ROW_NUMBER() OVER (ORDER BY random())
FROM players
WHERE id IN (
  '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440005',
  '550e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440009',
  '550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440014',
  '550e8400-e29b-41d4-a716-446655440015', '550e8400-e29b-41d4-a716-446655440016',
  '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440011'
);

-- View queue
SELECT
  q.position,
  p.name,
  p.skill_level as actual_skill,
  pp.skill_level_pref as wants_to_play_with
FROM queue q
JOIN players p ON q.player_id = p.id
JOIN player_preferences pp ON p.id = pp.player_id
ORDER BY q.position;

-- EXPECTED BEHAVIOR:
-- 1st match: Alice, Bob, David, Emma (all beginner/novice actual + beginner pref)
-- 2nd match: Henry, Isabel, Maya, Nathan (all int/adv actual + int/adv pref)
-- 3rd match: Jack, Karen, Olivia, Paul (remaining players - mixed)

ROLLBACK;


-- ============================================
-- SCENARIO 4: Complex Mixed Priorities
-- Expected: Groups > Gender > Skill > Queue Position
-- ============================================
BEGIN;

TRUNCATE queue CASCADE;
DELETE FROM player_preferences;

-- Start sessions
INSERT INTO sessions (player_id, building, status, start_time)
SELECT id, 'building_a', 'active', NOW()
FROM players LIMIT 16;

-- Set varied preferences
INSERT INTO player_preferences (player_id, skill_level_pref, gender_pref, match_type) VALUES
-- Position 1-2: Solo players, women's only, beginner
('550e8400-e29b-41d4-a716-446655440001', 'beginner', 'womens', 'solo'), -- Alice (beginner, female)
('550e8400-e29b-41d4-a716-446655440003', 'beginner', 'womens', 'solo'), -- Carol (beginner, female)

-- Position 3-6: GROUP of 4, random gender, mixed skill
('550e8400-e29b-41d4-a716-446655440008', 'intermediate_advanced', 'random', 'group'), -- Henry (intermediate, male)
('550e8400-e29b-41d4-a716-446655440009', 'intermediate_advanced', 'random', 'group'), -- Isabel (intermediate, female)
('550e8400-e29b-41d4-a716-446655440013', 'intermediate_advanced', 'random', 'group'), -- Maya (advanced, female)
('550e8400-e29b-41d4-a716-446655440014', 'intermediate_advanced', 'random', 'group'), -- Nathan (advanced, male)

-- Position 7-8: Solo players, women's only, beginner (to complete first match)
('550e8400-e29b-41d4-a716-446655440005', 'beginner', 'womens', 'solo'), -- Emma (novice, female)
('550e8400-e29b-41d4-a716-446655440007', 'beginner', 'womens', 'solo'), -- Grace (novice, female)

-- Position 9-12: Solo players, men's only, beginner
('550e8400-e29b-41d4-a716-446655440002', 'beginner', 'mens', 'solo'), -- Bob (beginner, male)
('550e8400-e29b-41d4-a716-446655440004', 'beginner', 'mens', 'solo'), -- David (novice, male)
('550e8400-e29b-41d4-a716-446655440006', 'beginner', 'mens', 'solo'), -- Frank (novice, male)
('550e8400-e29b-41d4-a716-446655440019', 'beginner', 'mens', 'solo'), -- Sam (beginner, male)

-- Position 13-16: Solo players, random
('550e8400-e29b-41d4-a716-446655440010', 'intermediate_advanced', 'random', 'solo'), -- Jack (intermediate, male)
('550e8400-e29b-41d4-a716-446655440011', 'intermediate_advanced', 'random', 'solo'), -- Karen (intermediate, female)
('550e8400-e29b-41d4-a716-446655440015', 'intermediate_advanced', 'random', 'solo'), -- Olivia (advanced, female)
('550e8400-e29b-41d4-a716-446655440016', 'intermediate_advanced', 'random', 'solo'); -- Paul (advanced, male)

-- Add to queue in the order specified above
INSERT INTO queue (player_id, building, status, position, group_id) VALUES
-- Solo positions 1-2
('550e8400-e29b-41d4-a716-446655440001', 'building_a', 'waiting', 1, NULL),
('550e8400-e29b-41d4-a716-446655440003', 'building_a', 'waiting', 2, NULL),
-- Group positions 3-6
('550e8400-e29b-41d4-a716-446655440008', 'building_a', 'waiting', 3, 'group-complex'),
('550e8400-e29b-41d4-a716-446655440009', 'building_a', 'waiting', 4, 'group-complex'),
('550e8400-e29b-41d4-a716-446655440013', 'building_a', 'waiting', 5, 'group-complex'),
('550e8400-e29b-41d4-a716-446655440014', 'building_a', 'waiting', 6, 'group-complex'),
-- Solo positions 7-8
('550e8400-e29b-41d4-a716-446655440005', 'building_a', 'waiting', 7, NULL),
('550e8400-e29b-41d4-a716-446655440007', 'building_a', 'waiting', 8, NULL),
-- Solo positions 9-12
('550e8400-e29b-41d4-a716-446655440002', 'building_a', 'waiting', 9, NULL),
('550e8400-e29b-41d4-a716-446655440004', 'building_a', 'waiting', 10, NULL),
('550e8400-e29b-41d4-a716-446655440006', 'building_a', 'waiting', 11, NULL),
('550e8400-e29b-41d4-a716-446655440019', 'building_a', 'waiting', 12, NULL),
-- Solo positions 13-16
('550e8400-e29b-41d4-a716-446655440010', 'building_a', 'waiting', 13, NULL),
('550e8400-e29b-41d4-a716-446655440011', 'building_a', 'waiting', 14, NULL),
('550e8400-e29b-41d4-a716-446655440015', 'building_a', 'waiting', 15, NULL),
('550e8400-e29b-41d4-a716-446655440016', 'building_a', 'waiting', 16, NULL);

-- View the queue
SELECT
  q.position,
  p.name,
  p.skill_level,
  p.gender,
  pp.skill_level_pref,
  pp.gender_pref,
  CASE WHEN q.group_id IS NOT NULL THEN 'GROUP' ELSE 'SOLO' END as type
FROM queue q
JOIN players p ON q.player_id = p.id
JOIN player_preferences pp ON p.id = pp.player_id
ORDER BY q.position;

-- EXPECTED BEHAVIOR:
-- 1st match: Henry, Isabel, Maya, Nathan (GROUP - highest priority, positions 3-6)
-- 2nd match: Alice, Carol, Emma, Grace (women's only, beginner - positions 1,2,7,8)
-- 3rd match: Bob, David, Frank, Sam (men's only, beginner - positions 9-12)
-- 4th match: Jack, Karen, Olivia, Paul (random, int/adv - positions 13-16)

ROLLBACK;


-- ============================================
-- SCENARIO 5: Edge Case - Not Enough Players for Perfect Match
-- Expected: Should fall back to best available match
-- ============================================
BEGIN;

TRUNCATE queue CASCADE;
DELETE FROM player_preferences;

-- Start sessions
INSERT INTO sessions (player_id, building, status, start_time)
SELECT id, 'building_a', 'active', NOW()
FROM players LIMIT 6;

-- Set preferences
INSERT INTO player_preferences (player_id, skill_level_pref, gender_pref, match_type) VALUES
-- 3 players want women's only
('550e8400-e29b-41d4-a716-446655440001', 'beginner', 'womens', 'solo'), -- Alice (female)
('550e8400-e29b-41d4-a716-446655440003', 'beginner', 'womens', 'solo'), -- Carol (female)
('550e8400-e29b-41d4-a716-446655440005', 'beginner', 'womens', 'solo'), -- Emma (female)

-- 3 players with random preference (mixed genders)
('550e8400-e29b-41d4-a716-446655440002', 'beginner', 'random', 'solo'), -- Bob (male)
('550e8400-e29b-41d4-a716-446655440004', 'beginner', 'random', 'solo'), -- David (male)
('550e8400-e29b-41d4-a716-446655440007', 'beginner', 'random', 'solo'); -- Grace (female)

-- Add to queue
INSERT INTO queue (player_id, building, status, position) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'building_a', 'waiting', 1),
('550e8400-e29b-41d4-a716-446655440003', 'building_a', 'waiting', 2),
('550e8400-e29b-41d4-a716-446655440005', 'building_a', 'waiting', 3),
('550e8400-e29b-41d4-a716-446655440002', 'building_a', 'waiting', 4),
('550e8400-e29b-41d4-a716-446655440004', 'building_a', 'waiting', 5),
('550e8400-e29b-41d4-a716-446655440007', 'building_a', 'waiting', 6);

-- View queue
SELECT
  q.position,
  p.name,
  p.gender,
  pp.gender_pref
FROM queue q
JOIN players p ON q.player_id = p.id
JOIN player_preferences pp ON p.id = pp.player_id
ORDER BY q.position;

-- EXPECTED BEHAVIOR:
-- Only 3 women want women's only (need 4 for a match)
-- Should match: Alice, Carol, Emma, Grace (3 womens + 1 random female)
-- OR wait for a 4th women's-only player

ROLLBACK;
