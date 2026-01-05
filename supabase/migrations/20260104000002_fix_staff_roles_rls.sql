-- Fix RLS policies for staff_roles to allow middleware to function properly

-- Drop the existing policy
DROP POLICY IF EXISTS "Staff can view their own role" ON staff_roles;

-- Create a more permissive policy for authenticated users
-- This allows the middleware (using anon key with user session) to read roles
CREATE POLICY "Authenticated users can view their own staff role"
  ON staff_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow service role to bypass RLS (for admin operations and middleware)
-- The service role is used server-side and should have full access
CREATE POLICY "Service role has full access to staff_roles"
  ON staff_roles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
