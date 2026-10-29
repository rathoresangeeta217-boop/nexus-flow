import { useState, useEffect, useRef } from 'react';
import { Bell, Search, Menu, Package, X, LogOut, ShieldCheck, ChevronDown } from 'lucide-react';
import { TabName } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToOrders, Order, getOverdueUnconfirmedDispatches } from '../lib/orders';

interface HeaderProps {
  activeTab: TabName;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  onOpenMobileMenu?: () => void;
}

export function Header({ 
  activeTab, 
  searchQuery, 
  onSearchChange,
  onOpenMobileMenu 
}: HeaderProps) {
  const { profile, user, signOut } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = subscribeToOrders(setOrders);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (showMobileSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showMobileSearch]);

  const pendingChallans = orders.filter(o => o.details?.challanApprovalStatus === 'Pending');
  const overdueDispatches = getOverdueUnconfirmedDispatches(orders);
  const totalNotifications = pendingChallans.length + overdueDispatches.length;

  return (
    <header className="bg-white border-b border-slate-200 shrink-0 z-20">
      <div className="h-16 flex items-center justify-between px-3 sm:px-6 lg:px-8">
        {/* Left: Mobile Hamburger & Title */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button 
            type="button"
            onClick={onOpenMobileMenu}
            className="lg:hidden w-11 h-11 -ml-1 flex items-center justify-center text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="min-w-0 flex items-center gap-2 sm:gap-3">
            <div className="lg:hidden flex items-center shrink-0">
              <span className="font-black text-lg tracking-tighter" style={{ fontFamily: 'Arial, sans-serif' }}>
                <span style={{ color: '#dca45a' }}>S</span>
                <span style={{ color: '#c33b3b' }}>R</span>
                <span style={{ color: '#dca45a' }}>K</span>
              </span>
            </div>

            <div className="min-w-0">
              <h1 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900 truncate">
                <span className="hidden sm:inline">{activeTab} Workflow Portal</span>
                <span className="sm:hidden">{activeTab}</span>
              </h1>
              <span className="hidden md:inline-block text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                System Online
              </span>
            </div>
          </div>
        </div>
        
        {/* Right: Search, Notifications, User */}
        <div className="flex items-center gap-1.5 sm:gap-4">
          {/* Desktop Search Bar */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              value={searchQuery || ''}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder={`Search ${activeTab.toLowerCase()}...`}
              className="bg-slate-100 text-sm border-none rounded-full pl-9 pr-8 py-2 w-56 lg:w-72 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400 text-slate-700"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange?.('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Mobile Search Toggle Button */}
          <button
            type="button"
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            className="md:hidden w-11 h-11 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            aria-label="Toggle Search"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Notifications Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button 
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="w-11 h-11 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl relative transition-colors cursor-pointer"
              aria-label="Notifications"
              title={overdueDispatches.length > 0 ? `${overdueDispatches.length} dispatch(es) overdue for confirmation (> 2 days)` : 'Notifications'}
            >
              <Bell className="w-5 h-5" />
              {totalNotifications > 0 && (
                <span className="absolute top-2 right-2 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600 border-2 border-white"></span>
                </span>
              )}
            </button>
              
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <h3 className="font-bold text-slate-800 text-sm">Notifications</h3>
                  <span className="text-xs font-semibold text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded-full">
                    {totalNotifications} Alerts
                  </span>
                </div>
                <div className="max-h-[360px] overflow-y-auto custom-scrollbar">
                  {overdueDispatches.map(order => (
                    <div key={`overdue-${order.id}`} className="p-3.5 border-b border-rose-100 bg-rose-50/70 hover:bg-rose-100/70 transition-colors">
                      <div className="flex gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0 font-bold text-xs">
                          !
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-rose-950">
                            ⚠️ Dispatch Confirmation Overdue (&gt; 2 Days)
                          </p>
                          <p className="text-[11px] text-rose-800 font-bold mt-0.5 truncate">
                            Order #{order.id} • {order.customer}
                          </p>
                          <p className="text-[10px] text-rose-700 mt-0.5">
                            New order scheduling is blocked until dispatch is confirmed.
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {pendingChallans.map(order => {
                    const isPartial = order.details?.challanApprovalType?.includes('partial') || (order.details?.challanPartialSummary?.heldBackItems?.length || 0) > 0;
                    return (
                      <div key={order.docId || order.id} className="p-3.5 border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <div className="flex gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                              <p className="text-xs font-bold text-slate-800">
                                Challan Approval
                              </p>
                              {isPartial && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded">
                                  Partial
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mb-1.5 truncate">Order {order.id} • {order.customer}</p>
                            <button 
                              onClick={() => {
                                window.location.href = `/?approveChallan=${order.id}`;
                              }}
                              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md inline-block transition-colors cursor-pointer"
                            >
                              Review &amp; Approve
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {totalNotifications === 0 && (
                    <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                      <Bell className="w-8 h-8 text-slate-300 mb-2" />
                      <p className="text-xs font-semibold">No pending alerts</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1 sm:p-1.5 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              aria-label="User Account Menu"
            >
              <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs overflow-hidden">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  profile?.displayName?.charAt(0).toUpperCase() || 'U'
                )}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 p-2">
                <div className="p-2.5 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900 truncate">{profile?.displayName || 'Authorized User'}</p>
                  <p className="text-[11px] text-slate-500 capitalize">{profile?.role?.replace('_', ' ') || 'Staff'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    signOut();
                  }}
                  className="w-full mt-1 flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Mobile Search Bar */}
      {showMobileSearch && (
        <div className="md:hidden px-3 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center gap-2 animate-in slide-in-from-top-2 duration-150">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              ref={searchInputRef}
              type="text" 
              value={searchQuery || ''}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder={`Search ${activeTab.toLowerCase()}...`}
              className="w-full bg-white text-sm border border-slate-200 rounded-xl pl-9 pr-8 py-2 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 placeholder:text-slate-400 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange?.('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setShowMobileSearch(false);
              onSearchChange?.('');
            }}
            className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
          >
            Cancel
          </button>
        </div>
      )}
    </header>
  );
}
