const fs = require('fs');
const path = 'src/tabs/OrdersTab.tsx';
let content = fs.readFileSync(path, 'utf8');

const getOrdersStatsRegex = /const getOrdersStats = \(\) => \{[\s\S]*?return \{[\s\S]*?\};\n  \};/;

const newStatsFunction = `  const getOrdersStats = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
    
    let thisMonthCount = 0;
    let lastMonthCount = 0;
    let lifetimeRevenue = 0;
    let thisMonthRevenue = 0;
    let lastMonthRevenue = 0;
    const lifetimeCount = filteredOrders.length;
    
    filteredOrders.forEach(order => {
      let orderDate;
      if (order.createdAt?.seconds) {
        orderDate = new Date(order.createdAt.seconds * 1000);
      } else if (order.date) {
        orderDate = new Date(order.date);
      }

      // Parse amount properly - take the total amount directly
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

content = content.replace(getOrdersStatsRegex, newStatsFunction);

// Also update the titles of the first cards to be less confusing when filtered
content = content.replace('title="Total Orders (Lifetime)"', 'title="Total Orders"');
content = content.replace('title="Total Revenue (Lifetime)"', 'title="Total Revenue"');

fs.writeFileSync(path, content);
console.log("Updated getOrdersStats correctly.");
