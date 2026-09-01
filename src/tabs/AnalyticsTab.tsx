import { motion } from 'motion/react';
import { BarChart3, TrendingUp, Users, DollarSign, Filter, Download } from 'lucide-react';
import { StatCard } from '../components/StatCard';

export function AnalyticsTab() {
  return (
    <div className="space-y-6 pb-8">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Analytics & Reporting</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Key metrics, performance indicators, and comprehensive reports.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Revenue (YTD)" 
          value="₹12.4M" 
          trend={{ value: 14.2, isPositive: true, label: 'vs last year' }}
          icon={<DollarSign className="w-5 h-5" />}
          colorClass="bg-emerald-50 text-emerald-600"
        />
        <StatCard 
          title="Avg Order Value" 
          value="₹8,240" 
          trend={{ value: 5.1, isPositive: true, label: 'vs last month' }}
          icon={<TrendingUp className="w-5 h-5" />}
          colorClass="bg-blue-50 text-blue-600"
        />
        <StatCard 
          title="New Clients" 
          value="48" 
          trend={{ value: 2.4, isPositive: false, label: 'vs last month' }}
          icon={<Users className="w-5 h-5" />}
          colorClass="bg-indigo-50 text-indigo-600"
        />
        <StatCard 
          title="Conversion Rate" 
          value="18.2%" 
          trend={{ value: 4.1, isPositive: true, label: 'vs last month' }}
          icon={<BarChart3 className="w-5 h-5" />}
          colorClass="bg-purple-50 text-purple-600"
        />
      </div>
    </div>
  );
}
