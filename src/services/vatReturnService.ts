import { deleteDoc, setDoc } from 'firebase/firestore';
import { now, requireUid, settleWrite, userCollectionDoc } from './db';

// A VAT return the user has told us they filed. The document id is the period ('YYYY-MM'),
// so each month can only be marked filed once.
export interface VatReturnRecord {
  id: string;
  period: string;
  filed_on: string; // 'YYYY-MM-DD'
  amount_paid: number;
  reference: string;
  created_at: string;
  updated_at: string;
}

export interface VatReturnInput {
  filed_on: string;
  amount_paid: number;
  reference: string;
}

export async function markVatReturnFiled(period: string, input: VatReturnInput): Promise<void> {
  const uid = await requireUid();
  const timestamp = now();
  await settleWrite(setDoc(userCollectionDoc(uid, 'vatReturns', period), {
    period,
    filed_on: input.filed_on,
    amount_paid: input.amount_paid,
    reference: input.reference.trim(),
    created_at: timestamp,
    updated_at: timestamp,
  }));
}

export async function unmarkVatReturnFiled(period: string): Promise<void> {
  const uid = await requireUid();
  await settleWrite(deleteDoc(userCollectionDoc(uid, 'vatReturns', period)));
}
