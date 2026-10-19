import React, { useState } from 'react';
import { Plus, Repeat, Pause, Play, Trash2, CalendarClock, AlertCircle } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatusPill from '../components/StatusPill';
import CustomerSelect from '../components/CustomerSelect';
import NewCustomerModal from '../components/NewCustomerModal';
import InvoiceLineItem, { LineItem } from '../components/InvoiceLineItem';
import InvoiceSummary from '../components/InvoiceSummary';
import { Panel, PanelTitle, withNaira } from '../components/dashboard/ui';
import { useCustomers, useRecurringInvoices } from '../context/DataContext';
import { createSchedule, deleteSchedule, setScheduleActive } from '../services/recurringInvoiceService';
import { formatNaira } from '../lib/finance';
import { FREQUENCY_LABELS, Frequency, fromDay, isFinished, RecurringInvoice, scheduleTotals, toDay } from '../lib/recurring';

const TERMS = [0, 7, 14, 30, 45, 60];

function formatDay(day: string) {
  return fromDay(day).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function ScheduleForm({ onDone }: { onDone: () => void }) {
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [items, setItems] = useState<LineItem[]>([{ id: '1', description: '', quantity: 1, unit_price: 0, line_total: 0 }]);
  const [applyVat, setApplyVat] = useState(true);
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [startDate, setStartDate] = useState(toDay(new Date()));
  const [endDate, setEndDate] = useState('');
  const [terms, setTerms] = useState(30);
  const [notes, setNotes] = useState('');
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const subtotal = items.reduce((t, i) => t + i.line_total, 0);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const lineItems = items.filter((i) => i.description.trim() && i.line_total > 0);
    if (!customerId) return setError('Choose a customer.');
    if (lineItems.length === 0) return setError('Add at least one item with a description and price.');
    if (endDate && endDate < startDate) return setError('The end date must be after the start date.');
    setIsSaving(true);
    try {
      await createSchedule({
        customer_id: customerId,
        line_items: lineItems.map(({ id, ...item }) => item),
        apply_vat: applyVat,
        notes,
        frequency,
        start_date: startDate,
        end_date: endDate || null,
        payment_terms_days: terms,
        active: true,
      });
      onDone();
    } catch {
      setError("Couldn't save the schedule. Please try again.");
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5" aria-label="New recurring invoice">
      <div className="lg:col-span-2 space-y-4 sm:space-y-5 min-w-0">
        <Panel>
          <PanelTitle icon={<CalendarClock className="w-[18px] h-[18px]" />} title="Schedule" />
          {error && (
            <p role="alert" className="mb-4 flex gap-2 rounded-2xl border border-brand-down/20 bg-brand-down/5 px-4 py-3 text-sm text-brand-down">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {error}
            </p>
          )}
          <div className="space-y-4">
            <div>
              <span className="field-label">Customer *</span>
              <CustomerSelect selectedCustomerId={customerId} onSelect={setCustomerId} onAddNew={() => setIsNewCustomerOpen(true)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="rec-frequency" className="field-label">How often</label>
                <select id="rec-frequency" value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)} className="input-field">
                  {(Object.keys(FREQUENCY_LABELS) as Frequency[]).map((f) => (
                    <option key={f} value={f}>{FREQUENCY_LABELS[f]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="rec-terms" className="field-label">Payment terms</label>
                <select id="rec-terms" value={terms} onChange={(e) => setTerms(Number(e.target.value))} className="input-field">
                  {TERMS.map((t) => (
                    <option key={t} value={t}>{t === 0 ? 'Due on receipt' : `Due in ${t} days`}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="rec-start" className="field-label">First invoice date</label>
                <input id="rec-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-field" required />
              </div>
              <div>
                <label htmlFor="rec-end" className="field-label">End date <span className="font-normal text-brand-muted">(optional)</span></label>
                <input id="rec-end" type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} className="input-field" />
              </div>
            </div>
            <div>
              <label htmlFor="rec-notes" className="field-label">Notes (optional)</label>
              <textarea id="rec-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Payment details or other notes for each invoice" className="input-field resize-none" />
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <h2 className="text-lg font-semibold text-brand-ink">Items on each invoice</h2>
            <button
              type="button"
              onClick={() => setItems([...items, { id: Date.now().toString(), description: '', quantity: 1, unit_price: 0, line_total: 0 }])}
              className="btn-primary"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>
          <div className="space-y-3">
            {items.map((item, index) => (
              <InvoiceLineItem
                key={item.id}
                item={item}
                index={index}
                onUpdate={(updated) => setItems(items.map((i) => (i.id === updated.id ? updated : i)))}
                onRemove={(id) => setItems(items.filter((i) => i.id !== id))}
              />
            ))}
          </div>
        </Panel>
      </div>

      <div className="space-y-4 min-w-0">
        <InvoiceSummary subtotal={subtotal} applyVat={applyVat} onVatToggle={setApplyVat} />
        <p className="text-xs text-brand-muted px-1">
          Each invoice is created as a draft on its date, so you can check it before sending. Nothing is sent automatically.
        </p>
        <button type="submit" disabled={isSaving} className="btn-primary w-full">
          <Repeat className="w-4 h-4" />
          {isSaving ? 'Saving…' : 'Save schedule'}
        </button>
        <button type="button" onClick={onDone} className="btn-secondary w-full">Cancel</button>
      </div>

      <NewCustomerModal
        isOpen={isNewCustomerOpen}
        onClose={() => setIsNewCustomerOpen(false)}
        onCustomerCreated={(id: string) => {
          setCustomerId(id);
          setIsNewCustomerOpen(false);
        }}
      />
    </form>
  );
}

function scheduleStatus(s: RecurringInvoice) {
  if (isFinished(s)) return <StatusPill tone="neutral">Finished</StatusPill>;
  if (!s.active) return <StatusPill tone="warn">Paused</StatusPill>;
  return <StatusPill tone="good">Active</StatusPill>;
}

export default function RecurringInvoicesPage() {
  const { schedules, isLoading, error } = useRecurringInvoices();
  const { customers } = useCustomers();
  const [isCreating, setIsCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  const customerName = (id: string) => customers.find((c) => c.id === id)?.name || 'Customer';

  const run = async (id: string, action: () => Promise<void>, failure: string) => {
    setBusyId(id);
    setActionError('');
    try {
      await action();
    } catch {
      setActionError(failure);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Recurring invoices"
        description="Invoices you send on a schedule. Each one is created as a draft on its date for you to check."
        back={{ to: '/invoices', label: 'All invoices' }}
        actions={
          !isCreating && (
            <button type="button" onClick={() => setIsCreating(true)} className="btn-primary">
              <Plus className="w-4 h-4" />
              New recurring invoice
            </button>
          )
        }
      />

      {(error || actionError) && <p role="alert" className="rounded-2xl border border-brand-down/20 bg-brand-down/5 px-4 py-3 text-sm text-brand-down">{error || actionError}</p>}

      {isCreating ? (
        <ScheduleForm onDone={() => setIsCreating(false)} />
      ) : isLoading ? (
        <div className="flex justify-center py-16" role="status" aria-label="Loading">
          <div className="w-10 h-10 border-4 border-brand-line border-t-brand-forest rounded-full animate-spin"></div>
        </div>
      ) : schedules.length === 0 ? (
        <Panel className="text-center py-12">
          <span className="inline-flex w-12 h-12 rounded-full bg-brand-lime items-center justify-center text-brand-forest mb-4">
            <Repeat className="w-5 h-5" />
          </span>
          <h2 className="text-lg font-semibold text-brand-ink">No recurring invoices yet</h2>
          <p className="text-sm text-brand-muted mt-1 max-w-md mx-auto">
            Set up retainers, rent or subscriptions once. VATClear creates each invoice as a draft on its date.
          </p>
          <button type="button" onClick={() => setIsCreating(true)} className="btn-primary mt-5">
            <Plus className="w-4 h-4" />
            New recurring invoice
          </button>
        </Panel>
      ) : (
        <section className="card overflow-hidden">
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr>
                  <th className="table-head px-5 sm:px-6 py-3">Customer</th>
                  <th className="table-head px-4 py-3">How often</th>
                  <th className="table-head px-4 py-3 text-right">Each invoice</th>
                  <th className="table-head px-4 py-3">Next draft</th>
                  <th className="table-head px-4 py-3">Status</th>
                  <th className="table-head px-5 sm:px-6 py-3 text-right"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((s) => {
                  const finished = isFinished(s);
                  return (
                    <tr key={s.id} className="table-row">
                      <td className="px-5 sm:px-6 py-4">
                        <p className="font-semibold text-brand-ink">{customerName(s.customer_id)}</p>
                        <p className="text-xs text-brand-muted truncate max-w-[16rem]">{s.line_items.map((i) => i.description).join(', ')}</p>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {FREQUENCY_LABELS[s.frequency]}
                        <span className="block text-xs text-brand-muted">
                          {s.payment_terms_days === 0 ? 'Due on receipt' : `Due in ${s.payment_terms_days} days`}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right whitespace-nowrap font-semibold tabular-nums">{withNaira(formatNaira(scheduleTotals(s).total, 2))}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {finished ? '—' : formatDay(s.next_date)}
                        <span className="block text-xs text-brand-muted">
                          {s.end_date ? `Ends ${formatDay(s.end_date)}` : 'No end date'} · {s.generated_count} created
                        </span>
                      </td>
                      <td className="px-4 py-4">{scheduleStatus(s)}</td>
                      <td className="px-5 sm:px-6 py-4">
                        <div className="flex justify-end gap-1">
                          {!finished && (
                            <button
                              type="button"
                              disabled={busyId === s.id}
                              onClick={() => run(s.id, () => setScheduleActive(s.id, !s.active), "Couldn't update the schedule.")}
                              aria-label={`${s.active ? 'Pause' : 'Resume'} schedule for ${customerName(s.customer_id)}`}
                              title={s.active ? 'Pause' : 'Resume'}
                              className="w-9 h-9 rounded-full flex items-center justify-center text-brand-ink hover:bg-brand-canvas disabled:opacity-40"
                            >
                              {s.active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busyId === s.id}
                            onClick={() => {
                              if (!window.confirm(`Delete the recurring invoice for ${customerName(s.customer_id)}? Invoices already created stay.`)) return;
                              run(s.id, () => deleteSchedule(s.id), "Couldn't delete the schedule.");
                            }}
                            aria-label={`Delete schedule for ${customerName(s.customer_id)}`}
                            title="Delete"
                            className="w-9 h-9 rounded-full flex items-center justify-center text-brand-down hover:bg-brand-down/10 disabled:opacity-40"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
