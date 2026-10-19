import { doc, runTransaction, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { now, requireUid, settleWrite, userCollection, userCollectionDoc } from './db';
import { BankTransaction, fingerprintId, ParsedRow, TransactionStatus } from '../lib/bankImport';
import { formatNaira } from '../lib/finance';

const BATCH_LIMIT = 450;

// Saves new statement lines. Ids come from each line's fingerprint, so lines already imported
// are skipped by the caller and could never be duplicated anyway.
export async function saveTransactions(rows: ParsedRow[], source: string): Promise<number> {
  const uid = await requireUid();
  const timestamp = now();
  for (let i = 0; i < rows.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    for (const row of rows.slice(i, i + BATCH_LIMIT)) {
      batch.set(userCollectionDoc(uid, 'bankTransactions', fingerprintId(row.fingerprint)), {
        ...row,
        source,
        status: 'unreviewed' as TransactionStatus,
        matched_invoice_id: null,
        matched_amount: null,
        expense_id: null,
        created_at: timestamp,
        updated_at: timestamp,
      });
    }
    await settleWrite(batch.commit());
  }
  return rows.length;
}

function paymentStatus(paid: number, total: number) {
  if (paid <= 0) return 'unpaid';
  return paid >= total - 0.005 ? 'paid' : 'partially_paid';
}

// Records money in as a payment on an invoice (up to what's still owed), atomically with the
// bank line, so the two can't disagree
export async function matchToInvoice(tx: BankTransaction, invoiceId: string): Promise<number> {
  const uid = await requireUid();
  const txRef = userCollectionDoc(uid, 'bankTransactions', tx.id);
  const invoiceRef = userCollectionDoc(uid, 'invoices', invoiceId);
  return runTransaction(db, async (t) => {
    const [txSnap, invSnap] = await Promise.all([t.get(txRef), t.get(invoiceRef)]);
    if (!txSnap.exists() || !invSnap.exists()) throw new Error('That transaction or invoice no longer exists.');
    if (txSnap.get('status') === 'matched') throw new Error('This payment is already matched.');
    const total = invSnap.get('total_amount') || 0;
    const paid = invSnap.get('amount_paid') || 0;
    const applied = Math.min(tx.amount, Math.max(total - paid, 0));
    if (applied <= 0) throw new Error('That invoice is already fully paid.');
    const newPaid = paid + applied;
    const timestamp = now();
    t.update(invoiceRef, { amount_paid: newPaid, status: paymentStatus(newPaid, total), updated_at: timestamp });
    t.update(txRef, { status: 'matched', matched_invoice_id: invoiceId, matched_amount: applied, updated_at: timestamp });
    return applied;
  });
}

// Reverses a match: takes back exactly the payment it recorded
export async function undoMatch(tx: BankTransaction): Promise<void> {
  const uid = await requireUid();
  const txRef = userCollectionDoc(uid, 'bankTransactions', tx.id);
  await runTransaction(db, async (t) => {
    const txSnap = await t.get(txRef);
    const invoiceId = txSnap.get('matched_invoice_id');
    const applied = txSnap.get('matched_amount') || 0;
    const timestamp = now();
    if (invoiceId) {
      const invoiceRef = userCollectionDoc(uid, 'invoices', invoiceId);
      const invSnap = await t.get(invoiceRef);
      if (invSnap.exists()) {
        const newPaid = Math.max((invSnap.get('amount_paid') || 0) - applied, 0);
        t.update(invoiceRef, { amount_paid: newPaid, status: paymentStatus(newPaid, invSnap.get('total_amount') || 0), updated_at: timestamp });
      }
    }
    t.update(txRef, { status: 'unreviewed', matched_invoice_id: null, matched_amount: null, updated_at: timestamp });
  });
}

// Money out → a DRAFT expense. VAT is left off: a bank line can't show whether VAT was charged,
// so the owner adds the receipt and VAT details before approving it.
export async function recordAsExpense(tx: BankTransaction): Promise<string> {
  const uid = await requireUid();
  const timestamp = now();
  const expenseRef = doc(userCollection(uid, 'expenses'));
  const batch = writeBatch(db);
  batch.set(expenseRef, {
    description: tx.description.slice(0, 120) || 'Bank payment',
    amount: tx.amount,
    vat_amount: 0,
    total_amount: tx.amount,
    category: 'other',
    expense_date: tx.date,
    apply_vat: false,
    notes: `From bank statement: ${formatNaira(tx.amount, 2)} paid on ${tx.date}${tx.reference ? ` (ref ${tx.reference})` : ''}. Add the receipt. If the payment included VAT, enter the amount before VAT and turn VAT on.`,
    status: 'draft',
    bank_transaction_id: tx.id,
    created_at: timestamp,
    updated_at: timestamp,
  });
  batch.update(userCollectionDoc(uid, 'bankTransactions', tx.id), { status: 'expense', expense_id: expenseRef.id, updated_at: timestamp });
  await settleWrite(batch.commit());
  return expenseRef.id;
}

export async function setTransactionStatus(tx: BankTransaction, status: 'ignored' | 'unreviewed'): Promise<void> {
  const uid = await requireUid();
  const batch = writeBatch(db);
  batch.update(userCollectionDoc(uid, 'bankTransactions', tx.id), { status, updated_at: now() });
  await settleWrite(batch.commit());
}
