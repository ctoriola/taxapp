# Setting Up Expenses in Supabase

## Quick Setup Instructions

To enable the expense management system, run the SQL migration in your Supabase project:

### Step 1: Go to Supabase Dashboard
1. Log in to your Supabase project
2. Navigate to the SQL Editor
3. Click "New Query"

### Step 2: Copy and Paste the Migration

Copy all SQL from `supabase/migrations/add_expenses_table.sql` into the query editor.

### Step 3: Execute

Click "Run" or press Ctrl+Enter to execute the migration.

### Step 4: Verify

The expenses table should now appear in the "Tables" section of the sidebar with:
- ✅ All columns created
- ✅ RLS policies enabled
- ✅ Indexes created

## What Gets Created

### Table: `expenses`
- Stores all expense records
- Linked to user via RLS policies
- Automatically tracks created/updated timestamps

### Policies (Row Level Security)
- Users can ONLY see their own expenses
- Users can ONLY create expenses for themselves
- Users can ONLY update/delete their own expenses

### Indexes
- `user_id` - For fast user queries
- `status` - For filtering by status

## Testing the Connection

Once the table is created:

1. **Open app**: Navigate to http://localhost:3000/
2. **Log in**: Use your test account
3. **Create expense**: Click Dashboard → "Expenses" → "Record Expense"
4. **Fill form**: 
   - Description: "Test expense"
   - Amount: 50000
   - Category: "Office Supplies"
   - Date: Today
5. **Save**: Click "Save Expense"

### Expected Result
- Expense appears in `/expenses` list
- Status shows as "Draft" (gray badge)
- Amount shown with 7.5% VAT added

## Troubleshooting

### "Permission denied" Error
- Check RLS policies are created
- Verify `auth.uid()` matches your logged-in user
- Run the entire SQL migration (including the POLICY statements)

### Table Not Appearing
- Refresh the Supabase dashboard
- Check SQL execution returned no errors
- Verify you're in the correct project

### VAT Not Calculating
- Ensure `apply_vat` is checked when creating
- Check `vat_amount` column exists in table
- Verify backend is using the Expense interface

## Optional: Adding to Existing Project

If you already have a Supabase project, you can:

1. **Add to migrations folder**:
   ```
   supabase/migrations/<timestamp>_add_expenses_table.sql
   ```

2. **Push to Supabase**:
   ```bash
   supabase db push
   ```

3. **Or run manually** via SQL Editor as above

## Storage Setup (Optional)

For receipt uploads (future feature):

```sql
-- Create storage bucket
INSERT INTO storage.buckets (id, name)
VALUES ('expense-receipts', 'expense-receipts');

-- Allow authenticated users to upload
CREATE POLICY "Users can upload receipts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'expense-receipts' AND auth.role() = 'authenticated');
```

## Success!

Your expense management system is now ready to use. Users can:
- ✅ Record new expenses with VAT
- ✅ View expense list with filters
- ✅ Change expense status (Draft → Pending → Approved/Rejected)
- ✅ See VAT reclamable amounts on dashboard
- ✅ Track expense categories
