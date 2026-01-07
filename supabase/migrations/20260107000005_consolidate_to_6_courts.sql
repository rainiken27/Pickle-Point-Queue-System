-- Consolidate to 6 courts total and update constraints
-- This migration assumes building column has been removed in previous migration

-- Delete courts beyond #6 (keep courts 1-6)
DELETE FROM courts WHERE court_number > 6;

-- Ensure exactly 6 courts exist (1-6)
-- If fewer than 6 courts exist, this will be handled by seed data

-- Update constraint to enforce 6 courts maximum
ALTER TABLE courts DROP CONSTRAINT IF EXISTS courts_court_number_check;
ALTER TABLE courts ADD CONSTRAINT courts_court_number_check
  CHECK (court_number >= 1 AND court_number <= 6);

-- Ensure court_number is unique (no building-based uniqueness anymore)
ALTER TABLE courts DROP CONSTRAINT IF EXISTS courts_court_number_building_key;
ALTER TABLE courts DROP CONSTRAINT IF EXISTS unique_court_number_per_building;
ALTER TABLE courts ADD CONSTRAINT unique_court_number
  UNIQUE (court_number);

-- Add comment for clarity
COMMENT ON TABLE courts IS 'Single facility with 6 courts total (court_number 1-6)';

-- ROLLBACK INSTRUCTIONS (manual):
-- To rollback:
-- 1. Drop unique constraint: ALTER TABLE courts DROP CONSTRAINT unique_court_number;
-- 2. Add back building constraint: ALTER TABLE courts ADD CONSTRAINT courts_court_number_check CHECK (court_number >= 1 AND court_number <= 3);
-- 3. Restore 9 courts with building-based uniqueness
