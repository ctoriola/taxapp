# Create Invoice Feature - Implementation Guide

## Overview

The Create Invoice feature is a complete invoicing system that allows users to:
- Create professional invoices with customer information
- Add line items with automatic calculations
- Apply 7.5% VAT (Nigerian standard)
- Upload and manage company logos
- Save invoices as drafts or send them directly
- Track invoice status (draft, sent, paid, overdue)

## Files Created

### Components

#### 1. **CustomerSelect.tsx** (`/src/components/CustomerSelect.tsx`)
Searchable dropdown for selecting customers with inline creation option.

**Features:**
- Search by customer name or email
- Display customer email below name
- "+ Add New Customer" button at bottom
- Closes when selection made or clicking outside
- Auto-focus on search input

**Usage:**
```tsx
<CustomerSelect
  selectedCustomerId={selectedCustomerId}
  onSelect={(id) => setSelectedCustomerId(id)}
  onAddNew={() => setIsNewCustomerModalOpen(true)}
/>
```

#### 2. **NewCustomerModal.tsx** (`/src/components/NewCustomerModal.tsx`)
Modal for creating new customers without leaving invoice flow.

**Features:**
- Form for: name, email, phone
- Only name is required
- Auto-closes after creation
- Calls `addCustomer()` from customerService
- Auto-selects new customer in parent form
- Error handling with user-friendly messages

**Usage:**
```tsx
<NewCustomerModal
  isOpen={isNewCustomerModalOpen}
  onClose={() => setIsNewCustomerModalOpen(false)}
  onCustomerCreated={handleCustomerCreated}
/>
```

#### 3. **InvoiceLineItem.tsx** (`/src/components/InvoiceLineItem.tsx`)
Reusable line item component for invoice entries.

**Features:**
- Input fields: description, quantity, unit_price
- Auto-calculates line_total (quantity × unit_price)
- Real-time updates
- Remove button for deleting line items
- Displays item number

**Props:**
```tsx
interface InvoiceLineItemProps {
  item: LineItem;
  onUpdate: (item: LineItem) => void;
  onRemove: (id: string) => void;
  index: number;
}
```

#### 4. **InvoiceSummary.tsx** (`/src/components/InvoiceSummary.tsx`)
Sticky right-side summary showing real-time calculations.

**Features:**
- Displays subtotal (sum of all line items)
- VAT toggle (7.5%)
- Shows VAT amount calculated in real-time
- Displays total amount (subtotal + VAT)
- Sticky positioning on scroll
- Info message explaining calculations

**Props:**
```tsx
interface InvoiceSummaryProps {
  subtotal: number;
  applyVat: boolean;
  onVatToggle: (apply: boolean) => void;
}
```

### Pages

#### 5. **CreateInvoicePage.tsx** (`/src/pages/CreateInvoicePage.tsx`)
Main invoice creation page orchestrating all components.

**Layout:**
- Left column (2/3): Invoice form and line items
- Right column (1/3): Summary and action buttons

**Form Sections:**
1. **Invoice Details:**
   - Invoice number (auto-generated, editable)
   - Invoice date (default: today)
   - Due date (default: 30 days from today)
   - Customer selection (via CustomerSelect)

2. **Line Items:**
   - Add/remove items
   - Description, quantity, unit_price inputs
   - Auto-calculated line totals
   - Empty state with "Add First Item" button

3. **Notes:**
   - Optional textarea for payment instructions

4. **Actions:**
   - "Save as Draft" - saves with status='draft'
   - "Send Invoice" - saves with status='sent'
   - "Cancel" - returns to dashboard

**Features:**
- Auto-generates invoice number on mount (INV-YYYYMMDD-XXXX format)
- Real-time VAT calculations
- Form validation (customer required, at least one line item, due date for send)
- Error and success messages
- Loading states on buttons
- Auto-redirect to /invoices after save (in future phase)

### Services

#### 6. **invoiceService.ts** (`/src/services/invoiceService.ts`) - Updated
Enhanced with all invoice management functions.

**Interfaces:**
```typescript
interface Invoice {
  id: string;
  user_id: string;
  customer_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  notes: string | null;
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  apply_vat: boolean;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  line_items: InvoiceLineItem[];
  company_logo_url: string | null;
  created_at: string;
  updated_at: string;
}

interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

interface CompanyLogo {
  id: string;
  user_id: string;
  logo_url: string;
  created_at: string;
  updated_at: string;
}
```

**Functions:**

1. **generateInvoiceNumber()** → string
   - Format: INV-YYYYMMDD-XXXX
   - Example: INV-20260115-3847
   - Auto-generates on page load

2. **createInvoice(invoice)** → Promise<Invoice>
   - Saves invoice with all line items
   - Calculates totals automatically
   - Returns created invoice

3. **fetchInvoices()** → Promise<Invoice[]>
   - Gets all invoices for current user
   - Ordered by created_at DESC

4. **uploadCompanyLogo(file)** → Promise<CompanyLogo>
   - Uploads logo to Supabase storage
   - Saves reference in company_logos table
   - Returns logo object

5. **getCompanyLogo()** → Promise<CompanyLogo | null>
   - Retrieves user's saved logo
   - Returns null if no logo

6. **deleteCompanyLogo()** → Promise<void>
   - Removes logo from storage and database

## Database Schema

### invoices table
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL (FK to auth.users),
  customer_id UUID NOT NULL (FK to customers),
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  notes TEXT,
  subtotal NUMERIC(15, 2),
  vat_amount NUMERIC(15, 2),
  total_amount NUMERIC(15, 2),
  apply_vat BOOLEAN,
  status TEXT ('draft'|'sent'|'paid'|'overdue'),
  line_items JSONB (array of {description, quantity, unit_price, line_total}),
  company_logo_url TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### company_logos table
```sql
CREATE TABLE company_logos (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE (FK to auth.users),
  logo_url TEXT NOT NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### RLS Policies
- **invoices:** Users can only access their own invoices (auth.uid() = user_id)
- **company_logos:** Users can only manage their own logo (auth.uid() = user_id)

## Setup Instructions

### 1. Run Supabase SQL Setup
1. Go to your Supabase dashboard
2. Open SQL Editor
3. Copy and paste contents of `SUPABASE_SETUP.sql`
4. Execute the SQL

### 2. Create Storage Bucket
1. Go to Storage in Supabase dashboard
2. Click "New bucket"
3. Name: `logos`
4. Set to PRIVATE
5. Configure RLS policies (see SUPABASE_SETUP.sql comments)

### 3. Update Routes
Routes have been added to App.tsx:
```tsx
<Route path="/invoices/create" element={<ProtectedRoute><CreateInvoicePage /></ProtectedRoute>} />
```

### 4. Navigation
The Invoices menu item in the dashboard sidebar now links to `/invoices/create`.

## Usage Flow

### Creating an Invoice

1. **User clicks "Invoices" in sidebar**
   - Navigates to CreateInvoicePage

2. **Auto-populated fields:**
   - Invoice number: INV-20260115-3847
   - Invoice date: Today's date
   - Due date: 30 days from today

3. **User fills in:**
   - Select customer (with option to add new)
   - Optional notes
   - Add line items

4. **Line items:**
   - Click "Add Item"
   - Enter description, quantity, unit_price
   - Auto-calculates line_total
   - Remove button if needed
   - Add multiple items

5. **VAT handling:**
   - Summary shows VAT toggle (default: checked)
   - Real-time VAT calculation (7.5%)
   - Shows total automatically

6. **Save or Send:**
   - "Save as Draft" → status='draft', stores for later
   - "Send Invoice" → status='sent', ready for delivery
   - Both require: customer selected, at least one line item
   - "Send" also requires: due date set

7. **Confirmation:**
   - Success message displays
   - Auto-redirect to invoices page after 2 seconds

## Real-Time Calculations

### Subtotal Calculation
```
Subtotal = SUM(all line_items.line_total)
         = SUM(quantity × unit_price for each item)
```

### VAT Calculation
```
if apply_vat:
  VAT Amount = Subtotal × 0.075 (7.5%)
else:
  VAT Amount = 0
```

### Total Calculation
```
Total = Subtotal + VAT Amount
```

All calculations update instantly as user modifies line items or toggles VAT.

## Error Handling

### Form Validation
- ❌ No customer selected → Error: "Please select a customer"
- ❌ No line items added → Error: "Please add at least one line item"
- ❌ Sending without due date → Error: "Please set a due date"

### Network Errors
- All errors caught with try-catch
- User-friendly error messages displayed
- Console logs include full error details for debugging

### Loading States
- Submit buttons disabled during save/send
- Button text changes to "Processing..."
- Prevents double-submission

## Future Enhancements

### Phase 2 (Planned)
- [ ] InvoicesPage - List all invoices with filters
- [ ] InvoiceDetailPage - View/edit single invoice
- [ ] PDF generation and download
- [ ] Email invoice directly from app
- [ ] Mark invoice as paid/overdue
- [ ] Invoice reminders and follow-ups

### Phase 3 (Planned)
- [ ] Logo upload UI with preview
- [ ] Invoice templates/customization
- [ ] Recurring invoices
- [ ] Invoice payments tracking
- [ ] Client portal to view invoices

## Testing Checklist

- [ ] Can select existing customer
- [ ] Can add new customer from modal
- [ ] Line item calculations correct
- [ ] VAT toggles and calculates properly
- [ ] Invoice number auto-generates
- [ ] Can add/remove multiple line items
- [ ] "Save as Draft" works and stores data
- [ ] "Send Invoice" works and stores with status='sent'
- [ ] Validation messages display correctly
- [ ] Success message shows after save
- [ ] Auto-redirect works after save (when InvoicesPage exists)
- [ ] Can navigate back to dashboard

## Performance Notes

- Line item calculations use reduce() for efficiency
- Component re-renders only on relevant state changes
- Supabase queries optimized with proper indexes
- RLS policies prevent unauthorized access

## Browser Compatibility

Works on all modern browsers:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Notes for Developer

1. **Auto-focus on CustomerSelect:** Search input auto-focuses when dropdown opens for better UX
2. **Sticky Summary:** InvoiceSummary uses sticky positioning to stay visible while scrolling
3. **JSONB Storage:** Line items stored as JSONB in database for flexibility
4. **Monetary Precision:** All amounts use NUMERIC(15, 2) for accurate financial calculations
5. **User Isolation:** All queries filtered by user_id for security

## Environment Variables

The following are already configured in `.env.local`:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anon key

No additional environment variables needed for invoice feature.
