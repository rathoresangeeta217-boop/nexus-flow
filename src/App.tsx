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

  if (loading) { return null; }

  if (!user || !profile || !profile.isActive) {
    return <AuthView />;
  }

  if (approvalOrderId) {
    return <AdminApprovalView orderId={approvalOrderId} />;
  }

  // Reset search query when changing tabs
  useEffect(() => {
    setSearchQuery('');
  }, [activeTab]);

  if (quoteId) {
    return <VendorQuoteForm quoteId={quoteId} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header activeTab={activeTab} searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 custom-scrollbar">
          <div className="max-w-[1600px] mx-auto h-full">
            {activeTab === 'Orders' && <OrdersTab searchQuery={searchQuery} />}
            {activeTab === 'Purchase' && <PurchaseTab searchQuery={searchQuery} />}
            {activeTab === 'Production' && <ProductionTab searchQuery={searchQuery} />}
            {activeTab === 'Dispatched' && <DispatchedTab searchQuery={searchQuery} />}
            {activeTab === 'Payments' && <PaymentsTab searchQuery={searchQuery} />}
            {activeTab === 'Analytics' && <AnalyticsTab />}
            {activeTab === 'Users' as any && <UsersTab />}
          </div>
        </main>
      </div>
    </div>
  );
}

