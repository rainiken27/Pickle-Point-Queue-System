-- Create courts table
CREATE TABLE IF NOT EXISTS courts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_number INTEGER NOT NULL CHECK (court_number >= 1 AND court_number <= 12),
  building TEXT CHECK (building IN ('building_a', 'building_b', 'building_c')) NOT NULL,
  status TEXT CHECK (status IN ('available', 'occupied')) DEFAULT 'available',
  current_session_id UUID REFERENCES sessions(id),
  session_start_time TIMESTAMPTZ,
  UNIQUE(court_number, building)
);

-- Enable Row Level Security
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: All users can view courts (for TV displays and dashboard)
CREATE POLICY "Public can view courts"
  ON courts FOR SELECT
  USING (true);

-- RLS Policy: Court officers can update courts
CREATE POLICY "Court officers can update courts"
  ON courts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM staff_roles
      WHERE user_id = auth.uid()
      AND role = 'court_officer'
    )
  );

-- Seed 12 courts (4 per building)
INSERT INTO courts (court_number, building, status) VALUES
  (1, 'building_a', 'available'),
  (2, 'building_a', 'available'),
  (3, 'building_a', 'available'),
  (4, 'building_a', 'available'),
  (5, 'building_b', 'available'),
  (6, 'building_b', 'available'),
  (7, 'building_b', 'available'),
  (8, 'building_b', 'available'),
  (9, 'building_c', 'available'),
  (10, 'building_c', 'available'),
  (11, 'building_c', 'available'),
  (12, 'building_c', 'available')
ON CONFLICT (court_number, building) DO NOTHING;

-- Create index on building for fast filtering
CREATE INDEX idx_courts_building ON courts(building);
CREATE INDEX idx_courts_status ON courts(status);
