import { formatNaira, parseDay } from './finance';

interface EmailInput {
  invoice: { invoice_number: string; total_amount: number; amount_paid?: number; due_date: string };
  customer?: { name?: string; email?: string } | null;
  businessName?: string | null;
}

// A mailto: link that opens the user's email app with the invoice details filled in.
// There's no email service behind the app, so the user sends it (and attaches the PDF) themselves.
export function invoiceMailto({ invoice, customer, businessName }: EmailInput): string {
  const business = businessName?.trim() || 'us';
  const owed = invoice.total_amount - (invoice.amount_paid || 0);
  const due = invoice.due_date
    ? parseDay(invoice.due_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  const subject = `Invoice ${invoice.invoice_number} from ${business}`;
  const body = [
    `Hello${customer?.name ? ` ${customer.name}` : ''},`,
    '',
    `Please find attached invoice ${invoice.invoice_number} for ${formatNaira(owed, 2)}${due ? `, due on ${due}` : ''}.`,
    '',
    'Thank you for your business.',
    '',
    business === 'us' ? '' : business,
  ]
    .join('\n')
    .trimEnd();
  return `mailto:${encodeURIComponent(customer?.email?.trim() || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// Hand the link to the email app without navigating the page
export function openEmail(mailto: string): void {
  const link = document.createElement('a');
  link.href = mailto;
  link.rel = 'noopener';
  link.click();
}
