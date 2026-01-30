-- Add waitlist status to queue_entries table
-- This allows groups to wait for missing members without being called to courts

ALTER TABLE queue_entries 
ADD COLUMN status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'waitlist'));

-- Add index for better query performance on status
CREATE INDEX idx_queue_entries_status ON queue_entries(status);

-- Update existing records to ensure they have the correct status
UPDATE queue_entries 
SET status = 'waiting' 
WHERE status IS NULL OR status NOT IN ('waiting', 'playing', 'waitlist');
