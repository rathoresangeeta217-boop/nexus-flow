import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
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
  Sparkles,
  Calendar,
  RefreshCw,
  LayoutGrid,
  List,
  ArrowUpDown,
  IndianRupee,
  Check,
  TrendingDown,
  ShieldAlert,
  ChevronDown,
  FileSpreadsheet
} from 'lucide-react';
import { 
  RawMaterialItem, 
  InventoryHistoryEntry, 
  subscribeToRawMaterials, 
  subscribeToInventoryHistory, 
  deleteRawMaterialItem,
  deleteInventoryHistoryEntry,
  clearAllInventoryHistory,
  separateMergedScannedItems
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
  
  // UI View & Sorting state
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [sortBy, setSortBy] = useState<'name' | 'stock_desc' | 'stock_asc' | 'valuation_desc' | 'rate_desc'>('name');

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

  // Subscriptions & automatic unmerge of items with different rates
  useEffect(() => {
    const unsubMaterials = subscribeToRawMaterials((items) => {
      setMaterials(items);
    });
    const unsubHistory = subscribeToInventoryHistory((history) => {
      setHistoryList(history);
      // Auto-separate any merged scanned items that have distinct rates
      separateMergedScannedItems().catch(() => {});
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
        const matchChairType = (item.chairType || '').toLowerCase().includes(effectiveSearch);
        const matchChairBrand = (item.chairBrand || '').toLowerCase().includes(effectiveSearch);
        const matchChairColor = (item.chairColor || '').toLowerCase().includes(effectiveSearch);
        const matchChairMaterial = (item.chairUpholstery || '').toLowerCase().includes(effectiveSearch);
        if (!matchName && !matchSpecs && !matchSku && !matchCategory && !matchNotes && !matchChairType && !matchChairBrand && !matchChairColor && !matchChairMaterial) {
          return false;
        }
      }

      return true;
    });
  }, [materials, categoryFilter, stockStatusFilter, effectiveSearch]);

  // Total Estimated Inventory Valuation
  const totalValuation = useMemo(() => {
    return materials.reduce((sum, m) => sum + (m.availableQuantity || 0) * (m.unitCost || 0), 0);
  }, [materials]);

  // Sorted Raw Materials
  const sortedMaterials = useMemo(() => {
    const list = [...filteredMaterials];
    list.sort((a, b) => {
      if (sortBy === 'stock_desc') {
        return (b.availableQuantity || 0) - (a.availableQuantity || 0);
      }
      if (sortBy === 'stock_asc') {
        return (a.availableQuantity || 0) - (b.availableQuantity || 0);
      }
      if (sortBy === 'valuation_desc') {
        const valA = (a.availableQuantity || 0) * (a.unitCost || 0);
        const valB = (b.availableQuantity || 0) * (b.unitCost || 0);
        return valB - valA;
      }
      if (sortBy === 'rate_desc') {
        return (b.unitCost || 0) - (a.unitCost || 0);
      }
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [filteredMaterials, sortBy]);

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

  // Excel Export Functions
  const exportInventoryToExcel = () => {
    if (sortedMaterials.length === 0) {
      showNotification('No raw materials found to export.', 'info');
      return;
    }
    const data = sortedMaterials.map(m => ({
      'Raw Material Item': m.name,
      'SKU': m.sku || '',
      'Category': m.category || '',
      'Specifications': m.specs || '',
      'Available Quantity': m.availableQuantity || 0,
      'Unit': m.unit || 'Nos',
      'Unit Rate (₹)': m.unitCost || 0,
      'Total Value (₹)': (m.availableQuantity || 0) * (m.unitCost || 0),
      'Total Received': m.totalReceived || 0,
      'Total Dispatched': m.totalDispatched || 0,
      'Min Threshold': m.minThreshold ?? 10,
      'Board Company': m.boardCompany || '',
      'Board Thickness': m.boardThickness || '',
      'Chair Type': m.chairType || '',
      'Color Code': m.colorCode || '',
      'Bill Date': m.invoiceDate || '',
      'Notes': m.notes || ''
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Raw Materials Inventory');
    XLSX.writeFile(wb, `Inventory_Stock_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showNotification(`Exported ${data.length} raw materials to Excel!`, 'success');
  };

  const exportHistoryToExcel = () => {
    if (filteredHistory.length === 0) {
      showNotification('No transaction records to export.', 'info');
      return;
    }
    const data = filteredHistory.map(h => ({
      'Date & Time': h.timestamp,
      'Bill Date': h.billDate || '',
      'Type': h.type,
      'Raw Material': h.materialName,
      'Quantity': (h.type === 'RECEIVED' ? '+' : '-') + h.quantity,
      'Unit': h.materialUnit || 'Nos',
      'Unit Rate (₹)': h.unitCost || 0,
      'Project Name': h.projectName || 'General Stock Inward',
      'Previous Balance': h.previousQuantity,
      'New Balance': h.newQuantity,
      'Vendor / Received From': h.receivedFrom || '',
      'Dispatched To': h.dispatchedTo || '',
      'Invoice / Ref': h.challanOrPoNo || '',
      'Staff / Operator': h.performedBy || '',
      'Notes': h.notes || ''
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Movement Ledger');
    XLSX.writeFile(wb, `Inventory_Ledger_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showNotification(`Exported ${data.length} ledger transactions to Excel!`, 'success');
  };

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

  const confirmDeleteMaterial = () => {
    if (!materialToDelete) return;
    const item = materialToDelete;
    
    // Instantly update UI and close modal in 0ms
    setMaterials(prev => prev.filter(m => m.id !== item.id && (!item.docId || m.docId !== item.docId)));
    setMaterialToDelete(null);
    showNotification(`Deleted "${item.name}" from inventory.`, 'info');

    // Trigger background deletion
    deleteRawMaterialItem(item.id, item.docId).catch(err => {
      console.warn('Background delete material error:', err);
    });
  };

  const handleDeleteHistory = (entry: InventoryHistoryEntry) => {
    setHistoryToDelete(entry);
  };

  const confirmDeleteHistory = () => {
    if (!historyToDelete) return;
    const entry = historyToDelete;

    // Instantly update UI and close modal in 0ms
    setHistoryList(prev => prev.filter(h => h.id !== entry.id && (!entry.docId || h.docId !== entry.docId)));
    setHistoryToDelete(null);
    showNotification('Transaction record deleted successfully.', 'info');

    // Trigger background deletion
    deleteInventoryHistoryEntry(entry.id, entry.docId).catch(err => {
      console.warn('Background history delete error:', err);
    });
  };

  const handleClearAllHistory = () => {
    setIsClearHistoryModalOpen(true);
  };

  const confirmClearAllHistory = () => {
    // Instantly update UI, close modal, and show toast in 0ms!
    setHistoryList([]);
    setIsClearHistoryModalOpen(false);
    setIsDeleting(false);
    showNotification('All transaction history records have been cleared.', 'info');

    // Trigger background deletion in Firestore
    clearAllInventoryHistory().catch(err => {
      console.warn('Background clear all history error:', err);
    });
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
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center text-white shadow-md shadow-indigo-600/20 shrink-0">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Raw Material Inventory
                </h2>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Warehouse & Stock
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Real-time raw material balances, incoming invoice audits, and project-wise dispatches
              </p>
            </div>
          </div>
        </div>

        {/* Main Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Scan Invoice / Bill Button */}
          <button
            onClick={() => setIsScanInvoiceModalOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-500/20 active:scale-98 cursor-pointer min-h-[42px]"
          >
            <Sparkles className="w-4 h-4 text-slate-950 shrink-0 animate-pulse" />
            <span>Scan Invoice / Bill</span>
          </button>

          {/* Add Raw Material Button */}
          <button
            onClick={() => {
              setEditingItem(null);
              setIsAddModalOpen(true);
            }}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs active:scale-98 cursor-pointer min-h-[42px]"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>+ Add Material</span>
          </button>

          {/* Receive Stock Button */}
          <button
            onClick={() => handleOpenReceive()}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs shadow-emerald-600/20 active:scale-98 cursor-pointer min-h-[42px]"
          >
            <ArrowDownLeft className="w-4 h-4 shrink-0" />
            <span>Receive Stock</span>
          </button>

          {/* Dispatch Stock Button */}
          <button
            onClick={() => handleOpenDispatch()}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs shadow-amber-600/20 active:scale-98 cursor-pointer min-h-[42px]"
          >
            <ArrowUpRight className="w-4 h-4 shrink-0" />
            <span>Dispatch Stock</span>
          </button>

          {/* Export to Excel */}
          <button
            onClick={activeSubTab === 'products' ? exportInventoryToExcel : exportHistoryToExcel}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all active:scale-98 cursor-pointer min-h-[42px]"
            title={activeSubTab === 'products' ? "Export inventory to Excel" : "Export ledger to Excel"}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Export Excel</span>
          </button>

          {/* Unmerge Scanned Items Button */}
          <button
            onClick={async () => {
              const unmerged = await separateMergedScannedItems();
              if (unmerged) {
                showNotification('Successfully separated merged scanned materials into distinct items!', 'info');
              } else {
                showNotification('No merged scanned items found to separate.', 'info');
              }
            }}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer min-h-[42px]"
            title="Split any previously merged invoice items into distinct product entries"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>Unmerge</span>
          </button>
        </div>
      </div>

      {/* Main KPI Stats Grid - 2 cols on mobile, 4 cols on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total SKUs */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Material SKUs
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {metrics.totalItems} <span className="text-xs font-bold text-slate-500">Items</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            Across {Math.max(1, categories.length - 1)} active categories
          </p>
        </div>

        {/* Total In Stock */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Units In Stock
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-700">
            {metrics.totalInStock.toLocaleString('en-IN')} <span className="text-xs font-bold text-slate-500">Units</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            Available on factory floor & shelves
          </p>
        </div>

        {/* Estimated Valuation */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Stock Valuation (Est.)
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700">
            ₹{totalValuation.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            Computed from bill rates & quantities
          </p>
        </div>

        {/* Stock Health & Alerts (Interactive filter) */}
        <div 
          onClick={() => {
            setActiveSubTab('products');
            if (metrics.outOfStockCount > 0) {
              setStockStatusFilter('out_of_stock');
            } else if (metrics.lowStockCount > 0) {
              setStockStatusFilter('low_stock');
            } else {
              setStockStatusFilter('all');
            }
          }}
          className={`p-3.5 sm:p-4 rounded-2xl border shadow-xs transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${
            metrics.outOfStockCount > 0
              ? 'bg-rose-50/70 border-rose-200 hover:border-rose-400'
              : metrics.lowStockCount > 0
              ? 'bg-amber-50/70 border-amber-200 hover:border-amber-400'
              : 'bg-emerald-50/70 border-emerald-200 hover:border-emerald-400'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Stock Health
            </span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              metrics.outOfStockCount > 0
                ? 'bg-rose-100 text-rose-700'
                : metrics.lowStockCount > 0
                ? 'bg-amber-100 text-amber-800'
                : 'bg-emerald-100 text-emerald-700'
            }`}>
              {metrics.outOfStockCount > 0 || metrics.lowStockCount > 0 ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black">
            {metrics.outOfStockCount > 0 ? (
              <span className="text-rose-700">{metrics.outOfStockCount} Out of Stock</span>
            ) : metrics.lowStockCount > 0 ? (
              <span className="text-amber-800">{metrics.lowStockCount} Low Stock</span>
            ) : (
              <span className="text-emerald-700">All Healthy</span>
            )}
          </div>
          <p className="text-[11px] text-slate-600 mt-1 font-semibold underline truncate">
            {metrics.outOfStockCount > 0 || metrics.lowStockCount > 0
              ? 'Click to filter reorder items'
              : 'No items below safety thresholds'}
          </p>
        </div>
      </div>

      {/* Inward vs Outward Quick Overview Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-200">
        <div 
          onClick={() => {
            setActiveSubTab('history');
            setHistoryTypeFilter('RECEIVED');
          }}
          className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 hover:border-emerald-400 transition-all cursor-pointer group shadow-2xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Material Received
              </p>
              <p className="text-lg font-black text-emerald-700">
                +{metrics.totalReceived.toLocaleString('en-IN')} units
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-700 group-hover:underline">
            View Inward &rarr;
          </span>
        </div>

        <div 
          onClick={() => {
            setActiveSubTab('history');
            setHistoryTypeFilter('DISPATCHED');
          }}
          className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 hover:border-amber-400 transition-all cursor-pointer group shadow-2xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Material Dispatched
              </p>
              <p className="text-lg font-black text-amber-700">
                -{metrics.totalDispatched.toLocaleString('en-IN')} units
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-amber-700 group-hover:underline">
            View Dispatches &rarr;
          </span>
        </div>
      </div>

      {/* Low Stock Warning Alert if any items are under minimum */}
      {metrics.lowStockCount > 0 && stockStatusFilter !== 'low_stock' && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-black text-amber-950">
                Low Stock Alert: {metrics.lowStockCount} raw material item(s) are running below safety threshold!
              </p>
              <p className="text-[11px] sm:text-xs text-amber-800">
                Reorder boards, hardware, or fasteners to prevent factory line stoppages.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setActiveSubTab('products');
              setStockStatusFilter('low_stock');
            }}
            className="w-full sm:w-auto px-3.5 py-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold transition-colors shrink-0 cursor-pointer text-center"
          >
            Show Low Stock Items
          </button>
        </div>
      )}

      {/* Sub-Tabs: Raw Materials List vs Movement History */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex bg-slate-200/70 p-1 rounded-xl w-full sm:w-fit overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('products')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'products'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-4 h-4 shrink-0" />
            <span>Raw Materials List</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px] font-black text-slate-700">
              {sortedMaterials.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('history')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'history'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4 shrink-0" />
            <span>Movement History / Ledger</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px] font-black text-slate-700">
              {historyList.length}
            </span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={internalSearch}
            onChange={(e) => setInternalSearch(e.target.value)}
            placeholder={activeSubTab === 'products' ? "Search raw materials, specs, SKU..." : "Search history, projects..."}
            className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-xs font-medium text-slate-900 bg-white"
          />
          {internalSearch && (
            <button
              onClick={() => setInternalSearch('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: RAW MATERIALS PRODUCT SECTION */}
      {activeSubTab === 'products' && (
        <div className="space-y-4">
          {/* Controls Bar: Category Filter Pills, Stock Status, Sort & View Mode */}
          <div className="flex flex-col gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
            {/* Row A: Category Filter Strip with counts */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
                Category:
              </span>
              {categories.map((cat) => {
                const count = cat === 'All' 
                  ? materials.length 
                  : materials.filter(m => m.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                      categoryFilter === cat
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <span>{cat}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      categoryFilter === cat ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Row B: Stock Status, Sort by, and Cards/Table View Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              {/* Stock Level Selector */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs overflow-x-auto">
                <button
                  onClick={() => setStockStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer shrink-0 ${
                    stockStatusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({materials.length})
                </button>
                <button
                  onClick={() => setStockStatusFilter('in_stock')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer shrink-0 ${
                    stockStatusFilter === 'in_stock' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  In Stock
                </button>
                <button
                  onClick={() => setStockStatusFilter('low_stock')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                    stockStatusFilter === 'low_stock' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-800 hover:bg-amber-100/50'
                  }`}
                >
                  <span>Low Stock</span>
                  <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-black/10">
                    {metrics.lowStockCount}
                  </span>
                </button>
                <button
                  onClick={() => setStockStatusFilter('out_of_stock')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                    stockStatusFilter === 'out_of_stock' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-700 hover:bg-rose-100/50'
                  }`}
                >
                  <span>Out of Stock</span>
                  <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-black/10">
                    {metrics.outOfStockCount}
                  </span>
                </button>
              </div>

              {/* Right tools: Sort Dropdown & View Mode Switcher */}
              <div className="flex items-center gap-2 flex-wrap ml-auto">
                {/* Sort selector */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-500 font-semibold hidden sm:inline">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-transparent font-bold text-slate-800 text-xs focus:outline-hidden cursor-pointer"
                  >
                    <option value="name">Name (A-Z)</option>
                    <option value="stock_desc">Available Stock (High to Low)</option>
                    <option value="stock_asc">Available Stock (Low - Needs Reorder)</option>
                    <option value="valuation_desc">Highest Valuation (₹)</option>
                    <option value="rate_desc">Highest Unit Rate (₹)</option>
                  </select>
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                      viewMode === 'table' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Table view"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Table</span>
                  </button>
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                      viewMode === 'cards' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Cards view"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Cards</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* EMPTY STATE */}
          {sortedMaterials.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-3 border border-indigo-100">
                <Package className="w-7 h-7 text-indigo-600" />
              </div>
              <p className="font-black text-slate-900 text-base">No Raw Materials Found</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                {internalSearch || categoryFilter !== 'All' || stockStatusFilter !== 'all'
                  ? 'No items matched your current filters or search query.'
                  : 'Your raw material inventory is currently empty. Add materials or scan an invoice.'}
              </p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {(internalSearch || categoryFilter !== 'All' || stockStatusFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setInternalSearch('');
                      setCategoryFilter('All');
                      setStockStatusFilter('all');
                    }}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    Reset Filters
                  </button>
                )}
                <button
                  onClick={() => {
                    setEditingItem(null);
                    setIsAddModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Raw Material</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* SUBVIEW A: MOBILE CARDS VIEW (ALWAYS SHOWN ON MOBILE md:hidden, OR DESKTOP WHEN viewMode === 'cards') */}
              <div className={`${viewMode === 'cards' ? 'grid' : 'grid md:hidden'} grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5`}>
                {sortedMaterials.map((item) => {
                  const threshold = item.minThreshold ?? 10;
                  const isLow = item.availableQuantity <= threshold && item.availableQuantity > 0;
                  const isOut = item.availableQuantity <= 0;
                  const lineValuation = (item.availableQuantity || 0) * (item.unitCost || 0);

                  return (
                    <div 
                      key={item.id}
                      className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3 relative group"
                    >
                      {/* Top Header: Image + Title + Category */}
                      <div>
                        <div className="flex items-start gap-3">
                          {/* Thumbnail with expand preview */}
                          <div
                            onClick={() => item.imageUrl && setPreviewImage({ url: item.imageUrl, name: item.name })}
                            className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all relative group/img"
                          >
                            {item.imageUrl ? (
                              <>
                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                                  <Eye className="w-3.5 h-3.5 text-white" />
                                </div>
                              </>
                            ) : (
                              <Package className="w-6 h-6 text-slate-400" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                                {item.sku || 'RM'}
                              </span>
                              <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[100px]">
                                {item.category}
                              </span>
                            </div>
                            <h3 className="font-black text-slate-900 text-sm leading-snug mt-1 truncate" title={item.name}>
                              {item.name}
                            </h3>
                            {item.specs && (
                              <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                {item.specs}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Attribute Badges */}
                        <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
                          {item.boardCompany && (
                            <span className="text-[10px] font-black text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">
                              {item.boardCompany}
                            </span>
                          )}
                          {item.boardThickness && (
                            <span className="text-[10px] font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded-md">
                              {item.boardThickness}
                            </span>
                          )}
                          {item.chairType && (
                            <span className="text-[10px] font-black text-sky-900 bg-sky-50 px-1.5 py-0.5 rounded-md border border-sky-200">
                              {item.chairType}
                            </span>
                          )}
                          {item.chairBrand && (
                            <span className="text-[10px] font-bold text-indigo-900 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-200">
                              {item.chairBrand}
                            </span>
                          )}
                          {item.colorCode && (
                            <span className="text-[10px] font-bold text-purple-800 bg-purple-50 px-1.5 py-0.5 rounded-md border border-purple-200">
                              Color: {item.colorCode}
                            </span>
                          )}
                          {item.unitCost ? (
                            <span className="text-[10px] font-black text-emerald-900 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                              ₹{item.unitCost.toLocaleString('en-IN')} / {item.unit}
                            </span>
                          ) : null}
                        </div>

                        {/* Stock Balance Indicator Box */}
                        <div className={`mt-3 p-3 rounded-xl border flex items-center justify-between gap-2 ${
                          isOut 
                            ? 'bg-rose-50/70 border-rose-200' 
                            : isLow 
                            ? 'bg-amber-50/70 border-amber-300' 
                            : 'bg-emerald-50/60 border-emerald-200'
                        }`}>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                              Available Stock
                            </span>
                            <div className="flex items-baseline gap-1 mt-0.5">
                              <span className={`text-xl font-black ${
                                isOut ? 'text-rose-700' : isLow ? 'text-amber-800' : 'text-emerald-800'
                              }`}>
                                {item.availableQuantity}
                              </span>
                              <span className="text-xs font-bold text-slate-600">{item.unit}</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                              isOut 
                                ? 'bg-rose-600 text-white' 
                                : isLow 
                                ? 'bg-amber-600 text-white' 
                                : 'bg-emerald-600 text-white'
                            }`}>
                              {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'Healthy'}
                            </span>
                            {lineValuation > 0 && (
                              <p className="text-[11px] font-extrabold text-slate-700 mt-1">
                                Est: ₹{lineValuation.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Inward vs Outward summary */}
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 px-1 mt-2">
                          <span className="text-emerald-700 font-bold">
                            Total In: +{item.totalReceived || 0} {item.unit}
                          </span>
                          <span className="text-amber-700 font-bold">
                            Dispatched: -{item.totalDispatched || 0} {item.unit}
                          </span>
                        </div>
                      </div>

                      {/* Card In-Action Buttons: Fast Receive & Fast Dispatch */}
                      <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleOpenReceive(item)}
                            className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs active:scale-98 transition-all cursor-pointer min-h-[38px]"
                            title="Receive inward shipment for this material"
                          >
                            <ArrowDownLeft className="w-4 h-4 shrink-0" />
                            <span>+ Receive</span>
                          </button>

                          <button
                            onClick={() => handleOpenDispatch(item)}
                            className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs active:scale-98 transition-all cursor-pointer min-h-[38px]"
                            title="Dispatch stock to a project"
                          >
                            <ArrowUpRight className="w-4 h-4 shrink-0" />
                            <span>- Dispatch</span>
                          </button>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Edit Specs</span>
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                            title="Delete raw material"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* SUBVIEW B: HIGH-DENSITY DESKTOP TABLE VIEW (HIDDEN ON MOBILE, SHOWN ON md+ WHEN viewMode === 'table') */}
              <div className={`${viewMode === 'table' ? 'hidden md:block' : 'hidden'} bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3.5 px-4">Raw Material Product</th>
                        <th className="py-3.5 px-4">Category</th>
                        <th className="py-3.5 px-4">Specifications</th>
                        <th className="py-3.5 px-4 text-center">Available Stock</th>
                        <th className="py-3.5 px-4 text-right">Unit Rate & Value</th>
                        <th className="py-3.5 px-4 text-center">Inward / Dispatched</th>
                        <th className="py-3.5 px-4 text-center">Quick Stock Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {sortedMaterials.map((item) => {
                        const threshold = item.minThreshold ?? 10;
                        const isLow = item.availableQuantity <= threshold && item.availableQuantity > 0;
                        const isOut = item.availableQuantity <= 0;
                        const lineValuation = (item.availableQuantity || 0) * (item.unitCost || 0);

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                            {/* Product Image + Name */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
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
                                    <span className="inline-block text-[10px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                                      {item.sku || 'RM'}
                                    </span>
                                    {item.chairType && (
                                      <span className="text-[10px] font-black text-sky-900 bg-sky-100 px-1.5 py-0.5 rounded-md border border-sky-200">
                                        {item.chairType}
                                      </span>
                                    )}
                                    {item.chairBrand && (
                                      <span className="text-[10px] font-bold text-indigo-900 bg-indigo-100 px-1.5 py-0.5 rounded-md border border-indigo-200">
                                        {item.chairBrand}
                                      </span>
                                    )}
                                    {item.boardCompany && (
                                      <span className="text-[10px] font-black text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded-md border border-amber-200">
                                        {item.boardCompany}
                                      </span>
                                    )}
                                    {item.boardThickness && (
                                      <span className="text-[10px] font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded-md">
                                        {item.boardThickness}
                                      </span>
                                    )}
                                    {item.colorCode && (
                                      <span className="text-[10px] font-bold text-purple-800 bg-purple-50 px-1.5 py-0.5 rounded-md border border-purple-200">
                                        Color: {item.colorCode}
                                      </span>
                                    )}
                                    {item.invoiceDate ? (
                                      <span className="text-[10px] font-bold text-indigo-900 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-200">
                                        Bill: {item.invoiceDate}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Category */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
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

                            {/* Available Stock */}
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
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
                                    Low stock (&lt; {threshold})
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Unit Rate & Line Valuation */}
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              {item.unitCost ? (
                                <div>
                                  <span className="text-xs font-black text-slate-900 block">
                                    ₹{item.unitCost.toLocaleString('en-IN')} / {item.unit}
                                  </span>
                                  <span className="text-[11px] font-bold text-emerald-700 block mt-0.5">
                                    Val: ₹{lineValuation.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">No rate set</span>
                              )}
                            </td>

                            {/* Received / Dispatched Totals */}
                            <td className="py-3.5 px-4 text-center text-xs whitespace-nowrap">
                              <div className="inline-flex flex-col gap-0.5 items-center">
                                <span className="text-emerald-700 font-bold">
                                  +{item.totalReceived || 0} {item.unit}
                                </span>
                                <span className="text-amber-700 font-bold">
                                  -{item.totalDispatched || 0} {item.unit}
                                </span>
                              </div>
                            </td>

                            {/* Quick Actions (In-Row Receive, Dispatch, Edit, Delete) */}
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleOpenReceive(item)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs transition-colors cursor-pointer"
                                  title="Receive inward stock for this material"
                                >
                                  <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>+ Receive</span>
                                </button>
                                <button
                                  onClick={() => handleOpenDispatch(item)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs transition-colors cursor-pointer"
                                  title="Dispatch stock to a project"
                                >
                                  <ArrowUpRight className="w-3.5 h-3.5 text-amber-700" />
                                  <span>- Dispatch</span>
                                </button>
                                <button
                                  onClick={() => handleEdit(item)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-colors cursor-pointer"
                                  title="Edit material specs"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(item)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors cursor-pointer"
                                  title="Delete material"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* VIEW 2: INVENTORY MOVEMENT HISTORY / LEDGER */}
      {activeSubTab === 'history' && (
        <div className="space-y-4">
          {/* History Filters & Action Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            {/* Transaction Type Filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                Type:
              </span>
              <button
                onClick={() => setHistoryTypeFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  historyTypeFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All ({historyList.length})
              </button>
              <button
                onClick={() => setHistoryTypeFilter('RECEIVED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  historyTypeFilter === 'RECEIVED'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Received Inward</span>
              </button>
              <button
                onClick={() => setHistoryTypeFilter('DISPATCHED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  historyTypeFilter === 'DISPATCHED'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Dispatched to Projects</span>
              </button>
            </div>

            {/* Filter by Project, Excel Export, and Clear All History */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs">
                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-slate-500 font-semibold hidden sm:inline">Project:</span>
                <select
                  value={historyProjectFilter}
                  onChange={(e) => setHistoryProjectFilter(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer max-w-[140px] truncate"
                >
                  <option value="all">All Projects</option>
                  {historyProjects.filter(p => p !== 'all').map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Export Ledger to Excel */}
              <button
                onClick={exportHistoryToExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                title="Export transaction records to Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export</span>
              </button>

              {historyList.length > 0 && (
                <button
                  onClick={handleClearAllHistory}
                  title="Remove all transaction records"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear All</span>
                </button>
              )}
            </div>
          </div>

          {/* EMPTY STATE */}
          {filteredHistory.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
              <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-800 text-base">No Transaction Records Found</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                {internalSearch || historyTypeFilter !== 'all' || historyProjectFilter !== 'all'
                  ? 'No movements match your current filter settings.'
                  : 'Inward received raw materials and project-specific dispatches will appear here with full timestamps.'}
              </p>
            </div>
          ) : (
            <>
              {/* SUBVIEW A: MOBILE HISTORY CARDS (md:hidden) */}
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {filteredHistory.map((entry) => {
                  const isReceive = entry.type === 'RECEIVED';

                  return (
                    <div 
                      key={entry.id}
                      className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col gap-2.5 relative"
                    >
                      {/* Card Header: Type Badge + Timestamp + Delete */}
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          {isReceive ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-black text-[11px]">
                              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-700" />
                              RECEIVED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 font-black text-[11px]">
                              <ArrowUpRight className="w-3.5 h-3.5 text-amber-700" />
                              DISPATCHED
                            </span>
                          )}
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{entry.timestamp}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteHistory(entry)}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Delete this record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Material Name & Movement Qty */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-black text-slate-900 text-sm leading-snug">
                            {entry.materialName}
                          </h4>
                          {entry.unitCost ? (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md inline-block mt-1">
                              Rate: ₹{entry.unitCost.toLocaleString('en-IN', { maximumFractionDigits: 2 })} / {entry.materialUnit || 'Nos'}
                            </span>
                          ) : null}
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-base font-black ${
                            isReceive ? 'text-emerald-700' : 'text-amber-800'
                          }`}>
                            {isReceive ? `+${entry.quantity}` : `-${entry.quantity}`} {entry.materialUnit || 'Nos'}
                          </span>
                          <span className="block text-[10px] text-slate-500 font-medium">
                            Stock: {entry.previousQuantity} → <strong className="text-slate-900 font-bold">{entry.newQuantity}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Project Name (Prominent) */}
                      {entry.projectName ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 font-bold text-xs">
                          <Building2 className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span className="truncate">Project: {entry.projectName}</span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400 italic">
                          General Stock Inward
                        </div>
                      )}

                      {/* Footer Details: Vendor / Dispatched To + Invoice/Ref + Bill Date */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                        <div>
                          <span className="font-semibold text-slate-800">
                            {isReceive ? (entry.receivedFrom || 'Supplier') : (entry.dispatchedTo || 'Production')}
                          </span>
                          {entry.challanOrPoNo && (
                            <span className="ml-1.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded-md">
                              #{entry.challanOrPoNo}
                            </span>
                          )}
                        </div>

                        {entry.billDate && (
                          <div className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                            <Calendar className="w-3 h-3 text-indigo-600 shrink-0" />
                            <span>Bill: {entry.billDate}</span>
                          </div>
                        )}
                      </div>

                      {entry.notes && (
                        <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg">
                          "{entry.notes}" {entry.performedBy ? `— ${entry.performedBy}` : ''}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* SUBVIEW B: DESKTOP HISTORY TABLE (hidden md:block) */}
              <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
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
                      {filteredHistory.map((entry) => {
                        const isReceive = entry.type === 'RECEIVED';

                        return (
                          <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                            {/* Date & Time */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>{entry.timestamp}</span>
                              </div>
                              {entry.billDate && (
                                <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-black text-indigo-900 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                                  <Calendar className="w-3 h-3 text-indigo-600 shrink-0" />
                                  <span>Bill Date: <strong>{entry.billDate}</strong></span>
                                </div>
                              )}
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

                            {/* Movement Quantity & Rate */}
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <span className={`text-sm font-black ${
                                isReceive ? 'text-emerald-600' : 'text-amber-700'
                              }`}>
                                {isReceive ? `+${entry.quantity}` : `-${entry.quantity}`} {entry.materialUnit || 'Nos'}
                              </span>
                              {entry.unitCost ? (
                                <div className="mt-1 text-[10px] font-black text-emerald-900 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md inline-block">
                                  Rate: ₹{entry.unitCost.toLocaleString('en-IN', { maximumFractionDigits: 2 })} / {entry.materialUnit || 'unit'}
                                </div>
                              ) : null}
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
                              <div className="font-semibold text-slate-900">
                                {isReceive ? (entry.receivedFrom || 'Supplier') : (entry.dispatchedTo || 'Production Team')}
                              </div>
                              {entry.challanOrPoNo ? (
                                <span className="inline-block mt-0.5 text-[10px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                                  Invoice/Ref: #{entry.challanOrPoNo}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                  Direct Inward
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
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
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
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="max-w-xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl p-4 flex flex-col gap-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-bold text-base text-slate-800 truncate">{previewImage.name}</h4>
              <button 
                onClick={() => setPreviewImage(null)}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Close</span>
              </button>
            </div>
            <img src={previewImage.url} alt="" className="w-full max-h-[70vh] object-contain rounded-xl bg-slate-50" />
            <div className="pt-2 flex justify-end">
              <button 
                onClick={() => setPreviewImage(null)}
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Close Enlarge Image</span>
              </button>
            </div>
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
