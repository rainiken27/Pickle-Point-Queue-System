-- Migration: Update courts to 9 total (3 per building) and add 'reserved' status

-- Step 1: Delete courts 4, 8, and 12 FIRST (reducing from 4 to 3 per building)
DELETE FROM courts WHERE court_number IN (4, 8, 12);

-- Step 2: Renumber courts for consistency BEFORE adding constraint
-- Building B: Courts 5,6,7 -> 4,5,6
-- Building C: Courts 9,10,11 -> 7,8,9
UPDATE courts SET court_number = 4 WHERE court_number = 5 AND building = 'building_b';
UPDATE courts SET court_number = 5 WHERE court_number = 6 AND building = 'building_b';
UPDATE courts SET court_number = 6 WHERE court_number = 7 AND building = 'building_b';

UPDATE courts SET court_number = 7 WHERE court_number = 9 AND building = 'building_c';
UPDATE courts SET court_number = 8 WHERE court_number = 10 AND building = 'building_c';
UPDATE courts SET court_number = 9 WHERE court_number = 11 AND building = 'building_c';

-- Step 3: Drop the old status constraint
ALTER TABLE courts DROP CONSTRAINT IF EXISTS courts_status_check;

-- Step 4: Add new status constraint including 'reserved'
ALTER TABLE courts ADD CONSTRAINT courts_status_check
  CHECK (status IN ('available', 'occupied', 'reserved'));

-- Step 5: Add reservation metadata columns
ALTER TABLE courts ADD COLUMN IF NOT EXISTS reserved_by TEXT;
ALTER TABLE courts ADD COLUMN IF NOT EXISTS reserved_until TIMESTAMPTZ;
ALTER TABLE courts ADD COLUMN IF NOT EXISTS reserved_note TEXT;

-- Step 6: NOW update court_number constraint to allow 1-9 instead of 1-12
ALTER TABLE courts DROP CONSTRAINT IF EXISTS courts_court_number_check;
ALTER TABLE courts ADD CONSTRAINT courts_court_number_check
  CHECK (court_number >= 1 AND court_number <= 9);

-- Add index on reserved status for filtering
CREATE INDEX IF NOT EXISTS idx_courts_reserved ON courts(status) WHERE status = 'reserved';

-- Comment for clarity
COMMENT ON COLUMN courts.reserved_by IS 'Name or identifier of who reserved the court (e.g., customer name for rental)';
COMMENT ON COLUMN courts.reserved_until IS 'Timestamp when the reservation expires';
COMMENT ON COLUMN courts.reserved_note IS 'Optional note about the reservation (e.g., "Birthday party rental")';
