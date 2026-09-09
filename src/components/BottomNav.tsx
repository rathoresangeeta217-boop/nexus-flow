import { ShoppingCart, ShoppingBag, Factory, Truck, CreditCard, BarChart3, Wrench, Users, FileText } from 'lucide-react';
import { TabName } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

const navigation = [
  { name: 'Orders', icon: ShoppingCart },
  { name: 'Purchase', icon: ShoppingBag },
  { name: 'Quotations', icon: FileText },
  { name: 'Production', icon: Factory },
  { name: 'Dispatched', icon: Truck },
  { name: 'Installation', icon: Wrench },
  { name: 'Payments', icon: CreditCard },
  { name: 'Analytics', icon: BarChart3 },
  { name: 'Users', icon: Users },
] as const;

export function BottomNav({ activeTab, setActiveTab }: { activeTab: TabName, setActiveTab: (tab: TabName) => void }) {
  const { profile } = useAuth();

  const filteredNav = navigation.filter(n => {
    if (n.name === 'Installation') return true; 
    if (profile?.role === 'super_admin') return true;
    if (profile?.role === 'admin') return n.name !== 'Analytics' && n.name !== 'Users';
    if (profile?.role === 'sales_executive') {
      return n.name === 'Orders' || n.name === 'Payments' || n.name === 'Dispatched';
    }
    return false;
  });

  return (
    <nav className="flex items-center overflow-x-auto no-scrollbar px-2 py-2 gap-1 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)] bg-white">
      {filteredNav.map((item) => {
        const isActive = activeTab === item.name;
        return (
          <button
            key={item.name}
            onClick={() => setActiveTab(item.name as TabName)}
            className={cn(
              "flex flex-col items-center justify-center min-w-[72px] px-1 py-1.5 rounded-lg transition-colors shrink-0",
              isActive 
                ? "text-indigo-600 bg-indigo-50" 
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            )}
          >
            <item.icon className={cn(
              "w-5 h-5 mb-1",
              isActive ? "text-indigo-600" : "text-slate-400"
            )} />
            <span className={cn(
              "text-[10px] font-medium tracking-wide",
              isActive ? "font-semibold" : ""
            )}>
              {item.name}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
