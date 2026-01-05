-- Create groups table for managing friend groups
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create group_members junction table
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, player_id)
);

-- Enable Row Level Security
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for groups table
CREATE POLICY "Anyone can view groups"
  ON groups FOR SELECT
  USING (true);

CREATE POLICY "Staff can create groups"
  ON groups FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_roles
      WHERE user_id = auth.uid()
      AND role IN ('court_officer', 'cashier')
    )
  );

CREATE POLICY "Staff can update groups"
  ON groups FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM staff_roles
      WHERE user_id = auth.uid()
      AND role IN ('court_officer', 'cashier')
    )
  );

CREATE POLICY "Staff can delete groups"
  ON groups FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM staff_roles
      WHERE user_id = auth.uid()
      AND role IN ('court_officer', 'cashier')
    )
  );

-- RLS Policies for group_members table
CREATE POLICY "Anyone can view group members"
  ON group_members FOR SELECT
  USING (true);

CREATE POLICY "Staff can add group members"
  ON group_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_roles
      WHERE user_id = auth.uid()
      AND role IN ('court_officer', 'cashier')
    )
  );

CREATE POLICY "Staff can remove group members"
  ON group_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM staff_roles
      WHERE user_id = auth.uid()
      AND role IN ('court_officer', 'cashier')
    )
  );

-- Create indexes for performance
CREATE INDEX idx_groups_created_at ON groups(created_at DESC);
CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_player_id ON group_members(player_id);

-- Add foreign key constraint to queue table
ALTER TABLE queue
  DROP CONSTRAINT IF EXISTS fk_queue_group_id,
  ADD CONSTRAINT fk_queue_group_id
  FOREIGN KEY (group_id)
  REFERENCES groups(id)
  ON DELETE SET NULL;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at on groups
CREATE TRIGGER update_groups_updated_at
    BEFORE UPDATE ON groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
