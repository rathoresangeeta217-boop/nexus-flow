
import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { Header } from './components/Header';
import { OrdersTab } from './tabs/OrdersTab';
import { PurchaseTab } from './tabs/PurchaseTab';
import { ProductsTab } from './tabs/ProductsTab';
import { QuotationsTab } from './tabs/QuotationsTab';
import { StorefrontTab } from './tabs/StorefrontTab';
import { ProductionTab } from './tabs/ProductionTab';
import { DispatchedTab } from './tabs/DispatchedTab';
import { InstallationTab } from './tabs/InstallationTab';
import { PaymentsTab } from './tabs/PaymentsTab';
import { AnalyticsTab } from './tabs/AnalyticsTab';
import { VendorQuoteForm } from './components/VendorQuoteForm';
import { InventoryTab } from './tabs/InventoryTab';
import { TabName } from './types';
import { AdminApprovalView } from './components/AdminApprovalView';
import { useAuth } from './contexts/AuthContext';
import { AuthView } from './components/AuthView';
import { UsersTab } from './tabs/UsersTab';

export default function App() {
  const { user, profile, loading, authError } = useAuth();
  const [activeTab, setActiveTab] = useState<TabName>(() => {
    const path = window.location.pathname;
    if (path.startsWith('/admin')) return 'Products';
    return 'Storefront';
  });
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [approvalOrderId, setApprovalOrderId] = useState<string | null>(null);
  

  useEffect(() => {
    const handleNavigate = (e: CustomEvent) => {
      const { tab, search } = e.detail;
      setActiveTab(tab);
      
      setTimeout(() => setSearchQuery(search || ''), 10);
    };
    window.addEventListener('navigate', handleNavigate as EventListener);
    return () => window.removeEventListener('navigate', handleNavigate as EventListener);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qId = params.get('quoteId');
    const aId = params.get('approveChallan');
    if (qId) {
      setQuoteId(qId);
    }
    if (aId) {
      setApprovalOrderId(aId);
    }
  }, []);

  // Reset search query when changing tabs
  useEffect(() => {
    setSearchQuery('');
  }, [activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg animate-pulse mb-3">
          <div className="w-6 h-6 rounded-lg bg-white transform rotate-45" />
        </div>
        <p className="text-slate-700 font-bold text-sm tracking-wide">SRK Modular Furniture co.</p>
        <span className="text-xs text-slate-400 mt-1">Starting showroom visualizer...</span>
      </div>
    );
  }

  // Only gate internal admin tabs behind authentication; Storefront is accessible
  if (activeTab !== 'Storefront' && (!user || !profile || !profile.isActive)) {
    return <AuthView />;
  }

  if (approvalOrderId) {
    return <AdminApprovalView orderId={approvalOrderId} />;
  }

  if (quoteId) {
    return <VendorQuoteForm quoteId={quoteId} />;
  }

  // Handle active tab fallback if a role doesn't have access to current tab
  let currentTab = activeTab;
  if (profile) {
    if (profile.role === 'employee' && activeTab !== 'Installation' && activeTab !== 'Storefront') {
       currentTab = 'Installation';
    } else if (profile.role === 'sales_executive' && (activeTab === 'Purchase' || activeTab === 'Inventory' || activeTab === 'Production' || activeTab === 'Analytics' || activeTab === 'Users')) { 
       currentTab = 'Orders';
    } else if (profile.role === 'admin' && (activeTab === 'Analytics' || activeTab === 'Users')) { 
       currentTab = 'Orders';
    }
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {currentTab !== 'Storefront' && (
        <div className="hidden lg:flex shrink-0">
          <Sidebar activeTab={currentTab} setActiveTab={setActiveTab} />
        </div>
      )}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {currentTab !== 'Storefront' && <Header activeTab={currentTab} searchQuery={searchQuery} onSearchChange={setSearchQuery} />}
        <main className={`flex-1 overflow-y-auto ${currentTab === 'Storefront' ? 'p-0 pb-12' : 'p-4 md:p-6 lg:p-8 pb-24 lg:pb-8'} custom-scrollbar`}>
          <div className={`${currentTab === 'Storefront' ? 'w-full' : 'max-w-[1600px] mx-auto'} min-h-full`}>
            {currentTab === 'Orders' && (profile?.role === 'super_admin' || profile?.role === 'admin' || profile?.role === 'sales_executive') && <OrdersTab searchQuery={searchQuery} />}
            {currentTab === 'Purchase' && (profile?.role === 'super_admin' || profile?.role === 'admin') && <PurchaseTab searchQuery={searchQuery} />}
            {currentTab === 'Inventory' && (profile?.role === 'super_admin' || profile?.role === 'admin') && <InventoryTab searchQuery={searchQuery} />}
            {currentTab === 'Products' && (profile?.role === 'super_admin' || profile?.role === 'admin') && <ProductsTab searchQuery={searchQuery} />}
            {currentTab === 'Quotations' && (profile?.role === 'super_admin' || profile?.role === 'admin') && <QuotationsTab searchQuery={searchQuery} setActiveTab={setActiveTab} />}
            {currentTab === 'Storefront' && <StorefrontTab setActiveTab={setActiveTab} />}
            {currentTab === 'Production' && (profile?.role === 'super_admin' || profile?.role === 'admin') && <ProductionTab searchQuery={searchQuery} />}
            {currentTab === 'Installation' && <InstallationTab searchQuery={searchQuery} />}
            {currentTab === 'Dispatched' && (profile?.role === 'super_admin' || profile?.role === 'admin' || profile?.role === 'sales_executive') && <DispatchedTab searchQuery={searchQuery} />}
            {currentTab === 'Payments' && (profile?.role === 'super_admin' || profile?.role === 'admin' || profile?.role === 'sales_executive') && <PaymentsTab searchQuery={searchQuery} />}
            {currentTab === 'Analytics' && profile?.role === 'super_admin' && <AnalyticsTab />}
            {currentTab === 'Users' as any && profile?.role === 'super_admin' && <UsersTab />}

            {/* Fallback if user's role does not have access to the selected tab */}
            {currentTab !== 'Storefront' && currentTab !== 'Installation' && (!profile || (profile.role !== 'super_admin' && profile.role !== 'admin' && profile.role !== 'sales_executive')) && (
              <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center max-w-lg mx-auto mt-12 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl font-bold">!</span>
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">Access Restricted</h3>
                <p className="text-sm text-slate-500 mb-6">Your current role does not have permission to view the {currentTab} portal.</p>
                <button
                  onClick={() => setActiveTab('Storefront')}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
                >
                  Return to Storefront
                </button>
              </div>
            )}
          </div>
        </main>
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200">
          {currentTab !== 'Storefront' && <BottomNav activeTab={currentTab} setActiveTab={setActiveTab} />}
        </div>
      </div>
    </div>
  );
}
