-- Add court timer field to courts table for 20-minute per-court tracking

ALTER TABLE courts
ADD COLUMN IF NOT EXISTS court_timer_started_at TIMESTAMPTZ;

-- Add comment for clarity
COMMENT ON COLUMN courts.court_timer_started_at IS 'Tracks when the 20-minute court countdown started for the current game (NULL when court is available)';

-- Create index for timer queries
CREATE INDEX IF NOT EXISTS idx_courts_timer ON courts(court_timer_started_at)
WHERE court_timer_started_at IS NOT NULL;

-- ROLLBACK INSTRUCTIONS (manual):
-- To rollback: ALTER TABLE courts DROP COLUMN court_timer_started_at;
