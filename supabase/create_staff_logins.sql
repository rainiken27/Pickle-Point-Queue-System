-- ============================================
-- CREATE STAFF LOGIN USERS
-- ============================================
-- Run this in Supabase Studio SQL Editor
-- http://localhost:54323
-- ============================================

-- Delete existing test users if they exist
DELETE FROM auth.users WHERE email IN ('officer@picklepoint.com', 'cashier@picklepoint.com');

-- Create court officer user
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated',
  'authenticated',
  'officer@picklepoint.com',
  crypt('officer123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  '',
  ''
);

-- Add officer to staff_users table
INSERT INTO staff_users (user_id, role) VALUES
  ('11111111-1111-1111-1111-111111111111', 'court_officer')
ON CONFLICT (user_id) DO UPDATE SET role = 'court_officer';


-- Create cashier user
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '22222222-2222-2222-2222-222222222222',
  'authenticated',
  'authenticated',
  'cashier@picklepoint.com',
  crypt('cashier123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  '',
  ''
);

-- Add cashier to staff_users table
INSERT INTO staff_users (user_id, role) VALUES
  ('22222222-2222-2222-2222-222222222222', 'cashier')
ON CONFLICT (user_id) DO UPDATE SET role = 'cashier';


-- Verify users were created
SELECT
  'Staff logins created successfully!' as message;

SELECT
  u.email,
  su.role,
  u.email_confirmed_at as confirmed
FROM auth.users u
JOIN staff_users su ON u.id = su.user_id
WHERE u.email IN ('officer@picklepoint.com', 'cashier@picklepoint.com')
ORDER BY u.email;
