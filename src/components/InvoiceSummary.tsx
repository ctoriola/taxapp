import React from 'react';

interface InvoiceSummaryProps {
  subtotal: number;
  applyVat: boolean;
  onVatToggle: (apply: boolean) => void;
}

export default function InvoiceSummary({ subtotal, applyVat, onVatToggle }: InvoiceSummaryProps) {
  const vatRate = 0.075; // 7.5%
  const vatAmount = applyVat ? subtotal * vatRate : 0;
  const total = subtotal + vatAmount;

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border border-slate-200 p-6 sticky top-4 space-y-4">
      <h3 className="text-lg font-bold text-slate-900">Invoice Summary</h3>

      {/* Subtotal */}
      <div className="flex justify-between items-center pt-2 border-t border-slate-200">
        <span className="text-slate-600">Subtotal</span>
        <span className="text-lg font-semibold text-slate-900">
          ₦{subtotal.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      {/* VAT Toggle and Amount */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={applyVat}
              onChange={(e) => onVatToggle(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-slate-700">Add VAT (7.5%)</span>
          </label>
          <span className="text-sm font-semibold text-slate-900">
            ₦{vatAmount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <p className="text-xs text-slate-500">VAT will be charged at 7.5% on the subtotal</p>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-300" />

      {/* Total */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <span className="text-white font-semibold">Total Amount</span>
          <span className="text-2xl font-bold text-white">
            ₦{total.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Info Message */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-800">
          <span className="font-semibold">Note:</span> Invoice totals are calculated automatically and updated in real-time as you modify line items.
        </p>
      </div>
    </div>
  );
}
