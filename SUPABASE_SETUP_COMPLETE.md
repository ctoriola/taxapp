# Complete Supabase Setup Guide

## Step 1: Enable Email/Password Authentication

1. Go to your Supabase dashboard: https://app.supabase.com
2. Select your project
3. Navigate to **Authentication** → **Providers**
4. Look for **Email** provider
5. Enable it (it should be enabled by default)
6. Confirm settings:
   - Enable "Email confirmations" (or disable for testing)
   - Confirm other settings are configured

## Step 2: Create Users Table (Optional - for storing business info)

This is optional. Supabase Auth automatically creates a `auth.users` table. But you can create a custom users profile table to store additional business information.

### Execute this SQL in Supabase SQL Editor:

```sql
-- Create users profile table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  business_name TEXT,
  business_type TEXT,
  phone TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policy so users can read their own data
CREATE POLICY "Users can read own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Create policy so users can update their own data
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- Create policy so users can insert their own data
CREATE POLICY "Users can insert own profile"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);
```

## Step 3: Create Customers Table

Execute this SQL in Supabase SQL Editor:

```sql
-- Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  tax_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX customers_user_id_idx ON public.customers(user_id);

-- Enable Row Level Security
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can read their own customers
CREATE POLICY "Users can read own customers"
  ON public.customers
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own customers
CREATE POLICY "Users can insert own customers"
  ON public.customers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own customers
CREATE POLICY "Users can update own customers"
  ON public.customers
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own customers
CREATE POLICY "Users can delete own customers"
  ON public.customers
  FOR DELETE
  USING (auth.uid() = user_id);
```

## Step 4: Test Authentication

1. Go to http://localhost:3000/signup
2. Fill in the signup form with:
   - Full Name: Your Name
   - Email: test@example.com
   - Password: TestPassword123
   - Business details
3. Click "Create Account"

### Troubleshooting:

**Error: "Failed to fetch"**
- Check that Supabase is running and accessible
- Check that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct in `.env.local`
- Check browser console (F12) for CORS errors
- Verify email/password auth is enabled in Supabase dashboard

**Error: "Email already registered"**
- The email already exists in Supabase
- Try a different email address

**Error: "Invalid login credentials"**
- Email doesn't exist or password is wrong
- Verify the account was created first on signup page

## Step 5: Verify in Supabase Dashboard

After signing up:
1. Go to Supabase dashboard → Authentication → Users
2. You should see your newly created user
3. Click on the user to see details

## Environment Variables (.env.local)

Make sure these are set correctly:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Get these values from:
- Supabase Dashboard → Settings → API
- Copy the "Project URL" and "Anon Public Key"

## File Structure

The application uses:
- `/src/lib/supabaseClient.ts` - Supabase client initialization
- `/src/services/authService.ts` - Authentication operations
- `/src/services/customerService.ts` - Customer CRUD operations
- `/src/context/AuthContext.tsx` - Global auth state management
- `/src/components/ProtectedRoute.tsx` - Route protection

## Features Implemented

✅ User Signup (Email/Password)
✅ User Login
✅ User Logout
✅ Protected Routes
✅ Customer CRUD (Add, List, Search, Delete)
✅ Error Handling with User-Friendly Messages
✅ Loading States

## Next Steps

1. Create the SQL tables in Supabase (see Step 2-3 above)
2. Test signup and login flows
3. Add customers from the dashboard
4. Consider adding:
   - Customer editing
   - Customer details page
   - Transaction/invoice tracking
   - VAT calculation features

