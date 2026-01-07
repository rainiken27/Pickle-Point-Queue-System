---
title: 'Queue Enhancements - Stats Tracking, Leaderboard, Time Limits & UX Improvements'
slug: 'queue-enhancements-stats-leaderboard'
created: '2026-01-06'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Next.js 16', 'React 18', 'TypeScript', 'Supabase', 'Tailwind CSS 4', 'Zustand', 'Vitest', 'Lucide React']
files_to_modify: [
  'types/session.ts',
  'types/player.ts',
  'types/queue.ts',
  'store/index.ts',
  'store/queueSlice.ts',
  'store/courtSlice.ts',
  'store/buildingSlice.ts',
  'app/admin/page.tsx',
  'app/display/page.tsx',
  'app/api/sessions/complete/route.ts',
  'app/api/queue/rejoin/route.ts',
  'lib/session/timer.ts',
  'lib/matchmaking/algorithm.ts',
  'supabase/migrations/20260101000006_create_match_history_table.sql'
]
code_patterns: [
  'Zustand store slices with persist middleware',
  'Supabase server/client split for API routes vs client code',
  'TypeScript interfaces in /types with strict typing',
  'Next.js API routes with Zod validation (SessionCompleteSchema)',
  'Real-time subscriptions via Supabase for admin dashboard',
  'Timer calculations using Date objects and elapsed/remaining milliseconds',
  'useShallow selector pattern for optimal Zustand re-renders'
]
test_patterns: [
  'Vitest with jsdom environment',
  'Mock Supabase with vi.mock',
  'Helper functions to create test fixtures (createQueueEntry)',
  'Tests in *.test.ts files alongside source code'
]
---

# Tech-Spec: Queue Enhancements - Stats Tracking, Leaderboard, Time Limits & UX Improvements

**Created:** 2026-01-06

## Overview

### Problem Statement

The current pickleball queue management system lacks critical features for player engagement and operational efficiency:

1. **No Performance Tracking** - Players have no way to see their wins, games played, or compete on a leaderboard, reducing engagement and competitive motivation
2. **No Court Time Enforcement** - Games can run indefinitely with no per-court time limits, causing queue delays and inefficient court utilization
3. **Limited Session Visibility** - Players in queue cannot see their remaining 5-hour session time, leading to confusion and missed opportunities
4. **Poor Queue UX** - Court officers cannot reorder queue positions via drag-and-drop, requiring manual database edits or workarounds
5. **Incomplete Court Display** - TV displays show court status but not which players are actively playing, reducing transparency
6. **Auto-Rejoin Issues** - Players automatically rejoin queue after games without court officer validation, enabling potential abuse
7. **Queue Position Bug** - When players are called to court, remaining players' positions don't update visually in the UI
8. **Over-Complex Architecture** - 3-building system adds unnecessary complexity when facility only needs 6 courts total

### Solution

Implement comprehensive queue enhancements across statistics, time management, and UX:

**Player Statistics & Leaderboard:**
- Create `player_stats` table (lifetime wins/games) and `player_stats_yearly` table (historical yearly data)
- Implement match history tracking with team scores, winner designation, and daily retention
- Build `/leaderboard` page showing top 10 players sorted by lifetime wins

**Time Management:**
- Display 5-hour session countdown beside each player in queue (admin dashboard + TV displays, format HH:MM:SS)
- Implement 20-minute per-court time limit with countdown, auto-alert, and auto-end session functionality

**Queue Flow & Management:**
- Remove auto-rejoin after session complete; add "Scan to Rejoin Queue" button for court officer workflow
- Add drag-and-drop queue reordering in admin dashboard with real-time position sync
- Fix queue position display bug (ensure UI refreshes when positions change)

**Visual Enhancements:**
- Show 4 player profile pictures (80px each) on TV display for courts in use
- Change available court color from green to amber/gold (`bg-amber-500`)

**Architecture Simplification:**
- Remove 3-building system, consolidate to single facility with 6 courts total

### Scope

**In Scope:**

1. ✅ Display 5-hour session countdown timer beside each player in queue (both TV display and admin dashboard, format: `HH:MM:SS`)
2. ✅ Create `player_stats` table for lifetime totals (`lifetime_wins`, `lifetime_games_played`)
3. ✅ Create `player_stats_yearly` table for historical yearly data (one record per player per year)
4. ✅ Create `match_history` table to track daily match results with team scores and winners (auto-delete records older than 24 hours)
5. ✅ Build `/leaderboard` page showing top 10 players sorted by lifetime wins
6. ✅ Modify queue flow: remove auto-rejoin after session complete, add "Scan to Rejoin Queue" button in admin dashboard
7. ✅ Implement 20-minute per-court time limit with countdown display on admin dashboard court cards and TV display
8. ✅ Auto-alert and auto-end session when 20-minute court limit is reached
9. ✅ Award wins to winning team (2 players in doubles) when court officer enters final score
10. ✅ Enhance TV display court cards to show 4 player profile pictures (80px each) for courts in use
11. ✅ Change available court color from `bg-green-600` to `bg-amber-500`
12. ✅ Fix queue position display bug (position updates in database but UI doesn't re-render)
13. ✅ Add drag-and-drop queue reordering in `/admin` dashboard with real-time position updates synced to TV displays
14. ✅ Remove 3-building architecture (`building_a`, `building_b`, `building_c`), consolidate to single facility with 6 courts
15. ✅ Intelligent team assignment: respect friend groups (queued together stay together), random assignment for solo players, court officer can override when entering score

**Out of Scope:**

- ❌ Building-specific features, multi-location routing, building preferences
- ❌ Advanced analytics (win rate trends, opponent analysis, performance graphs)
- ❌ Mobile app or player-facing stat interfaces
- ❌ Historical match data retention beyond current day
- ❌ ELO ratings, skill tier promotions, or advanced ranking algorithms
- ❌ Tournament mode or bracket systems
- ❌ Player awards or badges
- ❌ Social features (friend lists, challenges)

## Context for Development

### Codebase Patterns

**Tech Stack:**
- Next.js 16 with App Router
- React 18+ with TypeScript
- Supabase (PostgreSQL database, real-time subscriptions, auth)
- Zustand for global state management
- Tailwind CSS 4 for styling
- Lucide React for icons

**Current Architecture:**
- `/app/admin/page.tsx` - Court officer dashboard (12-court grid, queue management, match calling)
- `/app/display/page.tsx` - TV display overview (all buildings)
- `/app/display/[building]/page.tsx` - Building-specific TV displays
- `/app/cashier/page.tsx` - Player check-in interface (QR scanning)
- `/store/index.ts` - Zustand store with slices (courts, queue, players, buildings)
- `/lib/matchmaking/algorithm.ts` - Matchmaking priority logic
- `/lib/session/timer.ts` - 5-hour session timer tracking
- `/types/*.ts` - TypeScript interfaces (Player, QueueEntry, Court, Session)

**Database Schema (Current):**
- `players` - id, qr_uuid, name, photo_url, skill_level, gender
- `queue_entries` - id, player_id, group_id, position, building, status, joined_at
- `courts` - id, court_number, building, status
- `sessions` - id, player_id, court_id, started_at, ended_at, duration_minutes

**Real-Time Patterns:**
- Admin dashboard uses Supabase real-time subscriptions (`subscribeToCourts`, `subscribeToQueue`)
- TV displays use Server-Sent Events (SSE) for one-way updates
- Zustand store mutations trigger Supabase updates

**Component Patterns:**
- Atomic UI components in `/components/ui/` (Button, Card, Input)
- Feature components in `/components/` (QRScanner, TimeWarning)
- Page-level components use hooks (`useCourts`, `useQueue`) to access Zustand store

### Files to Reference

| File | Purpose | Key Findings |
| ---- | ------- | ------------ |
| `types/player.ts` | Player, PlayerProfile interfaces | Has: id, qr_uuid, name, photo_url, skill_level, gender. Need to add stats-related types |
| `types/queue.ts` | QueueEntry, QueueEntryWithPlayer interfaces | Has building field (needs removal), position field, status enum |
| `types/session.ts` | Session, BuildingType, ActiveSession types | Has BuildingType enum (remove), Session has building field (remove), already has team1_score/team2_score |
| `store/index.ts` | Zustand store with slices | Combines queueSlice, courtSlice, timerSlice, buildingSlice (remove buildingSlice) |
| `store/queueSlice.ts` | Queue state management | Has getQueueByBuilding (remove), position tracking logic exists |
| `store/courtSlice.ts` | Court status tracking | assignSession, completeSession, subscribeToCourts actions |
| `store/buildingSlice.ts` | Buildings state (REMOVE ENTIRE FILE) | Not needed after consolidation to 6 courts |
| `app/admin/page.tsx` | Court officer dashboard (100 lines read) | Has matchmaking UI, court grid, queue panel. Needs: drag-drop queue, 20-min timer, scan-to-rejoin button |
| `app/display/page.tsx` | TV display overview (100 lines read) | Shows 3 building columns with courts and queue. Needs: consolidate to 1 column, add timers, show 4 player photos per court |
| `app/display/building-a/page.tsx` | Building-specific displays (DELETE THESE) | Remove after consolidation |
| `lib/session/timer.ts` | 5-hour timer calculation logic | Has calculateSessionTime, shouldShowSoftWarning, isInGracePeriod. Use as pattern for 20-min court timer |
| `lib/matchmaking/algorithm.ts` | Matchmaking priority algorithm | Has MatchmakingEngine class. Add team assignment logic here |
| `lib/matchmaking/buildingAssignment.ts` | Building routing logic (DELETE) | Not needed after consolidation |
| `app/api/sessions/complete/route.ts` | Complete session endpoint | Currently updates session with team scores. Needs: create match_history, update player_stats |
| `app/api/queue/rejoin/route.ts` | Auto-rejoin logic (MODIFY) | Currently auto-rejoins players after game. Change to require manual court officer scan |
| `supabase/migrations/20260101000006_create_match_history_table.sql` | Match history schema | **WRONG SCHEMA**: Has session_id, player_id, opponent_ids[]. Needs: court_id, 4 player columns, team scores, winning_team |
| `vitest.config.ts` | Vitest test configuration | Configured with jsdom, setupFiles, coverage with v8 provider |

### Technical Decisions

**Critical Discovery: Existing Database Issues**

1. **`match_history` table exists but has WRONG schema:**
   - Current: session_id, player_id, opponent_ids[] (array of UUIDs)
   - Required: court_id, team_a_player_1_id, team_a_player_2_id, team_b_player_1_id, team_b_player_2_id, team_a_score, team_b_score, winning_team, played_date
   - **Action:** Create new migration to ALTER table structure

2. **Courts currently: 9 courts (3 per building)**
   - Latest migration (20260105000001) reduced from 12 to 9 courts
   - User wants 6 courts total
   - **Action:** Create migration to delete 3 courts and renumber to 1-6

3. **Buildings table exists** (20260105000002)
   - **Action:** Create migration to drop buildings table

4. **Building references scattered throughout codebase:**
   - `BuildingType` enum in types/session.ts
   - `building` column in courts, sessions, queue tables
   - `buildingSlice.ts` in Zustand store
   - `/app/display/building-a/`, `/app/display/building-b/`, `/app/display/building-c/` pages
   - `lib/matchmaking/buildingAssignment.ts` module
   - **Action:** Systematic removal across all files

**Database Schema Changes:**

1. **New Tables:**
   - `player_stats` (lifetime totals: player_id UNIQUE, lifetime_wins, lifetime_games_played)
   - `player_stats_yearly` (yearly history: player_id + year UNIQUE, wins, games_played)
   - `match_history` (daily matches: court_id, team_a/b player IDs, scores, winning_team, played_date)

2. **Schema Modifications:**
   - Remove `building` field from `courts`, `queue_entries`, `sessions` tables
   - Add `court_timer_started_at` to `sessions` for 20-minute per-court tracking
   - Consolidate to 6 courts total (court_number 1-6)

**Team Assignment Logic:**
- If players queued as 2-person group → same team
- If 4 solo players → random team assignment
- If mixed (1 group + 2 solos) → group on Team A, solos on Team B
- Court officer can override teams when entering score via drag UI

**Countdown Timer Implementation:**
- 5-hour timer: Read `sessions.started_at`, calculate remaining time client-side
- 20-minute court timer: Read `sessions.court_timer_started_at`, calculate remaining time
- Format: `HH:MM:SS` using `lib/session/timer.ts` patterns
- Update every second via `setInterval` in React component

**Queue Position Bug Fix:**
- Root cause: Zustand store updates but React component doesn't re-render
- Solution: Ensure queue list component subscribes to specific Zustand selectors that trigger re-renders
- Use Zustand shallow equality checks to prevent unnecessary renders

**Drag-and-Drop Queue:**
- Library: `@dnd-kit/core` and `@dnd-kit/sortable` (modern, accessible, touch-friendly)
- On drop: Update `queue_entries.position` in Supabase, trigger real-time sync to TV displays
- Optimistic UI updates in Zustand store

**Session vs Match Model (CRITICAL CLARIFICATION):**
- **sessions table** = 5-hour facility check-in session (1 per player, tracks check-in time)
- **Match/game on court** = 4 players playing doubles (NOT stored in sessions table)
- **How to get 4 players on a court:** Query `queue` entries with `status='playing'` AND `court_id=X`
- **20-minute court timer:** Stored in `courts` table as `court_timer_started_at` (per-court, not per-player)
- **Match completion:** When court officer completes, fetch 4 players from queue by court_id, create match_history with their IDs

**Match History Cleanup:**
- Supabase Edge Function (server-side cron) deletes `match_history WHERE played_date < CURRENT_DATE`
- Run at midnight facility timezone via Supabase scheduled function
- Implementation tasks added: Task 46-48

## Implementation Plan

### Tasks

**Phase 1: Database Foundation (Do First)**

- [ ] Task 1: Install required NPM packages
  - File: `package.json`
  - Action: Run `npm install @dnd-kit/core @dnd-kit/sortable date-fns`
  - Notes: Required for drag-drop queue and timer formatting

- [ ] Task 2: Create player_stats table migration
  - File: `supabase/migrations/20260107000001_create_player_stats_table.sql`
  - Action: Create table with player_id (UNIQUE), lifetime_wins, lifetime_games_played, updated_at
  - Notes: Enable RLS, add index on player_id

- [ ] Task 3: Create player_stats_yearly table migration
  - File: `supabase/migrations/20260107000002_create_player_stats_yearly_table.sql`
  - Action: Create table with player_id, year, wins, games_played, UNIQUE(player_id, year)
  - Notes: Enable RLS, add composite index on (player_id, year)

- [ ] Task 4: Restructure match_history table
  - File: `supabase/migrations/20260107000003_restructure_match_history_table.sql`
  - Action: Drop existing match_history, recreate with court_id, team_a_player_1_id, team_a_player_2_id, team_b_player_1_id, team_b_player_2_id, team_a_score, team_b_score, winning_team, played_at, played_date
  - Notes: Keep RLS policies, add indexes on played_date for daily cleanup

- [ ] Task 5: Remove building architecture from database (WITH SAFETY CHECKS)
  - File: `supabase/migrations/20260107000004_remove_buildings_architecture.sql`
  - Action: (1) PRE-FLIGHT CHECK: Verify no active sessions/queue entries exist (fail migration if any found), (2) Drop building column from courts, sessions, queue tables (these are NOT NULL, so must be empty), (3) Drop buildings table entirely, (4) Include rollback script in migration comments
  - Notes: F3 fix - REQUIRE EMPTY FACILITY before running. Add pre-flight: `DO $$ BEGIN IF EXISTS (SELECT 1 FROM sessions WHERE status='active') THEN RAISE EXCEPTION 'Cannot migrate: active sessions exist'; END IF; END $$;`

- [ ] Task 6: Consolidate to 6 courts total
  - File: `supabase/migrations/20260107000005_consolidate_to_6_courts.sql`
  - Action: Delete 3 courts (keep courts 1-6), renumber sequentially, update constraint to CHECK (court_number >= 1 AND court_number <= 6)
  - Notes: Remove building UNIQUE constraint, add simple UNIQUE on court_number only

- [ ] Task 7: Add court timer field to courts table
  - File: `supabase/migrations/20260107000006_add_court_timer_to_courts.sql`
  - Action: ALTER courts table ADD COLUMN court_timer_started_at TIMESTAMPTZ
  - Notes: This tracks when the 20-minute court countdown started (per-court, not per-player session)

- [ ] Task 8: Test migrations in staging, then production
  - File: Terminal
  - Action: (1) Backup production database first, (2) Test in staging: `npx supabase db reset --db-url=$STAGING_DB_URL`, (3) Verify schema in Supabase Studio, (4) Run test suite, (5) Apply to production with rollback plan ready, (6) Regenerate TypeScript types: `supabase gen types typescript`
  - Notes: F14 fix - NEVER run db reset in production without backup. F3 fix - Test destructive migrations in staging first.

**Phase 2: Type System Updates**

- [ ] Task 9: Update session types
  - File: `types/session.ts`
  - Action: Remove BuildingType enum export; remove building field from Session interface; add court_timer_started_at?: string | null to Session
  - Notes: Keep team1_score and team2_score fields (already exist)

- [ ] Task 10: Create stats types
  - File: `types/stats.ts` (NEW FILE)
  - Action: Create PlayerStats, PlayerStatsYearly, MatchHistory interfaces matching new database schema
  - Notes: Export types for use in API routes and components

- [ ] Task 11: Update queue types
  - File: `types/queue.ts`
  - Action: Remove building field from QueueEntry interface; remove building from NewQueueEntry
  - Notes: Keep position, status, player_id fields intact

- [ ] Task 12: Create court timer types
  - File: `types/court.ts` (NEW FILE if doesn't exist, or add to session.ts)
  - Action: Create ActiveCourt interface extending Court with court_timer_remaining_minutes, court_timer_elapsed_minutes, is_timer_warning
  - Notes: Mirror pattern from ActiveSession in session.ts

**Phase 3: Backend Logic - Stats Tracking**

- [ ] Task 13: Create Supabase RPC for atomic stats update
  - File: `supabase/migrations/20260107000007_create_stats_update_rpc.sql`
  - Action: Create stored procedure `complete_match_with_stats(court_id, team_a_player_ids, team_b_player_ids, team_a_score, team_b_score, winning_team)` that atomically: (1) inserts match_history, (2) updates player_stats for all 4 players, (3) upserts player_stats_yearly
  - Notes: MUST use transaction to prevent partial updates (F5 fix). Returns success or rolls back entirely. Extract current year inside function.

- [ ] Task 14: Create match history utility function
  - File: `lib/stats/createMatchHistory.ts` (NEW FILE)
  - Action: Create function `createMatchHistory(courtId, teamAPlayers, teamBPlayers, teamAScore, teamBScore, winningTeam)` that inserts match_history record
  - Notes: Return created record or throw error

- [ ] Task 15: Modify session complete API to track stats
  - File: `app/api/sessions/complete/route.ts`
  - Action: (1) Fetch 4 players from queue WHERE court_id=X AND status='playing', (2) Determine winning team based on scores, (3) Call Supabase RPC complete_match_with_stats with player IDs and scores, (4) Handle tie scores (mark as no winner), (5) Add idempotency check using court_id+timestamp
  - Notes: Transaction handled by RPC (F5 fix). Add database-level locking: SELECT * FROM courts WHERE id=? FOR UPDATE NOWAIT (F2 fix)

**Phase 4: Queue Flow Change - Manual Rejoin**

- [ ] Task 16: Modify auto-rejoin API to require manual trigger
  - File: `app/api/queue/rejoin/route.ts`
  - Action: Change logic to NOT auto-rejoin; instead, only rejoin when explicitly called with player_id parameter; rename to `/api/queue/rejoin-player`
  - Notes: Court officer will call this after scanning QR code

- [ ] Task 17: Create QR scan to rejoin endpoint
  - File: `app/api/queue/scan-to-rejoin/route.ts` (NEW FILE)
  - Action: Accept qr_uuid, validate player, check if player was recently playing, add to queue at end position
  - Notes: Return success message with queue position

**Phase 5: Timer Logic - 5-Hour and 20-Minute**

- [ ] Task 18: Create 20-minute court timer utility
  - File: `lib/session/courtTimer.ts` (NEW FILE)
  - Action: Create functions calculateCourtTime(session), shouldAlertCourtTimer(session), hasCourtTimerExpired(session) mirroring patterns from lib/session/timer.ts
  - Notes: Use 20-minute constant (20 * 60 * 1000 ms)

- [ ] Task 19: Add 5-hour countdown formatting helper
  - File: `lib/session/timer.ts`
  - Action: Add function formatCountdown(remainingMinutes: number): string that returns "HH:MM:SS" format
  - Notes: Use date-fns or manual calculation

- [ ] Task 20: Create server-side cron for court timer auto-end
  - File: `supabase/functions/auto-end-court-timers/index.ts` (NEW FILE)
  - Action: Supabase Edge Function that checks courts WHERE court_timer_started_at + 20 minutes + 2 minutes grace < NOW, fetches 4 players from queue, determines winner by higher score (or marks incomplete if tie/NULL), calls complete_match_with_stats RPC
  - Notes: F2 fix - Server-side prevents race conditions. F11 fix - 2-minute grace period for score entry. Schedule via Supabase cron to run every minute.

**Phase 6: Frontend - Admin Dashboard Updates**

- [ ] Task 21: Add "Scan to Rejoin Queue" button to admin dashboard
  - File: `app/admin/page.tsx`
  - Action: Add button near QR scanner UI; on click, open QR scanner modal; on scan, call `/api/queue/scan-to-rejoin` with qr_uuid
  - Notes: Show success toast with queue position

- [ ] Task 22: Display 20-minute court timer on court cards
  - File: `app/admin/page.tsx`
  - Action: For each occupied court, fetch session.court_timer_started_at, calculate remaining time using courtTimer.ts, display countdown in MM:SS format
  - Notes: Update every second with setInterval, show warning at 5 minutes, alert at 1 minute

- [ ] Task 23: Add drag-and-drop queue reordering
  - File: `app/admin/page.tsx`
  - Action: Wrap queue list in DndContext from @dnd-kit/core; make each queue item draggable using useSortable; on drop, call API to update positions
  - Notes: Use SortableContext and arrayMove from @dnd-kit/sortable

- [ ] Task 24: Create API endpoint to update queue positions with conflict detection
  - File: `app/api/queue/update-positions/route.ts` (NEW FILE)
  - Action: (1) Accept array of {id, position, updated_at}, (2) Use optimistic locking: UPDATE queue SET position=?, updated_at=NOW() WHERE id=? AND updated_at=?, (3) If 0 rows updated, return conflict error, (4) Wrap in transaction, (5) Trigger real-time update to TV displays
  - Notes: F7 fix - Detect concurrent edits, force reload if conflict. Add audit log for who changed queue order.

- [ ] Task 25: Display 5-hour countdown in admin queue panel (optimized)
  - File: `app/admin/page.tsx`
  - Action: (1) Use SINGLE setInterval for all timers (not one per player), (2) Store sessions in Zustand state, (3) Each timer calculates relative to shared 'now' timestamp, (4) Update 'now' every 5 seconds (not every 1 second for queue list - less critical than court timers), (5) Display beside player name in HH:MM:SS format
  - Notes: F10 fix - Performance optimization for 100+ players. Use formatCountdown helper from timer.ts.

**Phase 7: Frontend - TV Display Updates**

- [ ] Task 26: Consolidate TV display to single 6-court view
  - File: `app/display/page.tsx`
  - Action: Remove 3-building column layout; create single column with 6 courts; remove building filter logic
  - Notes: Delete `/app/display/building-a/`, `/building-b/`, `/building-c/` page directories

- [ ] Task 27: Display 5-hour countdown in TV queue list
  - File: `app/display/page.tsx`
  - Action: For each queue entry, show remaining session time beside player name in HH:MM:SS format
  - Notes: Same logic as admin dashboard

- [ ] Task 28: Display 20-minute court timer on TV courts
  - File: `app/display/page.tsx`
  - Action: For each occupied court, show court timer countdown in large text (e.g., "Game Time: 14:32")
  - Notes: Update every second, highlight in red when < 5 minutes

- [ ] Task 29: Show 4 player profile pictures on occupied courts
  - File: `app/display/page.tsx`
  - Action: For each court with status='occupied', fetch 4 players from queue entries with status='playing' and court_id matching; display 80px profile photos in 2x2 grid
  - Notes: Use player.photo_url, add fallback for missing photos

- [ ] Task 30: Change available court color to amber/gold
  - File: `app/display/page.tsx`
  - Action: Find all instances of `bg-green-600` for available courts, replace with `bg-amber-500`
  - Notes: Also update any related color classes (text-green, border-green, etc.)

**Phase 8: Leaderboard Feature**

- [ ] Task 31: Create leaderboard page
  - File: `app/leaderboard/page.tsx` (NEW FILE)
  - Action: Create Next.js page that fetches top 10 players from player_stats ordered by lifetime_wins DESC; display in table with rank, name, photo, wins, games played
  - Notes: Add link to this page in admin dashboard navigation

- [ ] Task 32: Create leaderboard API endpoint with deterministic tie-breaking
  - File: `app/api/leaderboard/top-players/route.ts` (NEW FILE)
  - Action: Query player_stats joined with players, ORDER BY lifetime_wins DESC, lifetime_games_played ASC (fewer games = more efficient), player_name ASC (final tie-breaker) LIMIT 10, return player data
  - Notes: F9 fix - Deterministic sort prevents random reordering. Add composite index: CREATE INDEX idx_leaderboard ON player_stats(lifetime_wins DESC, lifetime_games_played ASC). Cache for 5 minutes.

**Phase 9: Zustand Store Updates**

- [ ] Task 33: Remove buildings slice from Zustand store
  - File: `store/index.ts`
  - Action: Remove import of createBuildingSlice; remove BuildingSlice from StoreState type; remove from store creation; remove useBuildings selector
  - Notes: Delete `store/buildingSlice.ts` file entirely

- [ ] Task 34: Remove building filter from queue slice
  - File: `store/queueSlice.ts`
  - Action: Remove getQueueByBuilding function; update fetchQueue to not filter by building
  - Notes: Queue is now facility-wide, not per-building

- [ ] Task 35: Add court timer state to timer slice
  - File: `store/timerSlice.ts`
  - Action: Add courtTimers: Record<string, ActiveCourt> to state; add actions updateCourtTimer, expireCourtTimer
  - Notes: Court timers tracked separately from session timers

**Phase 10: Bug Fixes**

- [ ] Task 35.5: Investigate root cause of queue position bug
  - File: Investigation / Debugging
  - Action: (1) Enable Zustand devtools to trace state updates, (2) Add console.log to subscribeToQueue to verify position field updates, (3) Check React component selector pattern (useShallow), (4) Verify Supabase real-time subscription filter includes position field, (5) Document findings before attempting fix
  - Notes: F4 fix - Must understand root cause before fixing

- [ ] Task 36: Fix queue position display bug (based on investigation)
  - File: `app/admin/page.tsx` (queue component)
  - Action: Apply fix based on Task 35.5 findings. Likely solutions: (A) Force new reference in selector to trigger re-render, OR (B) Ensure Supabase subscription includes position field, OR (C) Fix position recalculation logic after players called
  - Notes: Add regression test to verify position updates trigger re-renders. Document the fix in code comments.

**Phase 11: Team Assignment Logic**

- [ ] Task 37: Add intelligent team assignment to matchmaking with all scenarios covered
  - File: `lib/matchmaking/algorithm.ts`
  - Action: In MatchmakingEngine class, add method assignTeams(players: Player[]): {teamA: Player[], teamB: Player[]} that handles: (1) 2 groups of 2: Group1=TeamA, Group2=TeamB, (2) 1 group of 2 + 2 solos: Group=TeamA, Solos=TeamB, (3) 4 solos: Random split, (4) 1 group of 3+: REJECT (doubles requires max 2-person groups), (5) 1 group of 4: REJECT or split group (clarify with user)
  - Notes: F8 fix - All scenarios defined. Add validation to reject invalid configurations. Return team assignments when generating match suggestions.

- [ ] Task 38: Add team override UI in session complete flow
  - File: `app/admin/page.tsx`
  - Action: When court officer clicks "Complete Session", show modal with 4 player names, allow drag-drop between Team A and Team B sections before entering scores
  - Notes: Use @dnd-kit for team assignment drag-drop

**Phase 12: Cleanup & Delete Building References**

- [ ] Task 39: Delete building-specific display pages
  - File: File system
  - Action: Delete `/app/display/building-a/`, `/app/display/building-b/`, `/app/display/building-c/` directories
  - Notes: Update navigation links if any

- [ ] Task 40: Delete building assignment module
  - File: `lib/matchmaking/buildingAssignment.ts`
  - Action: Delete entire file (no longer needed)
  - Notes: Remove any imports of this module from other files

- [ ] Task 41: Search and remove all BuildingType references
  - File: Multiple files (types, components, API routes)
  - Action: Search codebase for "BuildingType", "building:", "building_a", "building_b", "building_c" and remove/refactor all references
  - Notes: Use IDE global search to find all occurrences

**Phase 13: Testing**

- [ ] Task 42: Write unit tests for stats update logic
  - File: `lib/stats/updatePlayerStats.test.ts` (NEW FILE)
  - Action: Test incrementing wins for winning team only, incrementing games for all players, yearly record upserts
  - Notes: Mock Supabase, use Vitest patterns from algorithm.test.ts

- [ ] Task 43: Write unit tests for team assignment logic
  - File: `lib/matchmaking/algorithm.test.ts`
  - Action: Add tests for assignTeams function: friend groups stay together, solo players random split, mixed scenarios
  - Notes: Extend existing test suite

- [ ] Task 44: Write integration test for complete session with stats
  - File: `app/api/sessions/complete/route.test.ts` (NEW FILE)
  - Action: Test full flow: complete session → match history created → player stats updated
  - Notes: Mock Supabase transactions

- [ ] Task 45: Manual testing checklist
  - File: Testing document or issue tracker
  - Action: Test all 9 features end-to-end: timers display, stats track, leaderboard shows, rejoin flow works, drag-drop queue, color changes, 4 photos show, bug fixed
  - Notes: Test on actual TV display hardware if possible

**Phase 14: Match History Cleanup (F6 Fix)**

- [ ] Task 46: Create daily cleanup Edge Function
  - File: `supabase/functions/cleanup-match-history/index.ts` (NEW FILE)
  - Action: Create Supabase Edge Function that deletes match_history WHERE played_date < CURRENT_DATE, logs result (number of records deleted), returns success
  - Notes: F6 fix - Implements AC2.5

- [ ] Task 47: Schedule Edge Function with Supabase cron
  - File: `supabase/migrations/20260107000008_schedule_cleanup_cron.sql`
  - Action: Schedule cleanup function to run daily at midnight facility timezone: SELECT cron.schedule('cleanup-match-history', '0 0 * * *', 'SELECT invoke_edge_function(''cleanup-match-history'')')
  - Notes: Verify cron extension is enabled in Supabase project

- [ ] Task 48: Add cleanup monitoring
  - File: `supabase/functions/cleanup-match-history/index.ts`
  - Action: Log cleanup results to separate audit table (cleanup_logs) with timestamp and count deleted, send alert if cleanup fails
  - Notes: Consider archiving to match_history_archive instead of deleting (future enhancement)

**Phase 15: Error Messages & UX (F13 Fix)**

- [ ] Task 49: Create error message constants file
  - File: `lib/constants/errorMessages.ts` (NEW FILE)
  - Action: Define ERROR_MESSAGES object with user-friendly messages: INVALID_QR, PLAYER_NOT_FOUND, SESSION_EXPIRED, QUEUE_FULL, CONCURRENT_EDIT_CONFLICT, AUTO_END_NO_SCORES, etc. Include actionable guidance in each message.
  - Notes: F13 fix - Centralized error messages for consistency

- [ ] Task 50: Update all API routes to use error constants
  - File: Multiple API routes
  - Action: Replace generic error messages with constants from errorMessages.ts, ensure all error responses include actionable guidance
  - Notes: Update Tasks 15, 17, 21, 24 error handling

**Phase 16: Deployment Coordination & Rollbacks (F14, F15 Fix)**

- [ ] Task 51: Create rollback scripts for all migrations
  - File: `supabase/migrations/*_rollback.sql` (6 NEW FILES)
  - Action: For each migration (Tasks 2-7), create corresponding rollback script that reverses changes: restore building columns, restore 9 courts, restore old match_history schema, etc.
  - Notes: F14 fix - Critical for production safety

- [ ] Task 52: Create backward-compatible migration strategy
  - File: `supabase/migrations/20260107000009_add_facility_id_compat.sql` (NEW FILE)
  - Action: Phase 1 migration - Add new columns (facility_id) but KEEP old columns (building). Update code to dual-read. Deploy code. Phase 2 migration (separate) - Drop old columns after code is deployed.
  - Notes: F15 fix - Prevents real-time subscription breakage during migration

- [ ] Task 53: Add feature flag for building removal
  - File: `lib/config/featureFlags.ts` (NEW FILE)
  - Action: Create feature flag ENABLE_SINGLE_FACILITY that gates building removal code, allows gradual rollout and easy rollback
  - Notes: F15 fix - Coordination between database and code deployment

- [ ] Task 54: Document deployment sequence
  - File: `DEPLOYMENT.md` (NEW FILE)
  - Action: Document step-by-step deployment: (1) Backup database, (2) Deploy backward-compat code, (3) Run Phase 1 migrations, (4) Verify, (5) Deploy final code, (6) Run Phase 2 migrations, (7) Clean up deprecated columns
  - Notes: F15 fix - Clear deployment plan prevents outages

### Acceptance Criteria

**AC1: 5-Hour Countdown Timer Display**
- [ ] AC1.1: Given a player in the queue with an active session, when viewing the TV display, then their remaining session time appears beside their name in HH:MM:SS format
- [ ] AC1.2: Given a player in the queue with an active session, when viewing the admin dashboard queue panel, then their remaining session time appears beside their name in HH:MM:SS format
- [ ] AC1.3: Given a player with 30 minutes remaining, when the countdown updates, then the timer shows "00:30:00" and decrements every second
- [ ] AC1.4: Given a player whose session expired, when viewing the queue, then their entry is removed or marked as expired

**AC2: Player Stats Tracking**
- [ ] AC2.1: Given a completed match with scores entered, when the session completes, then a match_history record is created with all 4 player IDs, team scores, and winning team
- [ ] AC2.2: Given a completed match where Team A wins 11-7, when stats are updated, then both Team A players' lifetime_wins increment by 1, and all 4 players' lifetime_games_played increment by 1
- [ ] AC2.3: Given it's the first match of a new year, when stats are updated, then a new player_stats_yearly record is created for that year
- [ ] AC2.4: Given multiple matches in the same year, when stats are updated, then yearly wins and games_played increment correctly
- [ ] AC2.5: Given match_history records older than 24 hours, when daily cleanup runs, then old records are deleted

**AC3: Leaderboard**
- [ ] AC3.1: Given 15 players with varying win counts, when navigating to /leaderboard, then the top 10 players sorted by lifetime wins are displayed
- [ ] AC3.2: Given a player on the leaderboard, when viewing their entry, then their rank, name, photo, total wins, and games played are shown
- [ ] AC3.3: Given two players with the same win count, when viewing the leaderboard, then they appear in order by games_played (fewer games = higher rank)

**AC4: Queue Flow Change - Manual Rejoin**
- [ ] AC4.1: Given a player completes a game, when the session ends, then they do NOT automatically rejoin the queue
- [ ] AC4.2: Given a court officer wants to rejoin a player, when they click "Scan to Rejoin Queue" and scan the player's QR code, then the player is added to the queue at the end position
- [ ] AC4.3: Given an invalid QR code, when scanned to rejoin, then an error message is shown
- [ ] AC4.4: Given a player without an active session, when attempting to rejoin, then they are rejected with an appropriate error message

**AC5: 20-Minute Per-Court Time Limit**
- [ ] AC5.1: Given a court session starts, when viewing the admin dashboard, then a 20-minute countdown timer appears on the court card
- [ ] AC5.2: Given a court session starts, when viewing the TV display, then a 20-minute countdown timer appears beside the court status
- [ ] AC5.3: Given a court timer reaches 5 minutes remaining, when displayed, then the timer shows in warning state (yellow/orange color)
- [ ] AC5.4: Given a court timer reaches 1 minute remaining, when displayed, then the timer shows in alert state (red color) and plays a notification
- [ ] AC5.5: Given a court timer expires (reaches 00:00), when auto-end runs, then the session is automatically completed with the team having the higher score awarded the win
- [ ] AC5.6: Given a court timer expires during an auto-end check, when the session completes, then match_history and player_stats are updated correctly
- [ ] AC5.7: Given a tie score when court timer expires, when auto-end runs, then no team is awarded a win (match marked as tie/incomplete)
- [ ] AC5.8: Given court timer expires (20 minutes), when court officer has NOT entered scores yet, then system waits 2-minute grace period before auto-ending (F11 fix)
- [ ] AC5.9: Given 2-minute grace period expires with no scores entered, when auto-end runs, then match is marked as incomplete (no winner, no stats update)

**AC6: Bigger Profile Pictures on Courts**
- [ ] AC6.1: Given a court with status='occupied', when viewing the TV display, then 4 player profile pictures (80px each) are shown for that court
- [ ] AC6.2: Given a player without a photo_url, when displaying court players, then a placeholder avatar or initials are shown
- [ ] AC6.3: Given a court with fewer than 4 players (edge case), when displaying, then only the actual players' photos are shown

**AC7: Available Court Color Change**
- [ ] AC7.1: Given a court with status='available', when viewing the TV display, then the court card background is amber/gold (bg-amber-500)
- [ ] AC7.2: Given a court with status='occupied', when viewing the TV display, then the court card background remains red (bg-red-600)

**AC8: Queue Position Display Bug Fix**
- [ ] AC8.1: Given 5 players in queue (positions 1-5), when the first 4 players are called to court, then the 5th player's position updates to 1 in the queue list
- [ ] AC8.2: Given players called to court, when viewing the queue immediately after, then all remaining players' positions are recalculated and displayed correctly
- [ ] AC8.3: Given the queue updates, when subscribed via Zustand, then the UI re-renders with updated positions

**AC9: Draggable Queue Management**
- [ ] AC9.1: Given the admin dashboard queue panel, when the court officer drags a player from position 3 to position 1, then the queue reorders visually
- [ ] AC9.2: Given the queue is reordered via drag-drop, when the change is saved, then the database position fields are updated
- [ ] AC9.3: Given the queue positions are updated in the database, when viewing the TV display, then the updated order is reflected in real-time
- [ ] AC9.4: Given a drag-drop operation fails (network error), when the error occurs, then the queue reverts to the previous order and an error message is shown

**AC10: Remove 3-Building System**
- [ ] AC10.1: Given the database migrations run, when querying the courts table, then 6 courts exist (court_number 1-6) with no building column
- [ ] AC10.2: Given the type system updates, when importing types, then BuildingType is no longer exported and causes no TypeScript errors
- [ ] AC10.3: Given the TV display page, when navigating to /display, then a single view shows all 6 courts with one queue list
- [ ] AC10.4: Given the old building-specific pages, when attempting to navigate to /display/building-a, then a 404 error is returned

**AC11: Team Assignment Logic**
- [ ] AC11.1: Given 2 groups of 2 players each, when a match is generated, then Group 1 = Team A, Group 2 = Team B (F8 fix)
- [ ] AC11.2: Given 1 group of 2 + 2 solo players, when a match is generated, then the group is assigned to Team A and solos to Team B (F8 fix)
- [ ] AC11.3: Given 4 solo players, when a match is generated, then they are randomly split into Team A and Team B (2 players each)
- [ ] AC11.4: Given a group of 3 or more players, when matchmaking attempts to create a match, then the system rejects the configuration with error message (F8 fix)
- [ ] AC11.5: Given a court officer completing a session, when entering scores, then they can reassign players between teams via drag-drop before submitting
- [ ] AC11.6: Given team assignments, when match_history is created, then the correct player IDs are stored in team_a_player_1_id, team_a_player_2_id, team_b_player_1_id, team_b_player_2_id

**AC12: Year Rollover & Cleanup**
- [ ] AC12.1: Given the first match of a new year, when stats are updated, then a new player_stats_yearly record is created for the new year (F12 fix)
- [ ] AC12.2: Given a player with no yearly record for current year, when updatePlayerStats is called, then the record is upserted (created if not exists)
- [ ] AC12.3: Given match_history records older than 24 hours, when daily cleanup runs at midnight, then old records are deleted (F6 fix)
- [ ] AC12.4: Given cleanup runs successfully, when checked, then cleanup_logs table has entry with timestamp and count deleted

**AC13: Error Messages & UX**
- [ ] AC13.1: Given an invalid QR code is scanned, when error is returned, then user sees "Invalid QR code. Please scan a valid player badge." (F13 fix)
- [ ] AC13.2: Given a concurrent edit conflict on queue drag-drop, when detected, then user sees "Queue was modified by another officer. Reload to see latest." (F7 fix)
- [ ] AC13.3: Given all error messages, when displayed, then they include actionable guidance (what to do next)

**AC14: Migration Safety & Rollbacks**
- [ ] AC14.1: Given production database, when preparing for migration, then backup is created first (F14 fix)
- [ ] AC14.2: Given migrations in staging, when tested, then all pass before applying to production (F3, F14 fix)
- [ ] AC14.3: Given a migration with active sessions, when pre-flight check runs, then migration is aborted with error message (F3 fix)
- [ ] AC14.4: Given any migration, when rollback is needed, then corresponding rollback script exists and is documented (F14 fix)

## Additional Context

### Dependencies

**New NPM Packages (Must Install):**
- `@dnd-kit/core` - Modern drag-and-drop toolkit for queue reordering (accessible, touch-friendly)
- `@dnd-kit/sortable` - Sortable list primitives for drag-drop implementation
- `date-fns` - Date/time formatting for countdown timers (check if already installed)

**Installation Command:**
```bash
npm install @dnd-kit/core @dnd-kit/sortable date-fns
```

**Supabase Database Changes:**

**New Tables to Create:**
1. `player_stats` - Lifetime totals (player_id UNIQUE, lifetime_wins, lifetime_games_played)
2. `player_stats_yearly` - Historical yearly data (player_id + year UNIQUE, wins, games_played)

**Existing Tables to Modify:**
1. `match_history` - **RESTRUCTURE** (drop old schema, recreate with team structure)
2. `courts` - **REMOVE** building column, reduce from 9 to 6 courts, add court_timer_started_at
3. `sessions` - **REMOVE** building column, **ADD** court_timer_started_at for 20-minute tracking
4. `queue` - **REMOVE** building column

**Tables to Delete:**
1. `buildings` - Drop entire table

**Daily Cleanup:**
- Supabase Edge Function or scheduled task to delete `match_history WHERE played_date < CURRENT_DATE`

### Testing Strategy

**Unit Tests:**
- Team assignment logic (friend groups, solo players, mixed scenarios)
- Countdown timer calculations (5-hour session, 20-minute court)
- Stats update logic (wins increment for winning team, games increment for all players)

**Integration Tests:**
- Match completion flow: Enter score → Create match history → Update stats → Award wins
- Queue reordering: Drag position → Update DB → Sync to TV displays
- Session auto-end: 20-minute timer expires → Alert → Auto-complete session

**E2E Tests (Playwright):**
- Court officer completes session with score entry
- Leaderboard displays top 10 players correctly
- Queue position updates visually after players called to court
- Drag-and-drop queue reordering works smoothly

### Notes

**Architecture Simplification Impact:**
- Removing 3-building system will require significant refactoring in:
  - Zustand store (remove `buildings` slice, update `courts` and `queue` slices)
  - Display pages (remove `/display/building-a`, `/display/building-b`, `/display/building-c`)
  - Admin dashboard (no building filtering, show all 6 courts in one view)
  - Matchmaking algorithm (remove building assignment logic)
  - Database migrations (drop `building` column from tables)

**5-Hour vs 20-Minute Timers:**
- 5-hour timer: Facility-wide session limit (already implemented, just need to display countdown)
- 20-minute timer: Per-court game limit (new implementation)
- Both timers run independently and must be tracked separately

**Team Assignment Flexibility:**
- System suggests teams based on queue groups
- Court officer has final say when entering score (can reassign via drag UI)
- This respects player choice while maintaining intelligent defaults

**Yearly Stats Rollover:**
- On January 1st, new `player_stats_yearly` records created for new year
- Previous years' records remain intact for historical reference
- Lifetime totals in `player_stats` continue incrementing across years
