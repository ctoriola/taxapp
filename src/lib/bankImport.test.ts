import { describe, expect, it } from 'vitest';
import { detectColumns, findHeaderRow, fingerprintId, mappingProblem, parseAmount, parseCsv, parseDate, suggestMatches, toTransactions } from './bankImport';

// Shaped like a Nigerian bank export: account details first, then the table
const GTB_CSV = `Customer Statement,,,,,,
Account Name,TOLU FOODS LTD,,,,,
Account No,0123456789,,,,,
,,,,,,
Trans. Date,Value Date,Reference,Debits,Credits,Balance,Remarks
05-Oct-2026,05-Oct-2026,FT2610050001,,"107,500.00","1,207,500.00",TRF FROM BOLA STORES INV-0104
05-Oct-2026,05-Oct-2026,FT2610050002,"25,000.00",,"1,182,500.00","POS PURCHASE, SHOPRITE IKEJA"
06-Oct-2026,06-Oct-2026,FT2610060003,50.00,,"1,182,450.00",SMS ALERT CHARGES
06-Oct-2026,06-Oct-2026,FT2610060003,50.00,,"1,182,400.00",SMS ALERT CHARGES
,,,,,,
Total,,,"25,100.00","107,500.00",,
`;

describe('parsing', () => {
  it('reads quoted CSV with commas inside fields', () => {
    const rows = parseCsv('a,"b, c","say ""hi"""\r\n1,2,3\n');
    expect(rows).toEqual([['a', 'b, c', 'say "hi"'], ['1', '2', '3']]);
    expect(parseCsv('date;amount\n01/10/2026;5')).toEqual([['date', 'amount'], ['01/10/2026', '5']]);
  });

  it('reads day-first dates in the formats banks use', () => {
    expect(parseDate('05/10/2026')).toBe('2026-10-05');
    expect(parseDate('05-Oct-2026')).toBe('2026-10-05');
    expect(parseDate('5 Sept 2026')).toBe('2026-09-05');
    expect(parseDate('05-OCT-26')).toBe('2026-10-05');
    expect(parseDate('2026-10-05 14:22:01')).toBe('2026-10-05');
    expect(parseDate(46300)).toBe('2026-10-05'); // Excel serial (1899-12-30 + 46300 days)
    expect(parseDate(new Date(2026, 9, 5))).toBe('2026-10-05');
    expect(parseDate('31/02/2026')).toBeNull();
    expect(parseDate('Total')).toBeNull();
  });

  it('reads amounts with commas, currency, brackets and DR/CR', () => {
    expect(parseAmount('1,250.50')).toBe(1250.5);
    expect(parseAmount('(500.00)')).toBe(-500);
    expect(parseAmount('-500')).toBe(-500);
    expect(parseAmount('₦2,000')).toBe(2000);
    expect(parseAmount('NGN 2,000.00 DR')).toBe(-2000);
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('n/a')).toBeNull();
  });
});

describe('statement to transactions', () => {
  const rows = parseCsv(GTB_CSV);
  const header = findHeaderRow(rows);
  const map = detectColumns(rows[header]);

  it('finds the header below the account details and maps the columns', () => {
    expect(header).toBe(3); // blank rows are dropped while parsing
    expect(map).toMatchObject({ date: 0, reference: 2, debit: 3, credit: 4, balance: 5, description: 6, amount: null });
    expect(mappingProblem(map)).toBeNull();
    expect(mappingProblem({ ...map, date: null })).toMatch(/date/);
  });

  it('turns rows into money in/out, skipping blanks and totals', () => {
    const { rows: txs, skipped } = toTransactions(rows, header, map);
    expect(skipped).toBe(1); // the Total row has no date (the blank row is dropped while parsing)
    expect(txs.map((t) => [t.date, t.direction, t.amount])).toEqual([
      ['2026-10-05', 'in', 107500],
      ['2026-10-05', 'out', 25000],
      ['2026-10-06', 'out', 50],
      ['2026-10-06', 'out', 50],
    ]);
    expect(txs[1].description).toBe('POS PURCHASE, SHOPRITE IKEJA');
    expect(txs[0].balance).toBe(1207500);
  });

  it('keeps identical same-day lines as separate transactions but stable across imports', () => {
    const first = toTransactions(rows, header, map).rows;
    const again = toTransactions(rows, header, map).rows;
    expect(first[2].fingerprint).not.toBe(first[3].fingerprint);
    expect(first.map((t) => fingerprintId(t.fingerprint))).toEqual(again.map((t) => fingerprintId(t.fingerprint)));
    expect(fingerprintId(first[0].fingerprint)).toMatch(/^bt-[a-z0-9]+$/);
  });

  it('supports a single signed amount column', () => {
    const simple = parseCsv('Date,Narration,Amount\n01/10/2026,Rent,-350000\n02/10/2026,Payment from Ada,50000');
    const m = detectColumns(simple[0]);
    expect(m).toMatchObject({ date: 0, description: 1, amount: 2, debit: null, credit: null });
    expect(toTransactions(simple, 0, m).rows.map((t) => [t.direction, t.amount])).toEqual([['out', 350000], ['in', 50000]]);
  });
});

describe('suggestMatches', () => {
  const candidates = [
    { id: 'a', invoice_number: 'INV-0104', customer_name: 'Bola Stores', outstanding: 107500, invoice_date: '2026-10-01' },
    { id: 'b', invoice_number: 'INV-0105', customer_name: 'Ada Ventures', outstanding: 107500, invoice_date: '2026-10-02' },
    { id: 'c', invoice_number: 'INV-0106', customer_name: 'Kola Foods', outstanding: 0, invoice_date: '2026-09-01' },
  ];

  it('ranks the invoice named in the narration first', () => {
    const s = suggestMatches({ amount: 107500, description: 'TRF FROM BOLA STORES INV-0104', reference: '', date: '2026-10-05' }, candidates);
    expect(s[0].invoice.id).toBe('a');
    expect(s[0].reason).toMatch(/invoice number/);
    expect(s.map((x) => x.invoice.id)).toContain('b'); // same amount, still offered
  });

  it('offers part payments only when the narration points to the customer', () => {
    expect(suggestMatches({ amount: 50000, description: 'ADA VENTURES PART PAYMENT', reference: '', date: '2026-10-05' }, candidates).map((x) => x.invoice.id)).toEqual(['b']);
    expect(suggestMatches({ amount: 50000, description: 'TRANSFER', reference: '', date: '2026-10-05' }, candidates)).toEqual([]);
  });

  it('ignores paid invoices and ones dated after the payment', () => {
    expect(suggestMatches({ amount: 107500, description: 'KOLA FOODS', reference: '', date: '2026-10-05' }, candidates).some((x) => x.invoice.id === 'c')).toBe(false);
    expect(suggestMatches({ amount: 107500, description: 'ADA VENTURES', reference: '', date: '2026-09-01' }, candidates)).toEqual([]);
  });
});
