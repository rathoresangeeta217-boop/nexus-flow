const fs = require('fs');
const file = 'src/tabs/OrdersTab.tsx';
let content = fs.readFileSync(file, 'utf8');

// Patch filter logic
content = content.replace(
  `      if (order.createdAt?.seconds) {
        orderDate = new Date(order.createdAt.seconds * 1000);
      } else if (order.date) {
        orderDate = new Date(order.date);
      }`,
  `      if (order.date) {
        orderDate = new Date(order.date);
      } else if (order.createdAt?.seconds) {
        orderDate = new Date(order.createdAt.seconds * 1000);
      }`
);

// Patch stats logic
content = content.replace(
  `      if (order.createdAt?.seconds) {
        orderDate = new Date(order.createdAt.seconds * 1000);
      } else if (order.date) {
        orderDate = new Date(order.date);
      }`,
  `      if (order.date) {
        orderDate = new Date(order.date);
      } else if (order.createdAt?.seconds) {
        orderDate = new Date(order.createdAt.seconds * 1000);
      }`
);

fs.writeFileSync(file, content);
console.log("Patched date logic");
