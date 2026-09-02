
import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { OrdersTab } from './tabs/OrdersTab';
import { PurchaseTab } from './tabs/PurchaseTab';
import { ProductionTab } from './tabs/ProductionTab';
import { DispatchedTab } from './tabs/DispatchedTab';
import { PaymentsTab } from './tabs/PaymentsTab';
import { AnalyticsTab } from './tabs/AnalyticsTab';
import { VendorQuoteForm } from './components/VendorQuoteForm';
import { TabName } from './types';
import { AdminApprovalView } from './components/AdminApprovalView';
import { useAuth } from './contexts/AuthContext';
import { AuthView } from './components/AuthView';
import { UsersTab } from './tabs/UsersTab';

export default function App() {
  const { user, profile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabName>('Orders');
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

  if (loading) { return null; }

  if (!user || !profile || !profile.isActive) {
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
  if (profile.role === 'sales_executive' && (activeTab === 'Purchase' || activeTab === 'Production' || activeTab === 'Analytics' || activeTab === 'Users')) {
     currentTab = 'Orders';
  } else if (profile.role === 'admin' && (activeTab === 'Analytics' || activeTab === 'Users')) {
     currentTab = 'Orders';
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <Sidebar activeTab={currentTab} setActiveTab={setActiveTab} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header activeTab={currentTab} searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 custom-scrollbar">
          <div className="max-w-[1600px] mx-auto h-full">
            {currentTab === 'Orders' && (profile.role === 'super_admin' || profile.role === 'admin' || profile.role === 'sales_executive') && <OrdersTab searchQuery={searchQuery} />}
            {currentTab === 'Purchase' && (profile.role === 'super_admin' || profile.role === 'admin') && <PurchaseTab searchQuery={searchQuery} />}
            {currentTab === 'Production' && (profile.role === 'super_admin' || profile.role === 'admin') && <ProductionTab searchQuery={searchQuery} />}
            {currentTab === 'Dispatched' && (profile.role === 'super_admin' || profile.role === 'admin' || profile.role === 'sales_executive') && <DispatchedTab searchQuery={searchQuery} />}
            {currentTab === 'Payments' && (profile.role === 'super_admin' || profile.role === 'admin' || profile.role === 'sales_executive') && <PaymentsTab searchQuery={searchQuery} />}
            {currentTab === 'Analytics' && profile.role === 'super_admin' && <AnalyticsTab />}
            {currentTab === 'Users' as any && profile.role === 'super_admin' && <UsersTab />}
          </div>
        </main>
      </div>
    </div>
  );
}
