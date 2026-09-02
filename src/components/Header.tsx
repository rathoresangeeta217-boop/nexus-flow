import { useState, useEffect, useRef } from 'react';
import { Bell, Search, UserCircle, Menu, Command, Package } from 'lucide-react';
import { TabName } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToOrders, Order } from '../lib/orders';

export function Header({ activeTab, searchQuery, onSearchChange }: { activeTab: TabName, searchQuery?: string, onSearchChange?: (val: string) => void }) {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile?.role === 'super_admin') {
      const unsubscribe = subscribeToOrders(setOrders);
      return () => unsubscribe();
    }
  }, [profile?.role]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pendingChallans = orders.filter(o => o.details?.challanApprovalStatus === 'Pending');

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-20">
      <div className="flex items-center gap-4">
        <button className="lg:hidden p-2 -ml-2 mr-2 text-slate-500 hover:text-slate-700">
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-slate-800 hidden sm:block">
          {activeTab} Workflow Portal
        </h1>
        <span className="hidden sm:inline-block px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded">System Online</span>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="relative hidden md:block group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            value={searchQuery || ''}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder={`Search ${activeTab.toLowerCase()}...`}
            className="bg-slate-100 text-sm border-none rounded-full pl-9 pr-4 py-1.5 w-64 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400 text-slate-700"
          />
        </div>

        {profile?.role === 'super_admin' && (
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-full relative transition-colors"
            >
              <Bell className="w-5 h-5" />
              {pendingChallans.length > 0 && (
                <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
              )}
            </button>
            
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h3 className="font-semibold text-slate-800">Notifications</h3>
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{pendingChallans.length} New</span>
                </div>
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                  {pendingChallans.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 flex flex-col items-center">
                      <Bell className="w-8 h-8 text-slate-300 mb-2" />
                      <p className="text-sm">No pending challans</p>
                    </div>
                  ) : (
                    pendingChallans.map(order => (
                      <div key={order.docId || order.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors group">
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-800 mb-0.5">Challan Approval Required</p>
                            <p className="text-xs text-slate-500 mb-2">Order {order.id} from {order.customer}</p>
                            <button 
                              onClick={() => {
                                window.location.href = `/?approveChallan=${order.id}`;
                              }}
                              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-md inline-block transition-colors"
                            >
                              Review Challan
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
