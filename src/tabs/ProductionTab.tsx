import React, { useState, useEffect, useMemo } from 'react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { Factory, Zap, AlertTriangle, MoreHorizontal, Filter, PlayCircle, Settings } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';
import { subscribeToOrders, Order } from '../lib/orders';

export function ProductionTab({ searchQuery = '' }: { searchQuery?: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  
  useEffect(() => {
    const unsubscribe = subscribeToOrders((fetchedOrders) => {
      setOrders(fetchedOrders);
    });
    return () => unsubscribe();
  }, []);

  const { activeJobs, completedToday, activeCount } = useMemo(() => {
    const jobs: any[] = [];
    let completedCount = 0;
    
    const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    orders.forEach(order => {
      if (order.status === 'Completed' || order.status === 'Delivered' || order.status === 'Dispatched') {
        if (order.date === todayStr || (order.updatedAt && new Date(order.updatedAt.seconds * 1000).toDateString() === new Date().toDateString())) {
          completedCount++;
        }
        return; // skip fully completed orders from active jobs list
      }
      
      const products = order.details?.products || [];
      products.forEach((p, idx) => {
        if (!p.isDispatched) {
          jobs.push({
            id: `${order.id}-P${idx+1}`,
            orderId: order.id,
            product: p.name,
            qty: p.quantity,
            stage: 'In Production',
            completion: 50,
            priority: 'Normal',
            status: 'In Progress'
          });
        }
      });
    });
    
    return {
      activeJobs: jobs,
      completedToday: completedCount,
      activeCount: jobs.length
    };
  }, [orders]);

  const filteredJobs = activeJobs.filter(job => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      job.id.toLowerCase().includes(q) ||
      job.orderId.toLowerCase().includes(q) ||
      job.product.toLowerCase().includes(q) ||
      job.stage.toLowerCase().includes(q) ||
      job.status.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-8">
      {/* Action Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Production Floor</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Monitor manufacturing jobs, machinery status, and output quality based on real active orders.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Active Products in Prod" 
          value={activeCount.toString()} 
          icon={<Factory className="w-5 h-5" />}
          colorClass="bg-blue-50 text-blue-600"
        />
        
        <StatCard 
          title="Overall Efficiency (OEE)" 
          value="87.4%" 
          trend={{ value: 1.2, isPositive: true }}
          icon={<Zap className="w-5 h-5" />}
          colorClass="bg-emerald-50 text-emerald-600"
        />

        <StatCard 
          title="Orders Completed (Today)" 
          value={completedToday.toString()} 
          icon={<Settings className="w-5 h-5" />}
          colorClass="bg-purple-50 text-purple-600"
        />

        <StatCard 
          title="Critical Alerts" 
          value="0" 
          icon={<AlertTriangle className="w-5 h-5" />}
          colorClass="bg-rose-50 text-rose-600"
        />
      </div>
      
      {/* Main Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex-1 flex flex-col"
      >
        <div className="bg-white rounded-t-xl border border-slate-200 flex flex-col lg:flex-row items-start lg:items-center justify-between px-4 sm:px-6 py-4 gap-4">
          <h2 className="font-bold text-slate-800">Active Production Jobs</h2>
        </div>
        
        <div className="bg-white border-x border-b border-slate-200 rounded-b-xl overflow-hidden flex-1 relative">
          <div className="overflow-x-auto min-h-[500px]">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                <tr>
                  <th className="px-6 py-3 border-b border-slate-200">Job ID / Order ID</th>
                  <th className="px-6 py-3 border-b border-slate-200">Product</th>
                  <th className="px-6 py-3 border-b border-slate-200">Qty</th>
                  <th className="px-6 py-3 border-b border-slate-200">Stage</th>
                  <th className="px-6 py-3 border-b border-slate-200">Status</th>
                  <th className="px-6 py-3 border-b border-slate-200 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500 font-medium">
                      No active production jobs found.
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map((job, i) => (
                    <motion.tr 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.05 * i }}
                      key={job.id} 
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-slate-800">{job.id}</div>
                        <div className="text-xs text-slate-500 font-medium mt-0.5">{job.orderId}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 font-semibold">{job.product}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">{job.qty}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{job.stage}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={job.status === 'Completed' ? 'success' : job.status === 'Halted' ? 'error' : 'indigo'}>
                          {job.status}
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
    </div>
  );
}
