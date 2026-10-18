-- ============================================
-- ALIGN DATABASE SCHEMA WITH THE APP
-- ============================================
-- The app reads and writes a user_profiles table and invoices.amount_paid,
-- but no earlier setup script created them. Run this in the Supabase SQL
-- editor. It is idempotent: anything that already exists is left alone.

-- 1. Business profile for each user (one row per auth user)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  business_name TEXT NOT NULL DEFAULT '',
  business_type TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_can_manage_own_profile" ON public.user_profiles;
CREATE POLICY "users_can_manage_own_profile" ON public.user_profiles
  FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 2. Payment tracking on invoices
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(15, 2) NOT NULL DEFAULT 0;

-- Invoices marked paid before amount_paid existed should count as fully paid
UPDATE public.invoices
  SET amount_paid = total_amount
  WHERE status = 'paid' AND amount_paid = 0;

-- Invoice status values used by the app:
--   'draft', 'unpaid', 'partially_paid', 'paid', 'overdue'
