-- ============================================
-- CUSTOMERS TABLE SETUP
-- ============================================
-- Run this in your Supabase SQL editor

-- 1. Create customers table with user_id
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  tax_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(name);

-- 3. Enable Row Level Security
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policy - users can only manage their own customers
DROP POLICY IF EXISTS "users_can_manage_own_customers" ON public.customers;

CREATE POLICY "users_can_manage_own_customers" ON public.customers
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- VERIFY THE TABLE
-- ============================================
-- Run this query to check if table exists and has correct columns:
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'customers' AND table_schema = 'public';

-- Expected columns:
-- id - uuid
-- user_id - uuid
-- name - text
-- email - text
-- phone - text
-- tax_id - text
-- created_at - timestamp with time zone
-- updated_at - timestamp with time zone
