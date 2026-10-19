import { useEffect, useRef, useState } from 'react';
import { useRecurringInvoices } from '../context/DataContext';
import { generateDueDrafts } from '../services/recurringInvoiceService';
import { dueDates, toDay } from '../lib/recurring';

const RETRY_MS = 3000;
const MAX_TRIES = 5;

// Runs while the app is open: any schedule with invoices due creates them as drafts. A schedule
// that was just saved may not have reached the server yet, so that case is retried shortly.
// The transaction makes repeats harmless anyway.
export function useRecurringGenerator(): { generated: number; dismiss: () => void } {
  const { schedules, isLoading } = useRecurringInvoices();
  const tries = useRef(new Map<string, number>());
  const done = useRef(new Set<string>());
  const [generated, setGenerated] = useState(0);
  const [retryTick, setRetryTick] = useState(0);
  const mounted = useRef(true);
  useEffect(() => () => {
    mounted.current = false;
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const today = toDay(new Date());
    for (const schedule of schedules) {
      const key = `${schedule.id}:${schedule.next_date}`;
      if (done.current.has(key) || dueDates(schedule, today).length === 0) continue;
      const attempt = (tries.current.get(key) || 0) + 1;
      if (attempt > MAX_TRIES) continue;
      tries.current.set(key, attempt);
      done.current.add(key);
      generateDueDrafts(schedule.id, today)
        .then((count) => {
          if (count === null) throw new Error('Schedule not on the server yet');
          if (count > 0) setGenerated((n) => n + count);
        })
        .catch((err) => {
          done.current.delete(key);
          if (attempt < MAX_TRIES) window.setTimeout(() => mounted.current && setRetryTick((t) => t + 1), RETRY_MS);
          else console.warn('Recurring invoice generation failed; will retry next time the app opens.', err);
        });
    }
  }, [schedules, isLoading, retryTick]);

  return { generated, dismiss: () => setGenerated(0) };
}
