const fs = require('fs');
const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf-8');

const updatedTabs = `
            {activeTab === 'Orders' && (profile?.role === 'super_admin' || profile?.role === 'admin' || profile?.role === 'sales_executive') && <OrdersTab searchQuery={searchQuery} />}
            {activeTab === 'Purchase' && (profile?.role === 'super_admin' || profile?.role === 'admin') && <PurchaseTab searchQuery={searchQuery} />}
            {activeTab === 'Production' && (profile?.role === 'super_admin' || profile?.role === 'admin') && <ProductionTab searchQuery={searchQuery} />}
            {activeTab === 'Dispatched' && (profile?.role === 'super_admin' || profile?.role === 'admin' || profile?.role === 'sales_executive') && <DispatchedTab searchQuery={searchQuery} />}
            {activeTab === 'Payments' && (profile?.role === 'super_admin' || profile?.role === 'admin' || profile?.role === 'sales_executive') && <PaymentsTab searchQuery={searchQuery} />}
            {activeTab === 'Analytics' && profile?.role === 'super_admin' && <AnalyticsTab />}
            {activeTab === 'Users' as any && profile?.role === 'super_admin' && <UsersTab />}
`;

content = content.replace(
  /\{activeTab === 'Orders'[\s\S]*?\{activeTab === 'Users'.*?<\/UsersTab> \}\}/,
  updatedTabs.trim()
);

fs.writeFileSync(file, content);
