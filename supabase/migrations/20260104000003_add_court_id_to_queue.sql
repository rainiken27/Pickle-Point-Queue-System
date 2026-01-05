-- Add court_id to queue table to track which court players are assigned to
-- This enables proper re-queuing after match completion

ALTER TABLE queue
ADD COLUMN court_id UUID REFERENCES courts(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_queue_court_id ON queue(court_id);

-- Add comment
COMMENT ON COLUMN queue.court_id IS 'Court assignment when status is playing or called';
