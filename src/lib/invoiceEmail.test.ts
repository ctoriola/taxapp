import { describe, expect, it } from 'vitest';
import { invoiceMailto } from './invoiceEmail';

const decode = (url: string) => {
  const [to, query] = url.replace('mailto:', '').split('?');
  const params = new URLSearchParams(query);
  return { to: decodeURIComponent(to), subject: params.get('subject'), body: params.get('body') };
};

describe('invoiceMailto', () => {
  it('addresses the customer with the invoice details', () => {
    const mail = decode(invoiceMailto({
      invoice: { invoice_number: 'INV-0104', total_amount: 107500, amount_paid: 7500, due_date: '2026-11-18' },
      customer: { name: 'Bola Stores', email: 'pay@bola.ng' },
      businessName: 'Tolu Foods Ltd',
    }));
    expect(mail.to).toBe('pay@bola.ng');
    expect(mail.subject).toBe('Invoice INV-0104 from Tolu Foods Ltd');
    expect(mail.body).toContain('Hello Bola Stores,');
    expect(mail.body).toMatch(/invoice INV-0104 for ₦100,000\.00, due on 18 November 2026\./);
    expect(mail.body?.trim().endsWith('Tolu Foods Ltd')).toBe(true);
  });

  it('still works without a customer email or business name', () => {
    const mail = decode(invoiceMailto({ invoice: { invoice_number: 'INV-1', total_amount: 500, due_date: '' }, customer: null }));
    expect(mail.to).toBe('');
    expect(mail.subject).toBe('Invoice INV-1 from us');
    expect(mail.body).toContain('Hello,');
  });

  it('escapes characters that would break the link', () => {
    const url = invoiceMailto({ invoice: { invoice_number: 'A&B?', total_amount: 1, due_date: '' }, customer: { email: 'a+b@x.ng' }, businessName: 'R & D' });
    expect(url).not.toMatch(/subject=[^&]*&B/);
    expect(decode(url).subject).toBe('Invoice A&B? from R & D');
  });
});
