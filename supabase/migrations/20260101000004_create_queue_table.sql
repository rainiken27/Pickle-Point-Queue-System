-- Create queue table
CREATE TABLE IF NOT EXISTS queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  group_id UUID,
  position INTEGER NOT NULL,
  building TEXT CHECK (building IN ('building_a', 'building_b', 'building_c')) NOT NULL,
  status TEXT CHECK (status IN ('waiting', 'called', 'playing')) DEFAULT 'waiting',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  estimated_wait_minutes INTEGER
);

-- Enable Row Level Security
ALTER TABLE queue ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Players can view their own queue entry
CREATE POLICY "Players can view their own queue entry"
  ON queue FOR SELECT
  USING (auth.uid() = player_id);

-- RLS Policy: All users can view queue (for TV displays)
CREATE POLICY "Public can view queue"
  ON queue FOR SELECT
  USING (true);

-- RLS Policy: Staff can manage queue
CREATE POLICY "Staff can insert queue entries"
  ON queue FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_roles
      WHERE user_id = auth.uid()
      AND role IN ('court_officer', 'cashier')
    )
  );

CREATE POLICY "Staff can update queue"
  ON queue FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM staff_roles
      WHERE user_id = auth.uid()
      AND role IN ('court_officer', 'cashier')
    )
  );

CREATE POLICY "Staff can delete queue entries"
  ON queue FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM staff_roles
      WHERE user_id = auth.uid()
      AND role IN ('court_officer', 'cashier')
    )
  );

-- Create indexes for performance
CREATE INDEX idx_queue_position ON queue(position);
CREATE INDEX idx_queue_building ON queue(building);
CREATE INDEX idx_queue_status ON queue(status);
CREATE INDEX idx_queue_group_id ON queue(group_id);
