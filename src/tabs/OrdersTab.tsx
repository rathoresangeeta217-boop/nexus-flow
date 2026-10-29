import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShoppingCart, TrendingUp, Clock, CheckCircle2, MoreHorizontal, Filter, Plus, FileText, Download, Loader2, X, Truck, Calendar, AlertTriangle, Trash2, Check, Paperclip, Upload, FileCheck2 } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';
import { NewOrderModal } from '../components/NewOrderModal';
import { OrderDetailsModal } from '../components/OrderDetailsModal';
import { UploadDrawingChecklistModal } from '../components/UploadDrawingChecklistModal';
import { subscribeToOrders, saveOrder, deleteOrder, Order, getOverdueUnconfirmedDispatches } from '../lib/orders';
import { BASELINE_ORDERS } from '../lib/ordersCache';
import { useAuth } from '../contexts/AuthContext';
import { saveOrderFiles } from '../lib/fileStorage';
import { generatePaymentReminderPDF } from '../lib/pdfHelper';
import { getPaymentForOrder } from '../lib/payments';

export function OrdersTab({ searchQuery = '' }: { searchQuery?: string }) {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>(BASELINE_ORDERS);
  const [isLoading, setIsLoading] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [salespersonFilter, setSalespersonFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeMenuOrderId, setActiveMenuOrderId] = useState<string | null>(null);
  
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | undefined>();
  const [uploadedFileData, setUploadedFileData] = useState<string | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isDocUploadModalOpen, setIsDocUploadModalOpen] = useState(false);
  const [orderForDocUpload, setOrderForDocUpload] = useState<Order | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, statusFilter, salespersonFilter, startDate, endDate, searchQuery]);

  useEffect(() => {
    const onQuota = () => setQuotaExceeded(true);
    window.addEventListener('firestore-quota-exceeded', onQuota);
    return () => window.removeEventListener('firestore-quota-exceeded', onQuota);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = subscribeToOrders((fetchedOrders) => {
      if (!isMounted) return;
      if (fetchedOrders && fetchedOrders.length > 0) {
        setOrders(fetchedOrders);
      }
      setIsLoading(false);
      setSelectedOrder(current => {
        if (!current) return null;
        return fetchedOrders.find(o => o.id === current.id || o.docId === current.docId) || current;
      });
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const overdueDispatches = getOverdueUnconfirmedDispatches(orders);

  const handleNewOrderClick = () => {
    if (overdueDispatches.length > 0) {
      const overdue = overdueDispatches[0];
      alert(
        `❌ NEW ORDER SCHEDULING BLOCKED!\n\n` +
        `Term Enforcement: It is compulsory to confirm dispatch within 2 days of Delivery Challan creation or Scheduled Dispatch.\n\n` +
        `Order #${overdue.id} (${overdue.customer}) has an unconfirmed delivery challan / scheduled dispatch created over 2 days ago.\n\n` +
        `You cannot schedule any new order until dispatch is confirmed for Order #${overdue.id}.`
      );
      return;
    }
    setIsEmployeeModalOpen(true);
  };

  const handleProceedToUpload = () => {
    setIsEmployeeModalOpen(false);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setUploadedFileName(file.name);
      
      const isImage = file.type.startsWith('image/');
      
      if (isImage) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const maxDimension = 1200;
            
            if (width > height && width > maxDimension) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else if (height > maxDimension) {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            
            // Compress
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
            setUploadedFileData(compressedDataUrl);
            setIsModalOpen(true);
          };
          img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          setUploadedFileData(reader.result as string);
          setIsModalOpen(true);
        };
        reader.onerror = () => {
          console.error("Failed to read file");
          setIsModalOpen(true);
        };
        reader.readAsDataURL(file);
      }
      
      e.target.value = '';
    }
  };

  const handleAddOrder = async (newOrder: any) => {
    const isAnshuman = Boolean(
      profile?.displayName?.toLowerCase().includes('anshuman') || 
      profile?.email?.toLowerCase().includes('anshuman') ||
      profile?.role === 'super_admin'
    );

    const overdueDispatches = getOverdueUnconfirmedDispatches(orders);
    if (overdueDispatches.length > 0 && !isAnshuman) {
      const overdue = overdueDispatches[0];
      alert(
        `❌ NEW ORDER CREATION BLOCKED!\n\n` +
        `Term Enforcement: It is compulsory to confirm dispatch within 2 days of Delivery Challan creation or Scheduled Dispatch.\n\n` +
        `Order #${overdue.id} (${overdue.customer}) has an unconfirmed delivery challan / scheduled dispatch created over 2 days ago.\n\n` +
        `You cannot create any new order until dispatch is confirmed for Order #${overdue.id}.`
      );
      return;
    }

    // Extract file data to avoid Firebase size limits
    const { poFileData, drawingFileData, checklistFileData, ...orderDetails } = newOrder;

    const orderData: Order = {
      id: `ORD-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      customer: orderDetails.companyName || orderDetails.customerName || 'Unknown Customer',
      amount: orderDetails.totalAmount || '₹0.00',
      date: orderDetails.orderDate ? new Date(orderDetails.orderDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'New Order',
      items: Number(orderDetails.totalItems) || 0,
      createdAt: new Date().toISOString(),
      details: {
        ...orderDetails,
      }
    };
    
    try {
      await saveOrder(orderData);
      
      // Save files to IndexedDB
      await saveOrderFiles(orderData.id, {
        quotationFileData: uploadedFileData,
        poFileData: poFileData,
        drawingFileData: drawingFileData,
        checklistFileData: checklistFileData
      });
      
      // Give option to upload drawing and checklist immediately after adding the order
      setOrderForDocUpload(orderData);
      setIsDocUploadModalOpen(true);

    } catch (error: any) {
      console.error('Error saving order:', error);
      alert(`Failed to save order: ${error.message}`);
    }
  };

  const handleDeleteOrder = async (docId: string) => {
    try {
      await deleteOrder(docId);
      setSelectedOrder(null);
    } catch (error: any) {
      console.error('Error deleting order:', error);
      alert(`Failed to delete order: ${error.message}`);
    }
  };

  const handleSelectScheduledReason = async (order: Order, reason: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenuOrderId(null);
    try {
      const updated = {
        ...order,
        docId: order.docId || order.id,
        details: {
          ...(order.details || {}),
          scheduledReason: reason
        }
      };
      if (reason && (!order.status || order.status === 'New Order' || order.status === 'New')) {
        updated.status = 'Scheduled Dispatched';
      }
      await saveOrder(updated);

      const toast = document.createElement('div');
      toast.textContent = reason 
        ? `Scheduled Reason updated to "${reason}" for Order #${order.id}` 
        : `Scheduled Reason cleared for Order #${order.id}`;
      toast.className = 'fixed bottom-5 right-5 z-[200] bg-slate-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xl transition-all border border-slate-700';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } catch (err) {
      console.error('Failed to update scheduled reason:', err);
    }
  };

  const uniqueSalesPersons = Array.from(new Set(orders.map(o => o.details?.employeeName).filter(Boolean))).sort();

  const filteredOrders = orders.filter(order => {
    if (salespersonFilter !== 'all') {
      if (order.details?.employeeName !== salespersonFilter) {
        return false;
      }
    }
    if (statusFilter !== 'all') {
      if (statusFilter === 'New Order' && (order.status === 'New Order' || order.status === 'New')) {
        // match legacy
      } else if (order.status !== statusFilter) {
        return false;
      }
    }
    
    if (dateFilter !== 'all') {
      const now = new Date();
      let orderDate = null;
      
      if (order.date) {
        orderDate = new Date(order.date);
      } else if (order.createdAt?.seconds) {
        orderDate = new Date(order.createdAt.seconds * 1000);
      }
      
      if (orderDate && !isNaN(orderDate.getTime())) {
        if (dateFilter === 'day') {
          if (orderDate.toDateString() !== now.toDateString()) return false;
        } else if (dateFilter === 'month') {
          if (orderDate.getMonth() !== now.getMonth() || orderDate.getFullYear() !== now.getFullYear()) return false;
        } else if (dateFilter === 'lastMonth') {
          let expectedMonth = now.getMonth() - 1;
          let expectedYear = now.getFullYear();
          if (expectedMonth < 0) {
            expectedMonth = 11;
            expectedYear -= 1;
          }
          if (orderDate.getMonth() !== expectedMonth || orderDate.getFullYear() !== expectedYear) return false;
        } else if (dateFilter === 'year') {
          if (orderDate.getFullYear() !== now.getFullYear()) return false;
        } else if (dateFilter === 'custom') {
          if (startDate) {
            const s = new Date(startDate);
            s.setHours(0, 0, 0, 0);
            if (orderDate < s) return false;
          }
          if (endDate) {
            const e = new Date(endDate);
            e.setHours(23, 59, 59, 999);
            if (orderDate > e) return false;
          }
        }
      }
    }
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesId = order.id?.toLowerCase().includes(q) || order.docId?.toLowerCase().includes(q);
      const matchesCustomer = order.customer?.toLowerCase().includes(q);
      const matchesProject = order.project?.toLowerCase().includes(q);
      const matchesEmployee = order.employee?.toLowerCase().includes(q);
      if (!matchesId && !matchesCustomer && !matchesProject && !matchesEmployee) return false;
    }
    
    return true;
  }).sort((a, b) => {
    // Helper to get a comparable date time
    const getTime = (order) => {
      if (order.createdAt?.seconds) {
        return order.createdAt.seconds * 1000;
      }
      if (order.date) {
        const d = new Date(order.date);
        if (!isNaN(d.getTime())) return d.getTime();
      }
      return 0; // fallback
    };
    
    return getTime(b) - getTime(a); // Descending order (newest first)
  });

  const totalEntries = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = totalEntries === 0 ? 0 : (validCurrentPage - 1) * pageSize + 1;
  const endIndex = Math.min(validCurrentPage * pageSize, totalEntries);
  const paginatedOrders = filteredOrders.slice((validCurrentPage - 1) * pageSize, validCurrentPage * pageSize);

      const getOrdersStats = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
    
    let thisMonthCount = 0;
    let lastMonthCount = 0;
    let lifetimeRevenue = 0;
    let thisMonthRevenue = 0;
    let lastMonthRevenue = 0;
    const lifetimeCount = filteredOrders.length;
    
    filteredOrders.forEach(order => {
      let orderDate;
      if (order.date) {
        orderDate = new Date(order.date);
      } else if (order.createdAt?.seconds) {
        orderDate = new Date(order.createdAt.seconds * 1000);
      }

      // Parse amount properly - take the total amount directly
      const amountStr = String(order.amount || order.details?.totalAmount || '0')
        .replace(/Rs\.?\s*/g, '')
        .replace(/₹\s*/g, '')
        .replace(/[^0-9.]/g, '');
      const amount = parseFloat(amountStr) || 0;

      lifetimeRevenue += amount;
      
      if (orderDate && !isNaN(orderDate.getTime())) {
        if (orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear) {
          thisMonthCount++;
          thisMonthRevenue += amount;
        } else if (orderDate.getMonth() === lastMonthDate.getMonth() && orderDate.getFullYear() === lastMonthDate.getFullYear()) {
          lastMonthCount++;
          lastMonthRevenue += amount;
        }
      }
    });

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const currentDay = Math.max(1, now.getDate());
    
    const projectedCount = Math.round((thisMonthCount / currentDay) * daysInMonth);
    const projectedRevenue = Math.round((thisMonthRevenue / currentDay) * daysInMonth);

    // Calculate trends
    let thisMonthTrend = 0;
    if (lastMonthCount > 0) {
      thisMonthTrend = ((thisMonthCount - lastMonthCount) / lastMonthCount) * 100;
    }
    
    let projectedTrend = 0;
    if (thisMonthCount > 0) { 
       projectedTrend = ((projectedCount - thisMonthCount) / thisMonthCount) * 100;
    }
    
    let thisMonthRevTrend = 0;
    if (lastMonthRevenue > 0) {
      thisMonthRevTrend = ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
    }
    
    let projectedRevTrend = 0;
    if (thisMonthRevenue > 0) {
      projectedRevTrend = ((projectedRevenue - thisMonthRevenue) / thisMonthRevenue) * 100;
    }
    
    const formatCurrency = (val) => {
      if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
      if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lac`;
      return `₹${val.toLocaleString('en-IN')}`;
    };

    return {
      lifetime: lifetimeCount,
      thisMonth: thisMonthCount,
      lastMonth: lastMonthCount,
      projected: projectedCount || thisMonthCount,
      thisMonthTrend,
      projectedTrend,
      
      lifetimeRev: formatCurrency(lifetimeRevenue),
      thisMonthRev: formatCurrency(thisMonthRevenue),
      lastMonthRev: formatCurrency(lastMonthRevenue),
      projectedRev: formatCurrency(projectedRevenue || thisMonthRevenue),
      thisMonthRevTrend,
      projectedRevTrend
    };
  };

  const stats = getOrdersStats();

  return (
    <div className="space-y-6 pb-8">
      {isEmployeeModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">Select Salesperson</h2>
              <button onClick={() => setIsEmployeeModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <label className="block text-sm font-semibold text-slate-700">Employee Name</label>
              <select 
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="" disabled>Select an employee</option>
                <option value="Khushboo Modi">Khushboo Modi</option>
                <option value="Abhilasha verma">Abhilasha verma</option>
                <option value="Anshuman Singh">Anshuman Singh</option>
                <option value="Bhawna Khandelwal">Bhawna Khandelwal</option>
              </select>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
              <button
                onClick={() => setIsEmployeeModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleProceedToUpload}
                disabled={!selectedEmployee}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 flex items-center"
              >
                Next <FileText className="w-4 h-4 ml-2" />
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <NewOrderModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setUploadedFileName(undefined);
          setUploadedFileData(undefined);
        }} 
        fileName={uploadedFileName} 
        fileData={uploadedFileData}
        onAddOrder={handleAddOrder}
        employeeName={selectedEmployee}
      />

      <OrderDetailsModal 
        isOpen={!!selectedOrder} 
        onClose={() => setSelectedOrder(null)} 
        order={selectedOrder} 
        onDelete={() => selectedOrder?.docId && handleDeleteOrder(selectedOrder.docId)}
      />

      <UploadDrawingChecklistModal
        isOpen={isDocUploadModalOpen}
        onClose={() => {
          setIsDocUploadModalOpen(false);
          setOrderForDocUpload(null);
        }}
        order={orderForDocUpload}
        onSuccess={(updatedOrder) => {
          setOrders(prev => prev.map(o => (o.id === updatedOrder.id || o.docId === updatedOrder.docId) ? updatedOrder : o));
          if (selectedOrder && (selectedOrder.id === updatedOrder.id || selectedOrder.docId === updatedOrder.docId)) {
            setSelectedOrder(updatedOrder);
          }
        }}
      />

      {/* Firestore Quota Notice Banner */}
      {quotaExceeded && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="text-xs">
              <span className="font-bold">Firestore Daily Free Quota Limit Reached.</span> Operating safely in offline persistence mode with all cached orders loaded. New orders are saved locally and will sync when quota resets tomorrow.
            </div>
          </div>
          <a
            href="https://console.firebase.google.com/project/gen-lang-client-0388415499/firestore/databases/ai-studio-nexusflowenterpr-71986131-a5cc-4eb8-8637-e19c6c912d2c/data?openUpgradeDialog=true"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-amber-900 underline hover:text-amber-950 shrink-0"
          >
            Upgrade in Firebase Console
          </a>
        </div>
      )}

      {/* Overdue Dispatch Confirmation Compulsory Term Banner */}
      {overdueDispatches.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 font-bold">
              <AlertTriangle className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-rose-900 flex items-center gap-2">
                <span>⚠️ COMPULSORY DISPATCH CONFIRMATION OVERDUE ({overdueDispatches.length})</span>
              </h4>
              <p className="text-xs text-rose-800 font-semibold mt-0.5">
                Term Violation: Delivery Challan or Scheduled Dispatch created over 2 days ago requires confirmation. <strong>Scheduling new orders is BLOCKED</strong> until dispatch is confirmed for Order #{overdueDispatches[0].id} ({overdueDispatches[0].customer}).
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedOrder(overdueDispatches[0])}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all shrink-0 cursor-pointer shadow-sm"
          >
            Confirm Order #{overdueDispatches[0].id}
          </button>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Dashboard</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Manage and track customer orders across the pipeline.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleNewOrderClick}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Order
          </button>
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            accept=".pdf,.doc,.docx,.xls,.xlsx,image/*" 
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${(dateFilter === 'all' || dateFilter === 'month' || dateFilter === 'lastMonth') ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-6`}>
        <StatCard 
          title="Total Orders" 
          value={stats.lifetime.toLocaleString()} 
          icon={<ShoppingCart className="w-5 h-5" />}
          colorClass="bg-blue-50 text-blue-600"
        />
        <StatCard 
          title="Total Orders (This Month)" 
          value={stats.thisMonth.toLocaleString()} 
          trend={stats.lastMonth > 0 ? { value: parseFloat(Math.abs(stats.thisMonthTrend).toFixed(1)), isPositive: stats.thisMonthTrend >= 0, label: 'from last month' } : undefined}
          icon={<ShoppingCart className="w-5 h-5" />}
          colorClass="bg-emerald-50 text-emerald-600"
        />
        <StatCard 
          title="Total Orders (Last Month)" 
          value={stats.lastMonth.toLocaleString()} 
          icon={<ShoppingCart className="w-5 h-5" />}
          colorClass="bg-amber-50 text-amber-600"
        />
        {(dateFilter === 'all' || dateFilter === 'month' || dateFilter === 'lastMonth') && (
          <StatCard 
            title="Projected Orders (This Month)" 
            value={stats.projected.toLocaleString()} 
            trend={{ value: parseFloat(Math.abs(stats.projectedTrend).toFixed(1)), isPositive: stats.projectedTrend >= 0, label: 'vs current' }}
            icon={<ShoppingCart className="w-5 h-5" />}
            colorClass="bg-indigo-50 text-indigo-600"
          />
        )}
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 ${(dateFilter === 'all' || dateFilter === 'month' || dateFilter === 'lastMonth') ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-6`}>
        <StatCard 
          title="Total Revenue" 
          value={stats.lifetimeRev} 
          icon={<TrendingUp className="w-5 h-5" />}
          colorClass="bg-blue-50 text-blue-600"
        />
        <StatCard 
          title="Revenue (This Month)" 
          value={stats.thisMonthRev} 
          trend={stats.lastMonthRev !== '₹0' && stats.lastMonthRev !== '₹0 Lac' && stats.lastMonthRev !== '₹0.00 Lac' ? { value: parseFloat(Math.abs(stats.thisMonthRevTrend).toFixed(1)), isPositive: stats.thisMonthRevTrend >= 0, label: 'from last month' } : undefined}
          icon={<TrendingUp className="w-5 h-5" />}
          colorClass="bg-emerald-50 text-emerald-600"
        />
        <StatCard 
          title="Revenue (Last Month)" 
          value={stats.lastMonthRev} 
          icon={<TrendingUp className="w-5 h-5" />}
          colorClass="bg-amber-50 text-amber-600"
        />
        {(dateFilter === 'all' || dateFilter === 'month' || dateFilter === 'lastMonth') && (
          <StatCard 
            title="Projected Revenue (This Month)" 
            value={stats.projectedRev} 
            trend={{ value: parseFloat(Math.abs(stats.projectedRevTrend).toFixed(1)), isPositive: stats.projectedRevTrend >= 0, label: 'vs current' }}
            icon={<TrendingUp className="w-5 h-5" />}
            colorClass="bg-indigo-50 text-indigo-600"
          />
        )}
      </div>

      {/* Main Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex-1 flex flex-col"
      >
        <div className="bg-white rounded-t-xl border border-slate-200 flex flex-col lg:flex-row items-start lg:items-center justify-between px-4 sm:px-6 py-4 gap-4">
          <h2 className="font-bold text-slate-800">Recent Sales Orders</h2>
          <div className="flex flex-wrap gap-2 items-center w-full lg:w-auto">
            {dateFilter === 'custom' && (
              <div className="flex gap-2 items-center mr-2">
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-2 py-1 border border-slate-300 rounded text-xs font-medium text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-500">to</span>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-2 py-1 border border-slate-300 rounded text-xs font-medium text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
            <select 
              value={salespersonFilter}
              onChange={(e) => setSalespersonFilter(e.target.value)}
              className="px-3 py-1 border border-slate-300 rounded text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Salespersons</option>
              {uniqueSalesPersons.map((sp) => (
                <option key={sp as string} value={sp as string}>{sp}</option>
              ))}
            </select>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1 border border-slate-300 rounded text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="New Order">New Order</option>
              <option value="Purchase">Purchase</option>
              <option value="Production">Production</option>
              <option value="Scheduled Dispatched">Scheduled Dispatched</option>
              <option value="Dispatched">Dispatched</option>
              <option value="Installation Scheduled">Installation Scheduled</option>
              <option value="Installation Complete">Installation Complete</option>
            </select>
            <select 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-1 border border-slate-300 rounded text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Dates</option>
              <option value="day">Today</option>
              <option value="month">This Month</option>
              <option value="lastMonth">Last Month</option>
              <option value="year">This Year</option>
              <option value="custom">Custom Date Range</option>
            </select>
            <button onClick={() => {
              const headers = ['Order ID', 'Customer', 'Amount', 'Date', 'Status'];
              const csvContent = [
                headers.join(','),
                ...filteredOrders.map(order => 
                  `${order.id},"${order.customer}",${order.amount.replace(/,/g, '')},${order.date},${order.status}`
                )
              ].join('\n');
              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement('a');
              const url = URL.createObjectURL(blob);
              link.setAttribute('href', url);
              link.setAttribute('download', 'orders_export.csv');
              link.style.visibility = 'hidden';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }} className="px-3 py-1 border border-slate-300 rounded text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 flex items-center">
              <Download className="w-3.5 h-3.5 mr-1.5 inline" /> Export Excel
            </button>
          </div>
        </div>
        <div className="flex-1 bg-white border-x border-b border-slate-200 overflow-hidden rounded-b-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                <tr>
                  <th className="px-6 py-3 border-b border-slate-200">Order ID</th>
                  <th className="px-6 py-3 border-b border-slate-200">Customer</th>
                  <th className="px-6 py-3 border-b border-slate-200">Date</th>
                  <th className="px-6 py-3 border-b border-slate-200">Delivery Date</th>
                  <th className="px-6 py-3 border-b border-slate-200">Salesperson</th>
                  <th className="px-6 py-3 border-b border-slate-200">Items</th>
                  <th className="px-6 py-3 border-b border-slate-200">Total Amount</th>
                  <th className="px-6 py-3 border-b border-slate-200">Status</th>
                  <th className="px-6 py-3 border-b border-slate-200">Drawing & Checklist</th>
                  <th className="px-6 py-3 border-b border-slate-200 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
                        <p>Loading orders...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-slate-500">
                      No orders found matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map((order, i) => (
                    <motion.tr 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 + i * 0.05 }}
                    key={`${order.docId || order.id || 'k'}-${i}`} 
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedOrder(order)}
                  >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer">{order.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-semibold">{order.customer}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-medium">{order.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-700">
                    {order.details?.deliveryDate ? (
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded text-xs font-extrabold">
                        <Truck className="w-3 h-3 text-amber-600 shrink-0" />
                        {new Date(order.details.deliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-normal italic text-xs">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">{order.details?.employeeName || '—'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">{order.items} units</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-bold">{order.amount}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1 items-start">
                      <Badge variant={
                        order.status === 'Installation Complete' ? 'success' : 
                        order.status === 'Installation Scheduled' ? 'info' :
                        order.status === 'Dispatched' ? 'success' : 
                        order.status === 'Scheduled Dispatched' ? 'indigo' :
                        order.status === 'Production' ? 'warning' :
                        order.status === 'Purchase' ? 'purple' :
                        (order.status === 'New Order' || order.status === 'New') ? 'default' : 'default'
                      }>
                        {order.status === 'New' ? 'New Order' : order.status}
                      </Badge>
                      {order.details?.scheduledReason && (
                        <span className="text-[10px] font-black text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded shadow-2xs">
                          {order.details.scheduledReason}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    {order.details?.drawingFileName && order.details?.checklistFileName ? (
                      <button 
                        onClick={() => { setOrderForDocUpload(order); setIsDocUploadModalOpen(true); }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                        title="Drawing & Checklist attached. Click to view or replace."
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Attached</span>
                      </button>
                    ) : order.details?.drawingFileName ? (
                      <button 
                        onClick={() => { setOrderForDocUpload(order); setIsDocUploadModalOpen(true); }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                        title="Drawing attached, checklist pending. Click to upload checklist."
                      >
                        <Paperclip className="w-3.5 h-3.5 text-amber-600" />
                        <span>Checklist Pending</span>
                      </button>
                    ) : order.details?.checklistFileName ? (
                      <button 
                        onClick={() => { setOrderForDocUpload(order); setIsDocUploadModalOpen(true); }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors cursor-pointer"
                        title="Checklist attached, drawing pending. Click to upload drawing."
                      >
                        <FileCheck2 className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Drawing Pending</span>
                      </button>
                    ) : (
                      <button 
                        onClick={() => { setOrderForDocUpload(order); setIsDocUploadModalOpen(true); }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 border border-slate-200 transition-colors cursor-pointer shadow-2xs"
                        title="Upload Drawing & Customer Checklist"
                      >
                        <Upload className="w-3.5 h-3.5 text-slate-400" />
                        <span>+ Upload Docs</span>
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => setActiveMenuOrderId(activeMenuOrderId === (order.docId || order.id) ? null : (order.docId || order.id))}
                      className="text-slate-500 hover:text-indigo-600 p-1.5 rounded-md hover:bg-indigo-50 transition-colors cursor-pointer"
                      title="Actions & Scheduled Reason"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>

                    {activeMenuOrderId === (order.docId || order.id) && (
                      <div className="absolute right-6 top-12 z-50 w-56 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 text-left text-xs space-y-1 animate-fadeIn">
                        <div className="px-3 py-1.5 border-b border-slate-100 font-bold text-slate-800 flex items-center justify-between">
                          <span>Order Actions #{order.id}</span>
                          <button onClick={() => setActiveMenuOrderId(null)} className="text-slate-400 hover:text-slate-600 p-0.5 rounded">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button 
                          onClick={() => { setActiveMenuOrderId(null); setSelectedOrder(order); }}
                          className="w-full px-3 py-1.5 hover:bg-indigo-50/70 flex items-center gap-2 text-indigo-700 font-bold cursor-pointer transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5 text-indigo-600" /> View Order Details
                        </button>

                        <button 
                          onClick={() => { setActiveMenuOrderId(null); setOrderForDocUpload(order); setIsDocUploadModalOpen(true); }}
                          className="w-full px-3 py-1.5 hover:bg-indigo-50/70 flex items-center gap-2 text-indigo-700 font-bold cursor-pointer transition-colors"
                        >
                          <FileCheck2 className="w-3.5 h-3.5 text-indigo-600" /> Upload Drawing & Checklist
                        </button>

                        <button 
                          onClick={async () => { 
                            setActiveMenuOrderId(null); 
                            const pData = await getPaymentForOrder(order.id, order.docId);
                            generatePaymentReminderPDF(order, pData);
                          }}
                          className="w-full px-3 py-1.5 hover:bg-amber-50 flex items-center gap-2 text-amber-800 font-bold cursor-pointer transition-colors"
                        >
                          <Download className="w-3.5 h-3.5 text-amber-600" /> Payment Reminder Notice
                        </button>

                        <div className="border-t border-slate-100 pt-1">
                          <button 
                            onClick={() => { setActiveMenuOrderId(null); handleDeleteOrder(order.docId || order.id); }}
                            className="w-full px-3 py-1.5 hover:bg-rose-50 text-rose-600 font-semibold flex items-center gap-2 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" /> Delete Order
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                </motion.tr>
              )))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 bg-white flex items-center justify-between text-sm text-slate-500 font-medium border-t border-slate-100">
            <span>
              Showing {totalEntries === 0 ? 0 : startIndex} to {endIndex} of {totalEntries.toLocaleString()} entries
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={validCurrentPage === 1}
                  className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50 transition-colors text-xs font-semibold cursor-pointer"
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - validCurrentPage) <= 2)
                  .reduce((acc: (number | string)[], pageNum, i, arr) => {
                    if (i > 0 && pageNum - (arr[i - 1] as number) > 1) {
                      acc.push('...');
                    }
                    acc.push(pageNum);
                    return acc;
                  }, [])
                  .map((p, idx) =>
                    p === '...' ? (
                      <span key={`dots-${idx}`} className="px-2 py-1 text-slate-400 text-xs">...</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(Number(p))}
                        className={`px-3 py-1 border rounded text-xs font-semibold transition-colors cursor-pointer ${
                          validCurrentPage === p
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={validCurrentPage === totalPages}
                  className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50 transition-colors text-xs font-semibold cursor-pointer"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
