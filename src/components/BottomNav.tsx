import { ShoppingCart, Truck, CreditCard, Wrench, Menu, Factory, Boxes } from 'lucide-react';
import { TabName } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

interface BottomNavProps {
  activeTab: TabName;
  setActiveTab: (tab: TabName) => void;
  onOpenMenu?: () => void;
}

export function BottomNav({ activeTab, setActiveTab, onOpenMenu }: BottomNavProps) {
  const { profile } = useAuth();

  // Provide high-frequency quick-access tabs + a "More" drawer trigger
  let primaryTabs: { name: TabName; icon: any; label: string }[] = [];

  if (profile?.role === 'employee') {
    primaryTabs = [
      { name: 'Installation', icon: Wrench, label: 'Install' },
      { name: 'Inventory', icon: Boxes, label: 'Inventory' },
    ];
  } else if (profile?.role === 'sales_executive') {
    primaryTabs = [
      { name: 'Orders', icon: ShoppingCart, label: 'Orders' },
      { name: 'Dispatched', icon: Truck, label: 'Dispatched' },
      { name: 'Payments', icon: CreditCard, label: 'Payments' },
    ];
  } else {
    // Super admin & admin
    primaryTabs = [
      { name: 'Orders', icon: ShoppingCart, label: 'Orders' },
      { name: 'Production', icon: Factory, label: 'Production' },
      { name: 'Dispatched', icon: Truck, label: 'Dispatched' },
      { name: 'Payments', icon: CreditCard, label: 'Payments' },
    ];
  }

  const isMoreActive = !primaryTabs.some(t => t.name === activeTab);

  return (
    <nav className="bg-white border-t border-slate-200 px-2 py-1.5 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] flex items-center justify-around safe-area-pb">
      {primaryTabs.map((item) => {
        const isActive = activeTab === item.name;
        return (
          <button
            key={item.name}
            type="button"
            onClick={() => setActiveTab(item.name)}
            className={cn(
              "flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all cursor-pointer min-h-[44px]",
              isActive 
                ? "text-indigo-600 font-bold" 
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            <div className={cn(
              "p-1 rounded-lg transition-transform",
              isActive ? "bg-indigo-50 scale-105" : ""
            )}>
              <item.icon className={cn(
                "w-5 h-5",
                isActive ? "text-indigo-600 stroke-[2.2]" : "text-slate-500"
              )} />
            </div>
            <span className={cn(
              "text-[10px] tracking-tight mt-0.5",
              isActive ? "font-bold text-indigo-700" : "font-medium text-slate-500"
            )}>
              {item.label}
            </span>
          </button>
        );
      })}

      {/* "More / Menu" Button that triggers full Mobile Drawer */}
      <button
        type="button"
        onClick={onOpenMenu}
        className={cn(
          "flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all cursor-pointer min-h-[44px]",
          isMoreActive 
            ? "text-indigo-600 font-bold" 
            : "text-slate-500 hover:text-slate-800"
        )}
      >
        <div className={cn(
          "p-1 rounded-lg transition-transform",
          isMoreActive ? "bg-indigo-50 scale-105" : ""
        )}>
          <Menu className={cn(
            "w-5 h-5",
            isMoreActive ? "text-indigo-600 stroke-[2.2]" : "text-slate-500"
          )} />
        </div>
        <span className={cn(
          "text-[10px] tracking-tight mt-0.5",
          isMoreActive ? "font-bold text-indigo-700" : "font-medium text-slate-500"
        )}>
          {isMoreActive ? activeTab : 'More'}
        </span>
      </button>
    </nav>
  );
}
