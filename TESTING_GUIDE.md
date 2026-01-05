# Matchmaking Hierarchy Testing Guide

## 📊 Test Coverage Status

| Priority | Automated Tests | Manual Tests | Status |
|----------|----------------|--------------|--------|
| **CRITICAL** (Must test before production) | 1/8 | 8/8 | 🔴 12.5% |
| **HIGH** (Should test soon) | 0/5 | 5/5 | 🔴 0% |
| **MEDIUM** (Nice to have) | 3/5 | 2/5 | 🟡 60% |

**Current Automated Coverage:** ~15% of critical scenarios
**Recommendation:** Implement CRITICAL tests immediately (Scenarios 1-3, 11-14, 17)

---

## Updated Priority Hierarchy

1. **Friend Groups** (100 points) - Highest priority
2. **Time Urgency** (50 points) - Players with <30 min remaining
3. **Skill Level Preference** (30 points) - Beginner/Novice vs Intermediate/Advanced
4. **Gender Preference** (15 points) - Men's/Women's/Mixed/Random
5. **Variety Enforcement** (10 points) - Avoid recent opponents
6. **Queue Position** (FIFO) - First in, first out

---

## Test Scenarios

### 🔴 CRITICAL PRIORITY - Core Matchmaking (Must Test)

### Scenario 1: Skill Preference Over Gender
**Priority:** 🔴 CRITICAL
**Automated Test:** ❌ Missing
**What we're testing:** Skill level preference should match before gender preference

**Setup:**
- 4 players: All want "Beginner/Novice" matches, mixed genders
- 4 players: All want "Intermediate/Advanced" matches, mixed genders
- Queue order: Interleaved (beginner, int, beginner, int, etc.)

**Expected Result:**
- Match 1: All 4 beginner-preference players (regardless of gender)
- Match 2: All 4 intermediate-preference players (regardless of gender)

**How to verify:** Even though genders are mixed in queue order, skill preferences should cluster first.

---

### Scenario 2: Gender Still Matters (Within Skill Level)
**Priority:** 🔴 CRITICAL
**Automated Test:** ❌ Missing
**What we're testing:** Gender preference works within the same skill level

**Setup:**
- 4 beginner/novice players wanting "Women's Only"
- 4 beginner/novice players wanting "Men's Only"
- All have "Beginner/Novice" preference

**Expected Result:**
- Match 1: 4 women (all beginner-preference + women's preference)
- Match 2: 4 men (all beginner-preference + men's preference)

---

### Scenario 3: Skill Beats Gender (Cross-Level Test)
**Priority:** 🔴 CRITICAL
**Automated Test:** ❌ Missing
**What we're testing:** Skill preference overrides gender preference

**Setup:**
Position 1-4 (in queue first):
- 2 beginner females wanting "Women's Only"
- 2 intermediate females wanting "Women's Only"

Position 5-8 (in queue second):
- 2 beginner males wanting "Random"
- 2 intermediate males wanting "Random"

**Expected Result:**
- Match 1: 2 beginner females + 2 beginner males (skill match beats gender preference)
- Match 2: 2 intermediate females + 2 intermediate males

**Why:** Even though the 4 women could form a women's-only match, the skill preference is prioritized, so they'll match with players of the same skill group first.

---

### Scenario 4: Friend Group Always Wins
**Priority:** 🟡 MEDIUM
**Automated Test:** ✅ Implemented (algorithm.test.ts)
**What we're testing:** Groups override all other preferences

**Setup:**
- Position 1-2: 2 advanced solo players wanting "Intermediate/Advanced"
- Position 3-6: Group of 4 beginners (mixed skill preferences)
- Position 7-8: 2 more advanced solo players

**Expected Result:**
- Match 1: The group of 4 beginners (positions 3-6)
- Match 2: The 4 advanced solos (positions 1-2, 7-8)

---

### Scenario 5: Complex Realistic Test
**Priority:** 🟡 MEDIUM
**Automated Test:** ❌ Missing
**What we're testing:** All priorities working together

**Setup (16 players):**
1. Beginner female, wants "Beginner/Novice" + "Women's"
2. Novice female, wants "Beginner/Novice" + "Women's"
3. **GROUP START** Intermediate male, wants "Intermediate/Advanced" + "Random"
4. Intermediate female, wants "Intermediate/Advanced" + "Random"
5. Advanced male, wants "Intermediate/Advanced" + "Random"
6. **GROUP END** Advanced female, wants "Intermediate/Advanced" + "Random"
7. Beginner female, wants "Beginner/Novice" + "Women's"
8. Novice female, wants "Beginner/Novice" + "Women's"
9. Beginner male, wants "Beginner/Novice" + "Men's"
10. Novice male, wants "Beginner/Novice" + "Men's"
11. Beginner male, wants "Beginner/Novice" + "Men's"
12. Novice male, wants "Beginner/Novice" + "Men's"
13. Intermediate male, wants "Intermediate/Advanced" + "Random"
14. Intermediate female, wants "Intermediate/Advanced" + "Random"
15. Advanced male, wants "Intermediate/Advanced" + "Random"
16. Advanced female, wants "Intermediate/Advanced" + "Random"

**Expected Matching Order:**
1. **First match:** Positions 3-6 (friend group - overrides everything)
2. **Second match:** Positions 1,2,7,8 (beginner/novice skill + women's gender)
3. **Third match:** Positions 9-12 (beginner/novice skill + men's gender)
4. **Fourth match:** Positions 13-16 (intermediate/advanced skill + random gender)

---

---

### 🔴 CRITICAL PRIORITY - Constraint Handling

### Scenario 6: Constraint Relaxation - Progressive Fallback
**Priority:** 🔴 CRITICAL
**Automated Test:** ⚠️ Placeholder only (doesn't test actual behavior)
**What we're testing:** Constraint relaxation accumulates correctly (bugfix validation)

**Setup:**
- 4 beginner females all want "Beginner/Novice" + "Women's Only"
- 4 intermediate males all want "Intermediate/Advanced" + "Men's Only"
- Queue order: Interleaved

**Expected Result:**
- **NO perfect match exists** (no 4 players with matching skill AND gender preferences)
- Algorithm should progressively relax constraints:
  1. Try with all constraints → FAIL
  2. Relax variety → FAIL
  3. Relax variety + gender → **SUCCESS** (4 beginners with mixed gender)

**Why important:** Validates the constraint accumulation fix. Previously, relaxing "gender" would only relax gender (still checking skill/variety), causing matches to fail.

**How to verify:**
- Check server logs for: `[ALGORITHM] Match found after relaxing: variety, gender`
- Match should contain all 4 beginners (mixed gender)

---

---

### 🟠 HIGH PRIORITY - Session Management

### Scenario 7: Multi-Match Session Flow
**Priority:** 🟠 HIGH
**Automated Test:** ❌ Missing
**What we're testing:** Players can play multiple matches in one session

**Setup:**
1. Start with 8 players with active sessions in Building A
2. Create first match (4 players) on Court 1
3. Complete the match → Players auto-rejoin queue
4. Create second match with same 4 players on Court 2
5. Complete the match

**Expected Result:**
- ✅ All 8 players have **1 active session** throughout
- ✅ Match history shows **2 completed matches** for each of the 4 players
- ✅ Session status remains **'active'** (not completed after first match)
- ✅ Match durations are recorded (20-40 min realistic range)

**Why important:** Tests the session/match separation - sessions are facility passes, matches are individual games.

**How to verify:**
```sql
-- Check sessions (should show 1 active session per player)
SELECT p.name, COUNT(s.id) as session_count, s.status
FROM players p
JOIN sessions s ON p.id = s.player_id
GROUP BY p.id, s.status;

-- Check match history (should show 2 matches per player who played both)
SELECT p.name, COUNT(mh.id) as matches_played
FROM players p
JOIN match_history mh ON p.id = mh.player_id
GROUP BY p.id
ORDER BY matches_played DESC;
```

---

### Scenario 8: Smart Building Assignment After Rejoin
**Priority:** 🟡 MEDIUM
**Automated Test:** ❌ Missing
**What we're testing:** Building rebalancing after match completion

**Setup:**
- Building A: 4 courts, 12 waiting players
- Building B: 4 courts, 0 waiting players
- Building C: 4 courts, 0 waiting players

**Test Flow:**
1. Match 4 players from Building A on Court 1
2. Match 4 more players from Building A on Court 2
3. Complete both matches simultaneously
4. 8 players rejoin queue

**Expected Result:**
- Players should **spread across buildings** (not all return to Building A)
- Approximate distribution:
  - Building A: 2-3 players (already has 4 waiting)
  - Building B: 2-3 players (was empty, needs players)
  - Building C: 2-3 players (was empty, needs players)

**Why important:** Tests the smart building assignment algorithm that balances queue loads.

**How to verify:**
- Check server logs: `[REJOIN] Player X → building_Y (Best balance of courts and queue)`
- Query queue distribution:
```sql
SELECT building, COUNT(*) as waiting_players
FROM queue
WHERE status = 'waiting'
GROUP BY building
ORDER BY building;
```

---

### Scenario 9: Match History & Analytics Validation
**Priority:** 🟡 MEDIUM
**Automated Test:** ❌ Missing
**What we're testing:** Duration tracking and analytics calculations

**Setup:**
1. Create 3 matches across different buildings:
   - Building A, Court 1: Match at 2:00 PM, complete at 2:25 PM (25 min)
   - Building B, Court 1: Match at 2:00 PM, complete at 2:35 PM (35 min)
   - Building A, Court 2: Match at 2:30 PM, complete at 3:10 PM (40 min)

**Expected Analytics Results:**
- **Building A:**
  - Total Matches: 2
  - Avg Match Duration: 32.5 min (25+40)/2
  - Utilization: (2 matches × 32.5 min) / (4 courts × operating hours) × 100%

- **Building B:**
  - Total Matches: 1
  - Avg Match Duration: 35 min
  - Utilization: (1 match × 35 min) / (4 courts × operating hours) × 100%

**Why important:** Validates the match_history duration tracking and analytics calculations we implemented.

**How to verify:**
1. Navigate to `/admin/analytics`
2. Check "Building Utilization Report" shows correct match counts and avg durations
3. Check browser console logs: `[Analytics] building_a: { totalMatches: 2, avgMatchDuration: 32.5 }`

---

---

### 🟠 HIGH PRIORITY - Error Handling

### Scenario 10: No-Show Replacement Flow
**Priority:** 🟠 HIGH
**Automated Test:** ❌ Missing
**What we're testing:** Handling no-shows gracefully

**Setup:**
1. Queue has 8 waiting players in Building A
2. Call next 4 players for Court 1
3. Court officer marks 2 players as no-shows
4. Click "Replace No-Shows"

**Expected Result:**
- ✅ 2 no-show players removed from match suggestion
- ✅ Next 2 players from queue are called as replacements
- ✅ Final match has: 2 original verified + 2 new replacements = 4 total
- ✅ No-show players: [Decision pending - see below]

**No-Show Session Handling (To Be Decided):**

**Option A: Complete Session (Recommended)**
- No-show players' sessions marked as 'completed'
- They must re-check-in at cashier to continue playing
- **Pro:** Clear penalty, clean system state
- **Con:** Strict if player was just delayed

**Option B: Keep Session Active**
- No-show players' sessions stay 'active'
- They can manually rejoin queue later
- **Pro:** Flexible for delayed players
- **Con:** Unused sessions in system

**Why important:** Real-world scenario that needs smooth handling to keep matches flowing.

---

### 🔴 CRITICAL PRIORITY - Edge Cases & Boundary Conditions

### Scenario 11: Time Urgency Override
**Priority:** 🔴 CRITICAL
**Automated Test:** ❌ Missing
**What we're testing:** Players with <30 min remaining session time get priority over queue position

**Setup:**
- Player 1 (Position 1): 120 min remaining, beginner, wants random
- Player 2 (Position 2): 25 min remaining (URGENT), beginner, wants random
- Player 3 (Position 3): 120 min remaining, beginner, wants random
- Player 4 (Position 4): 120 min remaining, beginner, wants random
- Player 5 (Position 5): 120 min remaining, beginner, wants random

**Expected Result:**
- Match should include Player 2 (urgent) even though they're position 2
- Priority score should reflect +50 points for urgency

**Why important:** Time urgency is 2nd priority (50 points) but has ZERO tests validating it works.

---

### Scenario 12: Insufficient Players for Perfect Match
**Priority:** 🔴 CRITICAL
**Automated Test:** ❌ Missing
**What we're testing:** System handles incomplete preference matching gracefully

**Setup:**
- 3 beginners wanting "Beginner/Novice" + "Random"
- 1 intermediate wanting "Intermediate/Advanced" + "Random"
- Only 4 players total in queue

**Expected Result:**
- Algorithm relaxes skill constraint after trying all other relaxations
- Match created with all 4 players (beginner preference not fully satisfied)
- Match factors show `skill_compatible: false` or `constraints_relaxed: ['variety', 'gender', 'skill']`

**Why important:** Real-world queues won't always have perfect matches. System must degrade gracefully.

---

### Scenario 13: All Players Have Conflicting Preferences
**Priority:** 🔴 CRITICAL
**Automated Test:** ❌ Missing
**What we're testing:** Maximum constraint relaxation scenario

**Setup:**
- Player 1: Beginner + Women's Only
- Player 2: Intermediate + Men's Only
- Player 3: Advanced + Mixed
- Player 4: Novice + Random

**Expected Result:**
- Algorithm tries all constraint combinations
- Eventually creates match with fully relaxed constraints
- All 4 players matched together (preferences ignored)
- `constraints_relaxed: ['variety', 'gender', 'skill']`

**Why important:** Validates constraint relaxation doesn't infinite loop or crash.

---

### Scenario 14: Incomplete Friend Group (3 players)
**Priority:** 🔴 CRITICAL
**Automated Test:** ❌ Missing (Only tests complete groups of 4)
**What we're testing:** How system handles groups smaller than 4

**Setup:**
- Group of 3 friends (group_id: 'friends-1')
- 5 solo players in queue

**Expected Result:**
**Option A (Current Implementation?):**
- Group of 3 + 1 solo player matched together
- `is_friend_group: false` (since not all 4 are in same group)

**Option B (Alternative):**
- 4 solo players matched first
- Group of 3 waits for 1 more friend to join

**Why important:** Groups are highest priority (100 points) but behavior for incomplete groups is undefined.

---

### Scenario 15: Concurrent Court Calls (Race Condition)
**Priority:** 🟠 HIGH
**Automated Test:** ❌ Missing
**What we're testing:** Lock mechanism prevents double-assignment

**Setup:**
1. 8 players waiting in Building A
2. Court 1 officer clicks "Call Next" (locks queue)
3. **SIMULTANEOUSLY:** Court 2 officer clicks "Call Next"

**Expected Result:**
- Court 1 gets players 1-4 successfully
- Court 2 request blocked/queued until Court 1 verifies or cancels
- NO player appears in both match suggestions
- Server logs show: `[LOCK] Queue locked by court-1, court-2 request queued`

**Why important:** Prevents data corruption and bad UX (player called to 2 courts).

**How to test:**
```javascript
// Vitest concurrent test
it('should prevent double-assignment with concurrent calls', async () => {
  const [match1, match2] = await Promise.all([
    callNext('court-1'),
    callNext('court-2')
  ]);

  const playerIds1 = match1.players.map(p => p.id);
  const playerIds2 = match2.players.map(p => p.id);
  const overlap = playerIds1.filter(id => playerIds2.includes(id));

  expect(overlap).toHaveLength(0); // No overlap
});
```

---

### Scenario 16: Match Completion with Empty Queue
**Priority:** 🟠 HIGH
**Automated Test:** ❌ Missing
**What we're testing:** Rejoin logic when no other players waiting

**Setup:**
1. 4 players finish a match
2. Queue is empty (no one else waiting)
3. Players try to rejoin

**Expected Result:**
**Option A:** Players rejoin their original building, wait for others
**Option B:** System suggests they spread across buildings for future balance
**Option C:** Players rejoin but with notification "No matches available yet"

**Why important:** Edge case that will happen during slow hours.

---

### Scenario 17: Building with All Courts Occupied
**Priority:** 🟠 HIGH
**Automated Test:** ❌ Missing
**What we're testing:** System handles "no available courts" gracefully

**Setup:**
- Building A: 4 courts, all occupied with active matches
- Building A: 8 players waiting in queue
- Court officer tries to call next

**Expected Result:**
**Option A (Best):** UI shows "All courts occupied" and prevents call
**Option B:** Call works but match can't start until a court opens
**Option C:** System auto-assigns to next available court when one opens

**Why important:** Prevents confusion and bad UX when facility is at capacity.

**SQL to verify:**
```sql
-- Check available courts
SELECT building, COUNT(*) as occupied_courts
FROM matches
WHERE status = 'active'
GROUP BY building;
```

---

### Scenario 18: Same Player in Queue Twice (Data Integrity)
**Priority:** 🟡 MEDIUM
**Automated Test:** ❌ Missing
**What we're testing:** System prevents duplicate queue entries

**Setup:**
1. Player checks in and joins Building A queue
2. **Bug/exploit:** Player somehow gets added to queue again

**Expected Result:**
- Database constraint prevents duplicate (UNIQUE on player_id + building)
- OR: Application logic checks before inserting
- Error returned: "Player already in queue"

**Why important:** Data integrity check. Should be impossible but needs validation.

**How to test:**
```sql
-- Try to insert duplicate
INSERT INTO queue (player_id, building, status, position)
VALUES ('player-1', 'building_a', 'waiting', 2);
-- Should FAIL if player-1 already in building_a queue
```

---

## How to Run Tests

### Step 1: Reset Database with Fresh Data
```bash
cd C:\Users\PC\OneDrive\Desktop\pickleball\pickleball-queue
npx supabase db reset --local
```

This loads the 20 test players from `seed.sql`.

### Step 2: Open Test Scenarios File
Open `supabase/test_scenarios_updated.sql` and you'll see 5 scenarios with SQL setup code.

### Step 3: Run a Scenario

**Option A: Using Supabase Studio**
1. Open http://localhost:54323 (Supabase Studio)
2. Go to "SQL Editor"
3. Copy the ENTIRE scenario (from `BEGIN;` to `ROLLBACK;`)
4. Click "Run"
5. View the queue output at the bottom

**Option B: Using psql (if installed)**
```bash
psql postgresql://postgres:postgres@localhost:54322/postgres
# Then paste the scenario SQL
```

### Step 4: Test in the App

1. After running scenario SQL, open your app: http://localhost:3000/admin
2. Click "Call Next" for Building A
3. **Verify the match:** Does it match your expected players?
4. Check the "Match Factors" section to see which constraints were met
5. The scenario will ROLLBACK automatically, so you can test the next one

### Step 5: Verify Results

For each scenario, check:
- ✅ Are the right 4 players matched?
- ✅ Is the priority score correct?
- ✅ Are the match factors (skill_compatible, gender_compatible) accurate?
- ✅ Did higher-priority constraints win over lower-priority ones?

---

## Quick Test Reference

### Core Matchmaking Logic (Scenarios 1-5)
**To test that Skill > Gender:**
Run Scenario 3 and verify that skill-matched players (even of different genders) match before gender-matched players of different skill levels.

**To test that Groups > Everything:**
Run Scenario 4 and verify the group matches first even though solo players have better skill/gender matches.

**To test realistic complexity:**
Run Scenario 5 which combines all priorities.

### Advanced Features (Scenarios 6-10)
**To test constraint relaxation (bugfix):**
Run Scenario 6 and verify algorithm relaxes variety → variety+gender → variety+gender+skill progressively.

**To test multi-match sessions:**
Run Scenario 7 and verify players can play 2+ matches without re-checking in.

**To test smart building assignment:**
Run Scenario 8 and verify players spread across buildings after rejoining (not all to same building).

**To test analytics accuracy:**
Run Scenario 9 and verify match durations and utilization calculations are correct.

**To test no-show handling:**
Run Scenario 10 and verify replacement flow works smoothly.

---

## Debugging Tips

### If matches don't work as expected:

1. **Check player preferences:**
   ```sql
   SELECT p.name, p.skill_level, pp.skill_level_pref, pp.gender_pref
   FROM players p
   JOIN player_preferences pp ON p.id = pp.player_id
   ORDER BY p.name;
   ```

2. **Check queue state:**
   ```sql
   SELECT q.position, p.name, p.skill_level, pp.skill_level_pref, pp.gender_pref
   FROM queue q
   JOIN players p ON q.player_id = p.id
   JOIN player_preferences pp ON p.id = pp.player_id
   ORDER BY q.position;
   ```

3. **Check for active sessions:**
   ```sql
   SELECT p.name, s.status, s.start_time
   FROM sessions s
   JOIN players p ON s.player_id = p.id
   WHERE s.status = 'active';
   ```

4. **View browser console:** Open DevTools (F12) and check for API errors

---

## Expected Behavior Summary

### Matchmaking Priorities
✅ **Skill preference is MORE important than gender preference**
- A beginner wanting "Beginner/Novice" will match with other beginners/novices first
- Even if they want "Women's Only", they'll match with beginner males over intermediate females

✅ **Gender preference still matters within skill level**
- If 4 beginner females all want "Women's Only", they'll match together
- If 4 beginner males all want "Men's Only", they'll match together

✅ **Friend groups always win**
- A group of 4 will match before any solo players, regardless of skill or gender

✅ **Constraint relaxation accumulates progressively**
- If perfect matches aren't available, the system relaxes constraints **cumulatively**:
  1. First relax variety only: `['variety']`
  2. Then relax variety + gender: `['variety', 'gender']`
  3. Last resort: relax all three: `['variety', 'gender', 'skill']`
- **Important:** Constraints accumulate, they don't replace each other

### Session & Match Flow
✅ **Sessions are facility passes, not individual matches**
- One check-in = one 5-hour session
- Players can play multiple matches during one session
- Session stays 'active' until player leaves or 5 hours expire

✅ **Players auto-rejoin after completing matches**
- When a match completes, players automatically rejoin the queue
- They're assigned to the optimal building (balances queue loads)
- Session remains active for next match

✅ **Match history tracks actual durations**
- When match starts: records start_time
- When match ends: records end_time and calculates duration_minutes
- Analytics use actual durations, not estimates

### Concurrency & No-Shows
✅ **Only one court can verify players at a time**
- When court officer calls next and verifies players, other courts are locked
- Prevents same players being called for multiple courts
- Lock releases when match starts or is cancelled

✅ **No-show players can be replaced**
- Court officer unchecks no-show players
- Clicks "Replace No-Shows"
- System calls next N players from queue to fill slots

---

## 📋 Test Implementation Priority

### Implement IMMEDIATELY (Before Production)

These tests protect core functionality and prevent critical bugs:

1. **Scenario 1-3:** Priority hierarchy (Skill > Gender) ❌
2. **Scenario 6:** Constraint relaxation accumulation ⚠️ (Placeholder only)
3. **Scenario 11:** Time urgency override ❌
4. **Scenario 12-13:** Incomplete/conflicting preferences ❌
5. **Scenario 14:** Incomplete friend groups ❌
6. **Scenario 17:** All courts occupied ❌

**Estimated effort:** 2-3 hours for all critical automated tests

---

### Implement SOON (This Week)

These tests protect important flows and error handling:

7. **Scenario 7:** Multi-match session flow ❌
8. **Scenario 10:** No-show replacement ❌
9. **Scenario 15:** Concurrent court calls (race condition) ❌
10. **Scenario 16:** Empty queue rejoin ❌

**Estimated effort:** 2-3 hours

---

### Nice to Have (When Time Permits)

These tests validate analytics and optimization features:

11. **Scenario 5:** Complex realistic test ❌
12. **Scenario 8:** Building rebalancing ❌
13. **Scenario 9:** Analytics calculations ❌
14. **Scenario 18:** Duplicate queue entries ❌

**Estimated effort:** 1-2 hours

---

## 🎯 Testing Checklist

### Before Production Launch:
- [ ] All CRITICAL scenarios have automated tests
- [ ] All CRITICAL scenarios pass manual testing
- [ ] Constraint relaxation accumulation validated (Scenario 6)
- [ ] Time urgency tested with real session times (Scenario 11)
- [ ] Concurrent court calls tested under load (Scenario 15)
- [ ] No-show replacement flow tested end-to-end (Scenario 10)

### Before Each Release:
- [ ] Run full test suite (`npm test`)
- [ ] Manual smoke test of Scenarios 1-6
- [ ] Check analytics calculations (Scenario 9)
- [ ] Verify building rebalancing (Scenario 8)

### Continuous Monitoring (Production):
- [ ] Monitor constraint relaxation logs
- [ ] Track match success rate (% of players matched within 30 min)
- [ ] Alert if same player assigned to 2 courts (Scenario 15)
- [ ] Track no-show rate and replacement usage (Scenario 10)
