-- ============================================================
-- KingsIQ: User Roles Migration
-- Run this ONCE in your Supabase SQL Editor
-- ============================================================

-- 1. Update role constraint to include super_admin
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('marketing', 'management', 'admin', 'super_admin'));

-- 2. Set productkshitij@gmail.com as super_admin
UPDATE profiles
SET role = 'super_admin'
WHERE email = 'productkshitij@gmail.com';

-- 3. Allow super_admin to update any profile (for promote)
DROP POLICY IF EXISTS "super_admin_update_profiles" ON profiles;
CREATE POLICY "super_admin_update_profiles" ON profiles
  FOR UPDATE TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- 4. Allow inserting new profiles (when backend creates a user)
DROP POLICY IF EXISTS "insert_profiles" ON profiles;
CREATE POLICY "insert_profiles" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (TRUE);

-- Also allow the service role (used by backend) to insert profiles
-- This is automatic since service role bypasses RLS.
-- No extra policy needed for service role.
