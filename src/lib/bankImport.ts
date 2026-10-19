// Bank statement import: parse a CSV/XLSX export, map its columns, and turn rows into
// transactions. Matching money in to invoices is kept separate from tax: a bank line alone
// can't tell us VAT treatment, so nothing here decides it.

export type Cell = string | number | boolean | Date | null | undefined;
export type Direction = 'in' | 'out';
export type TransactionStatus = 'unreviewed' | 'matched' | 'expense' | 'ignored';

export interface BankTransaction {
  id: string; // derived from the fingerprint, so re-importing the same line is a no-op
  date: string; // YYYY-MM-DD
  description: string;
  reference: string;
  amount: number; // always positive
  direction: Direction;
  balance: number | null;
  fingerprint: string;
  source: string; // file name it came from
  status: TransactionStatus;
  matched_invoice_id?: string | null;
  matched_amount?: number | null; // payment recorded against the invoice
  expense_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ColumnMap {
  date: number | null;
  description: number | null;
  reference: number | null;
  amount: number | null; // single signed column
  debit: number | null; // money out
  credit: number | null; // money in
  balance: number | null;
}

// ---------- CSV ----------

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');
  // Some exports use semicolons; pick whichever separator the first line uses most
  const firstLine = src.split(/\r?\n/, 1)[0] || '';
  const sep = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

// ---------- Headers and columns ----------

const PATTERNS: Record<keyof ColumnMap, RegExp> = {
  date: /^(trans(action)?\.?\s*date|date|posted\s*date|date\s*posted|txn\s*date|booking\s*date|value\s*date)$/i,
  description: /(description|narration|narrative|details|remarks?|particulars|memo|transaction\s*details)/i,
  reference: /(ref(erence)?(\s*no\.?)?|cheque|chq|transaction\s*id|session\s*id)/i,
  amount: /^(amount|transaction\s*amount|amt)(\s*\(.*\))?$/i,
  debit: /(debit|withdrawal|money\s*out|paid\s*out|dr\b)/i,
  credit: /(credit|deposit|lodgement|money\s*in|paid\s*in|cr\b)/i,
  balance: /(balance|bal\b)/i,
};

function cellText(cell: Cell): string {
  if (cell instanceof Date) return cell.toISOString();
  return cell === null || cell === undefined ? '' : String(cell).trim();
}

// Bank exports often start with account details; the header is the first row that names a
// date column and some amount column.
export function findHeaderRow(rows: Cell[][]): number {
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const cells = rows[i].map(cellText);
    const hasDate = cells.some((c) => /date/i.test(c));
    const hasMoney = cells.some((c) => PATTERNS.amount.test(c) || PATTERNS.debit.test(c) || PATTERNS.credit.test(c));
    if (hasDate && hasMoney) return i;
  }
  return 0;
}

export function detectColumns(header: Cell[]): ColumnMap {
  const names = header.map(cellText);
  const find = (key: keyof ColumnMap, exclude: number[] = []) => {
    const i = names.findIndex((n, idx) => !exclude.includes(idx) && n && PATTERNS[key].test(n));
    return i === -1 ? null : i;
  };
  // Prefer the transaction date over the value date when both exist
  const transactionDate = names.findIndex((n) => /trans|posted|txn|booking/i.test(n) && /date/i.test(n));
  const date = transactionDate !== -1 ? transactionDate : find('date') ?? names.findIndex((n) => /date/i.test(n));
  const debit = find('debit');
  const credit = find('credit', debit === null ? [] : [debit]);
  const balance = find('balance');
  const description = find('description');
  return {
    date: date === -1 ? null : date,
    description,
    reference: find('reference', [description ?? -1]),
    amount: debit === null && credit === null ? find('amount') : null,
    debit,
    credit,
    balance,
  };
}

export function mappingProblem(map: ColumnMap): string | null {
  if (map.date === null) return 'Choose which column has the date.';
  if (map.description === null) return 'Choose which column has the description.';
  if (map.amount === null && map.debit === null && map.credit === null) return 'Choose the amount column, or the debit and credit columns.';
  return null;
}

// ---------- Values ----------

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };

function ymd(y: number, m: number, d: number): string | null {
  if (y < 100) y += 2000;
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// Nigerian statements are day-first: 05/10/2026 is 5 October
export function parseDate(cell: Cell): string | null {
  if (cell instanceof Date && !isNaN(cell.getTime())) return ymd(cell.getFullYear(), cell.getMonth() + 1, cell.getDate());
  if (typeof cell === 'number' && cell > 20000 && cell < 80000) {
    // Excel serial date
    const date = new Date(Math.round((cell - 25569) * 86400000));
    return ymd(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  }
  const s = cellText(cell).replace(/\s+\d{1,2}:\d{2}(:\d{2})?(\s*[ap]m)?$/i, '').trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return ymd(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (m) return ymd(+m[3], +m[2], +m[1]);
  m = s.match(/^(\d{1,2})[-/.\s]([A-Za-z]{3,9})[-/.\s,]*(\d{2,4})$/);
  const month = m ? MONTHS[m[2].slice(0, 3).toLowerCase()] : undefined;
  if (m && month) return ymd(+m[3], month, +m[1]);
  return null;
}

// "1,250.50", "(500.00)", "-500", "₦2,000", "NGN 2,000.00 DR" → number (negative for debits)
export function parseAmount(cell: Cell): number | null {
  if (typeof cell === 'number') return Number.isFinite(cell) ? cell : null;
  let s = cellText(cell);
  if (!s || s === '-') return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (/\bdr\.?$/i.test(s)) negative = true;
  s = s.replace(/\b(dr|cr)\.?$/i, '').replace(/ngn|₦|,|\s/gi, '');
  if (s.startsWith('-')) {
    negative = !negative;
    s = s.slice(1);
  }
  if (!/^\d*\.?\d+$/.test(s)) return null;
  const n = parseFloat(s);
  return negative ? -n : n;
}

// ---------- Rows → transactions ----------

export type ParsedRow = Omit<BankTransaction, 'id' | 'source' | 'status' | 'created_at' | 'updated_at'>;

function normalise(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function baseFingerprint(row: Pick<ParsedRow, 'date' | 'amount' | 'direction' | 'description' | 'reference'>): string {
  return [row.date, row.direction, row.amount.toFixed(2), normalise(row.reference), normalise(row.description).slice(0, 60)].join('|');
}

// Firestore-safe id from a fingerprint (FNV-1a, two passes for a 64-bit-ish key)
export function fingerprintId(fingerprint: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < fingerprint.length; i++) {
    const c = fingerprint.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x5bd1e995) >>> 0;
  }
  return `bt-${h1.toString(36)}${h2.toString(36)}`;
}

export interface RowsResult {
  rows: ParsedRow[];
  skipped: number; // rows that weren't transactions (totals, blanks, bad dates)
}

export function toTransactions(rows: Cell[][], headerIndex: number, map: ColumnMap): RowsResult {
  const out: ParsedRow[] = [];
  let skipped = 0;
  const seen = new Map<string, number>();
  for (const row of rows.slice(headerIndex + 1)) {
    const date = map.date === null ? null : parseDate(row[map.date]);
    let signed: number | null = null;
    if (map.amount !== null) signed = parseAmount(row[map.amount]);
    else {
      const debit = map.debit === null ? null : parseAmount(row[map.debit]);
      const credit = map.credit === null ? null : parseAmount(row[map.credit]);
      if (credit) signed = Math.abs(credit);
      else if (debit) signed = -Math.abs(debit);
    }
    if (!date || signed === null || signed === 0) {
      skipped++;
      continue;
    }
    const description = map.description === null ? '' : cellText(row[map.description]);
    const reference = map.reference === null ? '' : cellText(row[map.reference]);
    const base = { date, amount: Math.round(Math.abs(signed) * 100) / 100, direction: (signed > 0 ? 'in' : 'out') as Direction, description, reference };
    // Identical lines on the same day are real (two equal transfers); number them so both stay
    const key = baseFingerprint(base);
    const n = (seen.get(key) || 0) + 1;
    seen.set(key, n);
    out.push({
      ...base,
      balance: map.balance === null ? null : parseAmount(row[map.balance]),
      fingerprint: `${key}#${n}`,
    });
  }
  return { rows: out, skipped };
}

// ---------- Matching money in to invoices ----------

export interface MatchCandidate {
  id: string;
  invoice_number: string;
  customer_name: string;
  outstanding: number;
  invoice_date: string;
}

export interface MatchSuggestion {
  invoice: MatchCandidate;
  score: number;
  reason: string;
}

// Suggests invoices a payment could settle: exact amount of what's owed, the customer's name in
// the narration, or the invoice number. The user always confirms; nothing is matched silently.
export function suggestMatches(tx: Pick<BankTransaction, 'amount' | 'description' | 'reference' | 'date'>, candidates: MatchCandidate[]): MatchSuggestion[] {
  const text = normalise(`${tx.description} ${tx.reference}`);
  const words = new Set(text.split(' ').filter((w) => w.length > 2));
  const suggestions: MatchSuggestion[] = [];
  for (const invoice of candidates) {
    if (invoice.outstanding <= 0) continue;
    let score = 0;
    const reasons: string[] = [];
    const numberToken = normalise(invoice.invoice_number);
    if (numberToken && text.includes(numberToken)) {
      score += 60;
      reasons.push('invoice number in the narration');
    }
    const nameWords = normalise(invoice.customer_name).split(' ').filter((w) => w.length > 2 && !['ltd', 'limited', 'enterprises', 'and', 'the', 'nig', 'nigeria', 'company'].includes(w));
    if (nameWords.length && nameWords.some((w) => words.has(w))) {
      score += 30;
      reasons.push('customer name in the narration');
    }
    if (Math.abs(invoice.outstanding - tx.amount) < 0.01) {
      score += 50;
      reasons.push('exact amount owed');
    } else if (tx.amount < invoice.outstanding && score > 0) {
      score += 10;
      reasons.push('part payment');
    }
    if (invoice.invoice_date > tx.date) continue; // paid before it was invoiced: not this invoice
    if (score >= 40) suggestions.push({ invoice, score, reason: reasons.join(', ') });
  }
  return suggestions.sort((a, b) => b.score - a.score).slice(0, 3);
}
