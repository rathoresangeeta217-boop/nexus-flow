import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Layers, 
  AlertTriangle, 
  History, 
  Boxes, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Building2, 
  Clock, 
  Eye,
  Loader2,
  X,
  Sparkles
} from 'lucide-react';
import { 
  RawMaterialItem, 
  InventoryHistoryEntry, 
  subscribeToRawMaterials, 
  subscribeToInventoryHistory, 
  deleteRawMaterialItem,
  deleteInventoryHistoryEntry,
  clearAllInventoryHistory 
} from '../lib/inventory';
import { AddRawMaterialModal } from '../components/AddRawMaterialModal';
import { ReceiveMaterialModal } from '../components/ReceiveMaterialModal';
import { DispatchMaterialModal } from '../components/DispatchMaterialModal';
import { ScanInvoiceModal } from '../components/ScanInvoiceModal';
import { StatCard } from '../components/StatCard';

interface InventoryTabProps {
  searchQuery?: string;
}

export const InventoryTab: React.FC<InventoryTabProps> = ({ searchQuery = '' }) => {
  const [activeSubTab, setActiveSubTab] = useState<'products' | 'history'>('products');
  
  // Data state
  const [materials, setMaterials] = useState<RawMaterialItem[]>([]);
  const [historyList, setHistoryList] = useState<InventoryHistoryEntry[]>([]);
  
  // Filtering & Search
  const [internalSearch, setInternalSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'all' | 'RECEIVED' | 'DISPATCHED'>('all');
  const [historyProjectFilter, setHistoryProjectFilter] = useState<string>('all');
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [isScanInvoiceModalOpen, setIsScanInvoiceModalOpen] = useState(false);
  const [selectedProductForAction, setSelectedProductForAction] = useState<RawMaterialItem | null>(null);
  const [editingItem, setEditingItem] = useState<RawMaterialItem | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

  // In-app Delete Confirmation Modals (bypasses window.confirm which is blocked in iframes)
  const [materialToDelete, setMaterialToDelete] = useState<RawMaterialItem | null>(null);
  const [historyToDelete, setHistoryToDelete] = useState<InventoryHistoryEntry | null>(null);
  const [isClearHistoryModalOpen, setIsClearHistoryModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Success toast notification
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Subscriptions
  useEffect(() => {
    const unsubMaterials = subscribeToRawMaterials((items) => {
      setMaterials(items);
    });
    const unsubHistory = subscribeToInventoryHistory((history) => {
      setHistoryList(history);
    });

    return () => {
      unsubMaterials();
      unsubHistory();
    };
  }, []);

  // Compute Categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    materials.forEach(m => {
      if (m.category) set.add(m.category);
    });
    return ['All', ...Array.from(set)];
  }, [materials]);

  // Compute Projects mentioned in history
  const historyProjects = useMemo(() => {
    const set = new Set<string>();
    historyList.forEach(h => {
      if (h.projectName) set.add(h.projectName);
    });
    return ['all', ...Array.from(set)];
  }, [historyList]);

  // Combined Search Query
  const effectiveSearch = (searchQuery || internalSearch).toLowerCase().trim();

  // Metrics Calculation
  const metrics = useMemo(() => {
    const totalItems = materials.length;
    let totalInStock = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalReceived = 0;
    let totalDispatched = 0;

    materials.forEach(m => {
      totalInStock += m.availableQuantity || 0;
      totalReceived += m.totalReceived || 0;
      totalDispatched += m.totalDispatched || 0;

      const threshold = m.minThreshold ?? 10;
      if (m.availableQuantity <= 0) {
        outOfStockCount++;
      } else if (m.availableQuantity <= threshold) {
        lowStockCount++;
      }
    });

    return {
      totalItems,
      totalInStock,
      lowStockCount,
      outOfStockCount,
      totalReceived,
      totalDispatched
    };
  }, [materials]);

  // Filtered Raw Materials
  const filteredMaterials = useMemo(() => {
    return materials.filter(item => {
      // Category filter
      if (categoryFilter !== 'All' && item.category !== categoryFilter) {
        return false;
      }

      // Stock status filter
      const threshold = item.minThreshold ?? 10;
      if (stockStatusFilter === 'out_of_stock' && item.availableQuantity > 0) {
        return false;
      }
      if (stockStatusFilter === 'low_stock' && (item.availableQuantity > threshold || item.availableQuantity <= 0)) {
        return false;
      }
      if (stockStatusFilter === 'in_stock' && item.availableQuantity <= threshold) {
        return false;
      }

      // Search query
      if (effectiveSearch) {
        const matchName = item.name.toLowerCase().includes(effectiveSearch);
        const matchSpecs = (item.specs || '').toLowerCase().includes(effectiveSearch);
        const matchSku = (item.sku || '').toLowerCase().includes(effectiveSearch);
        const matchCategory = (item.category || '').toLowerCase().includes(effectiveSearch);
        const matchNotes = (item.notes || '').toLowerCase().includes(effectiveSearch);
        if (!matchName && !matchSpecs && !matchSku && !matchCategory && !matchNotes) {
          return false;
        }
      }

      return true;
    });
  }, [materials, categoryFilter, stockStatusFilter, effectiveSearch]);

  // Filtered History
  const filteredHistory = useMemo(() => {
    return historyList.filter(entry => {
      if (historyTypeFilter !== 'all' && entry.type !== historyTypeFilter) {
        return false;
      }

      if (historyProjectFilter !== 'all' && entry.projectName !== historyProjectFilter) {
        return false;
      }

      if (effectiveSearch) {
        const matchMat = entry.materialName.toLowerCase().includes(effectiveSearch);
        const matchProj = (entry.projectName || '').toLowerCase().includes(effectiveSearch);
        const matchNotes = (entry.notes || '').toLowerCase().includes(effectiveSearch);
        const matchRef = (entry.challanOrPoNo || '').toLowerCase().includes(effectiveSearch);
        const matchRec = (entry.receivedFrom || '').toLowerCase().includes(effectiveSearch);
        const matchDisp = (entry.dispatchedTo || '').toLowerCase().includes(effectiveSearch);
        if (!matchMat && !matchProj && !matchNotes && !matchRef && !matchRec && !matchDisp) {
          return false;
        }
      }

      return true;
    });
  }, [historyList, historyTypeFilter, historyProjectFilter, effectiveSearch]);

  // Handlers for action triggers
  const handleOpenReceive = (item?: RawMaterialItem) => {
    setSelectedProductForAction(item || null);
    setIsReceiveModalOpen(true);
  };

  const handleOpenDispatch = (item?: RawMaterialItem) => {
    setSelectedProductForAction(item || null);
    setIsDispatchModalOpen(true);
  };

  const handleEdit = (item: RawMaterialItem) => {
    setEditingItem(item);
    setIsAddModalOpen(true);
  };

  const handleDelete = (item: RawMaterialItem) => {
    setMaterialToDelete(item);
  };

  const confirmDeleteMaterial = async () => {
    if (!materialToDelete) return;
    const item = materialToDelete;
    setIsDeleting(true);

    try {
      // Optimistically update UI immediately
      setMaterials(prev => prev.filter(m => m.id !== item.id && (!item.docId || m.docId !== item.docId)));
      await deleteRawMaterialItem(item.id, item.docId);
      showNotification(`Deleted "${item.name}" from inventory.`, 'info');
      setMaterialToDelete(null);
    } catch (err) {
      console.error('Delete failed', err);
      showNotification(`Failed to delete "${item.name}".`, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteHistory = (entry: InventoryHistoryEntry) => {
    setHistoryToDelete(entry);
  };

  const confirmDeleteHistory = async () => {
    if (!historyToDelete) return;
    const entry = historyToDelete;
    setIsDeleting(true);

    try {
      setHistoryList(prev => prev.filter(h => h.id !== entry.id && (!entry.docId || h.docId !== entry.docId)));
      await deleteInventoryHistoryEntry(entry.id, entry.docId);
      showNotification('Transaction record deleted successfully.', 'info');
      setHistoryToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete history record', err);
      showNotification('Failed to delete transaction record.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearAllHistory = () => {
    setIsClearHistoryModalOpen(true);
  };

  const confirmClearAllHistory = async () => {
    setIsDeleting(true);
    try {
      setHistoryList([]);
      await clearAllInventoryHistory();
      showNotification('All transaction history records have been cleared.', 'info');
      setIsClearHistoryModalOpen(false);
    } catch (err: any) {
      console.error('Failed to clear all history', err);
      showNotification('Failed to clear transaction history.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl border flex items-center gap-2.5 text-sm font-bold ${
              notification.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/20'
                : 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-600/20'
            }`}
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Banner / Action Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Raw Material Inventory Dashboard
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Track incoming shipments, warehouse stock, and project-wise dispatches
              </p>
            </div>
          </div>
        </div>

        {/* Main Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* 0. Scan Invoice / Bill Button */}
          <button
            onClick={() => setIsScanInvoiceModalOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-slate-950 animate-pulse" />
            <span>Scan Invoice / Bill</span>
          </button>

          {/* 1. Add Raw Material Button */}
          <button
            onClick={() => {
              setEditingItem(null);
              setIsAddModalOpen(true);
            }}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm hover:shadow cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Raw Material</span>
          </button>

          {/* 2. Receive Raw Material Button */}
          <button
            onClick={() => handleOpenReceive()}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm shadow-emerald-600/20 cursor-pointer"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Receive Raw Material</span>
          </button>

          {/* 3. Dispatch Raw Material Button */}
          <button
            onClick={() => handleOpenDispatch()}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-sm shadow-amber-600/20 cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Dispatch Raw Material</span>
          </button>
        </div>
      </div>

      {/* Main KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total SKUs */}
        <StatCard
          title="Raw Material Items"
          value={`${metrics.totalItems} SKUs`}
          icon={<Package className="w-5 h-5 text-indigo-600" />}
          colorClass="bg-indigo-50 text-indigo-600"
        />

        {/* Total In Stock */}
        <StatCard
          title="Total Units In Stock"
          value={metrics.totalInStock.toLocaleString('en-IN')}
          icon={<Boxes className="w-5 h-5 text-blue-600" />}
          colorClass="bg-blue-50 text-blue-600"
        />

        {/* Total Received (Cumulative Inward) */}
        <div 
          onClick={() => {
            setActiveSubTab('history');
            setHistoryTypeFilter('RECEIVED');
          }}
          className="cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99]"
        >
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs hover:border-emerald-300 transition-all">
            <div className="flex justify-between items-center mb-1">
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                Raw Materials Received
              </p>
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-emerald-600">
              +{metrics.totalReceived.toLocaleString('en-IN')}
            </p>
            <span className="text-[11px] text-emerald-700 font-semibold underline mt-1 block">
              View inward history
            </span>
          </div>
        </div>

        {/* Total Dispatched (Cumulative Outward) */}
        <div 
          onClick={() => {
            setActiveSubTab('history');
            setHistoryTypeFilter('DISPATCHED');
          }}
          className="cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99]"
        >
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs hover:border-amber-300 transition-all">
            <div className="flex justify-between items-center mb-1">
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                Raw Materials Dispatched
              </p>
              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-amber-600">
              -{metrics.totalDispatched.toLocaleString('en-IN')}
            </p>
            <span className="text-[11px] text-amber-700 font-semibold underline mt-1 block">
              View project dispatches
            </span>
          </div>
        </div>
      </div>

      {/* Low Stock Warning Banner if any items are under minimum */}
      {metrics.lowStockCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-800">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900">
                Low Stock Alert: {metrics.lowStockCount} raw material item(s) are running below safety threshold!
              </p>
              <p className="text-xs text-amber-700">
                Reorder nails, fasteners, or boards to avoid factory production downtime.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setActiveSubTab('products');
              setStockStatusFilter('low_stock');
            }}
            className="px-3 py-1.5 rounded-lg bg-amber-700 text-white text-xs font-bold hover:bg-amber-800 transition-colors shrink-0 cursor-pointer"
          >
            Filter Low Stock Items
          </button>
        </div>
      )}

      {/* Sub-Tabs: Products Section vs History Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex bg-slate-200/60 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveSubTab('products')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'products'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Raw Materials List</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px] font-black text-slate-700">
              {filteredMaterials.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'history'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Movement History / Ledger</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px] font-black text-slate-700">
              {historyList.length}
            </span>
          </button>
        </div>

        {/* Search Bar for inventory */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={internalSearch}
            onChange={(e) => setInternalSearch(e.target.value)}
            placeholder={activeSubTab === 'products' ? "Search raw materials, nails, specs..." : "Search history, projects..."}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-xs font-medium text-slate-900 bg-white"
          />
          {internalSearch && (
            <button
              onClick={() => setInternalSearch('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: RAW MATERIALS PRODUCT SECTION */}
      {activeSubTab === 'products' && (
        <div className="space-y-4">
          {/* Category Filter Pills & Stock Status Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Category Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                Category:
              </span>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                    categoryFilter === cat
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Stock Level Selector */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                onClick={() => setStockStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  stockStatusFilter === 'all' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600'
                }`}
              >
                All Stock
              </button>
              <button
                onClick={() => setStockStatusFilter('in_stock')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  stockStatusFilter === 'in_stock' ? 'bg-white text-emerald-700 font-bold shadow-xs' : 'text-slate-600'
                }`}
              >
                In Stock
              </button>
              <button
                onClick={() => setStockStatusFilter('low_stock')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  stockStatusFilter === 'low_stock' ? 'bg-amber-600 text-white font-bold shadow-xs' : 'text-slate-600'
                }`}
              >
                Low Stock ({metrics.lowStockCount})
              </button>
              <button
                onClick={() => setStockStatusFilter('out_of_stock')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  stockStatusFilter === 'out_of_stock' ? 'bg-rose-600 text-white font-bold shadow-xs' : 'text-slate-600'
                }`}
              >
                Out of Stock ({metrics.outOfStockCount})
              </button>
            </div>
          </div>

          {/* List View Product Section Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4">Raw Material Product</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Specifications</th>
                    <th className="py-3.5 px-4 text-center">Available Quantity</th>
                    <th className="py-3.5 px-4 text-center">Received / Dispatched</th>
                    <th className="py-3.5 px-4 text-right">Quick Stock Actions</th>
                    <th className="py-3.5 px-3 text-center">Manage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredMaterials.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-slate-500">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-3 border border-indigo-100">
                          <Package className="w-7 h-7 text-indigo-600" />
                        </div>
                        <p className="font-black text-slate-800 text-base">Inventory is Empty</p>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                          All default demo products have been removed. You can now add your raw materials manually.
                        </p>
                        <button
                          onClick={() => {
                            setEditingItem(null);
                            setIsAddModalOpen(true);
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>+ Add Raw Material Manually</span>
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredMaterials.map((item) => {
                      const threshold = item.minThreshold ?? 10;
                      const isLow = item.availableQuantity <= threshold && item.availableQuantity > 0;
                      const isOut = item.availableQuantity <= 0;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Product Image + Name */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              {/* Thumbnail preview */}
                              <div
                                onClick={() => item.imageUrl && setPreviewImage({ url: item.imageUrl, name: item.name })}
                                className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all relative group"
                              >
                                {item.imageUrl ? (
                                  <>
                                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                      <Eye className="w-3.5 h-3.5 text-white" />
                                    </div>
                                  </>
                                ) : (
                                  <Package className="w-5 h-5 text-slate-400" />
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 text-sm leading-snug">
                                  {item.name}
                                </p>
                                <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                  <span className="inline-block text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                                    {item.sku || 'RM'}
                                  </span>
                                  {item.boardCompany && (
                                    <span className="text-[10px] font-extrabold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded-md border border-amber-200">
                                      {item.boardCompany}
                                    </span>
                                  )}
                                  {item.boardThickness && (
                                    <span className="text-[10px] font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200">
                                      {item.boardThickness}
                                    </span>
                                  )}
                                  {item.boardSize && (
                                    <span className="text-[10px] font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200">
                                      {item.boardSize} ft
                                    </span>
                                  )}
                                  {item.colorCode && (
                                    <span className="text-[10px] font-bold text-purple-800 bg-purple-50 px-1.5 py-0.5 rounded-md border border-purple-200">
                                      Color: {item.colorCode}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-3.5 px-4">
                            <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                              {item.category}
                            </span>
                          </td>

                          {/* Specifications */}
                          <td className="py-3.5 px-4 max-w-xs">
                            <p className="text-slate-600 line-clamp-2 text-xs font-normal">
                              {item.specs || <span className="text-slate-400 italic">No specs specified</span>}
                            </p>
                            {item.notes && (
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                Loc: {item.notes}
                              </span>
                            )}
                          </td>

                          {/* Available Quantity */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="inline-flex flex-col items-center">
                              <span className={`text-base font-black px-3 py-1 rounded-xl border ${
                                isOut
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : isLow
                                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}>
                                {item.availableQuantity} <span className="text-xs font-bold">{item.unit}</span>
                              </span>
                              {isOut && (
                                <span className="text-[10px] font-black text-rose-600 mt-1 uppercase">
                                  Out of stock
                                </span>
                              )}
                              {isLow && (
                                <span className="text-[10px] font-bold text-amber-700 mt-1">
                                  Low stock (Alert &lt; {threshold})
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Received / Dispatched Totals */}
                          <td className="py-3.5 px-4 text-center text-xs">
                            <div className="inline-flex flex-col gap-0.5 items-center">
                              <span className="text-emerald-700 font-bold">
                                In: +{item.totalReceived} {item.unit}
                              </span>
                              <span className="text-amber-700 font-bold">
                                Out: -{item.totalDispatched} {item.unit}
                              </span>
                            </div>
                          </td>

                          {/* Quick Receive & Dispatch Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Receive Button */}
                              <button
                                onClick={() => handleOpenReceive(item)}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] border border-emerald-200 transition-colors flex items-center gap-1 cursor-pointer"
                                title="Receive stock for this item"
                              >
                                <ArrowDownLeft className="w-3.5 h-3.5" />
                                <span>Receive</span>
                              </button>

                              {/* Dispatch Button */}
                              <button
                                onClick={() => handleOpenDispatch(item)}
                                disabled={isOut}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-[11px] border border-amber-300 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                title="Dispatch stock for a project"
                              >
                                <ArrowUpRight className="w-3.5 h-3.5" />
                                <span>Dispatch</span>
                              </button>
                            </div>
                          </td>

                          {/* Edit / Delete */}
                          <td className="py-3.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleEdit(item)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                                title="Edit product"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(item)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Delete product"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: INVENTORY MOVEMENT HISTORY / LEDGER */}
      {activeSubTab === 'history' && (
        <div className="space-y-4">
          {/* History Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Transaction Type:
              </span>
              <button
                onClick={() => setHistoryTypeFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  historyTypeFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All ({historyList.length})
              </button>
              <button
                onClick={() => setHistoryTypeFilter('RECEIVED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  historyTypeFilter === 'RECEIVED'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                Received Inward
              </button>
              <button
                onClick={() => setHistoryTypeFilter('DISPATCHED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  historyTypeFilter === 'DISPATCHED'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-900 hover:bg-amber-100'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                Dispatched to Projects
              </button>
            </div>

            {/* Filter by Project Name and Clear All History */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Project:</span>
                <select
                  value={historyProjectFilter}
                  onChange={(e) => setHistoryProjectFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 bg-white"
                >
                  <option value="all">All Projects</option>
                  {historyProjects.filter(p => p !== 'all').map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {historyList.length > 0 && (
                <button
                  onClick={handleClearAllHistory}
                  title="Remove all transaction records"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors cursor-pointer ml-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All History</span>
                </button>
              )}
            </div>
          </div>

          {/* History Ledger Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4">Date & Time</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Raw Material Product</th>
                    <th className="py-3.5 px-4 text-center">Movement Qty</th>
                    <th className="py-3.5 px-4">Project Name (Mandatory for Dispatch)</th>
                    <th className="py-3.5 px-4 text-center">Stock Balance</th>
                    <th className="py-3.5 px-4">Vendor / Dispatched To</th>
                    <th className="py-3.5 px-4">Notes & Staff</th>
                    <th className="py-3.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500">
                        <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-bold text-slate-700 text-sm">No transaction records found</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Inward received materials and project dispatches will be recorded here with timestamps.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((entry) => {
                      const isReceive = entry.type === 'RECEIVED';

                      return (
                        <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Date & Time */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 font-bold text-slate-800">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>{entry.timestamp}</span>
                            </div>
                          </td>

                          {/* Type */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {isReceive ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-black text-[11px]">
                                <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-700" />
                                RECEIVED
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-black text-[11px]">
                                <ArrowUpRight className="w-3.5 h-3.5 text-amber-700" />
                                DISPATCHED
                              </span>
                            )}
                          </td>

                          {/* Material */}
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {entry.materialName}
                          </td>

                          {/* Movement Quantity */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span className={`text-sm font-black ${
                              isReceive ? 'text-emerald-600' : 'text-amber-700'
                            }`}>
                              {isReceive ? `+${entry.quantity}` : `-${entry.quantity}`} {entry.materialUnit || 'Nos'}
                            </span>
                          </td>

                          {/* Project Name (MANDATORY REQUIREMENT) */}
                          <td className="py-3.5 px-4">
                            {entry.projectName ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 font-bold text-xs">
                                <Building2 className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                <span className="truncate max-w-[200px]" title={entry.projectName}>
                                  {entry.projectName}
                                </span>
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">General Stock Inward</span>
                            )}
                          </td>

                          {/* Stock Balance Transition */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span className="text-slate-500 font-medium">
                              {entry.previousQuantity} → <strong className="text-slate-900 font-bold">{entry.newQuantity}</strong>
                            </span>
                          </td>

                          {/* Vendor or Dispatched To */}
                          <td className="py-3.5 px-4 text-slate-700">
                            {isReceive ? (
                              <span>{entry.receivedFrom || 'Supplier'}</span>
                            ) : (
                              <span>{entry.dispatchedTo || 'Production Team'}</span>
                            )}
                            {entry.challanOrPoNo && (
                              <span className="block text-[10px] text-slate-400">
                                Ref: {entry.challanOrPoNo}
                              </span>
                            )}
                          </td>

                          {/* Notes & Staff */}
                          <td className="py-3.5 px-4 text-slate-600 max-w-xs">
                            <p className="truncate text-xs">{entry.notes || '-'}</p>
                            {entry.performedBy && (
                              <span className="text-[10px] text-slate-400 block">
                                By: {entry.performedBy}
                              </span>
                            )}
                          </td>

                          {/* Delete History Entry Action */}
                          <td className="py-3.5 px-3 text-center">
                            <button
                              onClick={() => handleDeleteHistory(entry)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete this transaction entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD RAW MATERIAL */}
      <AddRawMaterialModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingItem(null);
        }}
        initialItem={editingItem}
        onSuccess={(savedItem) => {
          showNotification(editingItem ? `Updated "${savedItem.name}"` : `Added "${savedItem.name}" to inventory!`);
        }}
      />

      {/* MODAL 2: RECEIVE RAW MATERIAL */}
      <ReceiveMaterialModal
        isOpen={isReceiveModalOpen}
        onClose={() => {
          setIsReceiveModalOpen(false);
          setSelectedProductForAction(null);
        }}
        products={materials}
        preselectedProductId={selectedProductForAction?.id || null}
        onSuccess={(updatedItem, history) => {
          showNotification(`Stock received! Added +${history.quantity} ${updatedItem.unit} to "${updatedItem.name}".`);
        }}
      />

      {/* MODAL 3: DISPATCH RAW MATERIAL */}
      <DispatchMaterialModal
        isOpen={isDispatchModalOpen}
        onClose={() => {
          setIsDispatchModalOpen(false);
          setSelectedProductForAction(null);
        }}
        products={materials}
        preselectedProductId={selectedProductForAction?.id || null}
        onSuccess={(updatedItem, history) => {
          showNotification(`Dispatched ${history.quantity} ${updatedItem.unit} to Project: "${history.projectName}"!`);
        }}
      />

      {/* IMAGE PREVIEW LIGHTBOX */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="max-w-md w-full bg-white rounded-2xl overflow-hidden shadow-2xl p-2" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-2">
              <h4 className="font-bold text-sm text-slate-800">{previewImage.name}</h4>
              <button 
                onClick={() => setPreviewImage(null)}
                className="p-1 text-slate-400 hover:text-slate-800 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img src={previewImage.url} alt="" className="w-full h-80 object-cover rounded-xl" />
          </div>
        </div>
      )}

      {/* CONFIRM DELETE RAW MATERIAL MODAL */}
      <AnimatePresence>
        {materialToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <button
                    onClick={() => setMaterialToDelete(null)}
                    disabled={isDeleting}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer disabled:opacity-50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-1">
                  Delete Raw Material?
                </h3>
                <p className="text-sm text-slate-600 mb-3">
                  Are you sure you want to delete <strong className="text-slate-900 font-bold">"{materialToDelete.name}"</strong>?
                </p>
                {materialToDelete.availableQuantity > 0 && (
                  <div className="mb-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Stock Remaining: {materialToDelete.availableQuantity} {materialToDelete.unit}</span>
                    </p>
                    <p className="mt-0.5 text-amber-700">Deleting this will remove the product and its current stock balance.</p>
                  </div>
                )}
                <p className="text-xs text-slate-400">
                  This action cannot be undone and will permanently remove this material from inventory.
                </p>
              </div>

              <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setMaterialToDelete(null)}
                  className="px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-200/80 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={confirmDeleteMaterial}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Yes, Delete Raw Material</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM DELETE HISTORY ENTRY MODAL */}
      <AnimatePresence>
        {historyToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <button
                    onClick={() => setHistoryToDelete(null)}
                    disabled={isDeleting}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer disabled:opacity-50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-1">
                  Delete Transaction Record?
                </h3>
                <p className="text-sm text-slate-600 mb-2">
                  Are you sure you want to remove this <span className="font-bold text-slate-900">{historyToDelete.type}</span> record for <strong className="text-slate-900 font-bold">"{historyToDelete.materialName}"</strong>?
                </p>
                <p className="text-xs text-slate-400">
                  Timestamp: {historyToDelete.timestamp} • Movement: {historyToDelete.type === 'RECEIVED' ? '+' : '-'}{historyToDelete.quantity} {historyToDelete.materialUnit || 'Nos'}
                </p>
              </div>

              <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setHistoryToDelete(null)}
                  className="px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-200/80 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={confirmDeleteHistory}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Record</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM CLEAR ALL HISTORY MODAL */}
      <AnimatePresence>
        {isClearHistoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <button
                    onClick={() => setIsClearHistoryModalOpen(false)}
                    disabled={isDeleting}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer disabled:opacity-50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-1">
                  Clear All History Records?
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  Are you sure you want to permanently clear all transaction history records? This cannot be undone.
                </p>
              </div>

              <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setIsClearHistoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-200/80 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={confirmClearAllHistory}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Clearing...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Clear All History</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SCAN INVOICE MODAL */}
      <ScanInvoiceModal
        isOpen={isScanInvoiceModalOpen}
        onClose={() => setIsScanInvoiceModalOpen(false)}
        onBatchAdded={(count) => {
          showNotification(`Successfully extracted and added ${count} raw material item(s) to inventory!`, 'success');
        }}
      />
    </div>
  );
};
