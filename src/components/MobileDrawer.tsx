import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ShoppingCart, 
  ShoppingBag, 
  Factory, 
  Truck, 
  CreditCard, 
  BarChart3, 
  Wrench, 
  Users, 
  FileText, 
  Boxes, 
  Package, 
  LogOut, 
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { TabName } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { Order, getOverdueUnconfirmedDispatches } from '../lib/orders';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: TabName;
  setActiveTab: (tab: TabName) => void;
  orders?: Order[];
}

const navigation = [
  { name: 'Orders', icon: ShoppingCart, section: 'Operations' },
  { name: 'Purchase', icon: ShoppingBag, section: 'Operations' },
  { name: 'Inventory', icon: Boxes, section: 'Operations' },
  { name: 'Products', icon: Package, section: 'Operations' },
  { name: 'Quotations', icon: FileText, section: 'Operations' },
  { name: 'Production', icon: Factory, section: 'Operations' },
  { name: 'Dispatched', icon: Truck, section: 'Operations' },
  { name: 'Installation', icon: Wrench, section: 'Operations' },
  { name: 'Payments', icon: CreditCard, section: 'Operations' },
  { name: 'Analytics', icon: BarChart3, section: 'Analytics' },
] as const;

export function MobileDrawer({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  orders = []
}: MobileDrawerProps) {
  const { user, profile, signOut } = useAuth();

  const overdueCount = orders.length > 0 ? getOverdueUnconfirmedDispatches(orders).length : 0;
  const pendingChallanCount = orders.filter(o => o.details?.challanApprovalStatus === 'Pending').length;

  const handleSelectTab = (tab: TabName) => {
    setActiveTab(tab);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
          />

          {/* Drawer content */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="fixed inset-y-0 left-0 w-[85%] max-w-sm bg-slate-900 text-white shadow-2xl flex flex-col z-10"
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-3">
                <div className="font-black text-2xl tracking-tighter" style={{ fontFamily: 'Arial, sans-serif' }}>
                  <span style={{ color: '#dca45a' }}>S</span>
                  <span style={{ color: '#c33b3b' }}>R</span>
                  <span style={{ color: '#dca45a' }}>K</span>
                </div>
                <div>
                  <span className="text-white font-bold text-base tracking-tight uppercase block leading-none">Modular</span>
                  <span className="text-[10px] text-slate-400 font-medium">Enterprise Portal</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                aria-label="Close Navigation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Profile Card */}
            <div className="p-4 bg-slate-950/80 border-b border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden shadow-inner ring-2 ring-indigo-400/30">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    profile?.displayName?.charAt(0).toUpperCase() || 'U'
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white truncate">{profile?.displayName || 'Authorized User'}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="text-[11px] text-slate-400 capitalize font-medium truncate">
                      {profile?.role?.replace('_', ' ') || 'Staff'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 custom-scrollbar">
              {['Operations', 'Analytics'].map((section) => {
                const filteredNav = navigation.filter(n => {
                  if (n.section !== section) return false;
                  if (n.name === 'Installation' || n.name === 'Inventory') return true;
                  if (profile?.role === 'super_admin') return true;
                  if (profile?.role === 'admin') return n.name !== 'Analytics';
                  if (profile?.role === 'sales_executive') {
                    return n.name === 'Orders' || n.name === 'Payments' || n.name === 'Dispatched';
                  }
                  return false;
                });

                const showUsers = section === 'Analytics' && profile?.role === 'super_admin';

                if (filteredNav.length === 0 && !showUsers) return null;

                return (
                  <div key={section} className="space-y-1">
                    <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest px-3 mb-2 flex items-center justify-between">
                      <span>{section}</span>
                    </div>

                    {filteredNav.map((item) => {
                      const isActive = activeTab === item.name;
                      const hasAlert = item.name === 'Orders' && overdueCount > 0;
                      const hasPendingChallans = item.name === 'Dispatched' && pendingChallanCount > 0;

                      return (
                        <button
                          key={item.name}
                          onClick={() => handleSelectTab(item.name as TabName)}
                          className={cn(
                            "w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition-all text-sm font-semibold cursor-pointer",
                            isActive 
                              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" 
                              : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <item.icon className={cn(
                              "w-5 h-5 shrink-0",
                              isActive ? "text-white" : "text-slate-400"
                            )} />
                            <span>{item.name}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {hasAlert && (
                              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-rose-500 text-white text-[10px] font-bold rounded-md">
                                <AlertTriangle className="w-3 h-3" />
                                {overdueCount}
                              </span>
                            )}
                            {hasPendingChallans && (
                              <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-md">
                                {pendingChallanCount}
                              </span>
                            )}
                            <ChevronRight className={cn(
                              "w-4 h-4",
                              isActive ? "text-indigo-200" : "text-slate-600"
                            )} />
                          </div>
                        </button>
                      );
                    })}

                    {showUsers && (
                      <button
                        onClick={() => handleSelectTab('Users' as TabName)}
                        className={cn(
                          "w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition-all text-sm font-semibold cursor-pointer",
                          activeTab === 'Users' 
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" 
                            : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Users className={cn(
                            "w-5 h-5 shrink-0",
                            activeTab === 'Users' ? "text-white" : "text-slate-400"
                          )} />
                          <span>Users Management</span>
                        </div>
                        <ChevronRight className={cn(
                          "w-4 h-4",
                          activeTab === 'Users' ? "text-indigo-200" : "text-slate-600"
                        )} />
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Public Storefront Link */}
              <div className="pt-2">
                <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest px-3 mb-2">
                  Public Showroom
                </div>
                <button
                  onClick={() => handleSelectTab('Storefront')}
                  className={cn(
                    "w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition-all text-sm font-semibold cursor-pointer",
                    activeTab === 'Storefront'
                      ? "bg-indigo-600 text-white shadow-md"
                      : "text-indigo-300 bg-indigo-950/40 border border-indigo-800/40 hover:bg-indigo-900/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <ExternalLink className="w-5 h-5 shrink-0" />
                    <span>View Storefront</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-70" />
                </button>
              </div>
            </div>

            {/* Footer with Sign Out */}
            <div className="p-4 bg-slate-950 border-t border-slate-800">
              <button
                onClick={() => {
                  onClose();
                  signOut();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-rose-950/50 text-slate-300 hover:text-rose-300 border border-slate-700/60 hover:border-rose-800/50 text-sm font-semibold transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
