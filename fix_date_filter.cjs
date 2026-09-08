const fs = require('fs');

const path = 'src/tabs/OrdersTab.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `  const filteredOrders = orders.filter(order => {
    if (statusFilter !== 'all' && order.status !== statusFilter) return false;
    
    if (searchQuery) {`;

const replacement = `  const filteredOrders = orders.filter(order => {
    if (statusFilter !== 'all' && order.status !== statusFilter) return false;
    
    if (dateFilter !== 'all') {
      const now = new Date();
      let orderDate = null;
      
      if (order.createdAt?.seconds) {
        orderDate = new Date(order.createdAt.seconds * 1000);
      } else if (order.date) {
        orderDate = new Date(order.date);
      }
      
      if (orderDate && !isNaN(orderDate.getTime())) {
        if (dateFilter === 'day') {
          if (orderDate.toDateString() !== now.toDateString()) return false;
        } else if (dateFilter === 'month') {
          if (orderDate.getMonth() !== now.getMonth() || orderDate.getFullYear() !== now.getFullYear()) return false;
        } else if (dateFilter === 'year') {
          if (orderDate.getFullYear() !== now.getFullYear()) return false;
        } else if (dateFilter === 'custom') {
          if (startDate) {
            const s = new Date(startDate);
            s.setHours(0, 0, 0, 0);
            if (orderDate < s) return false;
          }
          if (endDate) {
            const e = new Date(endDate);
            e.setHours(23, 59, 59, 999);
            if (orderDate > e) return false;
          }
        }
      }
    }
    
    if (searchQuery) {`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(path, content);
  console.log("Successfully replaced target string.");
} else {
  console.log("Could not find target string.");
}
