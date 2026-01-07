-- Remove session_id from courts table
-- Sessions are tied to individual players, not courts
-- A court can have 4 players (each with their own session)
-- Track players on courts via queue.court_id instead

-- Remove session-related columns
ALTER TABLE courts DROP COLUMN IF EXISTS current_session_id;
ALTER TABLE courts DROP COLUMN IF EXISTS session_start_time;

-- Note: court_timer_started_at already exists for 20-minute countdown
-- This tracks when the current match started on this court
