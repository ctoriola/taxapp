import React from 'react';
import { X } from 'lucide-react';

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

  return (
    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
      <div className="flex items-start gap-4">
        {/* Item Number */}
        <div className="text-sm font-medium text-slate-600 mt-2">{index + 1}</div>

        {/* Description */}
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
          <textarea
            name="description"
            value={item.description}
            onChange={handleChange}
            placeholder="E.g., Web design services, Product delivery, etc."
            rows={2}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Quantity */}
        <div className="w-20">
          <label className="block text-xs font-medium text-slate-600 mb-1">Qty</label>
          <input
            type="number"
            name="quantity"
            value={item.quantity}
            onChange={handleChange}
            min="0"
            step="0.01"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Unit Price */}
        <div className="w-24">
          <label className="block text-xs font-medium text-slate-600 mb-1">Unit Price</label>
          <div className="flex items-center">
            <span className="text-slate-500 text-sm mr-1">₦</span>
            <input
              type="number"
              name="unit_price"
              value={item.unit_price}
              onChange={handleChange}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Line Total */}
        <div className="w-28">
          <label className="block text-xs font-medium text-slate-600 mb-1">Total</label>
          <div className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-900">
            ₦{item.line_total.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Remove Button */}
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors mt-6"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
