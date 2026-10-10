import React, { useState, useEffect } from 'react';
import { X, ArrowDownLeft, AlertCircle, Calendar, Clock, PlusCircle } from 'lucide-react';
import { RawMaterialItem, receiveRawMaterialStock, formatInventoryDateTime, InventoryHistoryEntry } from '../lib/inventory';

interface ReceiveMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: RawMaterialItem[];
  preselectedProductId?: string | null;
  onSuccess?: (item: RawMaterialItem, history: InventoryHistoryEntry) => void;
}

export const ReceiveMaterialModal: React.FC<ReceiveMaterialModalProps> = ({
  isOpen,
  onClose,
  products,
  preselectedProductId,
  onSuccess
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('100');
  const [receivedFrom, setReceivedFrom] = useState<string>('');
  const [challanOrPoNo, setChallanOrPoNo] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set initial product when opened or changed
  useEffect(() => {
    if (preselectedProductId) {
      setSelectedProductId(preselectedProductId);
    } else if (products.length > 0 && !selectedProductId) {
      setSelectedProductId(products[0].id);
    }
  }, [preselectedProductId, products, isOpen]);

  if (!isOpen) return null;

  const currentProduct = products.find(p => p.id === selectedProductId || p.docId === selectedProductId);
  const numQty = parseFloat(quantity) || 0;
  const currentStock = currentProduct ? currentProduct.availableQuantity : 0;
  const newProjectedStock = currentStock + numQty;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      setError('Please select a raw material product.');
      return;
    }

    if (isNaN(numQty) || numQty <= 0) {
      setError('Please enter a valid quantity greater than 0.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const result = await receiveRawMaterialStock({
        materialId: selectedProductId,
        quantity: numQty,
        receivedFrom: receivedFrom.trim(),
        challanOrPoNo: challanOrPoNo.trim(),
        notes: notes.trim(),
        performedBy: 'Store Incharge'
      });

      if (onSuccess) {
        onSuccess(result.updatedItem, result.historyEntry);
      }
      onClose();
    } catch (err: any) {
      console.error('Failed to receive raw material:', err);
      setError(err?.message || 'Failed to update stock.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-emerald-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/25 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
              <ArrowDownLeft className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Receive Raw Material</h3>
              <p className="text-xs text-emerald-200">
                Log incoming inventory shipment and increase stock level
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-emerald-200 hover:text-white hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Product Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Select Raw Material Product <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-sm font-semibold text-slate-900 bg-white"
              required
            >
              {products.length === 0 && (
                <option value="">No raw material products registered</option>
              )}
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku || 'RM'}) — Current: {p.availableQuantity} {p.unit}
                </option>
              ))}
            </select>
          </div>

          {/* Selected Product Card Preview */}
          {currentProduct && (
            <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-lg bg-white border border-emerald-200 overflow-hidden shrink-0 flex items-center justify-center">
                {currentProduct.imageUrl ? (
                  <img src={currentProduct.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-emerald-700">RM</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{currentProduct.name}</p>
                <p className="text-xs text-slate-500 truncate">{currentProduct.specs || currentProduct.category}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-semibold text-emerald-800">
                    Current In Stock: <strong>{currentStock} {currentProduct.unit}</strong>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Quantity Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Quantity Received <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="0.1"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 100"
                className="w-full px-4 py-3 rounded-xl border-2 border-emerald-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-lg font-black text-slate-900 bg-white"
                required
              />
              <span className="absolute right-4 top-3.5 text-xs font-bold text-emerald-700 uppercase">
                {currentProduct?.unit || 'Nos'}
              </span>
            </div>

            {/* Quick Quantity Buttons */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[11px] text-slate-400 font-semibold">Quick add:</span>
              {[10, 50, 100, 250, 500].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setQuantity(String(val))}
                  className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700 font-semibold transition-colors"
                >
                  +{val}
                </button>
              ))}
            </div>
          </div>

          {/* Realtime Stock Calculation Summary */}
          {currentProduct && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
              <div>
                <span className="text-slate-500">Current Stock</span>
                <p className="font-bold text-slate-800 text-sm">{currentStock} {currentProduct.unit}</p>
              </div>
              <span className="text-slate-400 font-bold">+</span>
              <div>
                <span className="text-emerald-600 font-semibold">Receiving</span>
                <p className="font-bold text-emerald-600 text-sm">+{numQty} {currentProduct.unit}</p>
              </div>
              <span className="text-slate-400 font-bold">=</span>
              <div>
                <span className="text-indigo-600 font-semibold">New Stock</span>
                <p className="font-black text-indigo-700 text-sm">{newProjectedStock} {currentProduct.unit}</p>
              </div>
            </div>
          )}

          {/* Supplier & Reference PO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Received From (Vendor / Supplier)
              </label>
              <input
                type="text"
                value={receivedFrom}
                onChange={(e) => setReceivedFrom(e.target.value)}
                placeholder="e.g. Apex Hardware / Direct Mill"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-sm text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Invoice / Challan / PO No.
              </label>
              <input
                type="text"
                value={challanOrPoNo}
                onChange={(e) => setChallanOrPoNo(e.target.value)}
                placeholder="e.g. INV-8821 / PO-302"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-sm text-slate-900"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Receiving Notes / Remarks
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Batch #4 checked & verified without defects"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-sm text-slate-900"
            />
          </div>

          {/* Date & Time Timestamp Notice */}
          <div className="px-3.5 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-xs flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Timestamp recorded in History:
            </span>
            <span className="font-bold text-slate-800">{formatInventoryDateTime()}</span>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedProductId || numQty <= 0}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-lg shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  <span>Save & Increase Stock</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
