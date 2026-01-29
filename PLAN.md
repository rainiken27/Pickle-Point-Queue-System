# Plan: Auto-Rejoin After Match + Player Replacement Feature

## Task 1: Auto-Rejoin After Match Completion (quick fix)

### Problem
When a match ends via the score modal (`handleCompleteMatch`), the match completion API deletes queue entries and never calls the rejoin API. Players disappear from the queue instead of being re-added.

### Changes

**File: `app/api/match-history/complete/route.ts`**
- Remove lines 98-114 that delete queue entries from the `queue` table
- The rejoin endpoint will handle transitioning players back to 'waiting' or cleaning them up

**File: `app/admin/page.tsx` (in `handleCompleteMatch`, ~line 1088)**
- After the success alert, call `/api/queue/rejoin` with the `court_id`
- Show how many players were re-added to the queue

**File: `app/api/queue/rejoin/route.ts`**
- After processing eligible players, delete queue entries for non-eligible players (expired sessions) so they don't linger with `status='playing'` forever

---

## Task 2: Replace Player on Court (new feature)

### Changes

**New file: `app/api/players/search-available/route.ts`**
- GET endpoint: search players by name who have active sessions and are NOT currently on a court
- Returns: `[{ id, name, skill_level, photo_url, availability_status: 'in_queue' | 'on_break', queue_position? }]`

**New file: `app/api/courts/replace-player/route.ts`**
- POST endpoint: `{ court_id, old_player_id, new_player_id }`
- Updates `courts.current_players` JSONB (swap old for new)
- Old player: queue entry deleted with temporary_break treatment (session stays active)
- New player: if in queue → update to `status='playing', court_id=X`; if on break → insert new queue entry with `status='playing'`
- Recalculates queue positions if replacement was pulled from waiting queue

**File: `app/admin/page.tsx`**
- Add replace player modal state
- Add "Replace" button next to each player name on occupied court cards
- Modal: search input → shows available players → click to confirm swap
- After swap: refresh courts + queue

No database migrations needed.
