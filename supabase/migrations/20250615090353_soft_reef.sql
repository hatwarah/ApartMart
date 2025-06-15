/*
  # Fix infinite recursion in profiles RLS policies

  1. Security Changes
    - Remove problematic policies causing circular references
    - Create simple policies using auth.uid() directly
    - Add policy for profile insertion during signup
    - Simplify admin access without JWT parsing

  2. Changes Made
    - Drop existing recursive policies
    - Add INSERT policy for new user registration
    - Add SELECT/UPDATE policies for own profile access
    - Add simplified admin policy using direct role check
*/

-- Drop existing policies that may cause recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- Create new policies without circular references

-- Allow users to insert their own profile during signup
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow users to view their own profile
CREATE POLICY "Users can select own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow public read access for basic profile info (needed for some operations)
CREATE POLICY "Public can view basic profile info"
  ON profiles
  FOR SELECT
  TO public
  USING (true);

-- Admin policy - check if user has admin role in their profile
-- This uses a function to safely check admin status
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id AND role = 'admin'::user_role
  );
$$;

-- Admin policy using the function
CREATE POLICY "Admins can manage all profiles"
  ON profiles
  FOR ALL
  TO authenticated
  USING (
    auth.uid() = id OR 
    is_admin(auth.uid())
  )
  WITH CHECK (
    auth.uid() = id OR 
    is_admin(auth.uid())
  );