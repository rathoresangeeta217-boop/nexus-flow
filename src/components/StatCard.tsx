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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-2xs hover:shadow-sm transition-shadow flex flex-col justify-between"
    >
      <div>
        <div className="flex justify-between items-start gap-1.5 mb-1">
          <p className="text-slate-500 text-[10px] sm:text-xs font-semibold uppercase tracking-wider line-clamp-1 flex-1">{title}</p>
          <div className={cn("p-1 sm:p-1.5 rounded-lg opacity-80 shrink-0", colorClass)}>
            {icon}
          </div>
        </div>
        <p className="text-base sm:text-xl md:text-2xl font-extrabold text-slate-900 truncate">{value}</p>
      </div>

      {trend && (
        <div className={cn(
          "mt-1.5 sm:mt-2 text-[10px] sm:text-xs font-semibold flex items-center truncate",
          trend.isPositive ? "text-emerald-600" : "text-amber-600"
        )}>
          <span className="mr-0.5">{trend.isPositive ? '↑' : '↓'}</span>
          <span>{Math.abs(trend.value)}%</span>
          <span className="text-slate-400 font-normal ml-1 hidden xs:inline truncate">{trend.label || 'vs last month'}</span>
        </div>
      )}
    </motion.div>
  );
}
