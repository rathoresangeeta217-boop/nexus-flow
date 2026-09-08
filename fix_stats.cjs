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
      // Handle the format: "Oct 15, 2023" or fallback to createdAt
      if (order.createdAt?.seconds) {
        orderDate = new Date(order.createdAt.seconds * 1000);
      } else if (order.date) {
        orderDate = new Date(order.date);
      }

      // Parse amount properly
      let amount = 0;
      if (order.details && order.details.products) {
        amount = order.details.products.reduce((sum, p) => {
          const qty = Number(p.quantity) || 0;
          const rateStr = String(p.rate || '0').replace(/[^0-9.]/g, '');
          const rate = parseFloat(rateStr) || 0;
          return sum + (qty * rate);
        }, 0);
        
        // Add extra charges if any
        if (order.details.transportationCharges) amount += parseFloat(String(order.details.transportationCharges).replace(/[^0-9.]/g, '')) || 0;
        if (order.details.installationCharges) amount += parseFloat(String(order.details.installationCharges).replace(/[^0-9.]/g, '')) || 0;
        
      } else if (order.details && order.details.totalAmount) {
        amount = parseFloat(String(order.details.totalAmount).replace(/[^0-9.]/g, '')) || 0;
      } else if (order.amount) {
        amount = parseFloat(String(order.amount).replace(/[^0-9.]/g, '')) || 0;
      }

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
    
    const formatCurrency = (val: number) => {
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
fs.writeFileSync(path, content);
console.log("Updated getOrdersStats.");
