# Group Management Manual Testing Guide

## Quick Start

1. **Open Supabase Studio**: http://127.0.0.1:54323
2. **Go to SQL Editor** (left sidebar)
3. **Copy and paste each test below** one at a time
4. **Click "Run"** and verify the results

---

## TEST 1: Create Group with 4 Members ✅

```sql
-- Clean up
DELETE FROM group_members WHERE group_id = 'test-group-1';
DELETE FROM groups WHERE id = 'test-group-1';

-- Create group
INSERT INTO groups (id, name, created_at) VALUES
('test-group-1', 'Team Alpha', NOW());

-- Add 4 members
INSERT INTO group_members (group_id, player_id) VALUES
('test-group-1', '550e8400-e29b-41d4-a716-446655440001'), -- Alice
('test-group-1', '550e8400-e29b-41d4-a716-446655440002'), -- Bob
('test-group-1', '550e8400-e29b-41d4-a716-446655440003'), -- Charlie
('test-group-1', '550e8400-e29b-41d4-a716-446655440004'); -- David

-- Verify
SELECT
  g.name as group_name,
  COUNT(gm.id) as member_count,
  STRING_AGG(p.name, ', ' ORDER BY p.name) as members
FROM groups g
LEFT JOIN group_members gm ON g.id = gm.group_id
LEFT JOIN players p ON gm.player_id = p.id
WHERE g.id = 'test-group-1'
GROUP BY g.id, g.name;
```

**Expected Result:**
- group_name: "Team Alpha"
- member_count: 4
- members: "Alice, Bob, Charlie, David"

---

## TEST 2: Create Group with 2 Members (Minimum) ✅

```sql
-- Clean up
DELETE FROM group_members WHERE group_id = 'test-group-2';
DELETE FROM groups WHERE id = 'test-group-2';

-- Create group with 2 members
INSERT INTO groups (id, name) VALUES ('test-group-2', 'Duo Team');

INSERT INTO group_members (group_id, player_id) VALUES
('test-group-2', '550e8400-e29b-41d4-a716-446655440005'), -- Emma
('test-group-2', '550e8400-e29b-41d4-a716-446655440006'); -- Frank

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
```

**Expected Result:**
- member_count: 2
- members: "Emma, Frank"

---

## TEST 3: Add Member to Existing Group ✅

```sql
-- Add a third member to test-group-2
INSERT INTO group_members (group_id, player_id) VALUES
('test-group-2', '550e8400-e29b-41d4-a716-446655440007'); -- Grace

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
```

**Expected Result:**
- member_count: 3
- members: "Emma, Frank, Grace"

---

## TEST 4: Group with Maximum 4 Members ✅

```sql
-- Add 4th member to reach maximum
INSERT INTO group_members (group_id, player_id) VALUES
('test-group-2', '550e8400-e29b-41d4-a716-446655440008'); -- Henry

-- Verify
SELECT COUNT(*) as member_count
FROM group_members
WHERE group_id = 'test-group-2';
```

**Expected Result:**
- member_count: 4
- **Note:** Application logic prevents adding a 5th member

---

## TEST 5: Remove Member from Group ✅

```sql
-- Show members before removal
SELECT p.name, gm.joined_at
FROM group_members gm
JOIN players p ON gm.player_id = p.id
WHERE gm.group_id = 'test-group-2'
ORDER BY p.name;

-- Remove one member (Henry)
DELETE FROM group_members
WHERE group_id = 'test-group-2'
  AND player_id = '550e8400-e29b-41d4-a716-446655440008';

-- Verify remaining members
SELECT
  COUNT(*) as remaining_count,
  STRING_AGG(p.name, ', ' ORDER BY p.name) as remaining_members
FROM group_members gm
JOIN players p ON gm.player_id = p.id
WHERE gm.group_id = 'test-group-2';
```

**Expected Result:**
- remaining_count: 3
- remaining_members: "Emma, Frank, Grace"

---

## TEST 6: Prevent Duplicate Members ✅

```sql
-- Try to add Emma again (should fail)
DO $$
BEGIN
  INSERT INTO group_members (group_id, player_id) VALUES
  ('test-group-2', '550e8400-e29b-41d4-a716-446655440005'); -- Emma (already in group)
  RAISE NOTICE 'ERROR: Duplicate allowed!';
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'SUCCESS: Duplicate prevented correctly';
END $$;

-- Verify Emma only appears once
SELECT COUNT(*) as emma_count
FROM group_members
WHERE group_id = 'test-group-2'
  AND player_id = '550e8400-e29b-41d4-a716-446655440005';
```

**Expected Result:**
- Message: "SUCCESS: Duplicate prevented correctly"
- emma_count: 1

---

## TEST 7: Delete Group (Cascade Delete Members) ✅

```sql
-- Show group before deletion
SELECT
  g.name,
  COUNT(gm.id) as member_count
FROM groups g
LEFT JOIN group_members gm ON g.id = gm.group_id
WHERE g.id = 'test-group-1'
GROUP BY g.id, g.name;

-- Delete the group
DELETE FROM groups WHERE id = 'test-group-1';

-- Verify deletion (both group and members deleted)
SELECT
  (SELECT COUNT(*) FROM groups WHERE id = 'test-group-1') as group_exists,
  (SELECT COUNT(*) FROM group_members WHERE group_id = 'test-group-1') as members_exist;
```

**Expected Result:**
- group_exists: 0
- members_exist: 0 (cascade delete worked)

---

## TEST 8: Group in Queue Integration ✅

```sql
-- Create a test group for queue
DELETE FROM queue WHERE group_id = 'test-queue-group';
DELETE FROM group_members WHERE group_id = 'test-queue-group';
DELETE FROM groups WHERE id = 'test-queue-group';

INSERT INTO groups (id, name) VALUES ('test-queue-group', 'Queue Test Team');

INSERT INTO group_members (group_id, player_id) VALUES
('test-queue-group', '550e8400-e29b-41d4-a716-446655440001'),
('test-queue-group', '550e8400-e29b-41d4-a716-446655440002'),
('test-queue-group', '550e8400-e29b-41d4-a716-446655440003'),
('test-queue-group', '550e8400-e29b-41d4-a716-446655440004');

-- Start sessions
INSERT INTO sessions (player_id, building, status, start_time)
SELECT player_id, 'building_a', 'active', NOW()
FROM group_members
WHERE group_id = 'test-queue-group'
ON CONFLICT (player_id) DO UPDATE SET
  status = 'active',
  building = 'building_a';

-- Add to queue
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
  g.name,
  COUNT(DISTINCT q.player_id) as players_in_queue,
  STRING_AGG(p.name, ', ' ORDER BY p.name) as members
FROM groups g
JOIN queue q ON g.id = q.group_id
JOIN players p ON q.player_id = p.id
WHERE g.id = 'test-queue-group'
GROUP BY g.id, g.name;
```

**Expected Result:**
- players_in_queue: 4
- All members: "Alice, Bob, Charlie, David"
- All have same group_id in queue

---

## TEST 9: Prevent Deletion of Group in Active Queue ✅

```sql
-- Check if group is in active queue
SELECT EXISTS (
  SELECT 1 FROM queue
  WHERE group_id = 'test-queue-group'
    AND status = 'waiting'
) as in_active_queue;

-- Note: Application logic prevents deletion when in_active_queue = true
-- Try deletion via API: DELETE /api/groups/test-queue-group
-- Should return 400 error: "Cannot delete group while it is in the queue"
```

**Expected Result:**
- in_active_queue: true
- **Note:** API prevents deletion (test via UI or curl)

---

## TEST 10: List All Groups ✅

```sql
SELECT
  g.id,
  g.name,
  COUNT(gm.id) as member_count,
  STRING_AGG(p.name, ', ' ORDER BY p.name) as members,
  g.created_at
FROM groups g
LEFT JOIN group_members gm ON g.id = gm.group_id
LEFT JOIN players p ON gm.player_id = p.id
WHERE g.id LIKE 'test%'
GROUP BY g.id, g.name, g.created_at
ORDER BY g.created_at DESC;
```

**Expected Result:**
- Should see all test groups created
- Each with correct member count and member names

---

## CLEANUP (Optional)

```sql
-- Remove all test data
DELETE FROM queue WHERE group_id LIKE 'test%';
DELETE FROM group_members WHERE group_id LIKE 'test%';
DELETE FROM groups WHERE id LIKE 'test%';

-- Verify cleanup
SELECT COUNT(*) as remaining_test_groups FROM groups WHERE id LIKE 'test%';
```

---

## Testing via Admin UI 🖥️

You can also test through the web interface:

1. **Open Admin Panel**: http://localhost:3000/admin
2. **Click "Manage Groups"**
3. **Test the following:**
   - ✅ Create a new group (2-4 players)
   - ✅ View group details
   - ✅ Add a member to a group
   - ✅ Remove a member from a group
   - ✅ Try to add 5th member (should show error)
   - ✅ Try to remove from 2-member group (should show error)
   - ✅ Delete a group

---

## Summary

All manual tests cover:
- ✅ Group CRUD operations
- ✅ Member management (add/remove)
- ✅ Size constraints (2-4 members)
- ✅ Queue integration
- ✅ Duplicate prevention
- ✅ Cascade deletion
- ✅ Queue protection (cannot delete group in queue)

**Total Test Coverage: 10 scenarios + UI testing**
