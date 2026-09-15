const fs = require('fs');
let content = fs.readFileSync('src/tabs/OrdersTab.tsx', 'utf-8');

// Replace date assignment with the new orderDate provided from the form, formatting it correctly
content = content.replace(
  "date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),",
  "date: orderDetails.orderDate ? new Date(orderDetails.orderDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),"
);

fs.writeFileSync('src/tabs/OrdersTab.tsx', content);
console.log("Patched OrdersTab.tsx");
