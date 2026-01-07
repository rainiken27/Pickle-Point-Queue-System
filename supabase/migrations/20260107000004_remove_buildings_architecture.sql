-- Remove building architecture from database
-- SAFETY: This migration requires an empty facility (no active sessions or queue entries)

-- PRE-FLIGHT SAFETY CHECKS
DO $$
BEGIN
  -- Check for active sessions
  IF EXISTS (SELECT 1 FROM sessions WHERE status = 'active') THEN
    RAISE EXCEPTION 'Cannot migrate: active sessions exist. Please complete all sessions before running this migration.';
  END IF;

  -- Check for queue entries
  IF EXISTS (SELECT 1 FROM queue) THEN
    RAISE EXCEPTION 'Cannot migrate: queue entries exist. Please clear the queue before running this migration.';
  END IF;

  -- Check for courts with status != 'available'
  IF EXISTS (SELECT 1 FROM courts WHERE status != 'available') THEN
    RAISE EXCEPTION 'Cannot migrate: courts are in use. Please ensure all courts are available before running this migration.';
  END IF;
END $$;

-- Drop building column from courts table
ALTER TABLE courts DROP COLUMN IF EXISTS building;

-- Drop building column from sessions table
ALTER TABLE sessions DROP COLUMN IF EXISTS building;

-- Drop building column from queue table
ALTER TABLE queue DROP COLUMN IF EXISTS building;

-- Drop buildings table entirely
DROP TABLE IF EXISTS buildings CASCADE;

-- ROLLBACK INSTRUCTIONS (manual):
-- To rollback this migration:
-- 1. Recreate buildings table (see 20260105000002_create_buildings_table.sql)
-- 2. Add building column back to courts: ALTER TABLE courts ADD COLUMN building TEXT NOT NULL DEFAULT 'building_a';
-- 3. Add building column back to sessions: ALTER TABLE sessions ADD COLUMN building TEXT;
-- 4. Add building column back to queue: ALTER TABLE queue ADD COLUMN building TEXT NOT NULL DEFAULT 'building_a';
