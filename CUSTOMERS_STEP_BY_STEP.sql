-- ============================================
-- STEP-BY-STEP CUSTOMERS TABLE MIGRATION
-- ============================================
-- Run these commands one at a time in your Supabase SQL editor

-- STEP 1: First, let's check what columns currently exist
-- Run this to see what you have:
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'customers' AND table_schema = 'public'
ORDER BY ordinal_position;

-- STEP 2: Add the user_id column WITHOUT the NOT NULL constraint first
-- (This avoids issues with existing rows)
ALTER TABLE public.customers
ADD COLUMN user_id UUID;

-- STEP 3: Create a foreign key reference
ALTER TABLE public.customers
ADD CONSTRAINT fk_customers_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- STEP 4: If you have existing customers, assign them to the first user
-- First, see what users you have:
SELECT id, email FROM auth.users LIMIT 5;

-- Then run this to assign existing customers to a user (replace the user id):
-- UPDATE public.customers 
-- SET user_id = '1726dac1-0b9e-4a7c-b1bd-44731bbb2ab8'
-- WHERE user_id IS NULL;

-- STEP 5: Now make user_id NOT NULL (only after all rows have a value)
ALTER TABLE public.customers
ALTER COLUMN user_id SET NOT NULL;

-- STEP 6: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(name);

-- STEP 7: Enable Row Level Security
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- STEP 8: Drop any existing policies
DROP POLICY IF EXISTS "users_can_manage_own_customers" ON public.customers;
DROP POLICY IF EXISTS "customers_insert" ON public.customers;
DROP POLICY IF EXISTS "customers_read" ON public.customers;
DROP POLICY IF EXISTS "customers_update" ON public.customers;
DROP POLICY IF EXISTS "customers_delete" ON public.customers;

-- STEP 9: Create comprehensive RLS policies
CREATE POLICY "customers_insert" ON public.customers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "customers_read" ON public.customers
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "customers_update" ON public.customers
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "customers_delete" ON public.customers
  FOR DELETE
  USING (auth.uid() = user_id);

-- STEP 10: Verify the final table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'customers' AND table_schema = 'public'
ORDER BY ordinal_position;
