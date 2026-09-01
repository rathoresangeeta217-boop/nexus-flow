import { motion } from 'motion/react';
import { 
  ShoppingCart, 
  ShoppingBag, 
  Factory, 
  Truck, 
  CreditCard,
  Settings,
  HelpCircle,
  Hexagon,
  BarChart3
} from 'lucide-react';
import { TabName } from '../types';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { Users, LogOut } from 'lucide-react';

const navigation = [
  { name: 'Orders', icon: ShoppingCart, section: 'Operations' },
  { name: 'Purchase', icon: ShoppingBag, section: 'Operations' },
  { name: 'Production', icon: Factory, section: 'Operations' },
  { name: 'Dispatched', icon: Truck, section: 'Operations' },
  { name: 'Payments', icon: CreditCard, section: 'Operations' },
  { name: 'Analytics', icon: BarChart3, section: 'Analytics' },
] as const;

export function Sidebar({ activeTab, setActiveTab }: { activeTab: TabName, setActiveTab: (tab: TabName) => void }) {
  const { user, profile, signOut } = useAuth();
  return (
    <div className="w-64 bg-slate-900 flex flex-col h-full shrink-0 shadow-xl">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="font-black text-3xl tracking-tighter" style={{ fontFamily: 'Arial, sans-serif' }}>
            <span style={{ color: '#dca45a' }}>S</span>
            <span style={{ color: '#c33b3b' }}>R</span>
            <span style={{ color: '#dca45a' }}>K</span>
          </div>
          <span className="text-white font-bold text-lg tracking-tight uppercase">Modular</span>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
        {['Operations', 'Analytics'].map((section) => (
          <div key={section} className="mb-4 first:mt-0 mt-6">
            <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest px-3 mb-2">
              {section}
            </div>
            {navigation.filter(n => n.section === section).map((item) => {
              const isActive = activeTab === item.name;
              return (
                <button
                  key={item.name}
                  onClick={() => setActiveTab(item.name as TabName)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 transition-colors group",
                    isActive 
                      ? "bg-indigo-600/10 border-r-4 border-indigo-500 text-indigo-400 font-medium" 
                      : "text-slate-400 hover:bg-slate-800 font-medium"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="hidden"
                      initial={false}
                    />
                  )}
                  <item.icon className={cn(
                    "w-5 h-5 flex-shrink-0 transition-colors opacity-80",
                    isActive ? "text-indigo-400" : "text-slate-400"
                  )} />
                  <span>{item.name}</span>
                </button>
              );
            })}
            
            {section === 'Analytics' && profile?.role === 'admin' && (
               <button
                  onClick={() => setActiveTab('Users' as TabName)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 transition-colors group mt-1",
                    activeTab === 'Users' 
                      ? "bg-indigo-600/10 border-r-4 border-indigo-500 text-indigo-400 font-medium" 
                      : "text-slate-400 hover:bg-slate-800 font-medium"
                  )}
                >
                  <Users className={cn(
                    "w-5 h-5 flex-shrink-0 transition-colors opacity-80",
                    activeTab === 'Users' ? "text-indigo-400" : "text-slate-400"
                  )} />
                  <span>Users</span>
                </button>
            )}
          </div>
        ))}
      </nav>

      <div className="p-4 bg-slate-950 border-t border-slate-900">
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors group cursor-pointer">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white shrink-0 font-bold overflow-hidden">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                profile?.displayName?.charAt(0).toUpperCase() || 'U'
              )}
            </div>
            <div className="overflow-hidden text-left flex-1">
              <p className="text-xs text-white font-medium truncate">{profile?.displayName}</p>
              <p className="text-[10px] text-slate-400 truncate capitalize">{profile?.role}</p>
            </div>
          </div>
          <button 
            onClick={signOut}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
