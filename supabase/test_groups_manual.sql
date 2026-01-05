-- ============================================
-- MANUAL GROUP MANAGEMENT TESTING GUIDE
-- ============================================
-- Run each section separately and verify the results
-- Copy/paste each section into Supabase SQL Editor or psql

-- ============================================
-- SETUP: Ensure we have test players
-- ============================================
\echo '========================================'
\echo 'SETUP: Checking test players exist'
\echo '========================================'

SELECT
  id,
  name,
  skill_level,
  gender
FROM players
WHERE id IN (
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440003',
  '550e8400-e29b-41d4-a716-446655440004',
  '550e8400-e29b-41d4-a716-446655440005',
  '550e8400-e29b-41d4-a716-446655440006',
  '550e8400-e29b-41d4-a716-446655440007',
  '550e8400-e29b-41d4-a716-446655440008'
)
ORDER BY name;

-- Expected: Should see 8 players (Alice, Bob, Charlie, David, Emma, Frank, Grace, Henry)

-- ============================================
-- TEST 1: Create a Group with 4 Members
-- ============================================
\echo ''
\echo '========================================'
\echo 'TEST 1: Creating group with 4 members'
\echo '========================================'

BEGIN;

-- Clean up any existing test groups
DELETE FROM group_members WHERE group_id LIKE 'test-group%';
DELETE FROM groups WHERE id LIKE 'test-group%';

-- Create a new group
INSERT INTO groups (id, name, created_at) VALUES
('test-group-1', 'Team Alpha', NOW())
RETURNING *;

-- Add 4 members
INSERT INTO group_members (group_id, player_id) VALUES
('test-group-1', '550e8400-e29b-41d4-a716-446655440001'), -- Alice
('test-group-1', '550e8400-e29b-41d4-a716-446655440002'), -- Bob
('test-group-1', '550e8400-e29b-41d4-a716-446655440003'), -- Charlie
('test-group-1', '550e8400-e29b-41d4-a716-446655440004')  -- David
RETURNING *;

-- Verify group created with correct members
SELECT
  g.id,
  g.name as group_name,
  g.created_at,
  COUNT(gm.id) as member_count,
  STRING_AGG(p.name, ', ' ORDER BY p.name) as members
FROM groups g
LEFT JOIN group_members gm ON g.id = gm.group_id
LEFT JOIN players p ON gm.player_id = p.id
WHERE g.id = 'test-group-1'
GROUP BY g.id, g.name, g.created_at;

-- Expected Result:
-- group_name: "Team Alpha"
-- member_count: 4
-- members: "Alice, Bob, Charlie, David"

COMMIT;

-- ============================================
-- TEST 2: Create Group with Minimum 2 Members
-- ============================================
\echo ''
\echo '========================================'
\echo 'TEST 2: Creating group with 2 members'
\echo '========================================'

BEGIN;

DELETE FROM group_members WHERE group_id = 'test-group-2';
DELETE FROM groups WHERE id = 'test-group-2';

-- Create a group with only 2 members
INSERT INTO groups (id, name) VALUES
('test-group-2', 'Duo Team')
RETURNING *;

INSERT INTO group_members (group_id, player_id) VALUES
('test-group-2', '550e8400-e29b-41d4-a716-446655440005'), -- Emma
('test-group-2', '550e8400-e29b-41d4-a716-446655440006')  -- Frank
RETURNING *;

-- Verify
SELECT
  g.name,
  COUNT(gm.id) as member_count,
  STRING_AGG(p.name, ', ' ORDER BY p.name) as members
FROM groups g
LEFT JOIN group_members gm ON g.id = gm.group_id
LEFT JOIN players p ON gm.player_id = p.id
WHERE g.id = 'test-group-2'
GROUP BY g.id, g.name;

-- Expected: member_count = 2, members = "Emma, Frank"

COMMIT;

-- ============================================
-- TEST 3: Add Member to Existing Group
-- ============================================
\echo ''
\echo '========================================'
\echo 'TEST 3: Adding member to existing group'
\echo '========================================'

BEGIN;

-- Check initial count
SELECT
  COUNT(*) as current_member_count
FROM group_members
WHERE group_id = 'test-group-2';

-- Add a third member
INSERT INTO group_members (group_id, player_id) VALUES
('test-group-2', '550e8400-e29b-41d4-a716-446655440007') -- Grace
RETURNING *;

-- Verify new count
SELECT
  g.name,
  COUNT(gm.id) as member_count,
  STRING_AGG(p.name, ', ' ORDER BY p.name) as members
FROM groups g
LEFT JOIN group_members gm ON g.id = gm.group_id
LEFT JOIN players p ON gm.player_id = p.id
WHERE g.id = 'test-group-2'
GROUP BY g.id, g.name;

-- Expected: member_count = 3, members = "Emma, Frank, Grace"

COMMIT;

-- ============================================
-- TEST 4: Attempt to Add 5th Member (Should Fail in App)
-- ============================================
\echo ''
\echo '========================================'
\echo 'TEST 4: Checking group with 4 members'
\echo '========================================'

BEGIN;

-- Add one more member to test-group-2 to make it 4
INSERT INTO group_members (group_id, player_id) VALUES
('test-group-2', '550e8400-e29b-41d4-a716-446655440008'); -- Henry

-- Verify count
SELECT COUNT(*) as member_count
FROM group_members
WHERE group_id = 'test-group-2';

-- Expected: member_count = 4
-- Note: Adding a 5th member should be blocked by application logic

COMMIT;

-- ============================================
-- TEST 5: Remove Member from Group
-- ============================================
\echo ''
\echo '========================================'
\echo 'TEST 5: Removing member from group'
\echo '========================================'

BEGIN;

-- Show members before removal
SELECT
  p.name,
  gm.joined_at
FROM group_members gm
JOIN players p ON gm.player_id = p.id
WHERE gm.group_id = 'test-group-2'
ORDER BY p.name;

-- Remove one member
DELETE FROM group_members
WHERE group_id = 'test-group-2'
  AND player_id = '550e8400-e29b-41d4-a716-446655440008'; -- Remove Henry

-- Show members after removal
SELECT COUNT(*) as remaining_members
FROM group_members
WHERE group_id = 'test-group-2';

SELECT
  STRING_AGG(p.name, ', ' ORDER BY p.name) as remaining_members
FROM group_members gm
JOIN players p ON gm.player_id = p.id
WHERE gm.group_id = 'test-group-2';

-- Expected: remaining_members = 3 (Emma, Frank, Grace)

COMMIT;

-- ============================================
-- TEST 6: Prevent Duplicate Player in Same Group
-- ============================================
\echo ''
\echo '========================================'
\echo 'TEST 6: Attempting to add duplicate member'
\echo '========================================'

BEGIN;

-- Try to add Emma again (should fail due to UNIQUE constraint)
DO $$
BEGIN
  INSERT INTO group_members (group_id, player_id) VALUES
  ('test-group-2', '550e8400-e29b-41d4-a716-446655440005'); -- Emma (already in group)
  RAISE NOTICE 'ERROR: Duplicate member was added (constraint failed)';
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'SUCCESS: Correctly prevented duplicate member';
END $$;

-- Verify Emma only appears once
SELECT COUNT(*) as emma_count
FROM group_members
WHERE group_id = 'test-group-2'
  AND player_id = '550e8400-e29b-41d4-a716-446655440005';

-- Expected: emma_count = 1

COMMIT;

-- ============================================
-- TEST 7: Delete Group
-- ============================================
\echo ''
\echo '========================================'
\echo 'TEST 7: Deleting a group'
\echo '========================================'

BEGIN;

-- Show group before deletion
SELECT
  g.name,
  COUNT(gm.id) as member_count
FROM groups g
LEFT JOIN group_members gm ON g.id = gm.group_id
WHERE g.id = 'test-group-1'
GROUP BY g.id, g.name;

-- Delete the group (cascade should delete members)
DELETE FROM groups WHERE id = 'test-group-1';

-- Verify deletion
SELECT COUNT(*) as group_exists FROM groups WHERE id = 'test-group-1';
SELECT COUNT(*) as members_exist FROM group_members WHERE group_id = 'test-group-1';

-- Expected: group_exists = 0, members_exist = 0

COMMIT;

-- ============================================
-- TEST 8: Group in Queue (Integration Test)
-- ============================================
\echo ''
\echo '========================================'
\echo 'TEST 8: Testing group in queue'
\echo '========================================'

BEGIN;

-- Create a test group for queue testing
DELETE FROM group_members WHERE group_id = 'test-queue-group';
DELETE FROM groups WHERE id = 'test-queue-group';

INSERT INTO groups (id, name) VALUES
('test-queue-group', 'Queue Test Team');

INSERT INTO group_members (group_id, player_id) VALUES
('test-queue-group', '550e8400-e29b-41d4-a716-446655440001'),
('test-queue-group', '550e8400-e29b-41d4-a716-446655440002'),
('test-queue-group', '550e8400-e29b-41d4-a716-446655440003'),
('test-queue-group', '550e8400-e29b-41d4-a716-446655440004');

-- Start sessions for all members
INSERT INTO sessions (player_id, building, status, start_time)
SELECT player_id, 'building_a', 'active', NOW()
FROM group_members
WHERE group_id = 'test-queue-group'
ON CONFLICT (player_id) DO UPDATE SET
  status = 'active',
  building = 'building_a';

-- Add group to queue
INSERT INTO queue (player_id, group_id, building, status, position)
SELECT
  player_id,
  'test-queue-group',
  'building_a',
  'waiting',
  ROW_NUMBER() OVER (ORDER BY player_id)
FROM group_members
WHERE group_id = 'test-queue-group'
ON CONFLICT (player_id) DO UPDATE SET
  group_id = 'test-queue-group',
  status = 'waiting';

-- Verify group in queue
SELECT
  g.name as group_name,
  COUNT(DISTINCT q.player_id) as players_in_queue,
  q.group_id,
  STRING_AGG(p.name, ', ' ORDER BY p.name) as player_names
FROM groups g
JOIN queue q ON g.id = q.group_id
JOIN players p ON q.player_id = p.id
WHERE g.id = 'test-queue-group'
GROUP BY g.id, g.name, q.group_id;

-- Expected: All 4 players should have same group_id in queue

COMMIT;

-- ============================================
-- TEST 9: Prevent Deletion of Group in Active Queue
-- ============================================
\echo ''
\echo '========================================'
\echo 'TEST 9: Attempting to delete group in queue'
\echo '========================================'

BEGIN;

-- Check if group is in queue
SELECT EXISTS (
  SELECT 1 FROM queue
  WHERE group_id = 'test-queue-group'
    AND status = 'waiting'
) as in_active_queue;

-- Expected: in_active_queue = true
-- Note: Application should prevent deletion if in_active_queue = true
-- We won't actually delete here to preserve the test data

ROLLBACK;

-- ============================================
-- TEST 10: List All Groups
-- ============================================
\echo ''
\echo '========================================'
\echo 'TEST 10: Listing all groups'
\echo '========================================'

SELECT
  g.id,
  g.name as group_name,
  COUNT(gm.id) as member_count,
  g.created_at,
  STRING_AGG(p.name, ', ' ORDER BY p.name) as members
FROM groups g
LEFT JOIN group_members gm ON g.id = gm.group_id
LEFT JOIN players p ON gm.player_id = p.id
WHERE g.id LIKE 'test%'
GROUP BY g.id, g.name, g.created_at
ORDER BY g.created_at DESC;

-- Expected: Should see all test groups created above

-- ============================================
-- CLEANUP (Optional)
-- ============================================
\echo ''
\echo '========================================'
\echo 'CLEANUP: Removing test data'
\echo '========================================'

-- Uncomment to clean up test data:
-- BEGIN;
-- DELETE FROM queue WHERE group_id LIKE 'test%';
-- DELETE FROM group_members WHERE group_id LIKE 'test%';
-- DELETE FROM groups WHERE id LIKE 'test%';
-- COMMIT;

\echo ''
\echo '========================================'
\echo 'TESTING COMPLETE!'
\echo '========================================'
\echo 'All manual tests have been executed.'
\echo 'Review the results above to verify:'
\echo '- Groups can be created with 2-4 members'
\echo '- Members can be added/removed'
\echo '- Duplicate prevention works'
\echo '- Groups integrate with queue system'
\echo '- Cascade deletion works'
\echo '========================================'
