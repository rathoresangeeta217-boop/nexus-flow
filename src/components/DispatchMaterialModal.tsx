import React, { useState, useEffect } from 'react';
import { X, ArrowUpRight, AlertCircle, Briefcase, Clock, CheckCircle2 } from 'lucide-react';
import { RawMaterialItem, dispatchRawMaterialStock, formatInventoryDateTime, InventoryHistoryEntry } from '../lib/inventory';
import { subscribeToProjects, Project } from '../lib/projects';
import { subscribeToOrders, Order } from '../lib/orders';

interface DispatchMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: RawMaterialItem[];
  preselectedProductId?: string | null;
  onSuccess?: (item: RawMaterialItem, history: InventoryHistoryEntry) => void;
}

export const DispatchMaterialModal: React.FC<DispatchMaterialModalProps> = ({
  isOpen,
  onClose,
  products,
  preselectedProductId,
  onSuccess
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('50');
  const [projectName, setProjectName] = useState<string>('');
  const [dispatchedTo, setDispatchedTo] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  
  const [availableProjects, setAvailableProjects] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch project suggestions from orders and projects
  useEffect(() => {
    const unsubProjects = subscribeToProjects((projectsList: Project[]) => {
      const names = projectsList.map(p => p.name).filter(Boolean);
      setAvailableProjects(prev => Array.from(new Set([...prev, ...names])));
    });

    const unsubOrders = subscribeToOrders((ordersList: Order[]) => {
      const orderNames = ordersList.map(o => o.project || o.customer).filter(Boolean);
      setAvailableProjects(prev => Array.from(new Set([...prev, ...orderNames])));
    });

    return () => {
      unsubProjects();
      unsubOrders();
    };
  }, []);

  // Pre-select product when opened or changed
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
  const remainingStock = Math.max(0, currentStock - numQty);
  const isOverQuantity = numQty > currentStock;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      setError('Please select a raw material product.');
      return;
    }

    if (!projectName.trim()) {
      setError('Project Name is mandatory. Please enter or select a project.');
      return;
    }

    if (isNaN(numQty) || numQty <= 0) {
      setError('Please enter a valid quantity greater than 0.');
      return;
    }

    if (numQty > currentStock) {
      setError(`Cannot dispatch ${numQty} ${currentProduct?.unit}. Only ${currentStock} available in stock!`);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const result = await dispatchRawMaterialStock({
        materialId: selectedProductId,
        quantity: numQty,
        projectName: projectName.trim(),
        dispatchedTo: dispatchedTo.trim(),
        notes: notes.trim(),
        performedBy: 'Store Incharge'
      });

      if (onSuccess) {
        onSuccess(result.updatedItem, result.historyEntry);
      }
      onClose();
    } catch (err: any) {
      console.error('Failed to dispatch raw material:', err);
      setError(err?.message || 'Failed to dispatch material.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-amber-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/25 border border-amber-400/40 flex items-center justify-center text-amber-200">
              <ArrowUpRight className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Dispatch Raw Material</h3>
              <p className="text-xs text-amber-200">
                Allocate materials to a specific project and auto-decrease inventory
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-amber-200 hover:text-white hover:bg-amber-800 rounded-lg transition-colors cursor-pointer"
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
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-sm font-semibold text-slate-900 bg-white"
              required
            >
              {products.length === 0 && (
                <option value="">No raw material products in inventory</option>
              )}
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku || 'RM'}) — Available: {p.availableQuantity} {p.unit}
                </option>
              ))}
            </select>
          </div>

          {/* Current Stock Preview Card */}
          {currentProduct && (
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-lg bg-white border border-amber-200 overflow-hidden shrink-0 flex items-center justify-center">
                {currentProduct.imageUrl ? (
                  <img src={currentProduct.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-amber-700">RM</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{currentProduct.name}</p>
                <p className="text-xs text-slate-500 truncate">{currentProduct.specs || currentProduct.category}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-semibold text-amber-900">
                    Currently In Stock: <strong>{currentStock} {currentProduct.unit}</strong>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Quantity to Dispatch */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Quantity to Dispatch <span className="text-rose-500">*</span></span>
              <span className="text-xs text-slate-500">
                Available: <strong className="text-slate-800">{currentStock} {currentProduct?.unit}</strong>
              </span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="0.1"
                step="any"
                max={currentStock}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 50"
                className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-hidden text-lg font-black bg-white ${
                  isOverQuantity
                    ? 'border-rose-500 text-rose-700 ring-2 ring-rose-200'
                    : 'border-amber-400 focus:ring-2 focus:ring-amber-500 text-slate-900'
                }`}
                required
              />
              <span className="absolute right-4 top-3.5 text-xs font-bold text-amber-700 uppercase">
                {currentProduct?.unit || 'Nos'}
              </span>
            </div>

            {isOverQuantity && (
              <p className="text-xs text-rose-600 font-semibold mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Cannot exceed available inventory ({currentStock} {currentProduct?.unit})
              </p>
            )}

            {/* Quick Select Quantity Buttons */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[11px] text-slate-400 font-semibold">Quick select:</span>
              {[10, 25, 50, 100].map(val => (
                <button
                  key={val}
                  type="button"
                  disabled={val > currentStock}
                  onClick={() => setQuantity(String(val))}
                  className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-100 hover:text-amber-800 text-slate-700 font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {val}
                </button>
              ))}
              {currentStock > 0 && (
                <button
                  type="button"
                  onClick={() => setQuantity(String(currentStock))}
                  className="text-xs px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 font-bold hover:bg-amber-200 transition-colors"
                >
                  All ({currentStock})
                </button>
              )}
            </div>
          </div>

          {/* PROJECT NAME (MANDATORY REQUIREMENT) */}
          <div className="bg-amber-50/80 p-4 rounded-xl border-2 border-amber-300">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-amber-700" />
                Project Name <span className="text-rose-600 font-bold text-sm">* MANDATORY</span>
              </label>
              <span className="text-[11px] font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-md">
                Required for tracking
              </span>
            </div>

            <input
              type="text"
              list="project-suggestions"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. Infosys Tower Phase 2 / Cognizant Modular Desks"
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-amber-400 focus:outline-hidden focus:ring-2 focus:ring-amber-600 text-sm font-bold text-slate-900 bg-white"
              required
            />
            <datalist id="project-suggestions">
              {availableProjects.map((p, idx) => (
                <option key={`${p}-${idx}`} value={p} />
              ))}
            </datalist>

            {/* Quick Project Suggestions Pills */}
            {availableProjects.length > 0 && (
              <div className="mt-2.5">
                <span className="text-[10px] text-amber-900 font-bold uppercase tracking-wider block mb-1">
                  Or select active project:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {availableProjects.slice(0, 6).map((proj, idx) => (
                    <button
                      key={`${proj}-${idx}`}
                      type="button"
                      onClick={() => setProjectName(proj)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg transition-colors font-medium border ${
                        projectName === proj
                          ? 'bg-amber-700 text-white border-amber-800 font-bold shadow-xs'
                          : 'bg-white hover:bg-amber-100 text-slate-700 border-amber-200'
                      }`}
                    >
                      {proj}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Stock Deduction Summary */}
          {currentProduct && !isOverQuantity && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
              <div>
                <span className="text-slate-500">Current Stock</span>
                <p className="font-bold text-slate-800 text-sm">{currentStock} {currentProduct.unit}</p>
              </div>
              <span className="text-rose-500 font-bold">-</span>
              <div>
                <span className="text-amber-700 font-semibold">Dispatching</span>
                <p className="font-bold text-amber-700 text-sm">{numQty} {currentProduct.unit}</p>
              </div>
              <span className="text-slate-400 font-bold">=</span>
              <div>
                <span className="text-indigo-600 font-semibold">Remaining Stock</span>
                <p className="font-black text-indigo-700 text-sm">{remainingStock} {currentProduct.unit}</p>
              </div>
            </div>
          )}

          {/* Dispatched To / Dept */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Dispatched To (Team / Supervisor)
              </label>
              <input
                type="text"
                value={dispatchedTo}
                onChange={(e) => setDispatchedTo(e.target.value)}
                placeholder="e.g. Carpentry Team / Assembly Line 1"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-sm text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Requisition Notes / Slip No.
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Requisition Slip #402"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-sm text-slate-900"
              />
            </div>
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
              disabled={isSubmitting || !selectedProductId || !projectName.trim() || numQty <= 0 || isOverQuantity}
              className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold shadow-lg shadow-amber-600/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Deducting Stock...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Dispatch & Deduct Stock</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
