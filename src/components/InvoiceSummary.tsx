import React from 'react';
import { withNaira } from './dashboard/ui';

interface InvoiceSummaryProps {
  subtotal: number;
  applyVat: boolean;
  onVatToggle: (apply: boolean) => void;
}

const naira = (amount: number) => `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function InvoiceSummary({ subtotal, applyVat, onVatToggle }: InvoiceSummaryProps) {
  const vatRate = 0.075; // 7.5%
  const vatAmount = applyVat ? subtotal * vatRate : 0;
  const total = subtotal + vatAmount;

  return (
    <div className="bg-white rounded-[28px] p-5 sm:p-6 lg:sticky lg:top-4 space-y-4">
      <h3 className="text-lg font-semibold text-brand-ink">Invoice Summary</h3>

      {/* Subtotal */}
      <div className="flex justify-between items-center gap-3 pt-3 border-t border-brand-line">
        <span className="text-brand-muted">Subtotal</span>
        <span className="text-lg font-semibold text-brand-ink">{withNaira(naira(subtotal))}</span>
      </div>

      {/* VAT Toggle and Amount */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={applyVat}
              onChange={(e) => onVatToggle(e.target.checked)}
              className="w-4 h-4 rounded accent-brand-forest"
            />
            <span className="text-sm font-medium text-brand-ink">Add VAT (7.5%)</span>
          </label>
          <span className="text-sm font-semibold text-brand-ink">{withNaira(naira(vatAmount))}</span>
        </div>
        <p className="text-xs text-brand-muted">VAT will be charged at 7.5% on the subtotal</p>
      </div>

      {/* Total */}
      <div className="bg-brand-lime rounded-2xl p-4">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <span className="text-brand-ink/80 font-semibold">Total Amount</span>
          <span className="text-2xl font-semibold tracking-tight text-brand-ink">{withNaira(naira(total))}</span>
        </div>
      </div>

      {/* Info Message */}
      <p className="text-xs text-brand-muted bg-brand-canvas rounded-2xl p-3">
        <span className="font-semibold text-brand-ink">Note:</span> Invoice totals are calculated automatically and updated in real-time as you modify line items.
      </p>
    </div>
  );
}
