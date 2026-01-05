-- Create buildings table to track building status
CREATE TABLE IF NOT EXISTS buildings (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert the three buildings
INSERT INTO buildings (id, name, is_active) VALUES
  ('building_a', 'Building A', true),
  ('building_b', 'Building B', true),
  ('building_c', 'Building C', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read buildings
CREATE POLICY "Anyone can view buildings"
  ON buildings FOR SELECT
  USING (true);

-- Only staff can update buildings (court officers and cashiers)
CREATE POLICY "Staff can update buildings"
  ON buildings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM staff_roles
      WHERE user_id = auth.uid()
      AND role IN ('court_officer', 'cashier')
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_buildings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER buildings_updated_at
  BEFORE UPDATE ON buildings
  FOR EACH ROW
  EXECUTE FUNCTION update_buildings_updated_at();
