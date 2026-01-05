# Group Check-In Feature Guide

## Overview
The cashier page now supports **Group Check-In** mode, allowing 2-4 friends to register together and receive **highest priority** in matchmaking to play together.

---

## How It Works

### Solo Mode (Default)
- Check in one player at a time
- Players get `group_id: null`
- Matched with 3 other solo players

### Group Mode (NEW!)
- Check in 2-4 friends together
- All players get same `group_id: <UUID>`
- **Highest priority** in matchmaking to play together
- If group has 4 players → matched immediately
- If group has 2-3 players → matched with another group or solo players

---

## User Flow

### 1. Select Mode
At `/cashier`, cashier sees two buttons:
- **Solo** - Default, single player check-in
- **Group (2-4 players)** - Friend group check-in

### 2. Group Mode: Scan Multiple Players
When in Group mode:
1. Scan first player (camera or manual UUID)
2. Player added to "Group Members" list
3. Scan next player
4. Repeat until 2-4 players scanned
5. Can remove players by clicking X button

### 3. Set Preferences
Once 2+ players in group:
- Set shared preferences (skill, gender, building)
- Preferences apply to all group members

### 4. Start Group Session
Click **"Start Sessions for X Players"**
- All players get 5-hour sessions
- All players added to queue with **same group_id**
- Success message shows "Friend Group Priority Enabled! 🎾"

---

## Testing Group Check-In

### Quick Test with Seed Data

1. **Run seed script** (creates 12 test players)

2. **Go to `/cashier`**

3. **Click "Group (2-4 players)" button**

4. **Scan 4 QR UUIDs from seed data:**
   - Copy UUID for Test Alice
   - Paste → Click "Add"
   - Copy UUID for Test Bob
   - Paste → Click "Add"
   - Copy UUID for Test Carol
   - Paste → Click "Add"
   - Copy UUID for Test Dave
   - Paste → Click "Add"

5. **Should see:**
   - Group Members list with all 4 players
   - Each player numbered (1, 2, 3, 4)
   - Can remove players if needed

6. **Set preferences:**
   - Skill: Beginner
   - Gender: Random
   - Building: Building A

7. **Click "Start Sessions for 4 Players"**

8. **Verify in database:**
```sql
SELECT
  p.name,
  q.group_id,
  q.position
FROM queue q
JOIN players p ON p.id = q.player_id
WHERE q.group_id IS NOT NULL
ORDER BY q.position;
```

Should show all 4 players with **same group_id**

---

## Matchmaking Priority

When court officer clicks "Call Next" at `/admin`:

**Priority Order:**
1. ✅ **Friend Groups** (same group_id) - HIGHEST
2. Time urgency
3. Skill level match
4. Gender preference
5. Variety enforcement

**Example:**
- Queue has: 4-person group (beginners) + 6 solo players (intermediate)
- Even though solo players joined first...
- **Friend group gets called first!**

---

## UI Features

### Mode Toggle
```
┌─────────────────────────────────────┐
│ Check-In Mode                       │
│ [Solo] [Group (2-4 players)]       │
└─────────────────────────────────────┘
```

### Group Member List
```
┌─────────────────────────────────────┐
│ Group Members (4/4)                 │
├─────────────────────────────────────┤
│ 1  👤 Test Alice                [X] │
│    Beginner • female                │
├─────────────────────────────────────┤
│ 2  👤 Test Bob                  [X] │
│    Beginner • male                  │
├─────────────────────────────────────┤
│ 3  👤 Test Carol                [X] │
│    Beginner • female                │
├─────────────────────────────────────┤
│ 4  👤 Test Dave                 [X] │
│    Beginner • male                  │
└─────────────────────────────────────┘
```

### Success Screen
```
┌─────────────────────────────────────┐
│              ✓                      │
│   Check-In Complete!                │
│   Group of 4 checked in!            │
│   5-hour sessions started           │
│                                     │
│ 🎾 Friend Group Priority Enabled!  │
│ These players will be matched      │
│ together                            │
└─────────────────────────────────────┘
```

---

## Advanced Testing

### Test Friend Group Priority

1. Check in 4-player group (Test Alice, Bob, Carol, Dave)
2. Check in 8 solo players
3. Go to `/admin`
4. Click "Call Next" on Court 1

**Expected:** The 4-player group gets matched FIRST, even though solo players were in queue longer

### Test Mixed Groups

1. Check in 2-player group (Test Alice, Bob)
2. Check in 2-player group (Test Carol, Dave)
3. Click "Call Next"

**Expected:** Both 2-player groups matched together (4 total)

### Test Incomplete Groups

1. Check in 3-player group
2. Check in 5 solo players
3. Click "Call Next"

**Expected:** 3-player group + 1 solo player matched together

---

## Benefits

✅ **For Players:**
- Friends guaranteed to play together
- Highest priority in queue
- Fair matching with appropriate skill levels

✅ **For Facility:**
- Better customer experience
- Encourages group bookings
- Reduces complaints about split groups

✅ **For Matchmaking:**
- Clearer intent (group vs solo)
- More efficient court utilization
- Better balanced matches

---

## Notes

- Minimum 2 players for a group
- Maximum 4 players per group
- Group members can't be in queue already
- All group members must check in at same time
- Can't add/remove players after starting session
- Group preferences apply to all members

---

Ready to test! 🎾
