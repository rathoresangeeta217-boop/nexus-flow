import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { Factory, Zap, AlertTriangle, MoreHorizontal, Filter, PlayCircle, Settings } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';

const activeJobs = [
  { id: 'JOB-9402', product: 'Industrial Motor X-1', stage: 'Assembly', completion: 75, priority: 'High', status: 'In Progress' },
  { id: 'JOB-9403', product: 'Sensor Array Base', stage: 'Testing', completion: 90, priority: 'Normal', status: 'In Progress' },
  { id: 'JOB-9404', product: 'Control Panel V2', stage: 'Painting', completion: 40, priority: 'Normal', status: 'Halted' },
  { id: 'JOB-9405', product: 'Heavy Duty Gearbox', stage: 'Milling', completion: 15, priority: 'High', status: 'In Progress' },
  { id: 'JOB-9406', product: 'Power Supply Unit', stage: 'Quality Check', completion: 100, priority: 'Normal', status: 'Completed' },
];

export function ProductionTab({ searchQuery = '' }: { searchQuery?: string }) {
  const filteredJobs = activeJobs.filter(job => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      job.id.toLowerCase().includes(q) ||
      job.product.toLowerCase().includes(q) ||
      job.stage.toLowerCase().includes(q) ||
      job.priority.toLowerCase().includes(q) ||
      job.status.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-8">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Production Floor</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Monitor manufacturing jobs, machinery status, and output quality.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Active Jobs" 
          value="42" 
          trend={{ value: 5.0, isPositive: true }}
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
          title="Completed (Today)" 
          value="18" 
          icon={<Settings className="w-5 h-5" />}
          colorClass="bg-purple-50 text-purple-600"
        />
        <StatCard 
          title="Critical Alerts" 
          value="1" 
          icon={<AlertTriangle className="w-5 h-5" />}
          colorClass="bg-rose-50 text-rose-600"
        />
      </div>
    </div>
  );
}
