# Complete Manual Testing Guide
## Matchmaking Algorithm + Group Management

This guide covers manual testing for:
1. **Matchmaking Algorithm** (17 scenarios)
2. **Group Management** (11 scenarios)

---

# PART 1: MATCHMAKING ALGORITHM TESTS

## How to Run Matchmaking Tests

1. Open Supabase Studio: http://127.0.0.1:54323
2. Go to SQL Editor
3. Copy and paste each test below
4. Click "Run"
5. Verify the results

---

## SCENARIO 1: Skill Preference Over Gender (Priority Test)

**Objective**: Verify skill level has higher priority than gender preference

```sql
BEGIN;

TRUNCATE queue CASCADE;
DELETE FROM player_preferences;
DELETE FROM sessions;

-- Start sessions for 8 test players
INSERT INTO sessions (player_id, building, status, start_time)
SELECT id, 'building_a', 'active', NOW()
FROM players
WHERE id IN (
  '550e8400-e29b-41d4-a716-446655440001', -- Alice
  '550e8400-e29b-41d4-a716-446655440002', -- Bob
  '550e8400-e29b-41d4-a716-446655440003', -- Carol
  '550e8400-e29b-41d4-a716-446655440008', -- Henry
  '550e8400-e29b-41d4-a716-446655440009', -- Isabel
  '550e8400-e29b-41d4-a716-446655440010', -- Jack
  '550e8400-e29b-41d4-a716-446655440011', -- Karen
  '550e8400-e29b-41d4-a716-446655440020'  -- Tina
);

-- Set preferences: 4 beginners want different genders, 4 intermediates want different genders
INSERT INTO player_preferences (player_id, skill_level_pref, gender_pref, match_type) VALUES
-- Beginners with mixed gender preferences
('550e8400-e29b-41d4-a716-446655440001', 'beginner', 'womens', 'solo'),  -- Alice (beginner F)
('550e8400-e29b-41d4-a716-446655440002', 'beginner', 'mens', 'solo'),    -- Bob (beginner M)
('550e8400-e29b-41d4-a716-446655440003', 'beginner', 'random', 'solo'),  -- Carol (beginner F)
('550e8400-e29b-41d4-a716-446655440020', 'beginner', 'random', 'solo'),  -- Tina (beginner F)

-- Intermediates with mixed gender preferences
('550e8400-e29b-41d4-a716-446655440008', 'intermediate_advanced', 'mens', 'solo'),    -- Henry (intermediate M)
('550e8400-e29b-41d4-a716-446655440009', 'intermediate_advanced', 'womens', 'solo'),  -- Isabel (intermediate F)
('550e8400-e29b-41d4-a716-446655440010', 'intermediate_advanced', 'random', 'solo'),  -- Jack (intermediate M)
('550e8400-e29b-41d4-a716-446655440011', 'intermediate_advanced', 'random', 'solo'); -- Karen (intermediate F)

-- Add to queue in INTERLEAVED order (alternating skill levels)
INSERT INTO queue (player_id, building, status, position) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'building_a', 'waiting', 1), -- Alice beginner F
('550e8400-e29b-41d4-a716-446655440008', 'building_a', 'waiting', 2), -- Henry intermediate M
('550e8400-e29b-41d4-a716-446655440002', 'building_a', 'waiting', 3), -- Bob beginner M
('550e8400-e29b-41d4-a716-446655440009', 'building_a', 'waiting', 4), -- Isabel intermediate F
('550e8400-e29b-41d4-a716-446655440003', 'building_a', 'waiting', 5), -- Carol beginner F
('550e8400-e29b-41d4-a716-446655440010', 'building_a', 'waiting', 6), -- Jack intermediate M
('550e8400-e29b-41d4-a716-446655440020', 'building_a', 'waiting', 7), -- Tina beginner F
('550e8400-e29b-41d4-a716-446655440011', 'building_a', 'waiting', 8); -- Karen intermediate F

-- View current queue
SELECT
  q.position,
  p.name,
  p.skill_level,
  p.gender,
  pr.skill_level_pref,
  pr.gender_pref
FROM queue q
JOIN players p ON q.player_id = p.id
LEFT JOIN player_preferences pr ON q.player_id = pr.player_id
WHERE q.building = 'building_a'
  AND q.status = 'waiting'
ORDER BY q.position;

COMMIT;
```

**Expected**: Algorithm should group the 4 beginners together (Alice, Bob, Carol, Tina) despite mixed gender preferences, because skill preference has higher priority than gender.

**To test matchmaking**: Use the admin UI or call `/api/matchmaking/suggest?building=building_a`

---

## SCENARIO 2: Gender Preference Within Same Skill Level

**Objective**: When all players have same/compatible skill levels, gender preference should be respected

```sql
BEGIN;

TRUNCATE queue CASCADE;
DELETE FROM player_preferences;
DELETE FROM sessions;

-- Start sessions for 8 players (4 women, 4 men, all beginner/novice)
INSERT INTO sessions (player_id, building, status, start_time)
VALUES
('550e8400-e29b-41d4-a716-446655440001', 'building_a', 'active', NOW()), -- Alice F beginner
('550e8400-e29b-41d4-a716-446655440003', 'building_a', 'active', NOW()), -- Carol F beginner  
('550e8400-e29b-41d4-a716-446655440005', 'building_a', 'active', NOW()), -- Emma F novice
('550e8400-e29b-41d4-a716-446655440020', 'building_a', 'active', NOW()), -- Tina F beginner
('550e8400-e29b-41d4-a716-446655440002', 'building_a', 'active', NOW()), -- Bob M beginner
('550e8400-e29b-41d4-a716-446655440004', 'building_a', 'active', NOW()), -- David M novice
('550e8400-e29b-41d4-a716-446655440006', 'building_a', 'active', NOW()), -- Frank M novice
('550e8400-e29b-41d4-a716-446655440019', 'building_a', 'active', NOW()); -- Sam M beginner

-- Set preferences: All women want women's matches, all men want men's matches
INSERT INTO player_preferences (player_id, skill_level_pref, gender_pref, match_type) VALUES
-- 4 women want women's matches
('550e8400-e29b-41d4-a716-446655440001', 'beginner', 'womens', 'solo'),  -- Alice F beginner
('550e8400-e29b-41d4-a716-446655440003', 'beginner', 'womens', 'solo'),  -- Carol F beginner
('550e8400-e29b-41d4-a716-446655440005', 'beginner', 'womens', 'solo'),  -- Emma F novice
('550e8400-e29b-41d4-a716-446655440020', 'beginner', 'womens', 'solo'), -- Tina F beginner

-- 4 men want men's matches
('550e8400-e29b-41d4-a716-446655440002', 'beginner', 'mens', 'solo'),    -- Bob M beginner
('550e8400-e29b-41d4-a716-446655440004', 'beginner', 'mens', 'solo'),    -- David M novice
('550e8400-e29b-41d4-a716-446655440006', 'beginner', 'mens', 'solo'),    -- Frank M novice
('550e8400-e29b-41d4-a716-446655440019', 'beginner', 'mens', 'solo');   -- Sam M beginner

-- Add to queue alternating genders
INSERT INTO queue (player_id, building, status, position) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'building_a', 'waiting', 1), -- Alice F beginner
('550e8400-e29b-41d4-a716-446655440002', 'building_a', 'waiting', 2), -- Bob M beginner
('550e8400-e29b-41d4-a716-446655440003', 'building_a', 'waiting', 3), -- Carol F beginner
('550e8400-e29b-41d4-a716-446655440004', 'building_a', 'waiting', 4), -- David M novice
('550e8400-e29b-41d4-a716-446655440005', 'building_a', 'waiting', 5), -- Emma F novice
('550e8400-e29b-41d4-a716-446655440006', 'building_a', 'waiting', 6), -- Frank M novice
('550e8400-e29b-41d4-a716-446655440020', 'building_a', 'waiting', 7), -- Tina F beginner
('550e8400-e29b-41d4-a716-446655440019', 'building_a', 'waiting', 8); -- Sam M beginner

-- View queue
SELECT
  q.position,
  p.name,
  p.skill_level,
  p.gender,
  pr.skill_level_pref,
  pr.gender_pref
FROM queue q
JOIN players p ON q.player_id = p.id
LEFT JOIN player_preferences pr ON q.player_id = pr.player_id
WHERE q.building = 'building_a'
ORDER BY q.position;

COMMIT;
```

**Expected**: Since all players have compatible skill levels (beginner/novice) AND clear gender preferences, the algorithm should respect gender preference and create a women's match (Alice, Carol, Emma, Tina) first, leaving the men for the next match.
  pr.skill_level_pref,
  pr.gender_pref
FROM queue q
JOIN players p ON q.player_id = p.id
LEFT JOIN player_preferences pr ON q.player_id = pr.player_id
WHERE q.building = 'building_a'
ORDER BY q.position;

ROLLBACK;
```

**Expected**: Algorithm should prioritize skill level first, so beginners (Alice, Bob, Carol, Tina) should be matched together despite mixed genders, because skill preference has higher priority than gender preference.

---

## SCENARIO 3: Progressive Constraint Relaxation

**Objective**: Algorithm relaxes constraints progressively when strict matching fails

```sql
BEGIN;

TRUNCATE queue CASCADE;
DELETE FROM player_preferences;
DELETE FROM sessions;

-- Create varied preferences that will trigger relaxation
INSERT INTO sessions (player_id, building, status, start_time)
SELECT id, 'building_a', 'active', NOW()
FROM players LIMIT 6;

INSERT INTO player_preferences (player_id, skill_level_pref, gender_pref, match_type) VALUES
-- Mix of preferences that conflict
('550e8400-e29b-41d4-a716-446655440001', 'beginner', 'womens', 'solo'),       -- Alice F beginner
('550e8400-e29b-41d4-a716-446655440002', 'beginner', 'mens', 'solo'),         -- Bob M beginner
('550e8400-e29b-41d4-a716-446655440003', 'beginner', 'random', 'solo'),       -- Carol F beginner
('550e8400-e29b-41d4-a716-446655440004', 'beginner', 'womens', 'solo'),       -- David M novice
('550e8400-e29b-41d4-a716-446655440005', 'beginner', 'random', 'solo'),       -- Emma F novice
('550e8400-e29b-41d4-a716-446655440006', 'beginner', 'mens', 'solo');         -- Frank M novice

INSERT INTO queue (player_id, building, status, position) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'building_a', 'waiting', 1),
('550e8400-e29b-41d4-a716-446655440002', 'building_a', 'waiting', 2),
('550e8400-e29b-41d4-a716-446655440003', 'building_a', 'waiting', 3),
('550e8400-e29b-41d4-a716-446655440004', 'building_a', 'waiting', 4);

-- View queue
SELECT
  q.position,
  p.name,
  p.skill_level,
  p.gender,
  pr.skill_level_pref,
  pr.gender_pref
FROM queue q
JOIN players p ON q.player_id = p.id
LEFT JOIN player_preferences pr ON q.player_id = pr.player_id
WHERE q.building = 'building_a'
ORDER BY q.position;

COMMIT;
```

**Expected**: Algorithm progressively relaxes: variety → variety+gender → variety+gender+skill until a valid match is found.

---

## SCENARIO 4: Time Urgency Override

**Objective**: Players with <30 min remaining get priority over queue position

```sql
BEGIN;

TRUNCATE queue CASCADE;
DELETE FROM player_preferences;
-- Clean up existing sessions first
DELETE FROM sessions WHERE player_id IN (
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440003',
  '550e8400-e29b-41d4-a716-446655440004',
  '550e8400-e29b-41d4-a716-446655440005'
);

-- Create sessions with different start times
-- Alice: Started 4 hours 45 minutes ago (15 minutes remaining - URGENT)
INSERT INTO sessions (player_id, building, status, start_time) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'building_a', 'active', NOW() - INTERVAL '4 hours 45 minutes');

-- Players 2-5: Started recently (plenty of time remaining - NOT urgent)
INSERT INTO sessions (player_id, building, status, start_time) VALUES
('550e8400-e29b-41d4-a716-446655440002', 'building_a', 'active', NOW() - INTERVAL '30 minutes'),
('550e8400-e29b-41d4-a716-446655440003', 'building_a', 'active', NOW() - INTERVAL '30 minutes'),
('550e8400-e29b-41d4-a716-446655440004', 'building_a', 'active', NOW() - INTERVAL '30 minutes'),
('550e8400-e29b-41d4-a716-446655440005', 'building_a', 'active', NOW() - INTERVAL '30 minutes');

-- Set preferences (all compatible)
INSERT INTO player_preferences (player_id, skill_level_pref, gender_pref, match_type) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'beginner', 'random', 'solo'), -- Alice (urgent)
('550e8400-e29b-41d4-a716-446655440002', 'beginner', 'random', 'solo'), -- Bob
('550e8400-e29b-41d4-a716-446655440003', 'beginner', 'random', 'solo'), -- Carol
('550e8400-e29b-41d4-a716-446655440004', 'beginner', 'random', 'solo'), -- David
('550e8400-e29b-41d4-a716-446655440005', 'beginner', 'random', 'solo'); -- Emma

-- Add to queue - Alice is 5th in line (should normally wait)
INSERT INTO queue (player_id, building, status, position) VALUES
('550e8400-e29b-41d4-a716-446655440002', 'building_a', 'waiting', 1), -- Bob (1st)
('550e8400-e29b-41d4-a716-446655440003', 'building_a', 'waiting', 2), -- Carol (2nd)
('550e8400-e29b-41d4-a716-446655440004', 'building_a', 'waiting', 3), -- David (3rd)
('550e8400-e29b-41d4-a716-446655440005', 'building_a', 'waiting', 4), -- Emma (4th)
('550e8400-e29b-41d4-a716-446655440001', 'building_a', 'waiting', 5); -- Alice (5th - but URGENT!)

-- Check time urgency (5 hours = 300 minutes total)
SELECT
  q.position,
  p.name,
  s.start_time,
  EXTRACT(EPOCH FROM (NOW() - s.start_time)) / 60 as minutes_elapsed,
  300 - EXTRACT(EPOCH FROM (NOW() - s.start_time)) / 60 as minutes_remaining,
  CASE
    WHEN 300 - EXTRACT(EPOCH FROM (NOW() - s.start_time)) / 60 < 30 THEN 'URGENT (<30min left)'
    ELSE 'OK'
  END as urgency_status
FROM queue q
JOIN players p ON q.player_id = p.id
JOIN sessions s ON q.player_id = s.player_id
WHERE q.building = 'building_a'
  AND q.status = 'waiting'
  AND s.status = 'active'
ORDER BY q.position;

COMMIT;
```

**Expected**: Alice should be included in the first match despite being 5th in queue, because time urgency (Priority 2) overrides queue position. The algorithm should match Alice + 3 others from positions 1-4, skipping normal FIFO order.

**To test the fix**: Call `/api/matchmaking/suggest?building=building_a` and verify Alice is included in the suggested match.
WHERE s.building = 'building_a'
  AND s.status = 'active';

ROLLBACK;
```

**Expected**: Alice should be flagged as urgent (>90 minutes elapsed) and get priority in matchmaking.

---

## SCENARIO 5: Friend Group Priority (Group Check-in)

**Objective**: Full 4-person friend groups get highest priority

```sql
BEGIN;

TRUNCATE queue CASCADE;
DELETE FROM player_preferences;
DELETE FROM sessions;
DELETE FROM group_members WHERE group_id = 'friend-group-1';
DELETE FROM groups WHERE id = 'friend-group-1';

-- Create a friend group
INSERT INTO groups (id, name) VALUES ('friend-group-1', 'Weekend Warriors');

INSERT INTO group_members (group_id, player_id) VALUES
('friend-group-1', '550e8400-e29b-41d4-a716-446655440001'),
('friend-group-1', '550e8400-e29b-41d4-a716-446655440002'),
('friend-group-1', '550e8400-e29b-41d4-a716-446655440003'),
('friend-group-1', '550e8400-e29b-41d4-a716-446655440004');

-- Start sessions
INSERT INTO sessions (player_id, building, status, start_time)
VALUES
('550e8400-e29b-41d4-a716-446655440001', 'building_a', 'active', NOW()),
('550e8400-e29b-41d4-a716-446655440002', 'building_a', 'active', NOW()),
('550e8400-e29b-41d4-a716-446655440003', 'building_a', 'active', NOW()),
('550e8400-e29b-41d4-a716-446655440004', 'building_a', 'active', NOW()),
('550e8400-e29b-41d4-a716-446655440005', 'building_a', 'active', NOW()),
('550e8400-e29b-41d4-a716-446655440006', 'building_a', 'active', NOW());

-- Add to queue with group_id
INSERT INTO queue (player_id, group_id, building, status, position) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'friend-group-1', 'building_a', 'waiting', 1),
('550e8400-e29b-41d4-a716-446655440002', 'friend-group-1', 'building_a', 'waiting', 2),
('550e8400-e29b-41d4-a716-446655440003', 'friend-group-1', 'building_a', 'waiting', 3),
('550e8400-e29b-41d4-a716-446655440004', 'friend-group-1', 'building_a', 'waiting', 4),
('550e8400-e29b-41d4-a716-446655440005', NULL, 'building_a', 'waiting', 5),
('550e8400-e29b-41d4-a716-446655440006', NULL, 'building_a', 'waiting', 6);

-- View queue with group status
SELECT
  q.position,
  p.name,
  CASE WHEN q.group_id IS NOT NULL THEN 'FRIEND GROUP' ELSE 'Solo' END as type,
  q.group_id
FROM queue q
JOIN players p ON q.player_id = p.id
WHERE q.building = 'building_a'
ORDER BY q.position;

COMMIT;
```

**Expected**: The 4 friend group members should be matched together with highest priority (100 points).

---

## SCENARIO 6: Incomplete Friend Group (3 players + 1 solo)

**Objective**: Partial friend groups get matched with solo players

```sql
BEGIN;

TRUNCATE queue CASCADE;
DELETE FROM group_members WHERE group_id = 'partial-group';
DELETE FROM groups WHERE id = 'partial-group';

-- Create group with only 3 members
INSERT INTO groups (id, name) VALUES ('partial-group', 'Trio Team');

INSERT INTO group_members (group_id, player_id) VALUES
('partial-group', '550e8400-e29b-41d4-a716-446655440001'),
('partial-group', '550e8400-e29b-41d4-a716-446655440002'),
('partial-group', '550e8400-e29b-41d4-a716-446655440003');

-- Start sessions
INSERT INTO sessions (player_id, building, status, start_time)
VALUES
('550e8400-e29b-41d4-a716-446655440001', 'building_a', 'active', NOW()),
('550e8400-e29b-41d4-a716-446655440002', 'building_a', 'active', NOW()),
('550e8400-e29b-41d4-a716-446655440003', 'building_a', 'active', NOW()),
('550e8400-e29b-41d4-a716-446655440004', 'building_a', 'active', NOW());

-- Add to queue
INSERT INTO queue (player_id, group_id, building, status, position) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'partial-group', 'building_a', 'waiting', 1),
('550e8400-e29b-41d4-a716-446655440002', 'partial-group', 'building_a', 'waiting', 2),
('550e8400-e29b-41d4-a716-446655440003', 'partial-group', 'building_a', 'waiting', 3),
('550e8400-e29b-41d4-a716-446655440004', NULL, 'building_a', 'waiting', 4);

-- View queue
SELECT
  p.name,
  CASE WHEN q.group_id IS NOT NULL THEN 'Part of group' ELSE 'Solo' END as status
FROM queue q
JOIN players p ON q.player_id = p.id
WHERE q.building = 'building_a'
ORDER BY q.position;

COMMIT;
```

**Expected**: 3-person group should be matched with 1 solo player to form a complete match of 4.

---

## SCENARIO 7: Insufficient Players

**Objective**: No match suggested when fewer than 4 players in queue

```sql
BEGIN;

TRUNCATE queue CASCADE;
DELETE FROM player_preferences;
DELETE FROM sessions;

-- Add only 3 players
INSERT INTO sessions (player_id, building, status, start_time)
VALUES
('550e8400-e29b-41d4-a716-446655440001', 'building_a', 'active', NOW()),
('550e8400-e29b-41d4-a716-446655440002', 'building_a', 'active', NOW()),
('550e8400-e29b-41d4-a716-446655440003', 'building_a', 'active', NOW());

INSERT INTO queue (player_id, building, status, position) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'building_a', 'waiting', 1),
('550e8400-e29b-41d4-a716-446655440002', 'building_a', 'waiting', 2),
('550e8400-e29b-41d4-a716-446655440003', 'building_a', 'waiting', 3);

-- Check queue size
SELECT COUNT(*) as queue_size FROM queue WHERE building = 'building_a' AND status = 'waiting';

COMMIT;
```

**Expected**: Matchmaking API should return "Not enough players" message (need 4, have 3).

---

## More Scenarios...

Continue with:
- SCENARIO 8: Conflicting Preferences
- SCENARIO 9: Variety Preference
- SCENARIO 10: Multiple Buildings
- SCENARIO 11-17: Edge cases

*(See `supabase/test_scenarios_updated.sql` for complete list)*

---

# PART 2: GROUP MANAGEMENT TESTS

*(Copy from GROUP_TESTING_GUIDE.md - all 11 tests)*

---

## TEST 1: Create Group with 4 Members

```sql
DELETE FROM group_members WHERE group_id = 'test-group-1';
DELETE FROM groups WHERE id = 'test-group-1';

INSERT INTO groups (id, name) VALUES ('test-group-1', 'Team Alpha');

INSERT INTO group_members (group_id, player_id) VALUES
('test-group-1', '550e8400-e29b-41d4-a716-446655440001'),
('test-group-1', '550e8400-e29b-41d4-a716-446655440002'),
('test-group-1', '550e8400-e29b-41d4-a716-446655440003'),
('test-group-1', '550e8400-e29b-41d4-a716-446655440004');

SELECT
  g.name,
  COUNT(gm.id) as member_count,
  STRING_AGG(p.name, ', ' ORDER BY p.name) as members
FROM groups g
LEFT JOIN group_members gm ON g.id = gm.group_id
LEFT JOIN players p ON gm.player_id = p.id
WHERE g.id = 'test-group-1'
GROUP BY g.id, g.name;
```

**Expected**: group_name = "Team Alpha", member_count = 4

---

*(Continue with TEST 2-11 from GROUP_TESTING_GUIDE.md)*

---

# SUMMARY

## Total Test Coverage

### Matchmaking: 17 Scenarios
1. ✅ Skill > Gender priority
2. ✅ Gender preference within skill
3. ✅ Progressive relaxation
4. ✅ Time urgency override
5. ✅ Friend group priority
6. ✅ Incomplete friend groups
7. ✅ Insufficient players
8. ✅ Conflicting preferences
9. ✅ Variety preference
10. ✅ Multiple buildings
11. ✅ Gender balance
12. ✅ Skill balance
13. ✅ Recent opponents variety
14. ✅ Maximum wait time
15. ✅ Court assignment
16. ✅ Match confirmation
17. ✅ Match cancellation

### Group Management: 11 Scenarios
1. ✅ Create group (4 members)
2. ✅ Create group (2 members min)
3. ✅ Add member
4. ✅ Max 4 members enforcement
5. ✅ Remove member
6. ✅ Min 2 members enforcement
7. ✅ Delete group (cascade)
8. ✅ Group in queue integration
9. ✅ Prevent deletion in queue
10. ✅ Prevent duplicate members
11. ✅ List all groups

---

## Testing Checklist

- [ ] Run all 17 matchmaking scenarios
- [ ] Run all 11 group management scenarios
- [ ] Test via Admin UI (http://localhost:3000/admin)
- [ ] Test via API endpoints
- [ ] Verify automated tests pass (`npm test`)
