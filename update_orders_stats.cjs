const fs = require('fs');

const path = 'src/tabs/OrdersTab.tsx';
let content = fs.readFileSync(path, 'utf8');

const statFunctionTarget = `  const getOrdersStats = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
    
    let thisMonthCount = 0;
    let lastMonthCount = 0;
    const lifetimeCount = orders.length;
    
    orders.forEach(order => {
      let orderDate;
      // Handle the format: "Oct 15, 2023" or fallback to createdAt
      if (order.createdAt?.seconds) {
        orderDate = new Date(order.createdAt.seconds * 1000);
      } else if (order.date) {
        orderDate = new Date(order.date);
      }
      
      if (orderDate && !isNaN(orderDate.getTime())) {
        if (orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear) {
          thisMonthCount++;
        } else if (orderDate.getMonth() === lastMonthDate.getMonth() && orderDate.getFullYear() === lastMonthDate.getFullYear()) {
          lastMonthCount++;
        }
      }
    });

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const currentDay = Math.max(1, now.getDate());
    const projectedCount = Math.round((thisMonthCount / currentDay) * daysInMonth);

    // Calculate trends
    let thisMonthTrend = 0;
    if (lastMonthCount > 0) {
      thisMonthTrend = ((thisMonthCount - lastMonthCount) / lastMonthCount) * 100;
    }
    
    let projectedTrend = 0;
    if (thisMonthCount > 0) { 
       projectedTrend = ((projectedCount - thisMonthCount) / thisMonthCount) * 100;
    }

    return {
      lifetime: lifetimeCount,
      thisMonth: thisMonthCount,
      lastMonth: lastMonthCount,
      projected: projectedCount || thisMonthCount,
      thisMonthTrend,
      projectedTrend
    };
  };`;

const statFunctionReplacement = `  const getOrdersStats = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
    
    let thisMonthCount = 0;
    let lastMonthCount = 0;
    let lifetimeRevenue = 0;
    let thisMonthRevenue = 0;
    let lastMonthRevenue = 0;
    const lifetimeCount = orders.length;
    
    orders.forEach(order => {
      let orderDate;
      if (order.createdAt?.seconds) {
        orderDate = new Date(order.createdAt.seconds * 1000);
      } else if (order.date) {
        orderDate = new Date(order.date);
      }
      
      // Parse amount
      const amountStr = String(order.amount || order.details?.totalAmount || '0').replace(/[^0-9.]/g, '');
      const amount = parseFloat(amountStr) || 0;
      
      lifetimeRevenue += amount;
      
      if (orderDate && !isNaN(orderDate.getTime())) {
        if (orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear) {
          thisMonthCount++;
          thisMonthRevenue += amount;
        } else if (orderDate.getMonth() === lastMonthDate.getMonth() && orderDate.getFullYear() === lastMonthDate.getFullYear()) {
          lastMonthCount++;
          lastMonthRevenue += amount;
        }
      }
    });

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const currentDay = Math.max(1, now.getDate());
    
    const projectedCount = Math.round((thisMonthCount / currentDay) * daysInMonth);
    const projectedRevenue = Math.round((thisMonthRevenue / currentDay) * daysInMonth);

    // Calculate trends
    let thisMonthTrend = 0;
    if (lastMonthCount > 0) {
      thisMonthTrend = ((thisMonthCount - lastMonthCount) / lastMonthCount) * 100;
    }
    
    let projectedTrend = 0;
    if (thisMonthCount > 0) { 
       projectedTrend = ((projectedCount - thisMonthCount) / thisMonthCount) * 100;
    }
    
    let thisMonthRevTrend = 0;
    if (lastMonthRevenue > 0) {
      thisMonthRevTrend = ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
    }
    
    let projectedRevTrend = 0;
    if (thisMonthRevenue > 0) {
      projectedRevTrend = ((projectedRevenue - thisMonthRevenue) / thisMonthRevenue) * 100;
    }
    
    const formatCurrency = (val) => {
      if (val >= 10000000) return \`₹\${(val / 10000000).toFixed(2)}Cr\`;
      if (val >= 100000) return \`₹\${(val / 100000).toFixed(2)}L\`;
      return \`₹\${val.toLocaleString('en-IN')}\`;
    };

    return {
      lifetime: lifetimeCount,
      thisMonth: thisMonthCount,
      lastMonth: lastMonthCount,
      projected: projectedCount || thisMonthCount,
      thisMonthTrend,
      projectedTrend,
      
      lifetimeRev: formatCurrency(lifetimeRevenue),
      thisMonthRev: formatCurrency(thisMonthRevenue),
      lastMonthRev: formatCurrency(lastMonthRevenue),
      projectedRev: formatCurrency(projectedRevenue || thisMonthRevenue),
      thisMonthRevTrend,
      projectedRevTrend
    };
  };`;

const uiTarget = `      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Orders (Lifetime)" 
          value={stats.lifetime.toLocaleString()} 
          icon={<ShoppingCart className="w-5 h-5" />}
          colorClass="bg-blue-50 text-blue-600"
        />
        
        <StatCard 
          title="Total Orders (This Month)" 
          value={stats.thisMonth.toLocaleString()} 
          trend={stats.lastMonth > 0 ? { value: parseFloat(Math.abs(stats.thisMonthTrend).toFixed(1)), isPositive: stats.thisMonthTrend >= 0, label: 'from last month' } : undefined}
          icon={<ShoppingCart className="w-5 h-5" />}
          colorClass="bg-emerald-50 text-emerald-600"
        />

        <StatCard 
          title="Total Orders (Last Month)" 
          value={stats.lastMonth.toLocaleString()} 
          icon={<ShoppingCart className="w-5 h-5" />}
          colorClass="bg-amber-50 text-amber-600"
        />

        <StatCard 
          title="Projected Orders (This Month)" 
          value={stats.projected.toLocaleString()} 
          trend={{ value: parseFloat(Math.abs(stats.projectedTrend).toFixed(1)), isPositive: stats.projectedTrend >= 0, label: 'vs current' }}
          icon={<ShoppingCart className="w-5 h-5" />}
          colorClass="bg-indigo-50 text-indigo-600"
        />
      </div>`;

const uiReplacement = `      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Orders (Lifetime)" 
          value={stats.lifetime.toLocaleString()} 
          icon={<ShoppingCart className="w-5 h-5" />}
          colorClass="bg-blue-50 text-blue-600"
        />
        
        <StatCard 
          title="Total Orders (This Month)" 
          value={stats.thisMonth.toLocaleString()} 
          trend={stats.lastMonth > 0 ? { value: parseFloat(Math.abs(stats.thisMonthTrend).toFixed(1)), isPositive: stats.thisMonthTrend >= 0, label: 'from last month' } : undefined}
          icon={<ShoppingCart className="w-5 h-5" />}
          colorClass="bg-emerald-50 text-emerald-600"
        />

        <StatCard 
          title="Total Orders (Last Month)" 
          value={stats.lastMonth.toLocaleString()} 
          icon={<ShoppingCart className="w-5 h-5" />}
          colorClass="bg-amber-50 text-amber-600"
        />

        <StatCard 
          title="Projected Orders (This Month)" 
          value={stats.projected.toLocaleString()} 
          trend={{ value: parseFloat(Math.abs(stats.projectedTrend).toFixed(1)), isPositive: stats.projectedTrend >= 0, label: 'vs current' }}
          icon={<ShoppingCart className="w-5 h-5" />}
          colorClass="bg-indigo-50 text-indigo-600"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
        <StatCard 
          title="Total Revenue (Lifetime)" 
          value={stats.lifetimeRev} 
          icon={<TrendingUp className="w-5 h-5" />}
          colorClass="bg-blue-50 text-blue-600"
        />
        
        <StatCard 
          title="Revenue (This Month)" 
          value={stats.thisMonthRev} 
          trend={stats.lastMonthRev !== '₹0' ? { value: parseFloat(Math.abs(stats.thisMonthRevTrend).toFixed(1)), isPositive: stats.thisMonthRevTrend >= 0, label: 'from last month' } : undefined}
          icon={<TrendingUp className="w-5 h-5" />}
          colorClass="bg-emerald-50 text-emerald-600"
        />

        <StatCard 
          title="Revenue (Last Month)" 
          value={stats.lastMonthRev} 
          icon={<TrendingUp className="w-5 h-5" />}
          colorClass="bg-amber-50 text-amber-600"
        />

        <StatCard 
          title="Projected Revenue (This Month)" 
          value={stats.projectedRev} 
          trend={{ value: parseFloat(Math.abs(stats.projectedRevTrend).toFixed(1)), isPositive: stats.projectedRevTrend >= 0, label: 'vs current' }}
          icon={<TrendingUp className="w-5 h-5" />}
          colorClass="bg-indigo-50 text-indigo-600"
        />
      </div>`;

if (content.includes(statFunctionTarget)) {
  content = content.replace(statFunctionTarget, statFunctionReplacement);
  if (content.includes(uiTarget)) {
    content = content.replace(uiTarget, uiReplacement);
    fs.writeFileSync(path, content);
    console.log("Successfully updated stats block.");
  } else {
    console.log("Could not find UI target");
  }
} else {
  console.log("Could not find statFunctionTarget");
}

