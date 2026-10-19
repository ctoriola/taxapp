import { deleteDoc, doc, increment, runTransaction, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { now, requireUid, settleWrite, userCollection, userCollectionDoc } from './db';
import { generateInvoiceNumber } from './invoiceService';
import { addDays, dueDates, nextAfter, RecurringInvoice, scheduleTotals, toDay } from '../lib/recurring';

export type ScheduleInput = Omit<RecurringInvoice, 'id' | 'next_date' | 'generated_count' | 'created_at' | 'updated_at'>;

export async function createSchedule(input: ScheduleInput): Promise<string> {
  const uid = await requireUid();
  const ref = doc(userCollection(uid, 'recurringInvoices'));
  const timestamp = now();
  await settleWrite(setDoc(ref, { ...input, next_date: input.start_date, generated_count: 0, created_at: timestamp, updated_at: timestamp }));
  return ref.id;
}

export async function setScheduleActive(id: string, active: boolean): Promise<void> {
  const uid = await requireUid();
  await settleWrite(updateDoc(userCollectionDoc(uid, 'recurringInvoices', id), { active, updated_at: now() }));
}

export async function deleteSchedule(id: string): Promise<void> {
  const uid = await requireUid();
  await settleWrite(deleteDoc(userCollectionDoc(uid, 'recurringInvoices', id)));
}

// Creates the draft invoices a schedule owes up to today, inside a transaction. Each draft has a
// fixed id (rec-{schedule}-{date}), so two tabs or devices can never generate the same one twice.
// Returns how many were created, or null when the schedule isn't on the server yet (just saved
// and still syncing), so the caller can try again shortly.
export async function generateDueDrafts(scheduleId: string, today: string = toDay(new Date())): Promise<number | null> {
  const uid = await requireUid();
  const scheduleRef = userCollectionDoc(uid, 'recurringInvoices', scheduleId);
  return runTransaction(db, async (tx) => {
    const snapshot = await tx.get(scheduleRef);
    if (!snapshot.exists()) return null;
    const schedule = { id: scheduleId, ...snapshot.data() } as RecurringInvoice;
    const dates = dueDates(schedule, today);
    if (dates.length === 0) return 0;

    const refs = dates.map((date) => userCollectionDoc(uid, 'invoices', `rec-${scheduleId}-${date}`));
    const existing = await Promise.all(refs.map((ref) => tx.get(ref)));
    const { subtotal, vat, total } = scheduleTotals(schedule);
    const timestamp = now();
    let created = 0;
    dates.forEach((date, i) => {
      if (existing[i].exists()) return;
      tx.set(refs[i], {
        customer_id: schedule.customer_id,
        invoice_number: generateInvoiceNumber(),
        invoice_date: date,
        due_date: addDays(date, schedule.payment_terms_days),
        notes: schedule.notes || '',
        subtotal,
        vat_amount: vat,
        total_amount: total,
        amount_paid: 0,
        apply_vat: schedule.apply_vat,
        status: 'draft',
        line_items: schedule.line_items,
        recurring_id: scheduleId,
        created_at: timestamp,
        updated_at: timestamp,
      });
      created++;
    });
    tx.update(scheduleRef, { next_date: nextAfter(schedule, dates[dates.length - 1]), generated_count: increment(created), updated_at: timestamp });
    return created;
  });
}
