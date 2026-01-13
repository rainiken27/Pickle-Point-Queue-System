-- Add singles matching support to match_history table

-- Step 1: Add match_type column with default 'doubles' for backward compatibility
ALTER TABLE match_history
ADD COLUMN match_type TEXT CHECK (match_type IN ('singles', 'doubles')) DEFAULT 'doubles' NOT NULL;

-- Step 2: Update existing records to explicitly set match_type
UPDATE match_history SET match_type = 'doubles';

-- Step 3: Make team player 2 fields nullable to support singles matches
-- In singles: team_a_player_1_id = Player 1, team_b_player_1_id = Player 2
-- team_a_player_2_id and team_b_player_2_id will be NULL
ALTER TABLE match_history
ALTER COLUMN team_a_player_2_id DROP NOT NULL;

ALTER TABLE match_history
ALTER COLUMN team_b_player_2_id DROP NOT NULL;

-- Step 4: Add comment explaining the structure
COMMENT ON COLUMN match_history.match_type IS 'Type of match: singles (1v1) or doubles (2v2)';
COMMENT ON COLUMN match_history.team_a_player_2_id IS 'Second player on team A (NULL for singles matches)';
COMMENT ON COLUMN match_history.team_b_player_2_id IS 'Second player on team B (NULL for singles matches)';
