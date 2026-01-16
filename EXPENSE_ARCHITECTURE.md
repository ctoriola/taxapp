# Expense Management Flow - Architecture Diagram

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Application Shell (App.tsx)                 │
│         Routes: /expenses, /expenses/create, /expenses/:id      │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
                ▼             ▼             ▼
        ┌─────────────┐ ┌──────────────┐ ┌──────────────────┐
        │  Expenses   │ │   Create     │ │    Expense       │
        │    Page     │ │   Expense    │ │    Detail Page   │
        │   (List)    │ │    Page      │ │                  │
        └─────────────┘ └──────────────┘ └──────────────────┘
             │                │                    │
             │                │                    │
             └────────────────┼────────────────────┘
                              │
                              ▼
                    ┌──────────────────────┐
                    │ expenseService.ts    │
                    │  (CRUD Operations)   │
                    └──────────────────────┘
                              │
                              ▼
                    ┌──────────────────────┐
                    │    Supabase API      │
                    │   (PostgreSQL)       │
                    └──────────────────────┘
                              │
                              ▼
                    ┌──────────────────────┐
                    │   expenses Table     │
                    │   (RLS Policies)     │
                    └──────────────────────┘
```

## Data Flow: Create Expense

```
User Input
    │
    ▼
CreateExpensePage
  - description
  - amount
  - category
  - expense_date
  - apply_vat
    │
    ▼
Validation
  - description required
  - amount > 0
    │
    ▼
Calculate Totals
  - VAT = amount × 0.075 (if apply_vat)
  - total = amount + VAT
    │
    ▼
Call expenseService.createExpense()
    │
    ▼
Supabase Insert
  INSERT INTO expenses
  (user_id, description, amount, vat_amount, total_amount, ...)
  VALUES (...)
    │
    ▼
Expense Created ✓
  Status: 'draft'
    │
    ▼
Navigate to /expenses
```

## Data Flow: Expense Status Workflow

```
┌─────────────────────────────────────────────────────┐
│                    EXPENSE LIFECYCLE                │
└─────────────────────────────────────────────────────┘

    Created
       │
       ▼
    DRAFT
    (gray badge)
       │
       ├──────────────────┐
       │                  │
       ▼                  ▼
   PENDING             REJECTED
  (yellow badge)      (red badge)
       │                  ✗
       │              (End state)
       ▼
   APPROVED
  (green badge)
  ┌─────────────────────┐
  │ VAT Becomes Active  │
  │ Counted in VAT Paid │
  │ on Dashboard        │
  └─────────────────────┘
```

## Approval Status Indicators

```
Status      Badge Color   Icon        Meaning
─────────────────────────────────────────────────
draft       Gray          📝          Not submitted
pending     Yellow        ⏳          Awaiting review
approved    Green         ✅          Approved
rejected    Red           ❌          Rejected/Denied
```

## VAT Calculation Flow

```
                        Expense Created
                             │
                    ┌────────┴────────┐
                    │                 │
            apply_vat = true      apply_vat = false
                    │                 │
                    ▼                 ▼
            VAT = amount         VAT = 0
               × 0.075
                    │                 │
                    └────────┬────────┘
                             │
                             ▼
                    total = amount + VAT
                             │
                             ▼
                        Expense Saved
                             │
              ┌──────────────┬──────────────┐
              │              │              │
          draft          pending         (only if
           VAT           VAT not         approved)
        stored but    counted yet        VAT now
        not active                     COUNTED ON
                                       DASHBOARD
                                       
                       "VAT Paid"
                       calculation
```

## Dashboard Integration

```
┌─────────────────────────────────────────────┐
│              Dashboard Page                 │
│   (loads invoices + expenses on mount)      │
└─────────────────────────────────────────────┘
           │                      │
           │                      │
    fetchInvoices()        fetchExpenses()
           │                      │
           ▼                      ▼
    Get all invoices       Get all expenses
    Calculate:             Filter by status='approved'
    - VAT Collected        Calculate:
      (sum vat_amount)     - VAT Paid
                           (sum vat_amount)
           │                      │
           └──────────┬───────────┘
                      │
                      ▼
            ┌─────────────────────┐
            │   Display Cards:    │
            │                     │
            │ 1. Revenue Collected│
            │ 2. Outstanding     │
            │ 3. VAT Collected   │
            │ 4. VAT Paid ◄──────┤─ FROM EXPENSES
            │ 5. Payable VAT     │
            │ 6. Total Invoices  │
            └─────────────────────┘
            
            Payable VAT = VAT Collected - VAT Paid
```

## Service Layer - expenseService.ts

```
┌────────────────────────────────────────────────────────┐
│               expenseService.ts API                     │
├────────────────────────────────────────────────────────┤
│                                                        │
│  READ Operations:                                      │
│  ├─ fetchExpenses()           → Get all expenses      │
│  ├─ fetchExpense(id)          → Get single expense    │
│  └─ getApprovedExpensesTotal() → Get total VAT paid   │
│                                                        │
│  WRITE Operations:                                     │
│  ├─ createExpense(...)        → Create (draft)        │
│  ├─ updateExpenseStatus(...)  → Change status         │
│  ├─ updateExpense(...)        → Update details        │
│  └─ deleteExpense(id)         → Delete               │
│                                                        │
│  All operations:                                       │
│  • Verify auth.uid() = user_id                        │
│  • Handle VAT calculations                            │
│  • Throw errors on permission denied                  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

## Database Schema - expenses Table

```
┌─────────────────────────────────────────────────┐
│            expenses (PostgreSQL)                │
├─────────────────────────────────────────────────┤
│ id              │ UUID (PK)                     │
│ user_id         │ UUID (FK → auth.users)       │
│ description     │ TEXT (required)               │
│ amount          │ DECIMAL(12,2) (required)     │
│ vat_amount      │ DECIMAL(12,2) (auto)         │
│ total_amount    │ DECIMAL(12,2) (auto)         │
│ category        │ VARCHAR(50)                   │
│ expense_date    │ DATE                          │
│ receipt_url     │ TEXT (optional)               │
│ notes           │ TEXT (optional)               │
│ status          │ VARCHAR(20)                   │
│ apply_vat       │ BOOLEAN (default: true)       │
│ created_at      │ TIMESTAMPTZ (auto)            │
│ updated_at      │ TIMESTAMPTZ (auto)            │
├─────────────────────────────────────────────────┤
│ Indexes:                                        │
│ • user_id (for fast queries)                    │
│ • status (for filtering)                        │
├─────────────────────────────────────────────────┤
│ RLS Policies:                                   │
│ • Users see own only                            │
│ • Users create own only                         │
│ • Users update own only                         │
│ • Users delete own only                         │
└─────────────────────────────────────────────────┘
```

## Category Options

```
office_supplies    → Office Supplies
utilities          → Utilities (electricity, water, internet)
travel             → Travel (flights, transport, fuel)
meals              → Meals & Entertainment
equipment          → Equipment & Hardware
services           → Professional Services (consulting, etc)
other              → Other
```

## User Workflow - Complete Journey

```
START
  │
  ├─→ User logs in to /dashboard
  │
  ├─→ Click "Expenses" in sidebar
  │    (routes to /expenses)
  │
  ├─→ ExpensesPage shows list
  │    (empty initially, summary cards show 0s)
  │
  ├─→ Click "Record Expense" button
  │    (routes to /expenses/create)
  │
  ├─→ CreateExpensePage opens form
  │    ├─ Enter description: "Office desk"
  │    ├─ Enter amount: 50,000
  │    ├─ Select category: "equipment"
  │    ├─ Pick date: today
  │    ├─ Add notes: "For new staff"
  │    ├─ VAT checkbox (checked by default)
  │    └─ Preview: Total = 53,750 (50k + 3.75k VAT)
  │
  ├─→ Click "Save Expense"
  │    ├─ Validate form
  │    ├─ Call createExpense()
  │    ├─ Send to Supabase
  │    ├─ Supabase creates with status='draft'
  │    └─ Navigate back to /expenses
  │
  ├─→ Expense appears in list (Draft tab)
  │    ├─ Date: Today
  │    ├─ Description: "Office desk"
  │    ├─ Amount: ₦50,000
  │    ├─ VAT: ₦3,750
  │    ├─ Status: 📝 Draft (gray)
  │    └─ Action: "View" button
  │
  ├─→ Click "View" button
  │    (routes to /expenses/:id)
  │
  ├─→ ExpenseDetailPage shows:
  │    ├─ Full details
  │    ├─ Amount breakdown
  │    ├─ Status change buttons
  │    └─ Delete button
  │
  ├─→ User changes status
  │    ├─ Click "⏳ Pending" button
  │    ├─ Status updates to "pending"
  │    ├─ Display shows: ⏳ Pending Approval
  │
  ├─→ Later, manager approves
  │    ├─ Click "✅ Approve" button
  │    ├─ Status updates to "approved"
  │    ├─ VAT now counts toward "VAT Paid"
  │
  ├─→ Go back to dashboard
  │    ├─ "VAT Paid" now shows: ₦3,750
  │    ├─ "Payable VAT" recalculates
  │    └─ Payable VAT = Collected - Paid
  │
  END
```

---

**Architecture Note**: The expense system mirrors the invoice system architecture, ensuring consistency and maintainability across the application.
