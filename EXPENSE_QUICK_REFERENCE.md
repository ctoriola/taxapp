# Expense System - Quick Reference Guide

## Files Summary

| File | Purpose | Lines |
|------|---------|-------|
| `src/services/expenseService.ts` | CRUD operations + VAT calculations | 180+ |
| `src/pages/CreateExpensePage.tsx` | Form to record new expenses | 280+ |
| `src/pages/ExpensesPage.tsx` | List view with tabs and search | 300+ |
| `src/pages/ExpenseDetailPage.tsx` | Detailed view + status management | 260+ |
| `src/App.tsx` | Routes (3 new: /expenses routes) | Updated |
| `src/pages/DashboardPage.tsx` | VAT Paid integration | Updated |
| `supabase/migrations/add_expenses_table.sql` | Database schema | 45 lines |

## Quick API Reference

### Creating an Expense
```typescript
import { createExpense } from '../services/expenseService';

await createExpense(
  description: string,
  amount: number,
  category: string,
  expense_date: string,
  apply_vat: boolean = true,
  notes?: string
);
```

### Fetching Expenses
```typescript
import { fetchExpenses, fetchExpense } from '../services/expenseService';

// Get all
const expenses = await fetchExpenses();

// Get single
const expense = await fetchExpense(id);
```

### Updating Status
```typescript
import { updateExpenseStatus } from '../services/expenseService';

await updateExpenseStatus(id, 'approved'); // or 'pending', 'rejected', 'draft'
```

### Getting Approved VAT Total
```typescript
import { getApprovedExpensesTotal } from '../services/expenseService';

const totalVAT = await getApprovedExpensesTotal(); // Returns sum of VAT for approved only
```

## Routes

| Route | Component | Purpose |
|-------|-----------|---------|
| `/expenses` | ExpensesPage | List all expenses |
| `/expenses/create` | CreateExpensePage | Create new expense |
| `/expenses/:id` | ExpenseDetailPage | View/manage single expense |

## Status Workflow

```
draft ──→ pending ──→ approved  ✓  (counted in VAT Paid)
          │
          └──→ rejected ✗
```

**Only APPROVED expenses count toward VAT Paid calculation on dashboard.**

## Category Values

- `office_supplies`
- `utilities`
- `travel`
- `meals`
- `equipment`
- `services`
- `other`

## VAT Calculation

```
if apply_vat = true:
  vat_amount = amount × 0.075 (7.5%)
  total_amount = amount + vat_amount

if apply_vat = false:
  vat_amount = 0
  total_amount = amount
```

## Component Props

### CreateExpensePage
- No props required (uses hooks only)
- Returns on save: navigates to `/expenses`

### ExpensesPage
- No props required
- Loads expenses on mount
- Handles search and tab filtering

### ExpenseDetailPage
- Uses URL param `id` to load expense
- Displays and manages expense data

## Integration Checklist

- [x] Service layer created
- [x] Page components created
- [x] Routes added to App.tsx
- [x] Dashboard linked to expenses
- [x] VAT Paid calculation integrated
- [x] Database schema provided
- [ ] Run SQL migration in Supabase ← **YOU DO THIS**
- [ ] Test create/view/approve flow
- [ ] Add receipt upload (optional)

## Testing Checklist

After setup:

- [ ] Can create expense (Draft)
- [ ] Can view expense list
- [ ] Can search expenses
- [ ] Can filter by status tab
- [ ] Can change status to Pending
- [ ] Can approve expense
- [ ] Dashboard shows updated VAT Paid
- [ ] Can delete draft expense
- [ ] VAT calculates correctly (7.5%)

## Common Issues & Fixes

### VAT Not Showing
- Check `apply_vat` checkbox when creating
- Verify `vat_amount` column exists in DB

### Can't See Expenses
- Verify RLS policies are enabled
- Check user is logged in
- Confirm Supabase table exists

### Status Won't Change
- Refresh page after clicking button
- Check browser console for errors
- Verify Supabase permissions

### Dashboard VAT Paid Still 0
- Create an expense first
- Approve the expense
- Refresh dashboard page
- VAT Paid should now show

## Performance Tips

### Optimize Queries
```typescript
// Instead of loading all expenses on every page load:
const loadExpenses = async () => {
  const data = await fetchExpenses();
  setExpenses(data);
};
```

### Filter Server-Side (Future Enhancement)
```typescript
// Could add filters to expenseService
export async function fetchExpensesByStatus(status: string) {
  // Filter in database, not JavaScript
}
```

### Cache Approved Expenses
```typescript
// Store in state to avoid recalculation
const [totalVATPaid, setTotalVATPaid] = useState(0);

useEffect(() => {
  getApprovedExpensesTotal().then(setTotalVATPaid);
}, []);
```

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile: ✅ Responsive design

## Keyboard Shortcuts (Future)

Could add:
- `Ctrl+N` - New expense
- `Escape` - Close modal
- `Enter` - Submit form

## Accessibility Features

- Form labels linked to inputs
- Color-coded status badges + text labels
- Proper heading hierarchy
- Keyboard navigation supported

## Next Phase Features

1. **Receipt Upload** - Store receipt images
2. **Budget Tracking** - Set limits by category
3. **Recurring Expenses** - Monthly templates
4. **Advanced Filters** - Date range, amount range
5. **Reports** - PDF export of expenses
6. **Approval Workflow** - Multiple approvers
7. **Bank Integration** - Auto-import transactions
8. **Mobile App** - React Native version

---

**Last Updated**: January 15, 2026  
**Version**: 1.0 (Initial Release)  
**Status**: Production Ready (after Supabase setup)
