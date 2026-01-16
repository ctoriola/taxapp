-- ============================================
-- SUPABASE SETUP FOR INVOICE MANAGEMENT
-- ============================================
-- Run these SQL queries in your Supabase SQL editor
-- to set up the invoices and company_logos tables

-- 1. Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  notes TEXT,
  subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0,
  vat_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  apply_vat BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'sent', 'paid', 'overdue'
  line_items JSONB NOT NULL DEFAULT '[]',
  company_logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Create company_logos table
CREATE TABLE IF NOT EXISTS public.company_logos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  logo_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON public.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_company_logos_user_id ON public.company_logos(user_id);

-- 4. Enable Row Level Security (RLS) on invoices table
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policy for invoices - users can only read/write/delete their own invoices
CREATE POLICY "users_can_manage_own_invoices" ON public.invoices
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. Enable Row Level Security (RLS) on company_logos table
ALTER TABLE public.company_logos ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policy for company_logos - users can only manage their own logo
CREATE POLICY "users_can_manage_own_logo" ON public.company_logos
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- STORAGE SETUP FOR LOGO UPLOADS
-- ============================================
-- The following needs to be done in Supabase UI:
-- 1. Go to Storage in your Supabase dashboard
-- 2. Create a new bucket called "logos"
-- 3. Set it to PRIVATE (not public)
-- 4. Configure the RLS policy:
--    - Allow INSERT for authenticated users
--    - Allow SELECT for authenticated users who own the file
--    - Allow UPDATE for authenticated users who own the file
--    - Allow DELETE for authenticated users who own the file

-- ============================================
-- NOTES
-- ============================================
-- - Line items are stored as JSONB array with structure:
--   [
--     {
--       "description": "Service description",
--       "quantity": 2,
--       "unit_price": 50000,
--       "line_total": 100000
--     }
--   ]
--
-- - Invoice status can be: 'draft', 'sent', 'paid', 'overdue'
-- - All monetary values are stored as NUMERIC(15, 2) for precision
-- - VAT is always 7.5% (0.075)
-- - All tables have created_at and updated_at timestamps
