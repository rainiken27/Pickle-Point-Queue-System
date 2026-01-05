-- Create staff_roles table
CREATE TABLE IF NOT EXISTS staff_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('court_officer', 'cashier')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE staff_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Staff can view their own role
CREATE POLICY "Staff can view their own role"
  ON staff_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Create index on user_id for fast auth checks
CREATE INDEX idx_staff_roles_user_id ON staff_roles(user_id);
