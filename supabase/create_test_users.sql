-- ============================================
-- CREATE TEST USERS FOR LOGIN
-- ============================================
-- Run this in Supabase Studio SQL Editor
-- http://localhost:54323
-- ============================================

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
  'test-officer-uuid-001',
  'authenticated',
  'authenticated',
  'officer@test.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  '',
  ''
) ON CONFLICT (email) DO NOTHING;

-- Add to staff_users table with court_officer role
INSERT INTO staff_users (user_id, role) VALUES
  ('test-officer-uuid-001', 'court_officer')
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
  'test-cashier-uuid-001',
  'authenticated',
  'authenticated',
  'cashier@test.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  '',
  ''
) ON CONFLICT (email) DO NOTHING;

-- Add to staff_users table with cashier role
INSERT INTO staff_users (user_id, role) VALUES
  ('test-cashier-uuid-001', 'cashier')
ON CONFLICT (user_id) DO UPDATE SET role = 'cashier';


-- Verify users were created
SELECT
  'Login credentials created!' as message,
  '' as blank,
  'Court Officer Login:' as login1,
  'Email: officer@test.com' as email1,
  'Password: password123' as password1,
  '' as blank2,
  'Cashier Login:' as login2,
  'Email: cashier@test.com' as email2,
  'Password: password123' as password2;
