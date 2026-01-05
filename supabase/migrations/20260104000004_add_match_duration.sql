-- Add match duration tracking to match_history table
-- This allows us to calculate actual average match times and accurate utilization

ALTER TABLE match_history
ADD COLUMN start_time TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN end_time TIMESTAMPTZ,
ADD COLUMN duration_minutes INTEGER;

-- Create index for performance
CREATE INDEX idx_match_history_times ON match_history(start_time, end_time);

-- Add comments
COMMENT ON COLUMN match_history.start_time IS 'When the match started';
COMMENT ON COLUMN match_history.end_time IS 'When the match ended';
COMMENT ON COLUMN match_history.duration_minutes IS 'Calculated match duration in minutes';
