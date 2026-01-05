-- Assign staff roles to existing users
--
-- IMPORTANT: This SQL is for role assignment only.
-- For creating staff accounts, use the TypeScript seed script instead:
--   npx tsx supabase/seed-staff.ts
--
-- This SQL approach assumes users already exist in auth.users
-- (created via Supabase Dashboard, signup endpoint, or the seed-staff.ts script)

-- Assign Court Officer role
INSERT INTO staff_roles (user_id, role)
SELECT id, 'court_officer'
FROM auth.users
WHERE email = 'officer@picklepoint.com'
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

-- Assign Cashier role
INSERT INTO staff_roles (user_id, role)
SELECT id, 'cashier'
FROM auth.users
WHERE email = 'cashier@picklepoint.com'
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

-- Verify role assignments
SELECT
  u.email,
  sr.role,
  sr.created_at
FROM staff_roles sr
JOIN auth.users u ON u.id = sr.user_id
ORDER BY sr.created_at DESC;
