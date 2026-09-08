const fs = require('fs');

const code = `import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { BarChart3, TrendingUp, Users, DollarSign } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { subscribeToOrders, Order } from '../lib/orders';

export function AnalyticsTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  
  useEffect(() => {
    const unsubscribe = subscribeToOrders((fetchedOrders) => {
      setOrders(fetchedOrders);
    });
    return () => unsubscribe();
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    let totalRevenueYTD = 0;
    let totalRevenueLastYear = 0;
    let thisMonthRevenue = 0;
    let lastMonthRevenue = 0;
    let orderCountThisMonth = 0;
    let orderCountLastMonth = 0;
    
    const uniqueClientsThisMonth = new Set<string>();
    const uniqueClientsLastMonth = new Set<string>();

    orders.forEach(order => {
      let orderDate = now;
      if (order.createdAt?.seconds) {
        orderDate = new Date(order.createdAt.seconds * 1000);
      } else if (order.date) {
        orderDate = new Date(order.date);
      }

      // Safe parse amount
      const amountStr = String(order.amount || order.details?.totalAmount || '0').replace(/[^0-9.]/g, '');
      const amount = parseFloat(amountStr) || 0;
      const client = (order.customer || '').trim().toLowerCase();

      if (orderDate.getFullYear() === currentYear) {
        totalRevenueYTD += amount;
      } else if (orderDate.getFullYear() === currentYear - 1) {
        totalRevenueLastYear += amount;
      }

      if (orderDate.getFullYear() === currentYear && orderDate.getMonth() === currentMonth) {
        thisMonthRevenue += amount;
        orderCountThisMonth++;
        if (client) uniqueClientsThisMonth.add(client);
      } else if (
        (currentMonth > 0 && orderDate.getFullYear() === currentYear && orderDate.getMonth() === currentMonth - 1) ||
        (currentMonth === 0 && orderDate.getFullYear() === currentYear - 1 && orderDate.getMonth() === 11)
      ) {
        lastMonthRevenue += amount;
        orderCountLastMonth++;
        if (client) uniqueClientsLastMonth.add(client);
      }
    });

    const revenueTrend = totalRevenueLastYear > 0 ? ((totalRevenueYTD - totalRevenueLastYear) / totalRevenueLastYear) * 100 : 0;
    
    const avgOrderValueThisMonth = orderCountThisMonth > 0 ? thisMonthRevenue / orderCountThisMonth : 0;
    const avgOrderValueLastMonth = orderCountLastMonth > 0 ? lastMonthRevenue / orderCountLastMonth : 0;
    const avgOrderTrend = avgOrderValueLastMonth > 0 ? ((avgOrderValueThisMonth - avgOrderValueLastMonth) / avgOrderValueLastMonth) * 100 : 0;
    
    const newClientsTrend = uniqueClientsLastMonth.size > 0 ? ((uniqueClientsThisMonth.size - uniqueClientsLastMonth.size) / uniqueClientsLastMonth.size) * 100 : 0;
    
    // Format YTD revenue
    const formatCurrency = (val: number) => {
      if (val >= 10000000) return \`₹\${(val / 10000000).toFixed(2)}Cr\`;
      if (val >= 100000) return \`₹\${(val / 100000).toFixed(2)}L\`;
      return \`₹\${val.toLocaleString('en-IN')}\`;
    };

    return {
      revenueYTD: formatCurrency(totalRevenueYTD),
      revenueTrend,
      avgOrderValue: formatCurrency(avgOrderValueThisMonth),
      avgOrderTrend,
      newClients: uniqueClientsThisMonth.size.toString(),
      newClientsTrend,
      totalOrders: orderCountThisMonth.toString(),
      ordersTrend: orderCountLastMonth > 0 ? ((orderCountThisMonth - orderCountLastMonth) / orderCountLastMonth) * 100 : 0
    };
  }, [orders]);

  return (
    <div className="space-y-6 pb-8">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Analytics & Reporting</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Key metrics, performance indicators, and comprehensive reports based on real order data.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Revenue (YTD)" 
          value={stats.revenueYTD} 
          trend={stats.revenueTrend !== 0 ? { value: parseFloat(Math.abs(stats.revenueTrend).toFixed(1)), isPositive: stats.revenueTrend > 0, label: 'vs last year' } : undefined}
          icon={<DollarSign className="w-5 h-5" />}
          colorClass="bg-emerald-50 text-emerald-600"
        />
        
        <StatCard 
          title="Avg Order Value (This Month)" 
          value={stats.avgOrderValue} 
          trend={stats.avgOrderTrend !== 0 ? { value: parseFloat(Math.abs(stats.avgOrderTrend).toFixed(1)), isPositive: stats.avgOrderTrend > 0, label: 'vs last month' } : undefined}
          icon={<TrendingUp className="w-5 h-5" />}
          colorClass="bg-blue-50 text-blue-600"
        />

        <StatCard 
          title="Active Clients (This Month)" 
          value={stats.newClients} 
          trend={stats.newClientsTrend !== 0 ? { value: parseFloat(Math.abs(stats.newClientsTrend).toFixed(1)), isPositive: stats.newClientsTrend > 0, label: 'vs last month' } : undefined}
          icon={<Users className="w-5 h-5" />}
          colorClass="bg-indigo-50 text-indigo-600"
        />

        <StatCard 
          title="Orders (This Month)" 
          value={stats.totalOrders} 
          trend={stats.ordersTrend !== 0 ? { value: parseFloat(Math.abs(stats.ordersTrend).toFixed(1)), isPositive: stats.ordersTrend > 0, label: 'vs last month' } : undefined}
          icon={<BarChart3 className="w-5 h-5" />}
          colorClass="bg-purple-50 text-purple-600"
        />
      </div>
    </div>
  );
}
`;
fs.writeFileSync('src/tabs/AnalyticsTab.tsx', code);
