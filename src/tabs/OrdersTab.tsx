import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShoppingCart, TrendingUp, Clock, CheckCircle2, MoreHorizontal, Filter, Plus, FileText, Download, Loader2, X } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';
import { NewOrderModal } from '../components/NewOrderModal';
import { OrderDetailsModal } from '../components/OrderDetailsModal';
import { subscribeToOrders, saveOrder, deleteOrder, Order } from '../lib/orders';

import { saveOrderFiles } from '../lib/fileStorage';

export function OrdersTab({ searchQuery = '' }: { searchQuery?: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | undefined>();
  const [uploadedFileData, setUploadedFileData] = useState<string | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToOrders((fetchedOrders) => {
      setOrders(fetchedOrders);
      setIsLoading(false);
      setSelectedOrder(current => {
        if (!current) return null;
        return fetchedOrders.find(o => o.id === current.id || o.docId === current.docId) || current;
      });
    });
    
  
  return () => unsubscribe();
  }, []);

  const handleNewOrderClick = () => {
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
    // Extract file data to avoid Firebase size limits
    const { poFileData, drawingFileData, ...orderDetails } = newOrder;

    const orderData = {
      id: `ORD-2026-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      customer: orderDetails.companyName || orderDetails.customerName || 'Unknown Customer',
      amount: orderDetails.totalAmount || '₹0.00',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'New Order',
      items: Number(orderDetails.totalItems) || 0,
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
        drawingFileData: drawingFileData
      });
      
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

  const filteredOrders = orders.filter(order => {
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
      
      if (order.createdAt?.seconds) {
        orderDate = new Date(order.createdAt.seconds * 1000);
      } else if (order.date) {
        orderDate = new Date(order.date);
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
  });

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
      if (order.createdAt?.seconds) {
        orderDate = new Date(order.createdAt.seconds * 1000);
      } else if (order.date) {
        orderDate = new Date(order.date);
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
                  <th className="px-6 py-3 border-b border-slate-200">Salesperson</th>
                  <th className="px-6 py-3 border-b border-slate-200">Items</th>
                  <th className="px-6 py-3 border-b border-slate-200">Total Amount</th>
                  <th className="px-6 py-3 border-b border-slate-200">Status</th>
                  <th className="px-6 py-3 border-b border-slate-200 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
                        <p>Loading orders...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                      No orders found matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order, i) => (
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">{order.details?.employeeName || '—'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">{order.items} units</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-bold">{order.amount}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
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
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-md hover:bg-indigo-50 transition-colors">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </td>
                </motion.tr>
              )))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 bg-white flex items-center justify-between text-sm text-slate-500 font-medium">
            <span>Showing 1 to 6 of 1,248 entries</span>
            <div className="flex gap-1">
              <button className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50 transition-colors" disabled>Prev</button>
              <button className="px-3 py-1 border border-indigo-600 rounded bg-indigo-50 text-indigo-700 font-semibold shadow-sm">1</button>
              <button className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 transition-colors">2</button>
              <button className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 transition-colors">3</button>
              <span className="px-2 py-1 text-slate-400">...</span>
              <button className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 transition-colors">Next</button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
