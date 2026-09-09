const fs = require('fs');
let content = fs.readFileSync('src/tabs/DispatchedTab.tsx', 'utf8');

const targetStatsVars = `  const dispatchedOrders = orders.filter(o => o.status === 'Out for Delivery' || o.status === 'Delivered');
  const deliveredCount = orders.filter(o => o.status === 'Delivered').length;`;
  
const newStatsVars = `  const pendingCount = orders.filter(o => pendingStatuses.includes(o.status)).length;
  const scheduledCount = orders.filter(o => scheduledStatuses.includes(o.status)).length;
  const historyCount = orders.filter(o => historyStatuses.includes(o.status)).length;`;

content = content.replace(targetStatsVars, newStatsVars);

const targetStatsGrid = `<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              title="Active Shipments" 
              value={dispatchedOrders.length.toString()} 
              icon={<Truck className="w-5 h-5" />}
              colorClass="bg-blue-50 text-blue-600"
            />
            <StatCard 
              title="Total Orders" 
              value={orders.length.toString()} 
              icon={<Package className="w-5 h-5" />}
              colorClass="bg-emerald-50 text-emerald-600"
            />
            <StatCard 
              title="Delivered" 
              value={deliveredCount.toString()} 
              icon={<PackageCheck className="w-5 h-5" />}
              colorClass="bg-indigo-50 text-indigo-600"
            />
          </div>`;

const newStatsGrid = `<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <StatCard 
              title="Pending Dispatch" 
              value={pendingCount.toString()} 
              icon={<AlertCircle className="w-5 h-5" />}
              colorClass="bg-amber-50 text-amber-600"
            />
            <StatCard 
              title="Scheduled Dispatch" 
              value={scheduledCount.toString()} 
              icon={<Truck className="w-5 h-5" />}
              colorClass="bg-blue-50 text-blue-600"
            />
            <StatCard 
              title="Dispatch History" 
              value={historyCount.toString()} 
              icon={<PackageCheck className="w-5 h-5" />}
              colorClass="bg-emerald-50 text-emerald-600"
            />
            <StatCard 
              title="Total Orders" 
              value={orders.length.toString()} 
              icon={<Package className="w-5 h-5" />}
              colorClass="bg-indigo-50 text-indigo-600"
            />
          </div>`;

content = content.replace(targetStatsGrid, newStatsGrid);
fs.writeFileSync('src/tabs/DispatchedTab.tsx', content);
console.log("Patched stats grid in DispatchedTab");
