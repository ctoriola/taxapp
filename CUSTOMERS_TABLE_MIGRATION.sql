-- ============================================
-- MIGRATE CUSTOMERS TABLE - ADD user_id
-- ============================================
-- Run this in your Supabase SQL editor to add user_id to existing customers table

-- 1. Add user_id column if it doesn't exist
ALTER TABLE IF EXISTS public.customers
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(name);

-- 3. Enable Row Level Security
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies
DROP POLICY IF EXISTS "users_can_manage_own_customers" ON public.customers;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.customers;
DROP POLICY IF EXISTS "Enable read access for users" ON public.customers;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.customers;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.customers;

-- 5. Create comprehensive RLS policies
-- Allow users to insert their own customers
CREATE POLICY "customers_insert" ON public.customers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to read their own customers
CREATE POLICY "customers_read" ON public.customers
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to update their own customers
CREATE POLICY "customers_update" ON public.customers
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own customers
CREATE POLICY "customers_delete" ON public.customers
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- IMPORTANT: SET user_id FOR EXISTING ROWS
-- ============================================
-- If you have existing customers, you need to assign them to a user
-- Replace 'your-user-id-here' with an actual user ID from your auth.users table
-- This is a one-time operation to populate existing data

-- OPTIONAL: View existing users to find a user ID:
-- SELECT id, email FROM auth.users LIMIT 10;

-- OPTIONAL: Assign existing customers to the first user:
-- UPDATE public.customers 
-- SET user_id = (SELECT id FROM auth.users LIMIT 1)
-- WHERE user_id IS NULL;

-- ============================================
-- VERIFY THE TABLE
-- ============================================
-- Run this query to verify the migration was successful:
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns 
-- WHERE table_name = 'customers' AND table_schema = 'public'
-- ORDER BY ordinal_position;

-- Expected columns:
-- id - uuid - NO
-- name - text - NO
-- email - text - YES
-- phone - text - YES
-- tax_id - text - YES
-- created_at - timestamp with time zone - YES
-- updated_at - timestamp with time zone - YES
-- user_id - uuid - YES (or NO if you add NOT NULL constraint)
