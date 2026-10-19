import React from 'react';
import { X } from 'lucide-react';
import { withNaira } from './dashboard/ui';

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

interface InvoiceLineItemProps {
  item: LineItem;
  onUpdate: (item: LineItem) => void;
  onRemove: (id: string) => void;
  index: number;
}

export default function InvoiceLineItem({ item, onUpdate, onRemove, index }: InvoiceLineItemProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'quantity' || name === 'unit_price') {
      const numValue = parseFloat(value) || 0;
      const quantity = name === 'quantity' ? numValue : item.quantity;
      const unit_price = name === 'unit_price' ? numValue : item.unit_price;
      const line_total = quantity * unit_price;

      onUpdate({
        ...item,
        [name]: numValue,
        line_total,
      });
    } else {
      onUpdate({
        ...item,
        [name]: value,
      });
    }
  };

  const total = `₦${item.line_total.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const labelClass = 'block text-xs font-medium text-brand-muted mb-1';
  const fieldClass = 'w-full px-3 py-2 rounded-xl border border-brand-line bg-white text-sm text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-forest focus:border-transparent';
  const removeButton = (extra = '') => (
    <button
      type="button"
      onClick={() => onRemove(item.id)}
      aria-label={`Remove item ${index + 1}`}
      className={`w-9 h-9 flex items-center justify-center rounded-full text-brand-down hover:bg-brand-down/10 transition-colors flex-shrink-0 ${extra}`}
    >
      <X className="w-4 h-4" />
    </button>
  );

  return (
    <div className="bg-brand-canvas rounded-2xl p-4">
      {/* Mobile: Item Header */}
      <div className="flex items-center justify-between mb-3 lg:hidden">
        <div className="text-sm font-medium text-brand-muted">Item {index + 1}</div>
        {removeButton()}
      </div>

      {/* Desktop Layout: Horizontal */}
      <div className="hidden lg:flex items-start gap-4">
        <div className="w-7 h-7 mt-6 rounded-full bg-white text-xs font-semibold text-brand-ink flex items-center justify-center flex-shrink-0">{index + 1}</div>

        <div className="flex-1 min-w-0">
          <label className={labelClass}>Description</label>
          <textarea
            name="description"
            value={item.description}
            onChange={handleChange}
            placeholder="E.g., Web design services, Product delivery, etc."
            rows={2}
            className={`${fieldClass} resize-none`}
          />
        </div>

        <div className="w-20">
          <label className={labelClass}>Qty</label>
          <input
            type="number"
            name="quantity"
            value={item.quantity}
            onChange={handleChange}
            min="0"
            step="0.01"
            className={fieldClass}
          />
        </div>

        <div className="w-28">
          <label className={labelClass}>Unit Price (₦)</label>
          <input
            type="number"
            name="unit_price"
            value={item.unit_price}
            onChange={handleChange}
            min="0"
            step="0.01"
            className={fieldClass}
          />
        </div>

        <div className="w-32">
          <label className={labelClass}>Total</label>
          <div className="px-3 py-2 bg-white rounded-xl text-sm font-semibold text-brand-ink whitespace-nowrap overflow-hidden text-ellipsis">
            {withNaira(total)}
          </div>
        </div>

        {removeButton('mt-6')}
      </div>

      {/* Mobile Layout: Stacked */}
      <div className="flex flex-col gap-3 lg:hidden">
        <div>
          <label className={labelClass}>Description</label>
          <textarea
            name="description"
            value={item.description}
            onChange={handleChange}
            placeholder="E.g., Web design services, Product delivery, etc."
            rows={2}
            className={`${fieldClass} resize-none`}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Qty</label>
            <input
              type="number"
              name="quantity"
              value={item.quantity}
              onChange={handleChange}
              min="0"
              step="0.01"
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass}>Unit Price (₦)</label>
            <input
              type="number"
              name="unit_price"
              value={item.unit_price}
              onChange={handleChange}
              min="0"
              step="0.01"
              className={fieldClass}
            />
          </div>
        </div>

        <div className="flex items-center justify-between px-3 py-2 bg-white rounded-xl">
          <span className="text-xs font-medium text-brand-muted">Total</span>
          <span className="text-sm font-semibold text-brand-ink">{withNaira(total)}</span>
        </div>
      </div>
    </div>
  );
}
