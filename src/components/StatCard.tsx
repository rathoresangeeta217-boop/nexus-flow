import { ReactNode } from 'react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface StatCardProps {
  title: string;
  value: string | number;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  icon: ReactNode;
  colorClass?: string;
}

export function StatCard({ title, value, trend, icon, colorClass = "bg-indigo-50 text-indigo-600" }: StatCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"
    >
      <div className="flex justify-between items-center mb-1">
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{title}</p>
        <div className={cn("opacity-50", colorClass)}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {trend && (
        <div className={cn(
          "mt-2 text-xs flex items-center",
          trend.isPositive ? "text-green-600" : "text-amber-600"
        )}>
          {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label || 'from last month'}
        </div>
      )}
    </motion.div>
  );
}
