/*
  # Fix infinite recursion in profiles RLS policies

  1. Problem
    - The current RLS policies on the profiles table are causing infinite recursion
    - This happens when policies reference the same table they're protecting
    - Specifically affects user sign-up process

  2. Solution
    - Drop existing problematic policies
    - Create new, simpler policies that avoid circular references
    - Ensure users can create their own profiles during sign-up
    - Maintain security while preventing recursion

  3. New Policies
    - Users can insert their own profile (using auth.uid())
    - Users can select their own profile
    - Users can update their own profile
    - Admins can view all profiles (simplified check)
*/

-- Drop existing policies that may cause recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- Create new policies without circular references
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can select own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admin policy - simplified to avoid recursion
-- This checks the role directly from auth.jwt() instead of querying profiles table
CREATE POLICY "Admins can manage all profiles"
  ON profiles
  FOR ALL
  TO authenticated
  USING (
    COALESCE(
      (auth.jwt() ->> 'user_metadata' ->> 'role')::user_role,
      'customer'::user_role
    ) = 'admin'::user_role
    OR auth.uid() = id
  )
  WITH CHECK (
    COALESCE(
      (auth.jwt() ->> 'user_metadata' ->> 'role')::user_role,
      'customer'::user_role
    ) = 'admin'::user_role
    OR auth.uid() = id
  );