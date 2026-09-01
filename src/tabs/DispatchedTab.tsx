import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Truck, MapPin, PackageCheck, AlertCircle, MoreHorizontal, Filter, Package } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';
import { subscribeToOrders, Order } from '../lib/orders';
import { DispatchView } from '../components/DispatchView';

export function DispatchedTab({ searchQuery = '' }: { searchQuery?: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeSection, setActiveSection] = useState<'pending' | 'scheduled' | 'history'>('pending');

  useEffect(() => {
    const unsubscribe = subscribeToOrders((fetchedOrders) => {
      setOrders(fetchedOrders);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const openDispatchView = (order: Order) => {
    setSelectedOrder(order);
  };

  // Stats
  
  const pendingStatuses = ['New', 'Processing', 'Pending'];
  const scheduledStatuses = ['Scheduled Dispatched', 'Shipped', 'Out for Delivery'];
  const historyStatuses = ['Dispatched', 'Delivered', 'Completed'];

  const displayedOrders = orders.filter(o => {
    if (activeSection === 'pending') {
      if (!pendingStatuses.includes(o.status)) return false;
    } else if (activeSection === 'scheduled') {
      if (!scheduledStatuses.includes(o.status)) return false;
    } else {
      if (!historyStatuses.includes(o.status)) return false;
    }
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesId = o.id?.toLowerCase().includes(q) || o.docId?.toLowerCase().includes(q);
      const matchesCustomer = o.customer?.toLowerCase().includes(q);
      const matchesProject = o.project?.toLowerCase().includes(q);
      if (!matchesId && !matchesCustomer && !matchesProject) return false;
    }
    return true;
  });

  const dispatchedOrders = orders.filter(o => o.status === 'Out for Delivery' || o.status === 'Delivered');
  const deliveredCount = orders.filter(o => o.status === 'Delivered').length;

  return (
    <AnimatePresence mode="wait">
      {selectedOrder ? (
        <motion.div key="dispatch-view">
          <DispatchView 
            order={selectedOrder} 
            onBack={() => setSelectedOrder(null)} 
          />
        </motion.div>
      ) : (
        <motion.div 
          key="list-view"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-6 pb-8"
        >
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">Logistics & Dispatch</h2>
              <p className="text-sm text-slate-500 font-medium mt-1">Track outgoing shipments and scheduled dispatches.</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              title="Active Shipments" 
              value={dispatchedOrders.length.toString()} 
              icon={<Truck className="w-5 h-5" />}
              colorClass="bg-blue-50 text-blue-600"
            />
            <StatCard 
              title="Total Orders" 
              value={orders.length.toString()} 
              icon={<Package className="w-5 h-5" />}
              colorClass="bg-emerald-50 text-emerald-600"
            />
            <StatCard 
              title="Delivered" 
              value={deliveredCount.toString()} 
              icon={<PackageCheck className="w-5 h-5" />}
              colorClass="bg-indigo-50 text-indigo-600"
            />
          </div>

          {/* Main Table */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex-1 flex flex-col"
          >
            
          {/* Section Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-lg w-full max-w-xl">
            <button
              onClick={() => setActiveSection('pending')}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
                activeSection === 'pending' 
                  ? 'bg-white text-indigo-700 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Pending Dispatch
            </button>
            <button
              onClick={() => setActiveSection('scheduled')}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
                activeSection === 'scheduled' 
                  ? 'bg-white text-indigo-700 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Scheduled
            </button>
            <button
              onClick={() => setActiveSection('history')}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
                activeSection === 'history' 
                  ? 'bg-white text-indigo-700 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              History
            </button>
          </div>

            <div className="bg-white rounded-t-xl border border-slate-200 flex items-center justify-between px-6 py-4 mt-4">
              <h2 className="font-bold text-slate-800">{activeSection === 'pending' ? 'Pending Dispatch' : activeSection === 'scheduled' ? 'Scheduled Dispatches' : 'Dispatch History'}</h2>
              <div className="flex gap-2">
                <button className="px-3 py-1 border border-slate-300 rounded text-xs font-medium text-slate-600 bg-white hover:bg-slate-50">
                  <Filter className="w-3.5 h-3.5 mr-1.5 inline" /> Filters
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
                      <th className="px-6 py-3 border-b border-slate-200">Items</th>
                      <th className="px-6 py-3 border-b border-slate-200">Amount</th>
                      <th className="px-6 py-3 border-b border-slate-200">Status</th>
                      <th className="px-6 py-3 border-b border-slate-200 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoading ? (
                      <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500">Loading orders...</td></tr>
                    ) : displayedOrders.length === 0 ? (
                      <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500">No orders found.</td></tr>
                    ) : (
                      displayedOrders.map((order, i) => (
                        <motion.tr 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.05 * i }}
                          key={`${order.docId || order.id || "k"}-${i}`} 
                          className="hover:bg-slate-50 transition-colors cursor-pointer"
                          onClick={() => openDispatchView(order)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600 hover:text-indigo-800">{order.id}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-semibold">{order.customer}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{order.date}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{order.items} Items</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-semibold">{order.amount}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant={
                              order.status === 'Delivered' ? 'success' : 
                              order.status === 'Out for Delivery' ? 'purple' :
                              order.status === 'Scheduled Dispatched' ? 'indigo' :
                      order.status === 'Dispatched' ? 'success' : 
                              order.status === 'New' ? 'info' : 'warning'
                            }>
                              {order.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-md hover:bg-indigo-50 transition-colors">
                              <MoreHorizontal className="w-5 h-5" />
                            </button>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
